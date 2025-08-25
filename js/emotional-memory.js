class EmotionalMemory {
    constructor() {
        this.currentMood = null;
        this.currentWeek = new Date();
        this.activeTab = 'journey';
        this.modalType = null;
        this.azureClient = null;
        
        this.initializeAzureClient().then(() => {
            this.init();
        });
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Emotional Memory');
            }
        } catch (error) {
            console.warn('Failed to initialize Azure AI client for Emotional Memory:', error);
        }
    }

    async init() {
        this.setupEventListeners();
        this.loadData();
        this.renderJourneyChart();
        this.loadEvents();
        this.loadTriggersAndSoothers();
        await this.generatePatternInsights();
    }

    setupEventListeners() {
        // Mood selection
        document.querySelectorAll('.mood-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectMood(e));
        });

        // Log mood button
        document.getElementById('logMoodBtn').addEventListener('click', () => this.logMood());

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Week navigation
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));

        // Modal controls
        document.getElementById('addEventBtn').addEventListener('click', () => this.openEventModal());
        document.getElementById('addTriggerBtn').addEventListener('click', () => this.openTriggerModal('trigger'));
        document.getElementById('addSootherBtn').addEventListener('click', () => this.openTriggerModal('soother'));
        document.getElementById('insightsBtn').addEventListener('click', () => this.openInsightsModal());

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e));
        });

        // Save buttons
        document.getElementById('saveEventBtn').addEventListener('click', () => this.saveEvent());
        document.getElementById('saveTriggerBtn').addEventListener('click', () => this.saveTrigger());

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(e);
                }
            });
        });
    }

    selectMood(e) {
        // Remove previous selection
        document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
        
        // Add selection to clicked option
        e.currentTarget.classList.add('selected');
        this.currentMood = parseInt(e.currentTarget.dataset.mood);
        
        // Show mood details
        document.getElementById('moodDetails').style.display = 'block';
    }

    async logMood() {
        if (!this.currentMood) {
            alert('Please select a mood first');
            return;
        }

        const note = document.getElementById('moodNote').value;
        const moodEntry = {
            mood: this.currentMood,
            note: note,
            timestamp: new Date().toISOString(),
            date: new Date().toDateString()
        };

        // Save to localStorage
        const moodLogs = this.getMoodLogs();
        moodLogs.push(moodEntry);
        localStorage.setItem('hearuai_mood_logs', JSON.stringify(moodLogs));

        // Generate AI insights for the mood entry if available
        try {
            if (this.azureClient && note.trim()) {
                await this.generateMoodInsights(moodEntry, moodLogs);
            }
        } catch (error) {
            console.warn('Failed to generate AI mood insights:', error);
        }

        // Reset form
        document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
        document.getElementById('moodNote').value = '';
        document.getElementById('moodDetails').style.display = 'none';
        this.currentMood = null;

        // Refresh chart and patterns
        this.renderJourneyChart();
        await this.generatePatternInsights();
        
        // Show success message
        this.showNotification('Mood logged successfully!', 'success');
    }

    async generateMoodInsights(currentEntry, moodHistory) {
        const recentMoods = moodHistory.slice(-7); // Last 7 entries
        const context = {
            currentMood: {
                level: currentEntry.mood,
                note: currentEntry.note,
                timestamp: currentEntry.timestamp,
                dayOfWeek: new Date(currentEntry.timestamp).toLocaleDateString('en-US', { weekday: 'long' }),
                timeOfDay: new Date(currentEntry.timestamp).getHours()
            },
            recentHistory: recentMoods.map(mood => ({
                level: mood.mood,
                date: mood.date,
                note: mood.note
            })),
            triggers: this.getTriggersAndSoothers().filter(item => item.type === 'trigger'),
            soothers: this.getTriggersAndSoothers().filter(item => item.type === 'soother')
        };

        const prompt = `As an emotional wellness coach, analyze this mood entry and provide personalized insights and gentle recommendations.

Mood Context:
${JSON.stringify(context, null, 2)}

Please provide a brief, supportive response (2-3 sentences) that:
1. Acknowledges the current emotional state
2. Offers a gentle insight or observation
3. Suggests a small, actionable step for emotional wellness

Keep the tone warm, non-judgmental, and encouraging.`;

        const response = await this.azureClient.generateResponse(prompt);
        
        // Display the insight as a gentle notification
        if (response && response.trim()) {
            setTimeout(() => {
                this.showMoodInsight(response.trim());
            }, 1000);
        }
    }

    showMoodInsight(insight) {
        const insightContainer = document.createElement('div');
        insightContainer.className = 'mood-insight-popup';
        insightContainer.innerHTML = `
            <div class="insight-content">
                <div class="insight-header">
                    <i class="fas fa-lightbulb"></i>
                    <span>Emotional Insight</span>
                    <button class="close-insight" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="insight-text">${insight}</div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('.mood-insight-styles')) {
            const style = document.createElement('style');
            style.className = 'mood-insight-styles';
            style.textContent = `
                .mood-insight-popup {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 350px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    z-index: 1000;
                    animation: slideInRight 0.5s ease-out;
                }
                .insight-content {
                    padding: 20px;
                }
                .insight-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                    font-weight: 600;
                }
                .insight-header i {
                    margin-right: 8px;
                    color: #ffd700;
                }
                .close-insight {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }
                .close-insight:hover {
                    background: rgba(255,255,255,0.2);
                }
                .insight-text {
                    line-height: 1.5;
                    font-size: 14px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(insightContainer);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (insightContainer.parentNode) {
                insightContainer.remove();
            }
        }, 8000);
    }

    switchTab(e) {
        const tabName = e.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        this.activeTab = tabName;
    }

    navigateWeek(direction) {
        const newWeek = new Date(this.currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction * 7));
        this.currentWeek = newWeek;
        
        this.updateWeekDisplay();
        this.renderJourneyChart();
    }

    updateWeekDisplay() {
        const weekStart = new Date(this.currentWeek);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const isCurrentWeek = this.isCurrentWeek(weekStart);
        const weekText = isCurrentWeek ? 'This Week' : 
            `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        document.getElementById('currentWeek').textContent = weekText;
    }

    isCurrentWeek(weekStart) {
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay());
        
        return weekStart.toDateString() === currentWeekStart.toDateString();
    }

    renderJourneyChart() {
        const chartContainer = document.getElementById('journeyChart');
        const moodLogs = this.getMoodLogs();
        
        // Get week data
        const weekData = this.getWeekMoodData(moodLogs);
        
        if (weekData.length === 0) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>No mood data for this week</h4>
                    <p>Start logging your moods to see your emotional journey</p>
                </div>
            `;
            return;
        }
        
        // Create chart
        const chartHTML = `
            <div class="chart-container">
                ${weekData.map(day => `
                    <div class="chart-day">
                        <div class="chart-bar" style="height: ${(day.mood || 0) * 20}%" title="Mood: ${day.mood || 'No data'}"></div>
                        <div class="chart-label">${day.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        chartContainer.innerHTML = chartHTML;
        
        // Update summary
        this.updateJourneySummary(weekData);
    }

    getWeekMoodData(moodLogs) {
        const weekStart = new Date(this.currentWeek);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const weekData = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            
            const dayLogs = moodLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate.toDateString() === date.toDateString();
            });
            
            const averageMood = dayLogs.length > 0 ? 
                dayLogs.reduce((sum, log) => sum + log.mood, 0) / dayLogs.length : null;
            
            weekData.push({
                date: date,
                label: days[i],
                mood: averageMood,
                logs: dayLogs
            });
        }
        
        return weekData;
    }

    updateJourneySummary(weekData) {
        const summaryContainer = document.getElementById('journeySummary');
        
        const validDays = weekData.filter(day => day.mood !== null);
        if (validDays.length === 0) {
            summaryContainer.innerHTML = '<p>No mood data available for summary</p>';
            return;
        }
        
        const averageMood = validDays.reduce((sum, day) => sum + day.mood, 0) / validDays.length;
        const highestMood = Math.max(...validDays.map(day => day.mood));
        const lowestMood = Math.min(...validDays.map(day => day.mood));
        
        const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
        
        summaryContainer.innerHTML = `
            <h4>Week Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px;">
                <div>
                    <strong>Average Mood:</strong><br>
                    ${moodLabels[Math.round(averageMood) - 1]} (${averageMood.toFixed(1)})
                </div>
                <div>
                    <strong>Highest:</strong><br>
                    ${moodLabels[highestMood - 1]}
                </div>
                <div>
                    <strong>Lowest:</strong><br>
                    ${moodLabels[lowestMood - 1]}
                </div>
                <div>
                    <strong>Days Logged:</strong><br>
                    ${validDays.length} of 7
                </div>
            </div>
        `;
    }

    openEventModal() {
        document.getElementById('eventModal').classList.add('active');
        document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    }

    openTriggerModal(type) {
        this.modalType = type;
        const modal = document.getElementById('triggerModal');
        const title = document.getElementById('triggerModalTitle');
        
        title.textContent = type === 'trigger' ? 'Add Trigger' : 'Add Soother';
        modal.classList.add('active');
    }

    openInsightsModal() {
        const modal = document.getElementById('insightsModal');
        modal.classList.add('active');
        this.generateAIInsights();
    }

    closeModal(e) {
        const modal = e.target.closest('.modal');
        modal.classList.remove('active');
        
        // Reset forms
        modal.querySelectorAll('input, textarea, select').forEach(input => {
            input.value = '';
        });
        
        this.modalType = null;
    }

    saveEvent() {
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const impact = document.getElementById('eventImpact').value;
        const description = document.getElementById('eventDescription').value;
        
        if (!title || !date || !impact) {
            alert('Please fill in all required fields');
            return;
        }
        
        const event = {
            id: Date.now().toString(),
            title,
            date,
            impact,
            description,
            timestamp: new Date().toISOString()
        };
        
        const events = this.getLifeEvents();
        events.push(event);
        localStorage.setItem('hearuai_life_events', JSON.stringify(events));
        
        this.closeModal({ target: document.getElementById('eventModal') });
        this.loadEvents();
        this.showNotification('Event saved successfully!', 'success');
    }

    saveTrigger() {
        const name = document.getElementById('triggerName').value;
        const category = document.getElementById('triggerCategory').value;
        const notes = document.getElementById('triggerNotes').value;
        
        if (!name || !category) {
            alert('Please fill in all required fields');
            return;
        }
        
        const item = {
            id: Date.now().toString(),
            name,
            category,
            notes,
            type: this.modalType,
            timestamp: new Date().toISOString()
        };
        
        const items = this.getTriggersAndSoothers();
        items.push(item);
        localStorage.setItem('hearuai_triggers_soothers', JSON.stringify(items));
        
        this.closeModal({ target: document.getElementById('triggerModal') });
        this.loadTriggersAndSoothers();
        this.showNotification(`${this.modalType === 'trigger' ? 'Trigger' : 'Soother'} saved successfully!`, 'success');
    }

    loadEvents() {
        const eventsList = document.getElementById('eventsList');
        const events = this.getLifeEvents().sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h4>No life events recorded</h4>
                    <p>Add significant events to track their emotional impact</p>
                </div>
            `;
            return;
        }
        
        eventsList.innerHTML = events.map(event => `
            <div class="event-item">
                <div class="event-header">
                    <div>
                        <div class="event-title">${event.title}</div>
                        <div class="event-date">${new Date(event.date).toLocaleDateString()}</div>
                    </div>
                    <div class="event-impact ${event.impact}">${event.impact.replace('-', ' ')}</div>
                </div>
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            </div>
        `).join('');
    }

    loadTriggersAndSoothers() {
        const items = this.getTriggersAndSoothers();
        const triggers = items.filter(item => item.type === 'trigger');
        const soothers = items.filter(item => item.type === 'soother');
        
        this.renderTriggersList(triggers, 'triggerList');
        this.renderTriggersList(soothers, 'sootherList');
    }

    renderTriggersList(items, containerId) {
        const container = document.getElementById(containerId);
        const type = containerId.includes('trigger') ? 'trigger' : 'soother';
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-${type === 'trigger' ? 'exclamation-triangle' : 'heart'}"></i>
                    <h4>No ${type}s identified</h4>
                    <p>Add ${type}s to better understand your emotional patterns</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="${type}-item">
                <div class="${type}-name">${item.name}</div>
                <div class="${type}-category">${item.category}</div>
                ${item.notes ? `<div class="${type}-notes">${item.notes}</div>` : ''}
            </div>
        `).join('');
    }

    async generatePatternInsights() {
        const container = document.getElementById('patternInsights');
        const moodLogs = this.getMoodLogs();
        const events = this.getLifeEvents();
        const triggers = this.getTriggersAndSoothers().filter(item => item.type === 'trigger');
        
        if (moodLogs.length < 7) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-brain"></i>
                    <h4>Not enough data for patterns</h4>
                    <p>Log moods for at least a week to see meaningful patterns</p>
                </div>
            `;
            return;
        }
        
        // Show loading state
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Analyzing emotional patterns...</p>
            </div>
        `;
        
        try {
            let patterns;
            if (this.azureClient) {
                patterns = await this.generateAIPatternAnalysis(moodLogs, events, triggers);
            } else {
                patterns = this.analyzePatterns(moodLogs, events, triggers);
            }
            
            container.innerHTML = patterns.map(pattern => `
                <div class="pattern-card">
                    <div class="pattern-title">${pattern.title}</div>
                    <div class="pattern-description">${pattern.description}</div>
                    ${pattern.recommendation ? `<div class="pattern-recommendation">${pattern.recommendation}</div>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.warn('AI pattern analysis failed, using static analysis:', error);
            const patterns = this.analyzePatterns(moodLogs, events, triggers);
            container.innerHTML = patterns.map(pattern => `
                <div class="pattern-card">
                    <div class="pattern-title">${pattern.title}</div>
                    <div class="pattern-description">${pattern.description}</div>
                </div>
            `).join('');
        }
    }

    async generateAIPatternAnalysis(moodLogs, events, triggers) {
        const context = this.formatEmotionalDataForAI(moodLogs, events, triggers);
        
        const prompt = `As an emotional wellness expert, analyze the following emotional memory data and provide personalized insights and patterns.

Emotional Data:
${JSON.stringify(context, null, 2)}

Please provide pattern analysis in the following JSON format:
[
  {
    "title": "Pattern Title",
    "description": "Detailed description of the emotional pattern",
    "recommendation": "Personalized recommendation based on this pattern",
    "confidence": 0.85,
    "category": "mood_trend|trigger_pattern|emotional_cycle"
  }
]

Focus on:
1. Mood trends and cycles
2. Trigger patterns and correlations
3. Emotional resilience indicators
4. Personalized coping strategies
5. Growth opportunities`;

        const response = await this.azureClient.generateResponse(prompt);
        return this.parseAIPatternAnalysis(response);
    }

    formatEmotionalDataForAI(moodLogs, events, triggers) {
        const recentMoods = moodLogs.slice(-30); // Last 30 entries
        const recentEvents = events.slice(-10); // Last 10 events
        
        return {
            moodSummary: {
                totalEntries: recentMoods.length,
                averageMood: recentMoods.reduce((sum, log) => sum + log.mood, 0) / recentMoods.length,
                moodRange: {
                    highest: Math.max(...recentMoods.map(log => log.mood)),
                    lowest: Math.min(...recentMoods.map(log => log.mood))
                },
                variance: this.calculateMoodVariance(recentMoods)
            },
            recentMoodEntries: recentMoods.map(log => ({
                mood: log.mood,
                date: log.date,
                note: log.note,
                dayOfWeek: new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'long' }),
                timeOfDay: new Date(log.timestamp).getHours()
            })),
            lifeEvents: recentEvents.map(event => ({
                title: event.title,
                category: event.category,
                impact: event.impact,
                date: event.date
            })),
            triggers: triggers.map(trigger => ({
                name: trigger.name,
                category: trigger.category,
                notes: trigger.notes
            })),
            timeContext: {
                analysisDate: new Date().toISOString(),
                dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                season: this.getCurrentSeason()
            }
        };
    }

    parseAIPatternAnalysis(response) {
        try {
            // Extract JSON array from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const patterns = JSON.parse(jsonMatch[0]);
                return patterns.filter(pattern => pattern.title && pattern.description);
            }
        } catch (error) {
            console.warn('Failed to parse AI pattern analysis:', error);
        }
        
        // Fallback to static analysis
        return this.analyzePatterns(moodLogs, events, triggers);
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'Spring';
        if (month >= 5 && month <= 7) return 'Summer';
        if (month >= 8 && month <= 10) return 'Fall';
        return 'Winter';
    }

    analyzePatterns(moodLogs, events, triggers) {
        const patterns = [];
        
        // Analyze mood trends
        const recentMoods = moodLogs.slice(-7).map(log => log.mood);
        const averageRecent = recentMoods.reduce((sum, mood) => sum + mood, 0) / recentMoods.length;
        const olderMoods = moodLogs.slice(-14, -7).map(log => log.mood);
        const averageOlder = olderMoods.length > 0 ? olderMoods.reduce((sum, mood) => sum + mood, 0) / olderMoods.length : averageRecent;
        
        if (averageRecent > averageOlder + 0.5) {
            patterns.push({
                title: '📈 Improving Trend',
                description: 'Your mood has been trending upward over the past week. Keep up the positive momentum!'
            });
        } else if (averageRecent < averageOlder - 0.5) {
            patterns.push({
                title: '📉 Declining Trend',
                description: 'Your mood has been declining recently. Consider reaching out for support or engaging in self-care activities.'
            });
        } else {
            patterns.push({
                title: '📊 Stable Pattern',
                description: 'Your mood has been relatively stable. This consistency can be a sign of good emotional regulation.'
            });
        }
        
        // Analyze day of week patterns
        const dayMoods = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        moodLogs.forEach(log => {
            const day = new Date(log.timestamp).getDay();
            if (!dayMoods[day]) dayMoods[day] = [];
            dayMoods[day].push(log.mood);
        });
        
        let bestDay = null;
        let worstDay = null;
        let bestAverage = 0;
        let worstAverage = 6;
        
        Object.keys(dayMoods).forEach(day => {
            const average = dayMoods[day].reduce((sum, mood) => sum + mood, 0) / dayMoods[day].length;
            if (average > bestAverage) {
                bestAverage = average;
                bestDay = days[day];
            }
            if (average < worstAverage) {
                worstAverage = average;
                worstDay = days[day];
            }
        });
        
        if (bestDay && worstDay && bestDay !== worstDay) {
            patterns.push({
                title: '📅 Weekly Pattern',
                description: `You tend to feel best on ${bestDay}s and struggle more on ${worstDay}s. Consider planning self-care activities for ${worstDay}s.`
            });
        }
        
        // Analyze event impact
        if (events.length > 0) {
            const positiveEvents = events.filter(e => e.impact.includes('positive')).length;
            const negativeEvents = events.filter(e => e.impact.includes('negative')).length;
            
            if (positiveEvents > negativeEvents) {
                patterns.push({
                    title: '🌟 Positive Events',
                    description: 'You\'ve recorded more positive than negative life events recently. This suggests you\'re noticing and appreciating good moments.'
                });
            }
        }
        
        // Trigger awareness
        if (triggers.length > 0) {
            patterns.push({
                title: '🎯 Trigger Awareness',
                description: `You\'ve identified ${triggers.length} trigger(s). This self-awareness is a crucial step in emotional regulation and mental health management.`
            });
        }
        
        return patterns;
    }

    async generateAIInsights() {
        const container = document.getElementById('insightsContent');
        container.innerHTML = '<div class="loading">Generating insights...</div>';
        
        try {
            const moodLogs = this.getMoodLogs();
            const events = this.getLifeEvents();
            const triggers = this.getTriggersAndSoothers();
            
            // Simulate AI analysis (in real implementation, this would call your AI service)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const insights = this.generateDetailedInsights(moodLogs, events, triggers);
            
            container.innerHTML = `
                <div class="insights-grid">
                    ${insights.map(insight => `
                        <div class="insight-card">
                            <h4>${insight.title}</h4>
                            <p>${insight.content}</p>
                            ${insight.recommendation ? `<div class="recommendation"><strong>Recommendation:</strong> ${insight.recommendation}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            container.innerHTML = '<div class="error">Failed to generate insights. Please try again.</div>';
        }
    }

    generateDetailedInsights(moodLogs, events, triggers) {
        const insights = [];
        
        // Mood stability analysis
        if (moodLogs.length >= 14) {
            const moodVariance = this.calculateMoodVariance(moodLogs);
            if (moodVariance < 0.5) {
                insights.push({
                    title: 'Emotional Stability',
                    content: 'Your mood has been remarkably stable over the past two weeks, showing good emotional regulation.',
                    recommendation: 'Continue your current self-care practices and consider what factors contribute to this stability.'
                });
            } else if (moodVariance > 1.5) {
                insights.push({
                    title: 'Mood Fluctuations',
                    content: 'You\'ve experienced significant mood variations recently, which is completely normal.',
                    recommendation: 'Consider identifying patterns in your mood changes and practice grounding techniques during difficult moments.'
                });
            }
        }
        
        // Sleep and mood correlation (simulated)
        insights.push({
            title: 'Sleep & Mood Connection',
            content: 'Research shows a strong connection between sleep quality and emotional well-being.',
            recommendation: 'Track your sleep patterns alongside mood logs to identify potential correlations.'
        });
        
        // Social support analysis
        const socialEvents = events.filter(e => e.title.toLowerCase().includes('friend') || e.title.toLowerCase().includes('family') || e.title.toLowerCase().includes('social'));
        if (socialEvents.length > 0) {
            insights.push({
                title: 'Social Connections',
                content: `You\'ve recorded ${socialEvents.length} social event(s), which suggests you\'re maintaining important relationships.`,
                recommendation: 'Continue nurturing these social connections as they\'re vital for mental health and emotional support.'
            });
        }
        
        return insights;
    }

    calculateMoodVariance(moodLogs) {
        const moods = moodLogs.map(log => log.mood);
        const mean = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
        const variance = moods.reduce((sum, mood) => sum + Math.pow(mood - mean, 2), 0) / moods.length;
        return Math.sqrt(variance);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Data management methods
    getMoodLogs() {
        return JSON.parse(localStorage.getItem('hearuai_mood_logs') || '[]');
    }

    getLifeEvents() {
        return JSON.parse(localStorage.getItem('hearuai_life_events') || '[]');
    }

    getTriggersAndSoothers() {
        return JSON.parse(localStorage.getItem('hearuai_triggers_soothers') || '[]');
    }

    loadData() {
        // Initialize with sample data if empty (for demo purposes)
        if (this.getMoodLogs().length === 0) {
            this.initializeSampleData();
        }
        
        this.updateWeekDisplay();
    }

    initializeSampleData() {
        // Add some sample mood logs for demonstration
        const sampleMoods = [
            { mood: 4, note: 'Had a great morning walk', timestamp: new Date(Date.now() - 86400000).toISOString(), date: new Date(Date.now() - 86400000).toDateString() },
            { mood: 3, note: 'Feeling neutral today', timestamp: new Date(Date.now() - 172800000).toISOString(), date: new Date(Date.now() - 172800000).toDateString() },
            { mood: 5, note: 'Accomplished my goals!', timestamp: new Date(Date.now() - 259200000).toISOString(), date: new Date(Date.now() - 259200000).toDateString() }
        ];
        
        localStorage.setItem('hearuai_mood_logs', JSON.stringify(sampleMoods));
    }
}

// Initialize the emotional memory system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmotionalMemory();
});