class MeasurementBasedCare {
    constructor() {
        this.currentAssessment = null;
        this.currentQuestionIndex = 0;
        this.responses = [];
        this.assessmentStartTime = null;
        this.assessmentData = {
            phq9: [],
            gad7: [],
            history: []
        };
        this.azureClient = null;
        this.initializeAzureClient();
        
        // PHQ-9 Questions
        this.phq9Questions = [
            {
                text: "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
                conversational: "Let's start with how you've been feeling lately. Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?"
            },
            {
                text: "Feeling down, depressed, or hopeless?",
                conversational: "How about feeling down, depressed, or hopeless? How often has this bothered you in the past 2 weeks?"
            },
            {
                text: "Trouble falling or staying asleep, or sleeping too much?",
                conversational: "Let's talk about your sleep. Have you had trouble falling asleep, staying asleep, or found yourself sleeping too much?"
            },
            {
                text: "Feeling tired or having little energy?",
                conversational: "How has your energy been? Have you been feeling tired or having little energy?"
            },
            {
                text: "Poor appetite or overeating?",
                conversational: "What about your appetite? Have you noticed changes in your eating - either poor appetite or overeating?"
            },
            {
                text: "Feeling bad about yourself or that you are a failure or have let yourself or your family down?",
                conversational: "This next question is about self-perception. Have you been feeling bad about yourself, like you're a failure, or that you've let yourself or your family down?"
            },
            {
                text: "Trouble concentrating on things, such as reading the newspaper or watching television?",
                conversational: "How about your concentration? Have you had trouble focusing on things like reading, watching TV, or other activities?"
            },
            {
                text: "Moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?",
                conversational: "Have you noticed changes in how you move or speak? Either moving/speaking slowly, or being unusually restless and fidgety?"
            },
            {
                text: "Thoughts that you would be better off dead, or of hurting yourself?",
                conversational: "This last question is important for your safety. Have you had any thoughts that you would be better off dead, or thoughts of hurting yourself?"
            }
        ];
        
        // GAD-7 Questions
        this.gad7Questions = [
            {
                text: "Feeling nervous, anxious, or on edge?",
                conversational: "Now let's focus on anxiety. Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?"
            },
            {
                text: "Not being able to stop or control worrying?",
                conversational: "How about worrying? Have you found it difficult to stop or control your worrying?"
            },
            {
                text: "Worrying too much about different things?",
                conversational: "Have you been worrying too much about different things in your life?"
            },
            {
                text: "Trouble relaxing?",
                conversational: "What about relaxation? Have you had trouble relaxing?"
            },
            {
                text: "Being so restless that it is hard to sit still?",
                conversational: "Have you been feeling so restless that it's hard to sit still?"
            },
            {
                text: "Becoming easily annoyed or irritable?",
                conversational: "How about your mood? Have you been becoming easily annoyed or irritable?"
            },
            {
                text: "Feeling afraid, as if something awful might happen?",
                conversational: "Finally, have you been feeling afraid, as if something awful might happen?"
            }
        ];
        
        this.responseOptions = [
            { value: 0, text: "Not at all" },
            { value: 1, text: "Several days" },
            { value: 2, text: "More than half the days" },
            { value: 3, text: "Nearly every day" }
        ];
        
        this.init();
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Measurement-Based Care');
            } else {
                console.warn('Azure AI configuration not available for Measurement-Based Care');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client for Measurement-Based Care:', error);
        }
    }
    
    init() {
        this.loadAssessmentData();
        this.setupEventListeners();
        this.updateDashboard();
        this.generateSampleHistory();
    }
    
    setupEventListeners() {
        // Dashboard actions
        document.getElementById('startAssessmentBtn')?.addEventListener('click', () => {
            this.showAssessmentSelection();
        });
        
        document.getElementById('viewTrendsBtn')?.addEventListener('click', () => {
            this.showTrends();
        });
        
        document.getElementById('shareResultsBtn')?.addEventListener('click', () => {
            this.showShareModal();
        });
        
        // Assessment selection
        document.getElementById('backToDashboard')?.addEventListener('click', () => {
            this.showDashboard();
        });
        
        document.querySelectorAll('.assessment-option').forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                this.startAssessment(type);
            });
        });
        
        // Assessment controls
        document.getElementById('pauseAssessment')?.addEventListener('click', () => {
            this.pauseAssessment();
        });
        
        document.getElementById('previousQuestion')?.addEventListener('click', () => {
            this.previousQuestion();
        });
        
        // Response options
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('response-btn') || e.target.closest('.response-btn')) {
                const btn = e.target.classList.contains('response-btn') ? e.target : e.target.closest('.response-btn');
                this.selectResponse(btn);
            }
        });
        
        // Results actions
        document.getElementById('saveResults')?.addEventListener('click', () => {
            this.saveResults();
        });
        
        document.getElementById('scheduleFollowUp')?.addEventListener('click', () => {
            this.scheduleFollowUp();
        });
        
        document.getElementById('viewDetailedReport')?.addEventListener('click', () => {
            this.viewDetailedReport();
        });
        
        // Trends navigation
        document.getElementById('backFromTrends')?.addEventListener('click', () => {
            this.showDashboard();
        });
        
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateTimeRange(btn.dataset.range);
            });
        });
        
        // Menu
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.toggleMenu();
        });
        
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('assessmentHistory')?.addEventListener('click', () => {
            this.showHistoryModal();
        });
        
        document.getElementById('reminderSettings')?.addEventListener('click', () => {
            this.showReminderModal();
        });
        
        document.getElementById('privacySettings')?.addEventListener('click', () => {
            this.showPrivacySettings();
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }
    
    showAssessmentSelection() {
        document.querySelector('.assessment-dashboard').style.display = 'none';
        document.getElementById('assessmentSelection').style.display = 'block';
        document.getElementById('conversationalAssessment').style.display = 'none';
        document.getElementById('assessmentResults').style.display = 'none';
        document.getElementById('trendsVisualization').style.display = 'none';
    }
    
    showDashboard() {
        document.querySelector('.assessment-dashboard').style.display = 'block';
        document.getElementById('assessmentSelection').style.display = 'none';
        document.getElementById('conversationalAssessment').style.display = 'none';
        document.getElementById('assessmentResults').style.display = 'none';
        document.getElementById('trendsVisualization').style.display = 'none';
        this.updateDashboard();
    }
    
    showTrends() {
        document.querySelector('.assessment-dashboard').style.display = 'none';
        document.getElementById('assessmentSelection').style.display = 'none';
        document.getElementById('conversationalAssessment').style.display = 'none';
        document.getElementById('assessmentResults').style.display = 'none';
        document.getElementById('trendsVisualization').style.display = 'block';
        this.renderTrendsChart();
    }
    
    startAssessment(type) {
        this.currentAssessment = type;
        this.currentQuestionIndex = 0;
        this.responses = [];
        this.assessmentStartTime = Date.now();
        
        document.getElementById('assessmentSelection').style.display = 'none';
        document.getElementById('conversationalAssessment').style.display = 'block';
        
        this.updateAssessmentProgress();
        this.showCurrentQuestion();
    }
    
    showCurrentQuestion() {
        const questions = this.getCurrentQuestions();
        const question = questions[this.currentQuestionIndex];
        
        if (!question) {
            this.completeAssessment();
            return;
        }
        
        document.getElementById('questionText').textContent = question.conversational || question.text;
        
        // Update response options
        const optionsContainer = document.getElementById('responseOptions');
        optionsContainer.innerHTML = '';
        
        this.responseOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'response-btn';
            btn.dataset.value = option.value;
            btn.innerHTML = `
                <span class="response-text">${option.text}</span>
                <span class="response-score">${option.value}</span>
            `;
            optionsContainer.appendChild(btn);
        });
        
        // Update previous button state
        const prevBtn = document.getElementById('previousQuestion');
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
    }
    
    getCurrentQuestions() {
        if (this.currentAssessment === 'phq9') {
            return this.phq9Questions;
        } else if (this.currentAssessment === 'gad7') {
            return this.gad7Questions;
        } else if (this.currentAssessment === 'both') {
            return [...this.phq9Questions, ...this.gad7Questions];
        }
        return [];
    }
    
    selectResponse(btn) {
        // Remove previous selection
        document.querySelectorAll('.response-btn').forEach(b => b.classList.remove('selected'));
        
        // Add selection to clicked button
        btn.classList.add('selected');
        
        const value = parseInt(btn.dataset.value);
        this.responses[this.currentQuestionIndex] = value;
        
        // Auto-advance after a short delay
        setTimeout(() => {
            this.nextQuestion();
        }, 800);
    }
    
    nextQuestion() {
        this.currentQuestionIndex++;
        this.updateAssessmentProgress();
        this.showCurrentQuestion();
    }
    
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.updateAssessmentProgress();
            this.showCurrentQuestion();
        }
    }
    
    updateAssessmentProgress() {
        const totalQuestions = this.getCurrentQuestions().length;
        const progress = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;
        
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = totalQuestions;
    }
    
    async completeAssessment() {
        const completionTime = Date.now() - this.assessmentStartTime;
        const minutes = Math.floor(completionTime / 60000);
        const seconds = Math.floor((completionTime % 60000) / 1000);
        
        document.getElementById('conversationalAssessment').style.display = 'none';
        document.getElementById('assessmentResults').style.display = 'block';
        
        document.getElementById('completionTime').textContent = `${minutes} minutes ${seconds} seconds`;
        
        await this.calculateAndDisplayResults();
    }
    
    async calculateAndDisplayResults() {
        const results = this.calculateScores();
        const summaryContainer = document.getElementById('resultsSummary');
        const insightContainer = document.getElementById('insightList');
        
        summaryContainer.innerHTML = '';
        insightContainer.innerHTML = '';
        
        // Display results
        if (results.phq9 !== undefined) {
            const phq9Result = this.createResultItem('PHQ-9 Depression Score', results.phq9, this.getDepressionSeverity(results.phq9));
            summaryContainer.appendChild(phq9Result);
        }
        
        if (results.gad7 !== undefined) {
            const gad7Result = this.createResultItem('GAD-7 Anxiety Score', results.gad7, this.getAnxietySeverity(results.gad7));
            summaryContainer.appendChild(gad7Result);
        }
        
        // Show loading message for insights
        insightContainer.innerHTML = '<div class="insight-item loading">Generating personalized insights...</div>';
        
        // Generate insights asynchronously
        try {
            const insights = await this.generateInsights(results);
            insightContainer.innerHTML = '';
            insights.forEach(insight => {
                const insightElement = document.createElement('div');
                insightElement.className = 'insight-item';
                insightElement.textContent = insight;
                insightContainer.appendChild(insightElement);
            });
        } catch (error) {
            console.error('Error displaying insights:', error);
            insightContainer.innerHTML = '<div class="insight-item error">Unable to generate insights at this time.</div>';
        }
    }
    
    calculateScores() {
        const results = {};
        
        if (this.currentAssessment === 'phq9') {
            results.phq9 = this.responses.reduce((sum, score) => sum + score, 0);
        } else if (this.currentAssessment === 'gad7') {
            results.gad7 = this.responses.reduce((sum, score) => sum + score, 0);
        } else if (this.currentAssessment === 'both') {
            results.phq9 = this.responses.slice(0, 9).reduce((sum, score) => sum + score, 0);
            results.gad7 = this.responses.slice(9, 16).reduce((sum, score) => sum + score, 0);
        }
        
        return results;
    }
    
    createResultItem(title, score, severity) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h4>${title}</h4>
            <div class="result-score">
                <div class="score-circle">${score}</div>
                <div class="score-details">
                    <h5>${severity.level}</h5>
                    <p>${severity.description}</p>
                </div>
            </div>
        `;
        return item;
    }
    
    getDepressionSeverity(score) {
        if (score <= 4) {
            return {
                level: 'Minimal',
                description: 'Little to no depression symptoms'
            };
        } else if (score <= 9) {
            return {
                level: 'Mild',
                description: 'Mild depression symptoms'
            };
        } else if (score <= 14) {
            return {
                level: 'Moderate',
                description: 'Moderate depression symptoms'
            };
        } else if (score <= 19) {
            return {
                level: 'Moderately Severe',
                description: 'Moderately severe depression symptoms'
            };
        } else {
            return {
                level: 'Severe',
                description: 'Severe depression symptoms'
            };
        }
    }
    
    getAnxietySeverity(score) {
        if (score <= 4) {
            return {
                level: 'Minimal',
                description: 'Little to no anxiety symptoms'
            };
        } else if (score <= 9) {
            return {
                level: 'Mild',
                description: 'Mild anxiety symptoms'
            };
        } else if (score <= 14) {
            return {
                level: 'Moderate',
                description: 'Moderate anxiety symptoms'
            };
        } else {
            return {
                level: 'Severe',
                description: 'Severe anxiety symptoms'
            };
        }
    }
    
    async generateInsights(results) {
        try {
            if (this.azureClient) {
                return await this.generateAIInsights(results);
            } else {
                return this.generateStaticInsights(results);
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            return this.generateStaticInsights(results);
        }
    }

    async generateAIInsights(results) {
        try {
            const historyContext = this.getRecentAssessmentHistory();
            const prompt = `As a mental health assessment AI, provide personalized insights for these assessment results:

