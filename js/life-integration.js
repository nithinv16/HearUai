// Life Integration JavaScript
class LifeIntegration {
    constructor() {
        this.azureClient = null;
        this.initializeAzureClient();
        
        this.integrations = {
            calendar: false,
            health: false,
            spotify: false
        };
        this.userData = {
            steps: 8432,
            heartRate: 72,
            sleepHours: 7.5,
            moodScore: 7.2
        };
        this.nudges = [];
        this.playlists = {
            calm: {
                name: 'Calm & Focus',
                tracks: 24,
                duration: '1h 32m',
                playing: false
            },
            energize: {
                name: 'Energy Boost',
                tracks: 18,
                duration: '1h 8m',
                playing: false
            },
            relax: {
                name: 'Deep Relaxation',
                tracks: 20,
                duration: '1h 45m',
                playing: false
            }
        };
        this.init();
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Life Integration');
            } else {
                console.warn('Azure AI configuration not available for Life Integration');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client for Life Integration:', error);
        }
    }

    async init() {
        this.updateCurrentDate();
        this.loadIntegrationStatus();
        await this.generateSmartNudges();
        await this.updateHealthInsights();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    }

    loadIntegrationStatus() {
        // Load from localStorage or API
        const savedIntegrations = localStorage.getItem('lifeIntegrations');
        if (savedIntegrations) {
            this.integrations = JSON.parse(savedIntegrations);
        }
        this.updateIntegrationUI();
    }

    updateIntegrationUI() {
        // Update calendar status
        const calendarStatus = document.getElementById('calendar-status');
        const calendarBtn = document.querySelector('.calendar-status .connect-btn');
        if (this.integrations.calendar) {
            calendarStatus.textContent = 'Connected';
            calendarBtn.textContent = 'Disconnect';
            calendarBtn.classList.add('connected');
        }

        // Update health status
        const healthStatus = document.getElementById('health-status');
        const healthBtn = document.querySelector('.health-status .connect-btn');
        if (this.integrations.health) {
            healthStatus.textContent = 'Connected';
            healthBtn.textContent = 'Disconnect';
            healthBtn.classList.add('connected');
        }

        // Update Spotify status
        const spotifyStatus = document.getElementById('spotify-status');
        const spotifyBtn = document.querySelector('.spotify-status .connect-btn');
        if (this.integrations.spotify) {
            spotifyStatus.textContent = 'Connected';
            spotifyBtn.textContent = 'Disconnect';
            spotifyBtn.classList.add('connected');
        }
    }

    async generateSmartNudges() {
        const currentHour = new Date().getHours();
        this.nudges = [];
        
        // Generate AI-powered nudges if available
        if (this.azureClient) {
            await this.generateAINudges();
        } else {
            this.generateStaticNudges();
        }
        
        this.renderNudges();
    }
    
    generateStaticNudges() {
        const currentHour = new Date().getHours();

        // Time-based nudges
        if (currentHour >= 9 && currentHour <= 11) {
            this.nudges.push({
                id: 'morning-energy',
                icon: 'fas fa-sun',
                title: 'Morning Energy Boost',
                message: 'Your heart rate suggests you\'re ready for some energizing music. How about starting with an upbeat playlist?',
                actions: [{ text: 'Play Music', action: 'playPlaylist("energize")' }, { text: 'Dismiss', action: 'dismissNudge("morning-energy")' }]
            });
        }

        if (currentHour >= 14 && currentHour <= 16) {
            this.nudges.push({
                id: 'afternoon-break',
                icon: 'fas fa-coffee',
                title: 'Mindful Break Time',
                message: 'You\'ve been active today! Time for a 5-minute breathing exercise to recharge your energy.',
                actions: [{ text: 'Start Break', action: 'startWorkBreak()' }, { text: 'Later', action: 'postponeNudge("afternoon-break")' }]
            });
        }

        if (currentHour >= 19 && currentHour <= 21) {
            this.nudges.push({
                id: 'evening-wind-down',
                icon: 'fas fa-moon',
                title: 'Evening Wind Down',
                message: 'Based on your sleep pattern, it\'s time to start winding down. Try some relaxing music or meditation.',
                actions: [{ text: 'Relax', action: 'playPlaylist("relax")' }, { text: 'Skip', action: 'dismissNudge("evening-wind-down")' }]
            });
        }

        // Health-based nudges
        if (this.userData.steps < 5000) {
            this.nudges.push({
                id: 'step-goal',
                icon: 'fas fa-walking',
                title: 'Step Goal Reminder',
                message: 'You\'re at ' + this.userData.steps + ' steps today. A short walk could boost your mood and energy!',
                actions: [{ text: 'Track Walk', action: 'startWalkTracking()' }, { text: 'Dismiss', action: 'dismissNudge("step-goal")' }]
            });
        }

        if (this.userData.heartRate > 80) {
            this.nudges.push({
                id: 'stress-relief',
                icon: 'fas fa-heart',
                title: 'Stress Relief',
                message: 'Your heart rate is elevated. Take a moment for deep breathing or listen to calming music.',
                actions: [{ text: 'Breathe', action: 'startBreathingExercise()' }, { text: 'Music', action: 'playPlaylist("calm")' }]
            });
        }

    }
    
    async generateAINudges() {
        try {
            const userContext = this.formatUserDataForAI();
            const currentTime = new Date();
            const timeContext = `Current time: ${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')}, Day: ${currentTime.toLocaleDateString('en-US', { weekday: 'long' })}`;
            
            const prompt = `Based on this user's current wellness data and time context, generate 2-3 personalized wellness nudges that would be most beneficial right now:

${userContext}
${timeContext}

Integration status:
- Calendar: ${this.integrations.calendar ? 'Connected' : 'Not connected'}
- Health tracking: ${this.integrations.health ? 'Connected' : 'Not connected'}
- Music (Spotify): ${this.integrations.spotify ? 'Connected' : 'Not connected'}

Provide nudges in JSON format:
{
  "nudges": [
    {
      "id": "unique-id",
      "icon": "fas fa-icon-name",
      "title": "Nudge Title",
      "message": "Personalized message based on user data",
      "priority": "high|medium|low",
      "category": "wellness|activity|mindfulness|music"
    }
  ]
}`;
            
            const response = await this.azureClient.generateResponse(prompt);
            const aiNudges = this.parseAINudges(response);
            
            if (aiNudges && aiNudges.nudges) {
                // Convert AI nudges to our format and add actions
                aiNudges.nudges.forEach(nudge => {
                    const enhancedNudge = {
                        ...nudge,
                        actions: this.generateActionsForNudge(nudge)
                    };
                    this.nudges.push(enhancedNudge);
                });
            } else {
                // Fallback to static nudges if AI fails
                this.generateStaticNudges();
            }
        } catch (error) {
            console.error('Error generating AI nudges:', error);
            this.generateStaticNudges();
        }
    }
    
    formatUserDataForAI() {
        return `User Wellness Data:
- Steps today: ${this.userData.steps}
- Current heart rate: ${this.userData.heartRate} bpm
- Sleep last night: ${this.userData.sleepHours} hours
- Current mood score: ${this.userData.moodScore}/10
- Active integrations: ${Object.entries(this.integrations).filter(([key, value]) => value).map(([key]) => key).join(', ') || 'None'}`;
    }
    
    parseAINudges(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing AI nudges:', error);
        }
        return null;
    }
    
    generateActionsForNudge(nudge) {
        const actions = [];
        
        switch (nudge.category) {
            case 'activity':
                actions.push({ text: 'Start Activity', action: 'startWalkTracking()' });
                break;
            case 'mindfulness':
                actions.push({ text: 'Start Practice', action: 'startBreathingExercise()' });
                break;
            case 'music':
                actions.push({ text: 'Play Music', action: 'playPlaylist("calm")' });
                break;
            case 'wellness':
            default:
                actions.push({ text: 'Learn More', action: `showWellnessTip("${nudge.id}")` });
                break;
        }
        
        actions.push({ text: 'Dismiss', action: `dismissNudge("${nudge.id}")` });
        return actions;
    }

    renderNudges() {
        const container = document.getElementById('nudges-container');
        if (this.nudges.length === 0) {
            container.innerHTML = `
                <div class="no-nudges">
                    <i class="fas fa-check-circle"></i>
                    <p>All caught up! No new wellness nudges at the moment.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.nudges.map(nudge => `
            <div class="nudge-card" data-nudge-id="${nudge.id}">
                <div class="nudge-header">
                    <div class="nudge-icon">
                        <i class="${nudge.icon}"></i>
                    </div>
                    <div class="nudge-title">${nudge.title}</div>
                </div>
                <div class="nudge-message">${nudge.message}</div>
                <div class="nudge-actions">
                    ${nudge.actions.map(action => `
                        <button class="nudge-btn ${action.text === 'Dismiss' || action.text === 'Later' || action.text === 'Skip' ? 'dismiss' : ''}" 
                                onclick="${action.action}">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    async updateHealthInsights() {
        // Simulate real-time health data updates
        document.getElementById('steps-count').textContent = this.userData.steps.toLocaleString();
        document.getElementById('heart-rate').textContent = this.userData.heartRate;
        document.getElementById('sleep-hours').textContent = this.userData.sleepHours + 'h';
        document.getElementById('mood-score').textContent = this.userData.moodScore;

        // Update progress bars and trends
        const stepsProgress = Math.min((this.userData.steps / 10000) * 100, 100);
        document.querySelector('.insight-card.steps .progress-fill').style.width = stepsProgress + '%';
        
        // Generate AI-powered wellness insights
        if (this.azureClient) {
            await this.generateWellnessInsights();
        }
    }
    
    async generateWellnessInsights() {
        try {
            const userContext = this.formatUserDataForAI();
            const currentTime = new Date();
            const timeContext = `Current time: ${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')}, Day: ${currentTime.toLocaleDateString('en-US', { weekday: 'long' })}`;
            
            const prompt = `Based on this user's wellness data, provide personalized health insights and recommendations:

${userContext}
${timeContext}

Analyze the data and provide:
1. Key insights about their current wellness state
2. Specific recommendations for improvement
3. Positive reinforcement for good habits
4. Areas that need attention

Provide insights in JSON format:
{
  "insights": [
    {
      "category": "steps|heart_rate|sleep|mood|overall",
      "status": "excellent|good|needs_attention|concerning",
      "message": "Personalized insight message",
      "recommendation": "Specific actionable recommendation",
      "priority": "high|medium|low"
    }
  ],
  "overall_score": "number between 1-10",
  "motivational_message": "Encouraging message based on overall wellness"
}`;
            
            const response = await this.azureClient.generateResponse(prompt);
            const aiInsights = this.parseAIInsights(response);
            
            if (aiInsights) {
                this.displayWellnessInsights(aiInsights);
            }
        } catch (error) {
            console.error('Error generating wellness insights:', error);
        }
    }
    
    parseAIInsights(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing AI insights:', error);
        }
        return null;
    }
    
    displayWellnessInsights(insights) {
        // Display overall wellness score if available
        if (insights.overall_score) {
            const scoreElement = document.querySelector('.wellness-score');
            if (scoreElement) {
                scoreElement.textContent = `${insights.overall_score}/10`;
            }
        }
        
        // Display motivational message
        if (insights.motivational_message) {
            const messageElement = document.querySelector('.motivational-message');
            if (messageElement) {
                messageElement.textContent = insights.motivational_message;
            }
        }
        
        // Display individual insights
        if (insights.insights && insights.insights.length > 0) {
            const insightsContainer = document.querySelector('.ai-insights-container');
            if (insightsContainer) {
                insightsContainer.innerHTML = '';
                
                insights.insights.forEach(insight => {
                    const insightElement = document.createElement('div');
                    insightElement.className = `ai-insight ${insight.status} ${insight.priority}-priority`;
                    insightElement.innerHTML = `
                        <div class="insight-category">${insight.category.replace('_', ' ').toUpperCase()}</div>
                        <div class="insight-message">${insight.message}</div>
                        <div class="insight-recommendation">${insight.recommendation}</div>
                    `;
                    insightsContainer.appendChild(insightElement);
                });
            }
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterInsights(e.target.dataset.filter);
            });
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    filterInsights(period) {
        // Simulate different time period data
        const data = {
            today: {
                steps: 8432,
                heartRate: 72,
                sleepHours: 7.5,
                moodScore: 7.2
            },
            week: {
                steps: 9156,
                heartRate: 74,
                sleepHours: 7.8,
                moodScore: 7.5
            },
            month: {
                steps: 8890,
                heartRate: 73,
                sleepHours: 7.6,
                moodScore: 7.3
            }
        };

        this.userData = data[period];
        this.updateHealthInsights();
    }

    startPeriodicUpdates() {
        // Update nudges every 30 minutes
        setInterval(() => {
            this.generateSmartNudges();
        }, 30 * 60 * 1000);

        // Update health data every 5 minutes
        setInterval(() => {
            this.simulateHealthDataUpdate();
        }, 5 * 60 * 1000);
    }

    simulateHealthDataUpdate() {
        // Simulate small changes in health data
        this.userData.steps += Math.floor(Math.random() * 100);
        this.userData.heartRate += Math.floor(Math.random() * 6) - 3; // ±3 bpm
        this.userData.heartRate = Math.max(60, Math.min(100, this.userData.heartRate));
        this.updateHealthInsights();
    }

    // Integration Methods
    connectCalendar() {
        this.openModal('calendar-modal');
    }

    connectHealth() {
        this.openModal('health-modal');
    }

    connectSpotify() {
        this.openModal('spotify-modal');
    }

    connectGoogleCalendar() {
        this.simulateConnection('calendar', 'Google Calendar');
    }

    connectOutlook() {
        this.simulateConnection('calendar', 'Outlook Calendar');
    }

    connectAppleCalendar() {
        this.simulateConnection('calendar', 'Apple Calendar');
    }

    connectAppleHealth() {
        this.simulateConnection('health', 'Apple Health');
    }

    connectGoogleFit() {
        this.simulateConnection('health', 'Google Fit');
    }

    connectFitbit() {
        this.simulateConnection('health', 'Fitbit');
    }

    connectGarmin() {
        this.simulateConnection('health', 'Garmin Connect');
    }

    authenticateSpotify() {
        this.simulateConnection('spotify', 'Spotify');
    }

    simulateConnection(type, service) {
        // Simulate API connection
        this.showNotification(`Connecting to ${service}...`, 'info');
        
        setTimeout(() => {
            this.integrations[type] = true;
            this.saveIntegrations();
            this.updateIntegrationUI();
            this.closeModal(`${type}-modal`);
            this.showNotification(`Successfully connected to ${service}!`, 'success');
            
            // Generate new nudges based on new integration
            setTimeout(() => {
                this.generateSmartNudges();
            }, 1000);
        }, 2000);
    }

    saveIntegrations() {
        localStorage.setItem('lifeIntegrations', JSON.stringify(this.integrations));
    }

    // Routine Methods
    startMorningRoutine() {
        this.showNotification('Starting morning wellness routine...', 'info');
        // Simulate routine start
        setTimeout(() => {
            this.showNotification('Morning routine completed! +10 XP earned.', 'success');
            this.markTimelineCompleted('morning-routine');
        }, 3000);
    }

    startWorkBreak() {
        this.showNotification('Starting mindful work break...', 'info');
        setTimeout(() => {
            this.showNotification('Work break completed! Feeling refreshed.', 'success');
            this.markTimelineCompleted('work-break');
        }, 2000);
    }

    startEveningReflection() {
        this.showNotification('Starting evening reflection...', 'info');
        setTimeout(() => {
            this.showNotification('Evening reflection completed! Sweet dreams.', 'success');
            this.markTimelineCompleted('evening-reflection');
        }, 4000);
    }

    postponeRoutine(type) {
        this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} routine postponed for 1 hour.`, 'info');
    }

    markTimelineCompleted(timelineId) {
        const timelineItem = document.getElementById(timelineId);
        if (timelineItem) {
            timelineItem.style.opacity = '0.6';
            timelineItem.querySelector('.timeline-actions').innerHTML = `
                <span style="color: #4caf50; font-weight: 600;">
                    <i class="fas fa-check"></i> Completed
                </span>
            `;
        }
    }

    // Music Methods
    playPlaylist(mood) {
        const playlist = this.playlists[mood];
        if (!playlist) return;

        // Stop other playlists
        Object.keys(this.playlists).forEach(key => {
            this.playlists[key].playing = false;
        });

        playlist.playing = true;
        this.showNotification(`Now playing: ${playlist.name}`, 'success');
        
        // Update play button
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        const playBtn = document.querySelector(`[data-mood="${mood}"] .play-btn`);
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        // Simulate playlist end after some time
        setTimeout(() => {
            playlist.playing = false;
            if (playBtn) {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }, 10000); // 10 seconds for demo
    }

    shufflePlaylists() {
        this.showNotification('Shuffling playlists based on your current mood...', 'info');
        // Simulate playlist shuffle
        setTimeout(() => {
            this.showNotification('Playlists updated with fresh recommendations!', 'success');
        }, 1500);
    }

    // Nudge Actions
    dismissNudge(nudgeId) {
        this.nudges = this.nudges.filter(nudge => nudge.id !== nudgeId);
        this.renderNudges();
        this.showNotification('Nudge dismissed', 'info');
    }

    postponeNudge(nudgeId) {
        this.dismissNudge(nudgeId);
        this.showNotification('Nudge postponed for 30 minutes', 'info');
        
        // Re-add nudge after 30 minutes (for demo, we'll use 30 seconds)
        setTimeout(() => {
            this.generateSmartNudges();
        }, 30000);
    }

    startWalkTracking() {
        this.showNotification('Walk tracking started! Go get those steps!', 'success');
        this.dismissNudge('step-goal');
    }

    startBreathingExercise() {
        this.showNotification('Starting 5-minute breathing exercise...', 'info');
        this.dismissNudge('stress-relief');
        
        setTimeout(() => {
            this.showNotification('Breathing exercise completed! Heart rate normalized.', 'success');
            this.userData.heartRate = Math.max(65, this.userData.heartRate - 5);
            this.updateHealthInsights();
        }, 5000);
    }

    refreshNudges() {
        this.showNotification('Refreshing wellness nudges...', 'info');
        setTimeout(() => {
            this.generateSmartNudges();
            this.showNotification('Nudges updated!', 'success');
        }, 1000);
    }

    // Modal Methods
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // Settings Methods
    openSettingsModal() {
        this.openModal('settings-modal');
    }

    saveSettings() {
        const settings = {
            calendarNudges: document.getElementById('calendar-nudges').checked,
            healthAlerts: document.getElementById('health-alerts').checked,
            musicSuggestions: document.getElementById('music-suggestions').checked,
            dataSharing: document.getElementById('data-sharing').checked,
            localProcessing: document.getElementById('local-processing').checked
        };
        
        localStorage.setItem('lifeIntegrationSettings', JSON.stringify(settings));
        this.showNotification('Settings saved successfully!', 'success');
        this.closeModal('settings-modal');
    }

    resetSettings() {
        // Reset to default values
        document.getElementById('calendar-nudges').checked = true;
        document.getElementById('health-alerts').checked = true;
        document.getElementById('music-suggestions').checked = false;
        document.getElementById('data-sharing').checked = false;
        document.getElementById('local-processing').checked = true;
        
        this.showNotification('Settings reset to default values', 'info');
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
function connectCalendar() {
    lifeIntegration.connectCalendar();
}

function connectHealth() {
    lifeIntegration.connectHealth();
}

function connectSpotify() {
    lifeIntegration.connectSpotify();
}

function connectGoogleCalendar() {
    lifeIntegration.connectGoogleCalendar();
}

function connectOutlook() {
    lifeIntegration.connectOutlook();
}

function connectAppleCalendar() {
    lifeIntegration.connectAppleCalendar();
}

function connectAppleHealth() {
    lifeIntegration.connectAppleHealth();
}

function connectGoogleFit() {
    lifeIntegration.connectGoogleFit();
}

function connectFitbit() {
    lifeIntegration.connectFitbit();
}

function connectGarmin() {
    lifeIntegration.connectGarmin();
}

function authenticateSpotify() {
    lifeIntegration.authenticateSpotify();
}

function startMorningRoutine() {
    lifeIntegration.startMorningRoutine();
}

function startWorkBreak() {
    lifeIntegration.startWorkBreak();
}

function startEveningReflection() {
    lifeIntegration.startEveningReflection();
}

function postponeRoutine(type) {
    lifeIntegration.postponeRoutine(type);
}

function playPlaylist(mood) {
    lifeIntegration.playPlaylist(mood);
}

function shufflePlaylists() {
    lifeIntegration.shufflePlaylists();
}

function refreshNudges() {
    lifeIntegration.refreshNudges();
}

function dismissNudge(nudgeId) {
    lifeIntegration.dismissNudge(nudgeId);
}

function postponeNudge(nudgeId) {
    lifeIntegration.postponeNudge(nudgeId);
}

function startWalkTracking() {
    lifeIntegration.startWalkTracking();
}

function startBreathingExercise() {
    lifeIntegration.startBreathingExercise();
}

function openSettingsModal() {
    lifeIntegration.openSettingsModal();
}

function closeModal(modalId) {
    lifeIntegration.closeModal(modalId);
}

function saveSettings() {
    lifeIntegration.saveSettings();
}

function resetSettings() {
    lifeIntegration.resetSettings();
}

// Add notification animations to head
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .no-nudges {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .no-nudges i {
        font-size: 3rem;
        color: #4caf50;
        margin-bottom: 15px;
    }
`;
document.head.appendChild(style);

// Initialize the Life Integration system when DOM is loaded
let lifeIntegration;
document.addEventListener('DOMContentLoaded', () => {
    lifeIntegration = new LifeIntegration();
});