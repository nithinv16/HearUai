// MRT Engagement Engine JavaScript

class MRTEngine {
    constructor() {
        this.azureClient = null;
        this.trialData = {
            isActive: true,
            startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            interventionsDelivered: 127,
            engagementRate: 0.73,
            responseRate: 0.68
        };
        
        this.randomizationSettings = {
            rate: 0.5,
            minGap: 4, // hours
            maxDaily: 5,
            adaptiveTiming: true,
            contentPersonalization: true,
            learningRate: 'moderate'
        };
        
        this.interventionQueue = [
            {
                id: 1,
                type: 'mood-checkin',
                message: 'How are you feeling right now? 🌟',
                tone: 'encouraging',
                method: 'push',
                scheduledTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
                probability: 0.85
            },
            {
                id: 2,
                type: 'breathing-reminder',
                message: 'Time for a quick breathing exercise? 🧘‍♀️',
                tone: 'gentle',
                method: 'in-app',
                scheduledTime: new Date(Date.now() + 6.5 * 60 * 60 * 1000), // 6.5 hours from now
                probability: 0.92
            },
            {
                id: 3,
                type: 'affirmation',
                message: 'You\'ve got this! Start your day with intention ✨',
                tone: 'motivational',
                method: 'push',
                scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Tomorrow 9 AM
                probability: 0.78
            }
        ];
        
        this.abTests = [
            {
                id: 1,
                name: 'Notification Timing',
                variable: 'timing',
                status: 'running',
                variants: {
                    A: { name: 'Fixed Schedule', engagement: 0.45 },
                    B: { name: 'Adaptive Timing', engagement: 0.73 }
                },
                sampleSize: 156,
                confidence: 0.95,
                daysRemaining: 12
            },
            {
                id: 2,
                name: 'Message Tone',
                variable: 'tone',
                status: 'completed',
                variants: {
                    A: { name: 'Formal Tone', engagement: 0.62 },
                    B: { name: 'Friendly Tone', engagement: 0.81, winner: true }
                },
                sampleSize: 203,
                significance: 0.01,
                winner: 'B'
            }
        ];
        
        this.analyticsData = {
            timeEngagement: [
                { time: '6 AM', rate: 0.32 },
                { time: '9 AM', rate: 0.58 },
                { time: '12 PM', rate: 0.71 },
                { time: '3 PM', rate: 0.89 },
                { time: '6 PM', rate: 0.76 },
                { time: '9 PM', rate: 0.54 }
            ],
            contentPerformance: [
                { type: 'Mood Check-ins', rate: 0.84 },
                { type: 'Breathing Reminders', rate: 0.92 },
                { type: 'Affirmations', rate: 0.67 },
                { type: 'Journal Prompts', rate: 0.73 },
                { type: 'Activity Suggestions', rate: 0.58 }
            ]
        };
        
        this.initializeAzureClient();
        this.init();
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for MRT Engine');
            }
        } catch (error) {
            console.warn('Failed to initialize Azure AI client for MRT Engine:', error);
        }
    }
    
    init() {
        this.updateTrialStatus();
        this.renderRandomizationEngine();
        this.renderInterventionQueue();
        this.renderAnalytics();
        this.renderABTests();
        this.setupEventListeners();
        this.startRandomizationEngine();
    }
    
    setupEventListeners() {
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openModal('settingsModal');
        });
        
        // Add intervention button
        document.getElementById('addInterventionBtn').addEventListener('click', () => {
            this.openModal('addInterventionModal');
        });
        
        // Create test button
        document.getElementById('createTestBtn').addEventListener('click', () => {
            this.openModal('createTestModal');
        });
        
        // Settings form
        document.getElementById('randomizationRate').addEventListener('input', (e) => {
            document.getElementById('randomizationValue').textContent = `${Math.round(e.target.value * 100)}%`;
        });
        
        // Scheduling mode change
        document.getElementById('schedulingMode').addEventListener('change', (e) => {
            const specificTimeGroup = document.getElementById('specificTimeGroup');
            if (e.target.value === 'specific') {
                specificTimeGroup.style.display = 'block';
            } else {
                specificTimeGroup.style.display = 'none';
            }
        });
    }
    
    updateTrialStatus() {
        const trialDay = Math.floor((Date.now() - this.trialData.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        
        document.getElementById('trialDay').textContent = trialDay;
        document.getElementById('interventionsDelivered').textContent = this.trialData.interventionsDelivered;
        document.getElementById('engagementRate').textContent = `${Math.round(this.trialData.engagementRate * 100)}%`;
        document.getElementById('responseRate').textContent = `${Math.round(this.trialData.responseRate * 100)}%`;
        
        // Update trial indicator
        const indicator = document.getElementById('trialIndicator');
        if (this.trialData.isActive) {
            indicator.innerHTML = '<i class="fas fa-circle"></i><span>Active</span>';
            indicator.className = 'trial-indicator';
        } else {
            indicator.innerHTML = '<i class="fas fa-pause"></i><span>Paused</span>';
            indicator.className = 'trial-indicator paused';
        }
    }
    
    renderRandomizationEngine() {
        // This would typically update the randomization status based on real data
        // For now, we'll simulate the learning process
        this.simulateOptimizationLearning();
    }
    
    simulateOptimizationLearning() {
        // Simulate the learning process for timing optimization
        setInterval(() => {
            // Randomly update success rates to simulate learning
            const timingSuccess = document.querySelector('.randomization-item:nth-child(1) .detail-row:nth-child(2) .value');
            const currentRate = parseInt(timingSuccess.textContent);
            const newRate = Math.max(70, Math.min(95, currentRate + (Math.random() - 0.5) * 4));
            timingSuccess.textContent = `${Math.round(newRate)}%`;
        }, 30000); // Update every 30 seconds
    }
    
    renderInterventionQueue() {
        const queueList = document.getElementById('queueList');
        queueList.innerHTML = '';
        
        this.interventionQueue.forEach(intervention => {
            const queueItem = this.createQueueItem(intervention);
            queueList.appendChild(queueItem);
        });
    }
    
    createQueueItem(intervention) {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
            <div class="intervention-time">
                <i class="fas fa-clock"></i>
                <span>${this.formatScheduledTime(intervention.scheduledTime)}</span>
            </div>
            <div class="intervention-content">
                <h4>${this.getInterventionTitle(intervention.type)}</h4>
                <p>"${intervention.message}"</p>
                <div class="intervention-meta">
                    <span class="tone-tag ${intervention.tone}">${this.capitalizeFirst(intervention.tone)}</span>
                    <span class="method-tag ${intervention.method}">${this.capitalizeFirst(intervention.method)}</span>
                    <span class="probability">${Math.round(intervention.probability * 100)}% delivery</span>
                </div>
            </div>
            <div class="intervention-actions">
                <button class="btn-edit" onclick="editIntervention(${intervention.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-cancel" onclick="cancelIntervention(${intervention.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        return item;
    }
    
    formatScheduledTime(date) {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        if (isToday) {
            return `Today, ${timeStr}`;
        } else if (isTomorrow) {
            return `Tomorrow, ${timeStr}`;
        } else {
            return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
        }
    }
    
    getInterventionTitle(type) {
        const titles = {
            'mood-checkin': 'Mood Check-in',
            'breathing-reminder': 'Breathing Reminder',
            'affirmation': 'Daily Affirmation',
            'journal-prompt': 'Journal Prompt',
            'activity-suggestion': 'Activity Suggestion'
        };
        return titles[type] || 'Custom Intervention';
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    renderAnalytics() {
        this.renderTimeChart();
        this.renderContentChart();
    }
    
    renderTimeChart() {
        const canvas = document.getElementById('timeChart');
        const ctx = canvas.getContext('2d');
        
        // Simple bar chart for time engagement
        const data = this.analyticsData.timeEngagement;
        const maxRate = Math.max(...data.map(d => d.rate));
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = canvas.width / data.length;
        const maxBarHeight = canvas.height - 40;
        
        data.forEach((item, index) => {
            const barHeight = (item.rate / maxRate) * maxBarHeight;
            const x = index * barWidth;
            const y = canvas.height - barHeight - 20;
            
            // Draw bar
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.time, x + barWidth / 2, canvas.height - 5);
            
            // Draw value
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(`${Math.round(item.rate * 100)}%`, x + barWidth / 2, y - 5);
        });
    }
    
    renderContentChart() {
        const canvas = document.getElementById('contentChart');
        const ctx = canvas.getContext('2d');
        
        // Simple horizontal bar chart for content performance
        const data = this.analyticsData.contentPerformance;
        const maxRate = Math.max(...data.map(d => d.rate));
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barHeight = (canvas.height - 40) / data.length;
        const maxBarWidth = canvas.width - 120;
        
        data.forEach((item, index) => {
            const barWidth = (item.rate / maxRate) * maxBarWidth;
            const x = 100;
            const y = index * barHeight + 10;
            
            // Draw bar
            const gradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight - 10);
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(item.type, x - 10, y + (barHeight - 10) / 2 + 4);
            
            // Draw value
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(item.rate * 100)}%`, x + barWidth + 5, y + (barHeight - 10) / 2 + 4);
        });
    }
    
    renderABTests() {
        // A/B tests are already rendered in HTML, but we could update them dynamically here
        this.updateTestProgress();
    }
    
    updateTestProgress() {
        // Simulate test progress updates
        setInterval(() => {
            this.abTests.forEach(test => {
                if (test.status === 'running') {
                    // Slightly adjust engagement rates
                    Object.keys(test.variants).forEach(variant => {
                        const currentRate = test.variants[variant].engagement;
                        const newRate = Math.max(0.3, Math.min(0.95, currentRate + (Math.random() - 0.5) * 0.02));
                        test.variants[variant].engagement = newRate;
                    });
                    
                    // Update days remaining
                    if (test.daysRemaining > 0) {
                        test.daysRemaining -= 0.1; // Simulate time passing
                    }
                }
            });
        }, 60000); // Update every minute
    }
    
    startRandomizationEngine() {
        // Start the AI-powered randomization engine
        setInterval(async () => {
            try {
                await this.makeRandomizationDecision();
            } catch (error) {
                console.error('Error in randomization decision:', error);
            }
        }, 300000); // Every 5 minutes
    }
    
    async makeRandomizationDecision() {
        // Use AI-powered randomization decisions for timing, content, etc.
        if (Math.random() < this.randomizationSettings.rate) {
            console.log('MRT Engine: Making AI-powered randomization decision...');
            
            try {
                if (this.azureClient) {
                    await this.generateAIOptimizations();
                } else {
                    this.generateStaticOptimizations();
                }
            } catch (error) {
                console.warn('AI optimization failed, using static approach:', error);
                this.generateStaticOptimizations();
            }
            
            // Update display
            this.updateTrialStatus();
            this.renderInterventionQueue();
        }
    }

    async generateAIOptimizations() {
        const context = this.getOptimizationContext();
        
        const prompt = `As an MRT (Micro-Randomized Trial) optimization expert, analyze the current intervention data and provide optimization recommendations.

Current Context:
${JSON.stringify(context, null, 2)}

Please provide optimization recommendations in the following JSON format:
{
  "interventionAdjustments": [
    {
      "id": "intervention_id",
      "probabilityAdjustment": 0.05,
      "reasoning": "explanation for adjustment"
    }
  ],
  "engagementPrediction": {
    "expectedChange": 0.02,
    "confidence": 0.85
  },
  "timingOptimizations": {
    "optimalHours": [9, 14, 19],
    "avoidHours": [6, 22]
  },
  "contentRecommendations": [
    {
      "type": "mood-check",
      "priority": "high",
      "reasoning": "explanation"
    }
  ]
}`;

        const response = await this.azureClient.generateResponse(prompt);
        const optimizations = this.parseAIOptimizations(response);
        this.applyOptimizations(optimizations);
    }

    getOptimizationContext() {
        return {
            currentTime: new Date().toISOString(),
            engagementRate: this.trialData.engagementRate,
            responseRate: this.trialData.responseRate,
            activeInterventions: this.interventionQueue.length,
            recentPerformance: this.analyticsData.contentPerformance,
            timeEngagement: this.analyticsData.timeEngagement,
            settings: this.randomizationSettings
        };
    }

    parseAIOptimizations(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse AI optimization response:', error);
        }
        return null;
    }

    applyOptimizations(optimizations) {
        if (!optimizations) return;

        // Apply intervention adjustments
        if (optimizations.interventionAdjustments) {
            optimizations.interventionAdjustments.forEach(adj => {
                const intervention = this.interventionQueue.find(i => i.id === adj.id);
                if (intervention) {
                    intervention.probability = Math.max(0.1, Math.min(0.99, 
                        intervention.probability + adj.probabilityAdjustment));
                    console.log(`Adjusted intervention ${adj.id}: ${adj.reasoning}`);
                }
            });
        }

        // Apply engagement predictions
        if (optimizations.engagementPrediction) {
            const change = optimizations.engagementPrediction.expectedChange;
            this.trialData.engagementRate = Math.max(0.5, Math.min(0.95, 
                this.trialData.engagementRate + change));
            this.trialData.responseRate = Math.max(0.4, Math.min(0.9, 
                this.trialData.responseRate + change * 0.8));
        }
    }

    generateStaticOptimizations() {
        // Fallback to original static randomization
        this.interventionQueue.forEach(intervention => {
            const adjustment = (Math.random() - 0.5) * 0.1;
            intervention.probability = Math.max(0.1, Math.min(0.99, intervention.probability + adjustment));
        });
        
        this.trialData.engagementRate += (Math.random() - 0.5) * 0.02;
        this.trialData.engagementRate = Math.max(0.5, Math.min(0.95, this.trialData.engagementRate));
        
        this.trialData.responseRate += (Math.random() - 0.5) * 0.02;
        this.trialData.responseRate = Math.max(0.4, Math.min(0.9, this.trialData.responseRate));
    }
    
    // Modal functions
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        // Load current settings if it's the settings modal
        if (modalId === 'settingsModal') {
            this.loadSettingsToModal();
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }
    
    loadSettingsToModal() {
        document.getElementById('randomizationRate').value = this.randomizationSettings.rate;
        document.getElementById('randomizationValue').textContent = `${Math.round(this.randomizationSettings.rate * 100)}%`;
        document.getElementById('minInterventionGap').value = this.randomizationSettings.minGap;
        document.getElementById('maxDailyInterventions').value = this.randomizationSettings.maxDaily;
        document.getElementById('enableAdaptiveTiming').checked = this.randomizationSettings.adaptiveTiming;
        document.getElementById('enableContentPersonalization').checked = this.randomizationSettings.contentPersonalization;
        document.getElementById('learningRate').value = this.randomizationSettings.learningRate;
    }
    
    saveSettings() {
        this.randomizationSettings.rate = parseFloat(document.getElementById('randomizationRate').value);
        this.randomizationSettings.minGap = parseInt(document.getElementById('minInterventionGap').value);
        this.randomizationSettings.maxDaily = parseInt(document.getElementById('maxDailyInterventions').value);
        this.randomizationSettings.adaptiveTiming = document.getElementById('enableAdaptiveTiming').checked;
        this.randomizationSettings.contentPersonalization = document.getElementById('enableContentPersonalization').checked;
        this.randomizationSettings.learningRate = document.getElementById('learningRate').value;
        
        // Save to localStorage
        localStorage.setItem('mrtSettings', JSON.stringify(this.randomizationSettings));
        
        this.closeModal('settingsModal');
        this.showNotification('Settings saved successfully!', 'success');
    }
    
    async addIntervention() {
        const type = document.getElementById('interventionType').value;
        const message = document.getElementById('interventionMessage').value;
        const tone = document.getElementById('interventionTone').value;
        const method = document.getElementById('deliveryMethod').value;
        const schedulingMode = document.getElementById('schedulingMode').value;
        
        if (!message.trim()) {
            this.showNotification('Please enter a message for the intervention.', 'error');
            return;
        }
        
        let scheduledTime;
        if (schedulingMode === 'specific') {
            const specificTime = document.getElementById('specificTime').value;
            if (!specificTime) {
                this.showNotification('Please select a specific time.', 'error');
                return;
            }
            scheduledTime = new Date(specificTime);
        } else {
            // Generate optimal or random time
            scheduledTime = this.generateOptimalTime(schedulingMode);
        }
        
        // Use AI to optimize intervention if available
        let optimizedIntervention;
        try {
            if (this.azureClient && this.randomizationSettings.contentPersonalization) {
                optimizedIntervention = await this.optimizeInterventionWithAI({
                    type, message, tone, method, scheduledTime
                });
            } else {
                optimizedIntervention = {
                    type: type,
                    message: message,
                    tone: tone,
                    method: method === 'adaptive' ? this.selectOptimalMethod() : method,
                    scheduledTime: scheduledTime
                };
            }
        } catch (error) {
            console.warn('AI optimization failed, using original intervention:', error);
            optimizedIntervention = {
                type: type,
                message: message,
                tone: tone,
                method: method === 'adaptive' ? this.selectOptimalMethod() : method,
                scheduledTime: scheduledTime
            };
        }
        
        const newIntervention = {
            id: Date.now(),
            ...optimizedIntervention,
            probability: this.calculateDeliveryProbability(optimizedIntervention.tone, optimizedIntervention.method, optimizedIntervention.scheduledTime)
        };
        
        this.interventionQueue.push(newIntervention);
        this.interventionQueue.sort((a, b) => a.scheduledTime - b.scheduledTime);
        
        this.renderInterventionQueue();
        this.closeModal('addInterventionModal');
        this.showNotification('Intervention added successfully!', 'success');
        
        // Clear form
        document.getElementById('interventionMessage').value = '';
    }

    async optimizeInterventionWithAI(intervention) {
        const context = this.getOptimizationContext();
        
        const prompt = `As an MRT intervention optimization expert, analyze and optimize this intervention for maximum effectiveness.

Intervention to Optimize:
${JSON.stringify(intervention, null, 2)}

Current Context:
${JSON.stringify(context, null, 2)}

Please provide an optimized intervention in the following JSON format:
{
  "type": "optimized_type",
  "message": "optimized message with personalized content",
  "tone": "optimized_tone",
  "method": "optimized_delivery_method",
  "scheduledTime": "optimized_time_if_needed",
  "optimizations": {
    "messageChanges": "explanation of message improvements",
    "timingChanges": "explanation of timing optimizations",
    "deliveryChanges": "explanation of delivery method optimizations"
  }
}`;

        const response = await this.azureClient.generateResponse(prompt);
        const optimized = this.parseAIOptimizations(response);
        
        if (optimized && optimized.type) {
            console.log('AI Intervention Optimizations:', optimized.optimizations);
            return {
                type: optimized.type,
                message: optimized.message,
                tone: optimized.tone,
                method: optimized.method,
                scheduledTime: optimized.scheduledTime ? new Date(optimized.scheduledTime) : intervention.scheduledTime
            };
        }
        
        return intervention;
    }
    
    generateOptimalTime(mode) {
        const now = new Date();
        const optimalHours = [9, 15, 18]; // 9 AM, 3 PM, 6 PM
        
        if (mode === 'optimal') {
            // Choose the next optimal hour
            const currentHour = now.getHours();
            let nextOptimalHour = optimalHours.find(hour => hour > currentHour);
            
            if (!nextOptimalHour) {
                nextOptimalHour = optimalHours[0]; // Next day
                now.setDate(now.getDate() + 1);
            }
            
            now.setHours(nextOptimalHour, Math.floor(Math.random() * 60), 0, 0);
        } else {
            // Random within next 24 hours
            const randomHours = Math.random() * 24;
            now.setTime(now.getTime() + randomHours * 60 * 60 * 1000);
        }
        
        return now;
    }
    
    selectOptimalMethod() {
        // Based on current performance data, select the best method
        const methods = ['push', 'in-app', 'email'];
        const performance = { push: 0.72, 'in-app': 0.89, email: 0.45 };
        
        return Object.keys(performance).reduce((a, b) => performance[a] > performance[b] ? a : b);
    }
    
    calculateDeliveryProbability(tone, method, scheduledTime) {
        let baseProbability = 0.7;
        
        // Adjust based on method
        const methodMultipliers = { push: 0.9, 'in-app': 1.1, email: 0.6 };
        baseProbability *= methodMultipliers[method] || 1;
        
        // Adjust based on time
        const hour = scheduledTime.getHours();
        if (hour >= 14 && hour <= 16) { // 2-4 PM optimal window
            baseProbability *= 1.2;
        } else if (hour < 8 || hour > 22) { // Early morning or late night
            baseProbability *= 0.7;
        }
        
        // Adjust based on tone
        const toneMultipliers = { encouraging: 1.1, gentle: 1.05, motivational: 0.95, supportive: 1.0, playful: 0.9 };
        baseProbability *= toneMultipliers[tone] || 1;
        
        return Math.min(0.99, Math.max(0.1, baseProbability));
    }
    
    createTest() {
        const name = document.getElementById('testName').value;
        const variable = document.getElementById('testVariable').value;
        const variantA = document.getElementById('variantA').value;
        const variantB = document.getElementById('variantB').value;
        const duration = parseInt(document.getElementById('testDuration').value);
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        
        if (!name || !variantA || !variantB) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }
        
        const newTest = {
            id: Date.now(),
            name: name,
            variable: variable,
            status: 'running',
            variants: {
                A: { name: variantA, engagement: 0.5 + Math.random() * 0.3 },
                B: { name: variantB, engagement: 0.5 + Math.random() * 0.3 }
            },
            sampleSize: sampleSize,
            confidence: 0.95,
            daysRemaining: duration
        };
        
        this.abTests.push(newTest);
        this.renderABTests();
        this.closeModal('createTestModal');
        this.showNotification('A/B test created successfully!', 'success');
        
        // Clear form
        document.getElementById('testName').value = '';
        document.getElementById('variantA').value = '';
        document.getElementById('variantB').value = '';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add notification styles if not already present
        if (!document.querySelector('.notification-styles')) {
            const style = document.createElement('style');
            style.className = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 10px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideIn 0.3s ease;
                }
                .notification.success { background: linear-gradient(135deg, #4CAF50, #45a049); }
                .notification.error { background: linear-gradient(135deg, #f44336, #d32f2f); }
                .notification.info { background: linear-gradient(135deg, #2196F3, #1976D2); }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
function editIntervention(id) {
    console.log('Editing intervention:', id);
    // Implementation would open edit modal
}

function cancelIntervention(id) {
    if (confirm('Are you sure you want to cancel this intervention?')) {
        window.mrtEngine.interventionQueue = window.mrtEngine.interventionQueue.filter(i => i.id !== id);
        window.mrtEngine.renderInterventionQueue();
        window.mrtEngine.showNotification('Intervention cancelled.', 'info');
    }
}

function closeModal(modalId) {
    window.mrtEngine.closeModal(modalId);
}

function saveSettings() {
    window.mrtEngine.saveSettings();
}

async function addIntervention() {
    try {
        await window.mrtEngine.addIntervention();
    } catch (error) {
        console.error('Error adding intervention:', error);
    }
}

function createTest() {
    window.mrtEngine.createTest();
}

// Initialize the MRT Engine when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mrtEngine = new MRTEngine();
});

// Handle modal clicks outside content
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Handle escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
    }
});