Current Results:
- PHQ-9 Score: ${results.phq9 !== undefined ? results.phq9 : 'Not assessed'}
- GAD-7 Score: ${results.gad7 !== undefined ? results.gad7 : 'Not assessed'}

Recent History:
${historyContext}

Provide 3-4 personalized insights that:
1. Acknowledge the current scores with empathy
2. Compare to recent trends if available
3. Suggest specific, actionable coping strategies
4. Encourage appropriate professional help if needed
5. Maintain a supportive, non-judgmental tone

Keep insights concise and practical.`;

            const response = await this.azureClient.generateResponse(prompt, {
                maxTokens: 300,
                temperature: 0.7
            });

            return response.split('\n').filter(insight => insight.trim().length > 0);
        } catch (error) {
            console.error('Error generating AI insights:', error);
            return this.generateStaticInsights(results);
        }
    }

    generateStaticInsights(results) {
        const insights = [];
        
        if (results.phq9 !== undefined) {
            if (results.phq9 <= 4) {
                insights.push('Your depression screening suggests minimal symptoms. Keep up with healthy habits that support your mental well-being.');
            } else if (results.phq9 <= 9) {
                insights.push('You\'re experiencing mild depression symptoms. Consider incorporating stress management techniques and regular exercise into your routine.');
            } else {
                insights.push('Your depression screening indicates moderate to severe symptoms. It would be beneficial to discuss these results with a healthcare provider.');
            }
        }
        
        if (results.gad7 !== undefined) {
            if (results.gad7 <= 4) {
                insights.push('Your anxiety screening shows minimal symptoms. Continue practicing relaxation techniques to maintain your well-being.');
            } else if (results.gad7 <= 9) {
                insights.push('You\'re experiencing mild anxiety symptoms. Deep breathing exercises and mindfulness practices may be helpful.');
            } else {
                insights.push('Your anxiety screening indicates moderate to severe symptoms. Consider speaking with a mental health professional for support.');
            }
        }
        
        if (results.phq9 > 9 || results.gad7 > 9) {
            insights.push('Remember that seeking help is a sign of strength. Professional support can provide you with effective strategies for managing your symptoms.');
        }
        
        insights.push('Regular assessment helps track your progress over time. Consider taking this assessment weekly or bi-weekly.');
        
        return insights;
    }

    getRecentAssessmentHistory() {
        const recentAssessments = this.assessmentData.history.slice(-3);
        if (recentAssessments.length === 0) {
            return 'No previous assessments available.';
        }
        
        return recentAssessments.map(assessment => {
            const date = new Date(assessment.date).toLocaleDateString();
            const scores = [];
            if (assessment.scores.phq9 !== undefined) scores.push(`PHQ-9: ${assessment.scores.phq9}`);
            if (assessment.scores.gad7 !== undefined) scores.push(`GAD-7: ${assessment.scores.gad7}`);
            return `${date}: ${scores.join(', ')}`;
        }).join('\n');
    }
    
    saveResults() {
        const results = this.calculateScores();
        const assessment = {
            date: new Date().toISOString(),
            type: this.currentAssessment,
            scores: results,
            responses: this.responses,
            completionTime: Date.now() - this.assessmentStartTime
        };
        
        this.assessmentData.history.push(assessment);
        
        if (results.phq9 !== undefined) {
            this.assessmentData.phq9.push({
                date: assessment.date,
                score: results.phq9
            });
        }
        
        if (results.gad7 !== undefined) {
            this.assessmentData.gad7.push({
                date: assessment.date,
                score: results.gad7
            });
        }
        
        this.saveAssessmentData();
        this.showNotification('Assessment results saved successfully!', 'success');
        
        setTimeout(() => {
            this.showDashboard();
        }, 2000);
    }
    
    scheduleFollowUp() {
        this.showNotification('Follow-up reminder set for 2 weeks from now', 'info');
        // In a real app, this would integrate with calendar/notification system
    }
    
    viewDetailedReport() {
        // Generate and download detailed PDF report
        this.showNotification('Detailed report generation started', 'info');
        // In a real app, this would generate a PDF
    }
    
    pauseAssessment() {
        if (confirm('Are you sure you want to pause this assessment? Your progress will be saved.')) {
            this.showDashboard();
            this.showNotification('Assessment paused. You can resume anytime.', 'info');
        }
    }
    
    updateDashboard() {
        // Update current scores display
        const latestPhq9 = this.getLatestScore('phq9');
        const latestGad7 = this.getLatestScore('gad7');
        
        if (latestPhq9) {
            this.updateScoreDisplay('depression', latestPhq9.score, this.getDepressionSeverity(latestPhq9.score));
        }
        
        if (latestGad7) {
            this.updateScoreDisplay('anxiety', latestGad7.score, this.getAnxietySeverity(latestGad7.score));
        }
        
        // Update last assessment time
        const lastAssessment = this.assessmentData.history[this.assessmentData.history.length - 1];
        if (lastAssessment) {
            const daysSince = Math.floor((Date.now() - new Date(lastAssessment.date).getTime()) / (1000 * 60 * 60 * 24));
            document.querySelector('.last-assessment span').textContent = `Last assessment: ${daysSince} days ago`;
        }
    }
    
    getLatestScore(type) {
        const scores = this.assessmentData[type];
        return scores.length > 0 ? scores[scores.length - 1] : null;
    }
    
    updateScoreDisplay(type, score, severity) {
        const scoreItem = document.querySelector(`.score-item.${type}`);
        if (scoreItem) {
            scoreItem.querySelector('.score').textContent = score;
            const severityElement = scoreItem.querySelector('.severity');
            severityElement.textContent = severity.level;
            severityElement.className = `severity ${severity.level.toLowerCase().replace(' ', '-')}`;
        }
    }
    
    renderTrendsChart() {
        const canvas = document.getElementById('trendsChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Simple chart rendering (in a real app, use Chart.js or similar)
        this.drawSimpleChart(ctx, canvas.width, canvas.height);
    }
    
    drawSimpleChart(ctx, width, height) {
        const padding = 60;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Draw axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw sample data lines
        const phq9Data = this.generateSampleTrendData();
        const gad7Data = this.generateSampleTrendData();
        
        this.drawDataLine(ctx, phq9Data, '#4299e1', padding, chartWidth, chartHeight, height);
        this.drawDataLine(ctx, gad7Data, '#ed8936', padding, chartWidth, chartHeight, height);
        
        // Draw legend
        this.drawLegend(ctx, width, padding);
    }
    
    drawDataLine(ctx, data, color, padding, chartWidth, chartHeight, canvasHeight) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = canvasHeight - padding - (point / 27) * chartHeight; // Max score is 27 for PHQ-9
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = color;
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = canvasHeight - padding - (point / 27) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    drawLegend(ctx, width, padding) {
        ctx.font = '14px Segoe UI';
        ctx.fillStyle = '#2d3748';
        
        // PHQ-9 legend
        ctx.fillStyle = '#4299e1';
        ctx.fillRect(width - padding - 120, 20, 15, 3);
        ctx.fillStyle = '#2d3748';
        ctx.fillText('Depression (PHQ-9)', width - padding - 100, 30);
        
        // GAD-7 legend
        ctx.fillStyle = '#ed8936';
        ctx.fillRect(width - padding - 120, 40, 15, 3);
        ctx.fillStyle = '#2d3748';
        ctx.fillText('Anxiety (GAD-7)', width - padding - 100, 50);
    }
    
    generateSampleTrendData() {
        // Generate sample trend data for demonstration
        const data = [];
        let value = 15;
        
        for (let i = 0; i < 12; i++) {
            value += (Math.random() - 0.6) * 3; // Slight downward trend
            value = Math.max(0, Math.min(27, value));
            data.push(Math.round(value));
        }
        
        return data;
    }
    
    updateTimeRange(range) {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-range="${range}"]`).classList.add('active');
        this.renderTrendsChart();
    }
    
    toggleMenu() {
        const menu = document.getElementById('menuDropdown');
        menu.classList.toggle('show');
    }
    
    exportData() {
        const data = JSON.stringify(this.assessmentData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mental-health-assessment-data.json';
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Assessment data exported successfully', 'success');
    }
    
    showHistoryModal() {
        const modal = document.getElementById('historyModal');
        const historyList = document.getElementById('historyList');
        
        historyList.innerHTML = '';
        
        this.assessmentData.history.slice(-10).reverse().forEach(assessment => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const date = new Date(assessment.date).toLocaleDateString();
            const scores = [];
            
            if (assessment.scores.phq9 !== undefined) {
                scores.push(`PHQ-9: ${assessment.scores.phq9}`);
            }
            if (assessment.scores.gad7 !== undefined) {
                scores.push(`GAD-7: ${assessment.scores.gad7}`);
            }
            
            item.innerHTML = `
                <div class="history-date">${date}</div>
                <div class="history-scores">
                    ${scores.map(score => `<div class="history-score"><strong>${score}</strong></div>`).join('')}
                </div>
                <div class="history-notes">Assessment type: ${assessment.type}</div>
            `;
            
            historyList.appendChild(item);
        });
        
        modal.classList.add('show');
    }
    
    showReminderModal() {
        document.getElementById('reminderModal').classList.add('show');
    }
    
    showShareModal() {
        document.getElementById('shareModal').classList.add('show');
    }
    
    showPrivacySettings() {
        this.showNotification('Privacy settings would open here', 'info');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
    
    saveReminderSettings() {
        const settings = {
            enabled: document.getElementById('enableReminders').checked,
            frequency: document.getElementById('reminderFrequency').value,
            time: document.getElementById('reminderTime').value,
            days: Array.from(document.querySelectorAll('.day-selector input:checked')).map(cb => cb.value)
        };
        
        localStorage.setItem('reminderSettings', JSON.stringify(settings));
        this.showNotification('Reminder settings saved', 'success');
        this.closeModal('reminderModal');
    }
    
    sendReport() {
        const email = document.getElementById('providerEmail').value;
        if (email) {
            this.showNotification(`Report will be sent to ${email}`, 'success');
            this.closeModal('shareModal');
        } else {
            this.showNotification('Please enter a valid email address', 'error');
        }
    }
    
    generateSampleHistory() {
        if (this.assessmentData.history.length === 0) {
            // Generate sample historical data
            const now = Date.now();
            const sampleData = [
                { days: 21, phq9: 12, gad7: 15 },
                { days: 14, phq9: 10, gad7: 13 },
                { days: 7, phq9: 8, gad7: 12 },
                { days: 3, phq9: 8, gad7: 12 }
            ];
            
            sampleData.forEach(data => {
                const date = new Date(now - data.days * 24 * 60 * 60 * 1000).toISOString();
                
                this.assessmentData.history.push({
                    date,
                    type: 'both',
                    scores: { phq9: data.phq9, gad7: data.gad7 },
                    responses: [],
                    completionTime: 180000
                });
                
                this.assessmentData.phq9.push({ date, score: data.phq9 });
                this.assessmentData.gad7.push({ date, score: data.gad7 });
            });
        }
    }
    
    loadAssessmentData() {
        const saved = localStorage.getItem('assessmentData');
        if (saved) {
            this.assessmentData = JSON.parse(saved);
        }
    }
    
    saveAssessmentData() {
        localStorage.setItem('assessmentData', JSON.stringify(this.assessmentData));
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for modal management
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function saveReminderSettings() {
    if (window.measurementCare) {
        window.measurementCare.saveReminderSettings();
    }
}

function sendReport() {
    if (window.measurementCare) {
        window.measurementCare.sendReport();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.measurementCare = new MeasurementBasedCare();
});