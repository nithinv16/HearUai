// Mood Radar JavaScript
class MoodRadar {
    constructor() {
        this.currentMood = {
            energy: 50,
            stress: 50,
            mood: 50,
            focus: 50,
            timestamp: new Date()
        };
        
        this.moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
        this.nudgeSettings = JSON.parse(localStorage.getItem('nudgeSettings')) || {
            enabled: true,
            frequency: 'moderate',
            types: ['breathing', 'movement', 'mindfulness', 'social'],
            quietHours: { start: '22:00', end: '08:00' },
            adaptiveThreshold: true
        };
        
        this.engagementEvents = JSON.parse(localStorage.getItem('engagementEvents')) || [];
        this.notifications = JSON.parse(localStorage.getItem('moodNotifications')) || [];
        this.azureClient = null;
        this.initializeAzureClient();
        
        this.init();
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Mood Radar');
            } else {
                console.warn('Azure AI configuration not available for Mood Radar');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client for Mood Radar:', error);
        }
    }
    
    init() {
        this.setupEventListeners();
        this.loadCurrentMood();
        this.renderMoodVisualization();
        this.loadActiveNudges();
        this.loadPatterns();
        this.loadEvents();
        this.startMoodMonitoring();
        this.updateNotificationBadge();
        this.initDigitalPhenotyping();
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Quick check-in
        document.getElementById('quickCheckBtn').addEventListener('click', () => {
            this.openCheckInModal();
        });
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });
        
        // Notifications
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            this.openNotificationsModal();
        });
        
        // Pattern timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPatterns(e.target.dataset.timeframe);
            });
        });
        
        // Create event button
        document.getElementById('createEventBtn').addEventListener('click', () => {
            this.openCreateEventModal();
        });
        
        // Data management
        const dataManagementBtn = document.getElementById('dataManagementBtn');
        if (dataManagementBtn) {
            dataManagementBtn.addEventListener('click', () => {
                this.showDataDeletion();
            });
        }
        
        // Global functions for privacy controls
        window.showDataDeletion = () => this.showDataDeletion();
        window.deleteAllData = () => this.deleteAllData();
        window.closeModal = (modalId) => this.closeModal(modalId);
        
        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });
        
        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Check-in form
        document.getElementById('submitCheckIn').addEventListener('click', () => {
            this.submitCheckIn();
        });
        
        // Settings form
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Event form
        document.getElementById('createEventSubmit').addEventListener('click', () => {
            this.createEvent();
        });
        
        // Nudge controls
        document.getElementById('pauseNudges').addEventListener('click', () => {
            this.pauseNudges();
        });
        
        document.getElementById('refreshNudges').addEventListener('click', () => {
            this.refreshNudges();
        });
        
        // Notification actions
        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllNotificationsRead();
        });
        
        document.getElementById('clearNotifications').addEventListener('click', () => {
            this.clearAllNotifications();
        });
    }
    
    loadCurrentMood() {
        const lastMood = this.moodHistory[this.moodHistory.length - 1];
        if (lastMood && this.isToday(new Date(lastMood.timestamp))) {
            this.currentMood = lastMood;
        }
        
        this.updateMoodMetrics();
        this.updateLastUpdated();
    }
    
    updateMoodMetrics() {
        const metrics = {
            energy: { value: this.currentMood.energy, label: this.getMoodLabel('energy', this.currentMood.energy) },
            stress: { value: this.currentMood.stress, label: this.getMoodLabel('stress', this.currentMood.stress) },
            mood: { value: this.currentMood.mood, label: this.getMoodLabel('mood', this.currentMood.mood) },
            focus: { value: this.currentMood.focus, label: this.getMoodLabel('focus', this.currentMood.focus) }
        };
        
        Object.keys(metrics).forEach(key => {
            const metricElement = document.querySelector(`.metric.${key} .metric-value`);
            if (metricElement) {
                metricElement.textContent = metrics[key].label;
            }
        });
    }
    
    getMoodLabel(type, value) {
        const labels = {
            energy: ['Exhausted', 'Low', 'Moderate', 'High', 'Energized'],
            stress: ['Calm', 'Relaxed', 'Moderate', 'Stressed', 'Overwhelmed'],
            mood: ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'],
            focus: ['Scattered', 'Distracted', 'Moderate', 'Focused', 'Laser Sharp']
        };
        
        const index = Math.floor(value / 20);
        return labels[type][Math.min(index, 4)];
    }
    
    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const timeAgo = this.getTimeAgo(this.currentMood.timestamp);
            lastUpdatedElement.textContent = timeAgo;
        }
    }
    
    renderMoodVisualization() {
        const chartContainer = document.querySelector('.mood-radar-chart');
        if (!chartContainer) return;
        
        // Create a simple radar chart visualization
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        chartContainer.innerHTML = '';
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        this.drawRadarChart(ctx, canvas.width, canvas.height);
    }
    
    drawRadarChart(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background circles
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Draw axes
        const axes = ['Energy', 'Stress', 'Mood', 'Focus'];
        const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        
        ctx.strokeStyle = '#dee2e6';
        axes.forEach((axis, index) => {
            const angle = angles[index];
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw labels
            ctx.fillStyle = '#6c757d';
            ctx.font = '12px Segoe UI';
            ctx.textAlign = 'center';
            const labelX = centerX + Math.cos(angle) * (radius + 15);
            const labelY = centerY + Math.sin(angle) * (radius + 15);
            ctx.fillText(axis, labelX, labelY);
        });
        
        // Draw mood data
        const moodValues = [this.currentMood.energy, this.currentMood.stress, this.currentMood.mood, this.currentMood.focus];
        
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
        ctx.lineWidth = 2;
        
        moodValues.forEach((value, index) => {
            const angle = angles[index];
            const distance = (value / 100) * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#667eea';
        moodValues.forEach((value, index) => {
            const angle = angles[index];
            const distance = (value / 100) * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    async loadActiveNudges() {
        const nudgesContainer = document.querySelector('.nudges-container');
        if (!nudgesContainer) return;
        
        const activeNudges = await this.generateJITAINudges();
        
        if (activeNudges.length === 0) {
            nudgesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No Active Nudges</h4>
                    <p>You're all caught up! Check back later for personalized suggestions.</p>
                </div>
            `;
            return;
        }
        
        nudgesContainer.innerHTML = activeNudges.map(nudge => `
            <div class="nudge-card" data-nudge-id="${nudge.id}">
                <div class="nudge-header">
                    <span class="nudge-type">${nudge.type}</span>
                    <span class="nudge-time">${nudge.time}</span>
                </div>
                <div class="nudge-content">
                    <h3>${nudge.title}</h3>
                    <p>${nudge.message}</p>
                </div>
                <div class="nudge-actions">
                    <button class="nudge-btn primary" onclick="moodRadar.acceptNudge('${nudge.id}')">
                        <i class="fas fa-check"></i> ${nudge.primaryAction}
                    </button>
                    <button class="nudge-btn" onclick="moodRadar.snoozeNudge('${nudge.id}')">
                        <i class="fas fa-clock"></i> Later
                    </button>
                    <button class="nudge-btn" onclick="moodRadar.dismissNudge('${nudge.id}')">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async generateJITAINudges() {
        if (!this.nudgeSettings.enabled) return [];
        
        const now = new Date();
        const currentHour = now.getHours();
        
        // Check quiet hours
        const quietStart = parseInt(this.nudgeSettings.quietHours.start.split(':')[0]);
        const quietEnd = parseInt(this.nudgeSettings.quietHours.end.split(':')[0]);
        
        if (currentHour >= quietStart || currentHour <= quietEnd) {
            return [];
        }
        
        try {
            if (this.azureClient) {
                return await this.generateAINudges();
            } else {
                return this.generateStaticNudges();
            }
        } catch (error) {
            console.error('Error generating JITAI nudges:', error);
            return this.generateStaticNudges();
        }
    }

    async generateAINudges() {
        try {
            const moodContext = this.getMoodContext();
            const historyContext = this.getRecentMoodHistory();
            const timeContext = this.getTimeContext();
            
            const prompt = `As a mental health AI, generate 1-2 personalized Just-In-Time Adaptive Interventions (JITAI) based on:

Current Mood State:
- Energy: ${this.currentMood.energy}/100
- Stress: ${this.currentMood.stress}/100
- Mood: ${this.currentMood.mood}/100
- Focus: ${this.currentMood.focus}/100

Recent Patterns:
${historyContext}

Context:
${timeContext}

User Preferences: ${this.nudgeSettings.types.join(', ')}

Generate nudges that:
1. Address the most concerning mood metrics
2. Are contextually appropriate for the time/situation
3. Offer specific, actionable interventions
4. Use encouraging, supportive language
5. Include a clear call-to-action

Format each nudge as:
TYPE: [category]
TITLE: [engaging title]
MESSAGE: [supportive message]
ACTION: [specific action button text]
INTERVENTION: [intervention type]`;

            const response = await this.azureClient.generateResponse(prompt, {
                maxTokens: 400,
                temperature: 0.8
            });

            return this.parseAINudges(response);
        } catch (error) {
            console.error('Error generating AI nudges:', error);
            return this.generateStaticNudges();
        }
    }

    parseAINudges(aiResponse) {
        const nudges = [];
        const nudgeBlocks = aiResponse.split('TYPE:').filter(block => block.trim());
        
        nudgeBlocks.forEach((block, index) => {
            const lines = block.trim().split('\n');
            const nudge = {
                id: 'ai-nudge-' + Date.now() + '-' + index,
                time: 'Now'
            };
            
            lines.forEach(line => {
                if (line.startsWith('TITLE:')) nudge.title = line.replace('TITLE:', '').trim();
                else if (line.startsWith('MESSAGE:')) nudge.message = line.replace('MESSAGE:', '').trim();
                else if (line.startsWith('ACTION:')) nudge.primaryAction = line.replace('ACTION:', '').trim();
                else if (line.startsWith('INTERVENTION:')) nudge.intervention = line.replace('INTERVENTION:', '').trim();
                else if (!nudge.type) nudge.type = line.trim();
            });
            
            if (nudge.title && nudge.message && nudge.primaryAction) {
                nudges.push(nudge);
            }
        });
        
        return nudges.length > 0 ? nudges : this.generateStaticNudges();
    }

    generateStaticNudges() {
        const nudges = [];
        const now = new Date();
        const currentHour = now.getHours();
        
        // Generate nudges based on current mood state
        if (this.currentMood.stress > 70) {
            nudges.push({
                id: 'stress-relief-' + Date.now(),
                type: 'Stress Relief',
                title: 'Take a Breathing Break',
                message: 'Your stress levels seem elevated. A 2-minute breathing exercise could help you feel more centered.',
                time: 'Now',
                primaryAction: 'Start Breathing',
                intervention: 'breathing'
            });
        }
        
        if (this.currentMood.energy < 30) {
            nudges.push({
                id: 'energy-boost-' + Date.now(),
                type: 'Energy Boost',
                title: 'Quick Movement Break',
                message: 'Feeling low on energy? A short walk or some light stretching might help boost your mood.',
                time: 'Now',
                primaryAction: 'Get Moving',
                intervention: 'movement'
            });
        }
        
        if (this.currentMood.focus < 40) {
            nudges.push({
                id: 'focus-enhancement-' + Date.now(),
                type: 'Focus Enhancement',
                title: 'Mindfulness Moment',
                message: 'Having trouble concentrating? A brief mindfulness exercise could help clear your mind.',
                time: 'Now',
                primaryAction: 'Practice Mindfulness',
                intervention: 'mindfulness'
            });
        }
        
        // Time-based nudges
        if (currentHour >= 12 && currentHour <= 14) {
            nudges.push({
                id: 'lunch-check-' + Date.now(),
                type: 'Wellness Check',
                title: 'Midday Mood Check',
                message: 'How are you feeling after lunch? Taking a moment to check in with yourself can be valuable.',
                time: 'Now',
                primaryAction: 'Quick Check-in',
                intervention: 'reflection'
            });
        }
        
        return nudges.slice(0, 3); // Limit to 3 active nudges
    }

    getMoodContext() {
        const concerns = [];
        if (this.currentMood.stress > 70) concerns.push('high stress');
        if (this.currentMood.energy < 30) concerns.push('low energy');
        if (this.currentMood.mood < 40) concerns.push('low mood');
        if (this.currentMood.focus < 40) concerns.push('poor focus');
        return concerns.length > 0 ? concerns.join(', ') : 'stable mood state';
    }

    getRecentMoodHistory() {
        const recentEntries = this.moodHistory.slice(-5);
        if (recentEntries.length === 0) {
            return 'No recent mood history available.';
        }
        
        return recentEntries.map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            return `${date}: Energy ${entry.energy}, Stress ${entry.stress}, Mood ${entry.mood}, Focus ${entry.focus}`;
        }).join('\n');
    }

    getTimeContext() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.toLocaleDateString('en-US', { weekday: 'long' });
        
        let timeOfDay;
        if (hour < 12) timeOfDay = 'morning';
        else if (hour < 17) timeOfDay = 'afternoon';
        else timeOfDay = 'evening';
        
        return `${day} ${timeOfDay} (${hour}:${now.getMinutes().toString().padStart(2, '0')})`;
    }
    
    acceptNudge(nudgeId) {
        const nudgeElement = document.querySelector(`[data-nudge-id="${nudgeId}"]`);
        if (nudgeElement) {
            nudgeElement.style.opacity = '0.5';
            
            // Log engagement
            this.logEngagement({
                type: 'nudge_accepted',
                nudgeId: nudgeId,
                timestamp: new Date()
            });
            
            // Show success message
            this.showToast('Great! Starting your wellness activity...', 'success');
            
            // Remove nudge after animation
            setTimeout(() => {
                nudgeElement.remove();
                this.checkEmptyNudges();
            }, 1000);
        }
    }
    
    snoozeNudge(nudgeId) {
        const nudgeElement = document.querySelector(`[data-nudge-id="${nudgeId}"]`);
        if (nudgeElement) {
            nudgeElement.style.opacity = '0.5';
            
            this.logEngagement({
                type: 'nudge_snoozed',
                nudgeId: nudgeId,
                timestamp: new Date()
            });
            
            this.showToast('Nudge snoozed for 1 hour', 'info');
            
            setTimeout(() => {
                nudgeElement.remove();
                this.checkEmptyNudges();
            }, 500);
        }
    }
    
    dismissNudge(nudgeId) {
        const nudgeElement = document.querySelector(`[data-nudge-id="${nudgeId}"]`);
        if (nudgeElement) {
            nudgeElement.style.opacity = '0.5';
            
            this.logEngagement({
                type: 'nudge_dismissed',
                nudgeId: nudgeId,
                timestamp: new Date()
            });
            
            setTimeout(() => {
                nudgeElement.remove();
                this.checkEmptyNudges();
            }, 500);
        }
    }
    
    checkEmptyNudges() {
        const nudgesContainer = document.querySelector('.nudges-container');
        if (nudgesContainer && nudgesContainer.children.length === 0) {
            this.loadActiveNudges();
        }
    }
    
    async loadPatterns(timeframe = 'week') {
        const patternsGrid = document.querySelector('.patterns-grid');
        if (!patternsGrid) return;
        
        // Show loading state
        patternsGrid.innerHTML = `
            <div class="pattern-card loading">
                <div class="pattern-header">
                    <h3>Analyzing Patterns...</h3>
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="pattern-chart">
                    <p style="color: #6c757d;">AI is analyzing your mood patterns...</p>
                </div>
            </div>
        `;
        
        try {
            const patterns = await this.analyzePatterns(timeframe);
            
            patternsGrid.innerHTML = patterns.map(pattern => `
                <div class="pattern-card">
                    <div class="pattern-header">
                        <h3>${pattern.title}</h3>
                        <i class="${pattern.icon}"></i>
                    </div>
                    <div class="pattern-chart">
                        ${pattern.chartHtml}
                    </div>
                    <p class="pattern-insight">${pattern.insight}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading patterns:', error);
            patternsGrid.innerHTML = `
                <div class="pattern-card error">
                    <div class="pattern-header">
                        <h3>Analysis Error</h3>
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="pattern-chart">
                        <p style="color: #dc3545;">Unable to analyze patterns. Please try again later.</p>
                    </div>
                </div>
            `;
        }
    }
    
    async analyzePatterns(timeframe) {
        const relevantData = this.getRelevantMoodData(timeframe);
        
        if (relevantData.length === 0) {
            return [{
                title: 'Insufficient Data',
                icon: 'fas fa-chart-line',
                chartHtml: '<p style="color: #6c757d;">Not enough data to analyze patterns</p>',
                insight: 'Start logging your mood regularly to see personalized insights and patterns.'
            }];
        }

        try {
            if (this.azureClient) {
                return await this.generateAIPatternAnalysis(relevantData, timeframe);
            }
        } catch (error) {
            console.warn('AI pattern analysis failed, using static analysis:', error);
        }
        
        return this.generateStaticPatternAnalysis(relevantData);
    }

    async generateAIPatternAnalysis(data, timeframe) {
        const prompt = `Analyze the following mood data for ${timeframe} and provide personalized insights:

Mood Data:
${this.formatMoodDataForAI(data)}

Please provide 3-4 pattern insights in JSON format with this structure:
{
  "patterns": [
    {
      "title": "Pattern Name",
      "icon": "fas fa-icon-name",
      "insight": "Detailed personalized insight",
      "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
    }
  ]
}

Focus on:
1. Mood trends and what might be influencing them
2. Stress patterns and triggers
3. Energy levels and what affects them
4. Sleep or activity correlations if present

Make insights personal, actionable, and encouraging.`;

        const response = await this.azureClient.generateResponse(prompt);
        return this.parseAIPatternAnalysis(response, data);
    }

    formatMoodDataForAI(data) {
        return data.slice(-14).map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            const time = new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return `${date} ${time}: Mood ${entry.mood}/10, Energy ${entry.energy}/10, Stress ${entry.stress}/10, Focus ${entry.focus}/10${entry.context ? `, Context: ${entry.context.join(', ')}` : ''}`;
        }).join('\n');
    }

    parseAIPatternAnalysis(aiResponse, data) {
        try {
            const parsed = JSON.parse(aiResponse);
            if (parsed.patterns && Array.isArray(parsed.patterns)) {
                return parsed.patterns.map(pattern => ({
                    title: pattern.title || 'Pattern Analysis',
                    icon: pattern.icon || 'fas fa-chart-line',
                    chartHtml: this.generatePatternVisualization(pattern, data),
                    insight: pattern.insight || 'No specific insight available.',
                    recommendations: pattern.recommendations || []
                }));
            }
        } catch (error) {
            console.warn('Failed to parse AI pattern analysis:', error);
        }
        
        return this.generateStaticPatternAnalysis(data);
    }

    generatePatternVisualization(pattern, data) {
        const recommendations = pattern.recommendations || [];
        const recHtml = recommendations.length > 0 ? 
            `<div class="mt-2"><strong>Recommendations:</strong><ul class="mt-1">${recommendations.map(rec => `<li class="text-sm">${rec}</li>`).join('')}</ul></div>` : '';
        
        return `<div class="pattern-analysis">
            <p class="text-sm text-gray-600 mb-2">${pattern.insight}</p>
            ${recHtml}
        </div>`;
    }

    generateStaticPatternAnalysis(relevantData) {
        const patterns = [];
        
        // Mood trends
        const moodTrend = this.calculateTrend(relevantData, 'mood');
        patterns.push({
            title: 'Mood Trends',
            icon: 'fas fa-smile',
            chartHtml: this.generateTrendChart(moodTrend),
            insight: moodTrend.direction === 'up' ? 
                'Your mood has been trending upward! Keep up the positive momentum.' :
                moodTrend.direction === 'down' ?
                'Your mood has been declining. Consider reaching out for support or trying some wellness activities.' :
                'Your mood has been relatively stable this period.'
        });
        
        // Stress patterns
        const stressPattern = this.analyzeStressPatterns(relevantData);
        patterns.push({
            title: 'Stress Triggers',
            icon: 'fas fa-exclamation-triangle',
            chartHtml: this.generateTriggersList(stressPattern.triggers),
            insight: stressPattern.insight
        });
        
        // Energy patterns
        const energyPattern = this.analyzeEnergyPatterns(relevantData);
        patterns.push({
            title: 'Energy Boosters',
            icon: 'fas fa-bolt',
            chartHtml: this.generateActivitiesList(energyPattern.boosters),
            insight: energyPattern.insight
        });
        
        return patterns;
    }
    
    getRelevantMoodData(timeframe) {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeframe) {
            case 'day':
                cutoffDate.setDate(now.getDate() - 1);
                break;
            case 'week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            default:
                cutoffDate.setDate(now.getDate() - 7);
        }
        
        return this.moodHistory.filter(entry => new Date(entry.timestamp) >= cutoffDate);
    }
    
    calculateTrend(data, metric) {
        if (data.length < 2) return { direction: 'stable', change: 0 };
        
        const first = data[0][metric];
        const last = data[data.length - 1][metric];
        const change = last - first;
        
        return {
            direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            change: Math.abs(change)
        };
    }
    
    generateTrendChart(trend) {
        const arrow = trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '→';
        const color = trend.direction === 'up' ? '#28a745' : trend.direction === 'down' ? '#dc3545' : '#6c757d';
        
        return `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 2rem;">
                <span style="color: ${color};">${arrow}</span>
                <span style="color: ${color}; font-weight: bold;">${trend.change.toFixed(1)}%</span>
            </div>
        `;
    }
    
    analyzeStressPatterns(data) {
        // Mock stress triggers analysis
        const triggers = [
            { name: 'Work deadlines', impact: 'high' },
            { name: 'Social situations', impact: 'medium' },
            { name: 'Lack of sleep', impact: 'high' },
            { name: 'Traffic', impact: 'low' }
        ];
        
        return {
            triggers: triggers,
            insight: 'Work-related stress appears to be your biggest trigger. Consider time management techniques or speaking with your supervisor about workload.'
        };
    }
    
    analyzeEnergyPatterns(data) {
        // Mock energy boosters analysis
        const boosters = [
            { name: 'Morning exercise', effectiveness: '85%' },
            { name: 'Meditation', effectiveness: '72%' },
            { name: 'Social time', effectiveness: '68%' },
            { name: 'Nature walks', effectiveness: '79%' }
        ];
        
        return {
            boosters: boosters,
            insight: 'Morning exercise seems to be your most effective energy booster. Try to maintain this routine for optimal energy levels.'
        };
    }
    
    generateTriggersList(triggers) {
        return `
            <div class="trigger-list">
                ${triggers.map(trigger => `
                    <div class="trigger-item">
                        <span class="trigger-name">${trigger.name}</span>
                        <span class="trigger-impact ${trigger.impact}">${trigger.impact}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    generateActivitiesList(activities) {
        return `
            <div class="activity-list">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <span class="activity-name">${activity.name}</span>
                        <span class="activity-effectiveness">${activity.effectiveness}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    loadEvents() {
        const eventsTimeline = document.querySelector('.events-timeline');
        if (!eventsTimeline) return;
        
        if (this.engagementEvents.length === 0) {
            eventsTimeline.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h4>No Events Yet</h4>
                    <p>Create your first engagement event to start tracking your wellness journey.</p>
                </div>
            `;
            return;
        }
        
        const sortedEvents = this.engagementEvents
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        eventsTimeline.innerHTML = sortedEvents.map(event => `
            <div class="event-item">
                <div class="event-header">
                    <div>
                        <h4 class="event-title">${event.title}</h4>
                        <span class="event-type">${event.type}</span>
                    </div>
                    <span class="event-time">${this.formatEventTime(event.timestamp)}</span>
                </div>
                <p class="event-description">${event.description}</p>
                <div class="event-actions">
                    <button class="event-btn" onclick="moodRadar.editEvent('${event.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="event-btn" onclick="moodRadar.deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    formatEventTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }
    
    openCheckInModal() {
        const modal = document.getElementById('checkInModal');
        modal.classList.add('active');
        
        // Set current values
        document.getElementById('energySlider').value = this.currentMood.energy;
        document.getElementById('stressSlider').value = this.currentMood.stress;
        document.getElementById('moodSlider').value = this.currentMood.mood;
        document.getElementById('focusSlider').value = this.currentMood.focus;
    }
    
    submitCheckIn() {
        const newMood = {
            energy: parseInt(document.getElementById('energySlider').value),
            stress: parseInt(document.getElementById('stressSlider').value),
            mood: parseInt(document.getElementById('moodSlider').value),
            focus: parseInt(document.getElementById('focusSlider').value),
            timestamp: new Date(),
            context: this.getSelectedContextTags(),
            notes: document.getElementById('checkInNotes').value
        };
        
        this.currentMood = newMood;
        this.moodHistory.push(newMood);
        this.saveMoodHistory();
        
        this.updateMoodMetrics();
        this.updateLastUpdated();
        this.renderMoodVisualization();
        this.loadActiveNudges();
        
        document.getElementById('checkInModal').classList.remove('active');
        this.showToast('Mood check-in saved successfully!', 'success');
        
        // Clear form
        document.getElementById('checkInNotes').value = '';
        document.querySelectorAll('.context-tag').forEach(tag => tag.classList.remove('active'));
    }
    
    getSelectedContextTags() {
        const selectedTags = [];
        document.querySelectorAll('.context-tag.active').forEach(tag => {
            selectedTags.push(tag.textContent);
        });
        return selectedTags;
    }
    
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('active');
        
        // Load current settings
        document.getElementById('enableNudges').checked = this.nudgeSettings.enabled;
        document.getElementById('nudgeFrequency').value = this.nudgeSettings.frequency;
        document.getElementById('quietStart').value = this.nudgeSettings.quietHours.start;
        document.getElementById('quietEnd').value = this.nudgeSettings.quietHours.end;
        document.getElementById('adaptiveThreshold').checked = this.nudgeSettings.adaptiveThreshold;
        
        // Set intervention types
        this.nudgeSettings.types.forEach(type => {
            const checkbox = document.getElementById(`intervention_${type}`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    saveSettings() {
        const newSettings = {
            enabled: document.getElementById('enableNudges').checked,
            frequency: document.getElementById('nudgeFrequency').value,
            quietHours: {
                start: document.getElementById('quietStart').value,
                end: document.getElementById('quietEnd').value
            },
            adaptiveThreshold: document.getElementById('adaptiveThreshold').checked,
            types: []
        };
        
        // Get selected intervention types
        document.querySelectorAll('input[name="intervention_type"]:checked').forEach(checkbox => {
            newSettings.types.push(checkbox.value);
        });
        
        this.nudgeSettings = newSettings;
        localStorage.setItem('nudgeSettings', JSON.stringify(this.nudgeSettings));
        
        document.getElementById('settingsModal').classList.remove('active');
        this.showToast('Settings saved successfully!', 'success');
        
        // Refresh nudges with new settings
        this.loadActiveNudges();
    }
    
    openNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
        modal.classList.add('active');
        
        this.renderNotifications();
    }
    
    renderNotifications() {
        const notificationsList = document.querySelector('.notifications-list');
        if (!notificationsList) return;
        
        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <h4>No Notifications</h4>
                    <p>You're all caught up!</p>
                </div>
            `;
            return;
        }
        
        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <span class="notification-time">${this.getTimeAgo(notification.timestamp)}</span>
                </div>
                <p class="notification-message">${notification.message}</p>
            </div>
        `).join('');
    }
    
    markAllNotificationsRead() {
        this.notifications.forEach(notification => notification.read = true);
        localStorage.setItem('moodNotifications', JSON.stringify(this.notifications));
        this.renderNotifications();
        this.updateNotificationBadge();
        this.showToast('All notifications marked as read', 'success');
    }
    
    clearAllNotifications() {
        this.notifications = [];
        localStorage.setItem('moodNotifications', JSON.stringify(this.notifications));
        this.renderNotifications();
        this.updateNotificationBadge();
        this.showToast('All notifications cleared', 'success');
    }
    
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    openCreateEventModal() {
        const modal = document.getElementById('createEventModal');
        modal.classList.add('active');
        
        // Clear form
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventType').value = 'wellness';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('eventTime').value = new Date().toTimeString().slice(0, 5);
    }
    
    createEvent() {
        const title = document.getElementById('eventTitle').value;
        const type = document.getElementById('eventType').value;
        const description = document.getElementById('eventDescription').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        
        if (!title.trim()) {
            this.showToast('Please enter an event title', 'error');
            return;
        }
        
        const event = {
            id: 'event_' + Date.now(),
            title: title,
            type: type,
            description: description,
            timestamp: new Date(`${date}T${time}`),
            created: new Date()
        };
        
        this.engagementEvents.push(event);
        localStorage.setItem('engagementEvents', JSON.stringify(this.engagementEvents));
        
        document.getElementById('createEventModal').classList.remove('active');
        this.loadEvents();
        this.showToast('Event created successfully!', 'success');
    }
    
    editEvent(eventId) {
        // Implementation for editing events
        this.showToast('Edit functionality coming soon!', 'info');
    }
    
    deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event?')) {
            this.engagementEvents = this.engagementEvents.filter(event => event.id !== eventId);
            localStorage.setItem('engagementEvents', JSON.stringify(this.engagementEvents));
            this.loadEvents();
            this.showToast('Event deleted successfully!', 'success');
        }
    }
    
    pauseNudges() {
        this.nudgeSettings.enabled = false;
        localStorage.setItem('nudgeSettings', JSON.stringify(this.nudgeSettings));
        this.loadActiveNudges();
        this.showToast('Nudges paused for 2 hours', 'info');
    }
    
    refreshNudges() {
        this.loadActiveNudges();
        this.showToast('Nudges refreshed!', 'success');
    }
    
    startMoodMonitoring() {
        // Check for mood updates every 30 minutes
        setInterval(() => {
            this.checkForMoodReminders();
        }, 30 * 60 * 1000);
        
        // Generate new nudges every hour
        setInterval(() => {
            if (this.nudgeSettings.enabled) {
                this.loadActiveNudges();
            }
        }, 60 * 60 * 1000);
    }
    
    checkForMoodReminders() {
        const lastEntry = this.moodHistory[this.moodHistory.length - 1];
        const now = new Date();
        
        if (!lastEntry || !this.isToday(new Date(lastEntry.timestamp))) {
            this.addNotification({
                title: 'Daily Mood Check-in',
                message: 'Take a moment to check in with how you\'re feeling today.',
                timestamp: now,
                read: false
            });
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        localStorage.setItem('moodNotifications', JSON.stringify(this.notifications));
        this.updateNotificationBadge();
    }
    
    logEngagement(engagement) {
        const engagementLog = JSON.parse(localStorage.getItem('engagementLog')) || [];
        engagementLog.push(engagement);
        localStorage.setItem('engagementLog', JSON.stringify(engagementLog));
    }
    
    saveMoodHistory() {
        localStorage.setItem('moodHistory', JSON.stringify(this.moodHistory));
    }
    
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffTime = Math.abs(now - time);
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 60) {
            return `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else {
            return `${diffDays} days ago`;
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Digital Phenotyping Methods
    initDigitalPhenotyping() {
        this.phenotypingData = JSON.parse(localStorage.getItem('phenotypingData')) || {
            phoneUsage: [],
            activityLevel: [],
            sleepPattern: [],
            socialInteraction: []
        };
        
        this.privacySettings = JSON.parse(localStorage.getItem('privacySettings')) || {
            phoneUsage: true,
            activityData: true,
            sleepData: true,
            localProcessing: true,
            anonymousAnalytics: true
        };
        
        this.startDigitalPhenotyping();
        this.updatePhenotypingDisplay();
    }

    startDigitalPhenotyping() {
        // Simulate digital phenotyping data collection
        setInterval(() => {
            if (this.privacySettings.phoneUsage) {
                this.collectPhoneUsageData();
            }
            if (this.privacySettings.activityData) {
                this.collectActivityData();
            }
            if (this.privacySettings.sleepData) {
                this.collectSleepData();
            }
            this.updatePhenotypingDisplay();
        }, 300000); // Update every 5 minutes
    }

    collectPhoneUsageData() {
        // Simulate phone usage data collection
        const now = new Date();
        const usage = {
            timestamp: now,
            screenTime: Math.random() * 8 + 2, // 2-10 hours
            appSwitches: Math.floor(Math.random() * 100 + 50),
            notifications: Math.floor(Math.random() * 50 + 20)
        };
        
        this.phenotypingData.phoneUsage.push(usage);
        this.cleanOldData('phoneUsage', 7); // Keep 7 days
        this.savePhenotypingData();
    }

    collectActivityData() {
        // Simulate activity data collection
        const now = new Date();
        const activity = {
            timestamp: now,
            steps: Math.floor(Math.random() * 5000 + 3000), // 3000-8000 steps
            activeMinutes: Math.floor(Math.random() * 60 + 30),
            sedentaryTime: Math.random() * 8 + 4 // 4-12 hours
        };
        
        this.phenotypingData.activityLevel.push(activity);
        this.cleanOldData('activityLevel', 30); // Keep 30 days
        this.savePhenotypingData();
    }

    collectSleepData() {
        // Simulate sleep data collection
        const now = new Date();
        const sleep = {
            timestamp: now,
            duration: Math.random() * 3 + 6, // 6-9 hours
            quality: Math.random() * 40 + 60, // 60-100%
            bedtime: new Date(now.getTime() - (Math.random() * 2 + 7) * 3600000) // 7-9 hours ago
        };
        
        this.phenotypingData.sleepPattern.push(sleep);
        this.cleanOldData('sleepPattern', 60); // Keep 60 days
        this.savePhenotypingData();
    }

    cleanOldData(dataType, daysToKeep) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        this.phenotypingData[dataType] = this.phenotypingData[dataType].filter(
            item => new Date(item.timestamp) > cutoffDate
        );
    }

    updatePhenotypingDisplay() {
        // Update phone usage
        const phoneUsage = this.getLatestPhenotypingData('phoneUsage');
        if (phoneUsage) {
            const trend = this.calculatePhenotypingTrend('phoneUsage', 'screenTime');
            this.updatePhenotypingCard('phoneUsage', {
                value: `${phoneUsage.screenTime.toFixed(1)}h`,
                trend: trend,
                detail: 'Daily average',
                insight: trend < 0 ? 'Reduced usage correlates with better mood' : 'Consider reducing screen time'
            });
        }

        // Update activity level
        const activity = this.getLatestPhenotypingData('activityLevel');
        if (activity) {
            const trend = this.calculatePhenotypingTrend('activityLevel', 'steps');
            this.updatePhenotypingCard('activityLevel', {
                value: `${activity.steps.toLocaleString()}`,
                trend: trend,
                detail: 'Steps today',
                insight: trend > 0 ? 'Higher activity predicts mood improvement' : 'Try to increase daily activity'
            });
        }

        // Update sleep pattern
        const sleep = this.getLatestPhenotypingData('sleepPattern');
        if (sleep) {
            const trend = this.calculatePhenotypingTrend('sleepPattern', 'duration');
            this.updatePhenotypingCard('sleepPattern', {
                value: `${sleep.duration.toFixed(1)}h`,
                trend: trend,
                detail: 'Last night',
                insight: Math.abs(trend) < 0.1 ? 'Consistent sleep schedule detected' : 'Sleep pattern variation detected'
            });
        }

        // Update social interaction (simulated)
        const socialData = {
            messages: Math.floor(Math.random() * 30 + 10),
            trend: Math.random() * 0.3 - 0.15 // -15% to +15%
        };
        this.updatePhenotypingCard('socialInteraction', {
            value: socialData.messages.toString(),
            trend: socialData.trend,
            detail: 'Messages sent',
            insight: socialData.trend > 0 ? 'Increased social engagement' : 'Consider reaching out to friends'
        });
    }

    getLatestPhenotypingData(dataType) {
        const data = this.phenotypingData[dataType];
        return data.length > 0 ? data[data.length - 1] : null;
    }

    calculatePhenotypingTrend(dataType, metric) {
        const data = this.phenotypingData[dataType];
        if (data.length < 2) return 0;
        
        const recent = data.slice(-7); // Last 7 data points
        const older = data.slice(-14, -7); // Previous 7 data points
        
        if (older.length === 0) return 0;
        
        const recentAvg = recent.reduce((sum, item) => sum + item[metric], 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + item[metric], 0) / older.length;
        
        return (recentAvg - olderAvg) / olderAvg;
    }

    updatePhenotypingCard(type, data) {
        const cards = {
            phoneUsage: document.querySelector('.phenotype-card:nth-child(1)'),
            activityLevel: document.querySelector('.phenotype-card:nth-child(2)'),
            sleepPattern: document.querySelector('.phenotype-card:nth-child(3)'),
            socialInteraction: document.querySelector('.phenotype-card:nth-child(4)')
        };
        
        const card = cards[type];
        if (!card) return;
        
        const valueElement = card.querySelector('.phenotype-value');
        const detailElement = card.querySelector('.phenotype-detail');
        const insightElement = card.querySelector('.phenotype-insight');
        
        if (valueElement) {
            const trendClass = data.trend > 0.05 ? 'up' : data.trend < -0.05 ? 'down' : 'neutral';
            const trendSymbol = data.trend > 0.05 ? '↑' : data.trend < -0.05 ? '↓' : '→';
            const trendPercent = Math.abs(data.trend * 100).toFixed(0);
            
            valueElement.innerHTML = `${data.value} <span class="trend ${trendClass}">${trendSymbol}${trendPercent}%</span>`;
        }
        
        if (detailElement) {
            detailElement.textContent = data.detail;
        }
        
        if (insightElement) {
            insightElement.textContent = data.insight;
        }
    }

    savePhenotypingData() {
        localStorage.setItem('phenotypingData', JSON.stringify(this.phenotypingData));
    }

    savePrivacySettings() {
        localStorage.setItem('privacySettings', JSON.stringify(this.privacySettings));
    }

    showDataDeletion() {
        const modal = document.getElementById('dataDeletionModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    deleteAllData() {
        // Clear all stored data
        localStorage.removeItem('phenotypingData');
        localStorage.removeItem('moodHistory');
        localStorage.removeItem('engagementEvents');
        localStorage.removeItem('moodNotifications');
        
        // Reset data structures
        this.phenotypingData = {
            phoneUsage: [],
            activityLevel: [],
            sleepPattern: [],
            socialInteraction: []
        };
        this.moodHistory = [];
        this.engagementEvents = [];
        this.notifications = [];
        
        // Update displays
        this.updatePhenotypingDisplay();
        this.loadPatterns();
        this.loadEvents();
        this.updateNotificationBadge();
        
        // Close modal and show confirmation
        this.closeModal('dataDeletionModal');
        this.showToast('All data has been permanently deleted', 'success');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize mood radar when page loads
let moodRadar;
document.addEventListener('DOMContentLoaded', () => {
    moodRadar = new MoodRadar();
    
    // Setup context tag selection
    document.querySelectorAll('.context-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
        });
    });
    
    // Setup mood sliders
    document.querySelectorAll('.mood-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            const labels = e.target.parentElement.querySelector('.slider-labels');
            if (labels) {
                // Update visual feedback if needed
            }
        });
    });
});