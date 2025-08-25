// Smart Journal JavaScript
class SmartJournal {
    constructor() {
        this.currentTab = 'entry';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentPromptIndex = 0;
        this.journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        this.insights = JSON.parse(localStorage.getItem('journalInsights')) || [];
        this.affirmations = JSON.parse(localStorage.getItem('journalAffirmations')) || [];
        this.emotionIntensity = 5;
        this.currentEmotions = [];
        this.azureClient = null;
        
        // Initialize Azure AI client
        this.initializeAzureClient().then(() => {
            this.init();
        }).catch(error => {
            console.warn('Azure AI initialization failed, continuing without AI features:', error);
            this.init();
        });
        
        this.journalPrompts = [
            "What are three things you're grateful for today?",
            "Describe a moment today when you felt truly present.",
            "What challenge did you face today, and how did you handle it?",
            "Write about someone who made you smile today.",
            "What's one thing you learned about yourself today?",
            "Describe your ideal version of tomorrow.",
            "What emotions are you carrying right now?",
            "Write a letter to your past self from one year ago.",
            "What would you tell a friend who was feeling the way you feel right now?",
            "Describe a small victory you had today, no matter how minor."
        ];
        
        this.emotionCategories = [
            'joy', 'gratitude', 'love', 'excitement', 'peace', 'contentment',
            'sadness', 'anxiety', 'anger', 'frustration', 'fear', 'loneliness',
            'hope', 'curiosity', 'pride', 'shame', 'guilt', 'confusion',
            'empathy', 'compassion', 'determination', 'overwhelm'
        ];
    }
    
    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Smart Journal: Azure AI client initialized successfully');
            } else {
                console.warn('Smart Journal: Azure AI configuration not available');
            }
        } catch (error) {
            console.error('Smart Journal: Failed to initialize Azure AI client:', error);
            throw error;
        }
    }
    
    init() {
        this.setupEventListeners();
        this.updatePromptDisplay();
        this.updateWordCount();
        this.loadTabContent();
        this.updateEmotionIntensity();
        this.checkMicrophonePermission();
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Voice recording
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.toggleRecording();
        });
        
        // Text input
        const journalText = document.getElementById('journalText');
        journalText.addEventListener('input', () => {
            this.updateWordCount();
            this.analyzeEmotions();
        });
        
        // Emotion intensity
        document.getElementById('emotionIntensity').addEventListener('input', (e) => {
            this.emotionIntensity = parseInt(e.target.value);
            this.updateEmotionIntensity();
        });
        
        // Prompt navigation
        document.getElementById('prevPrompt').addEventListener('click', () => {
            this.navigatePrompt(-1);
        });
        
        document.getElementById('nextPrompt').addEventListener('click', () => {
            this.navigatePrompt(1);
        });
        
        document.getElementById('usePromptBtn').addEventListener('click', () => {
            this.useCurrentPrompt();
        });
        
        // Entry actions
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearEntry();
        });
        
        document.getElementById('saveDraftBtn').addEventListener('click', () => {
            this.saveDraft();
        });
        
        document.getElementById('submitEntryBtn').addEventListener('click', () => {
            this.submitEntry();
        });
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Header actions
        document.getElementById('insightsBtn').addEventListener('click', () => {
            this.switchTab('insights');
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportModal();
        });
        
        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });
        
        // Modal background clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // Insights refresh
        document.getElementById('refreshInsightsBtn').addEventListener('click', () => {
            this.generateInsights();
        });
        
        // Affirmations generation
        document.getElementById('generateAffirmationsBtn').addEventListener('click', () => {
            this.generateAffirmations();
        });
        
        // Pattern timeframe
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTimeframe(e.target.dataset.timeframe);
            });
        });
        
        // Export functionality
        document.getElementById('exportDownloadBtn').addEventListener('click', () => {
            this.downloadExport();
        });
    }
    
    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            document.getElementById('voiceStatus').textContent = 'Voice recording ready';
        } catch (error) {
            document.getElementById('voiceStatus').textContent = 'Microphone access denied';
            document.getElementById('voiceBtn').disabled = true;
        }
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
            document.getElementById('voiceStatus').textContent = 'Recording... Speak now';
            
        } catch (error) {
            console.error('Error starting recording:', error);
            document.getElementById('voiceStatus').textContent = 'Recording failed';
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
            document.getElementById('voiceStatus').textContent = 'Processing recording...';
        }
    }
    
    async processRecording() {
        try {
            // Simulate speech-to-text processing
            await this.simulateDelay(2000);
            
            // In a real implementation, you would send the audio to a speech-to-text service
            const transcribedText = "This is a simulated transcription of your voice recording. In a real implementation, this would be the actual transcribed text from your speech.";
            
            const journalText = document.getElementById('journalText');
            const currentText = journalText.value;
            journalText.value = currentText + (currentText ? '\n\n' : '') + transcribedText;
            
            this.updateWordCount();
            this.analyzeEmotions();
            
            document.getElementById('voiceStatus').textContent = 'Recording transcribed successfully';
            
        } catch (error) {
            console.error('Error processing recording:', error);
            document.getElementById('voiceStatus').textContent = 'Transcription failed';
        }
    }
    
    async analyzeEmotions() {
        const text = document.getElementById('journalText').value;
        if (!text.trim()) {
            this.currentEmotions = [];
            this.updateEmotionDisplay();
            return;
        }
        
        // Try AI-powered emotion analysis first
        try {
            if (this.azureClient && text.length > 20) {
                await this.analyzeEmotionsWithAI(text);
                return;
            }
        } catch (error) {
            console.warn('AI emotion analysis failed, falling back to keyword analysis:', error);
        }
        
        // Fallback to keyword-based emotion detection
        this.analyzeEmotionsWithKeywords(text.toLowerCase());
    }
    
    async analyzeEmotionsWithAI(text) {
        const prompt = `Analyze the emotional content of this journal entry and identify the primary emotions present. Consider both explicit emotional words and implicit emotional undertones.

Journal Entry:
"${text}"

Please respond with a JSON object containing:
{
  "emotions": ["emotion1", "emotion2", ...],
  "intensity": number (1-10),
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": number (0-1)
}

Use these emotion categories: joy, sadness, anxiety, anger, gratitude, love, hope, loneliness, excitement, peace, frustration, fear, pride, shame, guilt, confusion, empathy, compassion, determination, overwhelm.

Limit to 3-5 most prominent emotions.`;

        const response = await this.azureClient.generateResponse(prompt);
        
        try {
            const analysis = JSON.parse(response);
             if (analysis.emotions && Array.isArray(analysis.emotions)) {
                 this.currentEmotions = analysis.emotions.slice(0, 5); // Limit to 5 emotions
                
                // Update emotion intensity if provided
                if (analysis.intensity && analysis.intensity >= 1 && analysis.intensity <= 10) {
                    this.emotionIntensity = analysis.intensity;
                    document.getElementById('emotionIntensity').value = analysis.intensity;
                    this.updateEmotionIntensity();
                }
                
                this.updateEmotionDisplay();
                return;
            }
        } catch (parseError) {
            console.warn('Failed to parse AI emotion analysis response:', parseError);
        }
        
        // If AI analysis fails, fall back to keyword analysis
        this.analyzeEmotionsWithKeywords(text.toLowerCase());
    }
    
    analyzeEmotionsWithKeywords(text) {
        const emotionKeywords = {
            joy: ['happy', 'joyful', 'excited', 'thrilled', 'delighted', 'cheerful'],
            sadness: ['sad', 'depressed', 'down', 'blue', 'melancholy', 'grief'],
            anxiety: ['anxious', 'worried', 'nervous', 'stressed', 'panic', 'fear'],
            anger: ['angry', 'mad', 'furious', 'irritated', 'frustrated', 'rage'],
            gratitude: ['grateful', 'thankful', 'blessed', 'appreciate', 'fortunate'],
            love: ['love', 'adore', 'cherish', 'affection', 'care', 'devoted'],
            hope: ['hope', 'optimistic', 'positive', 'confident', 'faith'],
            loneliness: ['lonely', 'alone', 'isolated', 'disconnected', 'solitary']
        };
        
        const detectedEmotions = [];
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            const matches = keywords.filter(keyword => text.includes(keyword)).length;
            if (matches > 0) {
                detectedEmotions.push({
                    emotion,
                    intensity: Math.min(matches * 2, 10)
                });
            }
        }
        
        // Sort by intensity and take top emotions
        this.currentEmotions = detectedEmotions
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 5);
        
        this.updateEmotionDisplay();
    }
    
    updateEmotionDisplay() {
        const emotionTags = document.getElementById('emotionTags');
        emotionTags.innerHTML = '';
        
        if (this.currentEmotions.length === 0) {
            emotionTags.innerHTML = '<span class="emotion-tag">No emotions detected</span>';
            return;
        }
        
        this.currentEmotions.forEach((emotion, index) => {
            const tag = document.createElement('span');
            tag.className = `emotion-tag ${index === 0 ? 'primary' : ''}`;
            tag.textContent = emotion.emotion;
            emotionTags.appendChild(tag);
        });
    }
    
    updateEmotionIntensity() {
        const intensityFill = document.getElementById('intensityFill');
        const intensityLabel = document.getElementById('intensityLabel');
        
        const percentage = (this.emotionIntensity / 10) * 100;
        intensityFill.style.width = `${percentage}%`;
        
        let label = 'Neutral';
        if (this.emotionIntensity <= 3) label = 'Low';
        else if (this.emotionIntensity <= 7) label = 'Moderate';
        else label = 'High';
        
        intensityLabel.textContent = label;
    }
    
    updateWordCount() {
        const text = document.getElementById('journalText').value;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        document.getElementById('wordCount').textContent = `${wordCount} words`;
        
        // Enable/disable submit button
        const submitBtn = document.getElementById('submitEntryBtn');
        submitBtn.disabled = wordCount < 10;
    }
    
    navigatePrompt(direction) {
        this.currentPromptIndex += direction;
        if (this.currentPromptIndex < 0) {
            this.currentPromptIndex = this.journalPrompts.length - 1;
        } else if (this.currentPromptIndex >= this.journalPrompts.length) {
            this.currentPromptIndex = 0;
        }
        this.updatePromptDisplay();
    }
    
    updatePromptDisplay() {
        const promptText = document.getElementById('promptText');
        promptText.textContent = this.journalPrompts[this.currentPromptIndex];
    }
    
    useCurrentPrompt() {
        const journalText = document.getElementById('journalText');
        const currentText = journalText.value;
        const prompt = this.journalPrompts[this.currentPromptIndex];
        
        journalText.value = currentText + (currentText ? '\n\n' : '') + prompt + '\n\n';
        journalText.focus();
        this.updateWordCount();
    }
    
    clearEntry() {
        if (confirm('Are you sure you want to clear your entry?')) {
            document.getElementById('journalText').value = '';
            this.currentEmotions = [];
            this.emotionIntensity = 5;
            document.getElementById('emotionIntensity').value = 5;
            this.updateWordCount();
            this.updateEmotionDisplay();
            this.updateEmotionIntensity();
        }
    }
    
    saveDraft() {
        const text = document.getElementById('journalText').value;
        if (!text.trim()) {
            alert('Nothing to save');
            return;
        }
        
        localStorage.setItem('journalDraft', text);
        alert('Draft saved successfully');
    }
    
    async submitEntry() {
        const text = document.getElementById('journalText').value;
        if (!text.trim() || text.trim().split(/\s+/).length < 10) {
            alert('Please write at least 10 words before submitting');
            return;
        }
        
        this.showProcessingModal('Analyzing your entry...');
        
        try {
            // Simulate AI processing
            await this.simulateDelay(3000);
            
            const entry = {
                id: Date.now(),
                date: new Date().toISOString(),
                text: text,
                emotions: this.currentEmotions,
                intensity: this.emotionIntensity,
                wordCount: text.trim().split(/\s+/).length
            };
            
            this.journalEntries.unshift(entry);
            localStorage.setItem('journalEntries', JSON.stringify(this.journalEntries));
            
            // Generate insights for this entry
            await this.generateEntryInsights(entry);
            
            this.closeModal(document.getElementById('processingModal'));
            
            // Clear the form
            this.clearEntry();
            
            // Switch to entries tab
            this.switchTab('entries');
            
            alert('Entry submitted successfully!');
            
        } catch (error) {
            console.error('Error submitting entry:', error);
            this.closeModal(document.getElementById('processingModal'));
            alert('Error submitting entry. Please try again.');
        }
    }
    
    async generateEntryInsights(entry) {
        try {
            if (this.azureClient && entry.text && entry.text.length > 50) {
                await this.generateAIInsights(entry);
                return;
            }
        } catch (error) {
            console.warn('AI insight generation failed, using static insights:', error);
        }
        
        // Fallback to static insights
        this.generateStaticInsights(entry);
    }
    
    async generateAIInsights(entry) {
        const recentEntries = this.journalEntries.slice(-5).map(e => ({
            text: e.text.substring(0, 200),
            emotions: e.emotions || [],
            date: e.date
        }));
        
        const context = {
            currentEntry: {
                text: entry.text,
                emotions: entry.emotions || [],
                emotionIntensity: entry.emotionIntensity || 5,
                wordCount: entry.text.split(/\s+/).length,
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
            },
            recentHistory: recentEntries,
            totalEntries: this.journalEntries.length
        };
        
        const prompt = `As a compassionate journaling coach and emotional wellness expert, analyze this journal entry and provide personalized insights.

Context:
${JSON.stringify(context, null, 2)}

Please generate 2-3 meaningful insights in JSON format:
{
  "insights": [
    {
      "title": "Brief, engaging title",
      "description": "Supportive, actionable insight (2-3 sentences)",
      "category": "pattern" | "growth" | "strength" | "suggestion" | "reflection",
      "confidence": number (0.6-0.95)
    }
  ]
}

Focus on:
1. Emotional patterns and growth opportunities
2. Strengths and positive developments
3. Gentle, actionable suggestions for wellbeing
4. Encouraging observations about their journey

Keep insights warm, non-judgmental, and empowering.`;

        const response = await this.azureClient.generateResponse(prompt);
        
        try {
            const aiInsights = JSON.parse(response);
            if (aiInsights.insights && Array.isArray(aiInsights.insights)) {
                const processedInsights = aiInsights.insights.map(insight => ({
                    id: Date.now() + Math.random(),
                    title: insight.title || 'Personal Insight',
                    description: insight.description || 'Keep reflecting on your journey.',
                    confidence: Math.min(Math.max(insight.confidence || 0.7, 0.6), 0.95),
                    category: insight.category || 'reflection',
                    date: new Date().toISOString(),
                    entryId: entry.id
                }));
                
                this.insights.unshift(...processedInsights);
                localStorage.setItem('journalInsights', JSON.stringify(this.insights));
                return;
            }
        } catch (parseError) {
            console.warn('Failed to parse AI insights response:', parseError);
        }
        
        // If AI processing fails, fall back to static insights
        this.generateStaticInsights(entry);
    }
    
    generateStaticInsights(entry) {
        const insights = [
            {
                id: Date.now() + Math.random(),
                title: 'Emotional Pattern Detected',
                description: 'Your recent entries show a pattern of increased self-reflection during evening hours.',
                confidence: 0.85,
                category: 'pattern',
                date: new Date().toISOString(),
                entryId: entry.id
            },
            {
                id: Date.now() + Math.random() + 1,
                title: 'Growth Opportunity',
                description: 'Consider exploring mindfulness techniques to help process the emotions you\'ve been experiencing.',
                confidence: 0.72,
                category: 'suggestion',
                date: new Date().toISOString(),
                entryId: entry.id
            }
        ];
        
        this.insights.unshift(...insights);
        localStorage.setItem('journalInsights', JSON.stringify(this.insights));
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        this.currentTab = tabName;
        this.loadTabContent();
    }
    
    loadTabContent() {
        switch (this.currentTab) {
            case 'entries':
                this.loadEntries();
                break;
            case 'insights':
                this.loadInsights();
                break;
            case 'affirmations':
                this.loadAffirmations();
                break;
            case 'patterns':
                this.loadPatterns();
                break;
        }
    }
    
    loadEntries() {
        const entriesList = document.getElementById('entriesList');
        
        if (this.journalEntries.length === 0) {
            entriesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h4>No entries yet</h4>
                    <p>Start writing your first journal entry to see it here.</p>
                </div>
            `;
            return;
        }
        
        entriesList.innerHTML = this.journalEntries.map(entry => `
            <div class="entry-item" onclick="smartJournal.showEntryDetails('${entry.id}')">
                <div class="entry-header-item">
                    <div class="entry-date-item">${this.formatDate(entry.date)}</div>
                    <div class="entry-emotions">
                        ${entry.emotions.slice(0, 3).map(emotion => 
                            `<span class="entry-emotion">${emotion.emotion}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="entry-preview">${this.truncateText(entry.text, 150)}</div>
            </div>
        `).join('');
    }
    
    loadInsights() {
        const insightsGrid = document.getElementById('insightsGrid');
        
        if (this.insights.length === 0) {
            insightsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <h4>No insights yet</h4>
                    <p>Write more journal entries to generate AI insights.</p>
                </div>
            `;
            return;
        }
        
        insightsGrid.innerHTML = this.insights.map(insight => `
            <div class="insight-card" onclick="smartJournal.showInsightDetails('${insight.id}')">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
                <div class="insight-confidence">
                    <span>Confidence:</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${insight.confidence * 100}%"></div>
                    </div>
                    <span>${Math.round(insight.confidence * 100)}%</span>
                </div>
            </div>
        `).join('');
    }
    
    loadAffirmations() {
        const affirmationsList = document.getElementById('affirmationsList');
        
        if (this.affirmations.length === 0) {
            affirmationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h4>No affirmations yet</h4>
                    <p>Generate personalized affirmations based on your journal entries.</p>
                </div>
            `;
            return;
        }
        
        affirmationsList.innerHTML = this.affirmations.map(affirmation => `
            <div class="affirmation-card">
                <div class="affirmation-text">${affirmation.text}</div>
                <div class="affirmation-category">${affirmation.category}</div>
            </div>
        `).join('');
    }
    
    loadPatterns() {
        const patternsContent = document.getElementById('patternsContent');
        
        if (this.journalEntries.length < 3) {
            patternsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>Not enough data</h4>
                    <p>Write at least 3 journal entries to see emotional patterns.</p>
                </div>
            `;
            return;
        }
        
        // Generate sample patterns
        const patterns = [
            {
                title: 'Evening Reflection',
                description: 'You tend to write more introspective entries in the evening hours.',
                chart: 'Time-based pattern'
            },
            {
                title: 'Emotional Cycles',
                description: 'Your emotional intensity follows a weekly pattern with peaks on Wednesdays.',
                chart: 'Weekly emotion chart'
            },
            {
                title: 'Growth Themes',
                description: 'Recent entries show increased focus on personal development and self-care.',
                chart: 'Theme evolution'
            }
        ];
        
        patternsContent.innerHTML = patterns.map(pattern => `
            <div class="pattern-card">
                <div class="pattern-title">${pattern.title}</div>
                <div class="pattern-description">${pattern.description}</div>
                <div class="pattern-chart">${pattern.chart}</div>
            </div>
        `).join('');
    }
    
    async generateInsights() {
        if (this.journalEntries.length === 0) {
            alert('Write some journal entries first to generate insights.');
            return;
        }
        
        this.showProcessingModal('Generating AI insights...');
        
        try {
            await this.simulateDelay(3000);
            
            const newInsights = [
                {
                    id: Date.now(),
                    title: 'Resilience Building',
                    description: 'Your recent entries show strong problem-solving skills and emotional resilience.',
                    confidence: 0.88,
                    category: 'strength',
                    date: new Date().toISOString()
                },
                {
                    id: Date.now() + 1,
                    title: 'Social Connection',
                    description: 'Consider reaching out to friends or family when you\'re feeling overwhelmed.',
                    confidence: 0.76,
                    category: 'suggestion',
                    date: new Date().toISOString()
                }
            ];
            
            this.insights.unshift(...newInsights);
            localStorage.setItem('journalInsights', JSON.stringify(this.insights));
            
            this.closeModal(document.getElementById('processingModal'));
            this.loadInsights();
            
        } catch (error) {
            console.error('Error generating insights:', error);
            this.closeModal(document.getElementById('processingModal'));
            alert('Error generating insights. Please try again.');
        }
    }
    
    async generateAffirmations() {
        this.showProcessingModal('Creating personalized affirmations...');
        
        try {
            if (this.azureClient && this.journalEntries.length > 0) {
                await this.generateAIAffirmations();
            } else {
                await this.generateStaticAffirmations();
            }
            
            this.closeModal(document.getElementById('processingModal'));
            this.loadAffirmations();
            
        } catch (error) {
            console.error('Error generating affirmations:', error);
            this.closeModal(document.getElementById('processingModal'));
            alert('Error generating affirmations. Please try again.');
        }
    }
    
    async generateAIAffirmations() {
        const recentEntries = this.journalEntries.slice(-10).map(entry => ({
            text: entry.text.substring(0, 300),
            emotions: entry.emotions || [],
            date: entry.date
        }));
        
        const recentInsights = this.insights.slice(-5).map(insight => insight.description);
        
        const context = {
            recentJournalEntries: recentEntries,
            recentInsights: recentInsights,
            totalEntries: this.journalEntries.length,
            journalingDuration: this.getJournalingDuration()
        };
        
        const prompt = `As a compassionate wellness coach, create 4-5 personalized affirmations based on this person's journaling journey and emotional patterns.

Context:
${JSON.stringify(context, null, 2)}

Please generate affirmations in JSON format:
{
  "affirmations": [
    {
      "text": "Positive, empowering affirmation in first person",
      "category": "Strength" | "Self-Compassion" | "Growth" | "Self-Love" | "Resilience" | "Confidence" | "Peace" | "Gratitude"
    }
  ]
}

Guidelines:
1. Make affirmations specific to their emotional journey and growth areas
2. Use positive, present-tense language ("I am", "I have", "I choose")
3. Address any recurring themes or challenges mentioned in their entries
4. Keep each affirmation concise but meaningful (10-15 words)
5. Ensure they feel authentic and achievable
6. Focus on their strengths and potential for growth`;

        const response = await this.azureClient.generateResponse(prompt);
        
        try {
            const aiAffirmations = JSON.parse(response);
            if (aiAffirmations.affirmations && Array.isArray(aiAffirmations.affirmations)) {
                const processedAffirmations = aiAffirmations.affirmations.map((affirmation, index) => ({
                    id: Date.now() + index,
                    text: affirmation.text || 'I am worthy of love and happiness.',
                    category: affirmation.category || 'Self-Love',
                    date: new Date().toISOString(),
                    source: 'AI-Generated'
                }));
                
                this.affirmations.unshift(...processedAffirmations);
                localStorage.setItem('journalAffirmations', JSON.stringify(this.affirmations));
                return;
            }
        } catch (parseError) {
            console.warn('Failed to parse AI affirmations response:', parseError);
        }
        
        // Fallback to static affirmations if AI fails
        await this.generateStaticAffirmations();
    }
    
    async generateStaticAffirmations() {
        await this.simulateDelay(2500);
        
        const newAffirmations = [
            {
                id: Date.now(),
                text: 'I am capable of handling whatever challenges come my way.',
                category: 'Strength',
                date: new Date().toISOString(),
                source: 'Template'
            },
            {
                id: Date.now() + 1,
                text: 'My feelings are valid, and I honor them with compassion.',
                category: 'Self-Compassion',
                date: new Date().toISOString(),
                source: 'Template'
            },
            {
                id: Date.now() + 2,
                text: 'I am growing and learning from every experience.',
                category: 'Growth',
                date: new Date().toISOString(),
                source: 'Template'
            },
            {
                id: Date.now() + 3,
                text: 'I deserve love, kindness, and understanding.',
                category: 'Self-Love',
                date: new Date().toISOString(),
                source: 'Template'
            }
        ];
        
        this.affirmations.unshift(...newAffirmations);
        localStorage.setItem('journalAffirmations', JSON.stringify(this.affirmations));
    }
    
    getJournalingDuration() {
        if (this.journalEntries.length === 0) return 'New to journaling';
        
        const firstEntry = new Date(this.journalEntries[this.journalEntries.length - 1].date);
        const now = new Date();
        const daysDiff = Math.floor((now - firstEntry) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 7) return 'Less than a week';
        if (daysDiff < 30) return 'A few weeks';
        if (daysDiff < 90) return 'A few months';
        return 'Several months';
    }
    
    switchTimeframe(timeframe) {
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-timeframe="${timeframe}"]`).classList.add('active');
        
        // Reload patterns with new timeframe
        this.loadPatterns();
    }
    
    showEntryDetails(entryId) {
        const entry = this.journalEntries.find(e => e.id == entryId);
        if (!entry) return;
        
        const modal = document.getElementById('entryModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="entry-details">
                <div class="entry-meta">
                    <p><strong>Date:</strong> ${this.formatDate(entry.date)}</p>
                    <p><strong>Word Count:</strong> ${entry.wordCount}</p>
                    <p><strong>Emotional Intensity:</strong> ${entry.intensity}/10</p>
                </div>
                <div class="entry-emotions-detail">
                    <h4>Emotions:</h4>
                    <div class="emotion-tags">
                        ${entry.emotions.map(emotion => 
                            `<span class="emotion-tag">${emotion.emotion}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="entry-text-detail">
                    <h4>Entry:</h4>
                    <p style="line-height: 1.6; white-space: pre-wrap;">${entry.text}</p>
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }
    
    showInsightDetails(insightId) {
        const insight = this.insights.find(i => i.id == insightId);
        if (!insight) return;
        
        const modal = document.getElementById('insightModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="insight-details">
                <h3>${insight.title}</h3>
                <p style="margin: 15px 0; line-height: 1.6;">${insight.description}</p>
                <div class="insight-meta">
                    <p><strong>Category:</strong> ${insight.category}</p>
                    <p><strong>Confidence:</strong> ${Math.round(insight.confidence * 100)}%</p>
                    <p><strong>Generated:</strong> ${this.formatDate(insight.date)}</p>
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }
    
    showExportModal() {
        this.showModal(document.getElementById('exportModal'));
    }
    
    showProcessingModal(message) {
        const modal = document.getElementById('processingModal');
        modal.querySelector('p').textContent = message;
        this.showModal(modal);
    }
    
    showModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    downloadExport() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const includeEmotions = document.getElementById('includeEmotions').checked;
        const includeInsights = document.getElementById('includeInsights').checked;
        
        let filteredEntries = this.journalEntries;
        
        // Filter by date range if specified
        if (startDate) {
            filteredEntries = filteredEntries.filter(entry => 
                new Date(entry.date) >= new Date(startDate)
            );
        }
        if (endDate) {
            filteredEntries = filteredEntries.filter(entry => 
                new Date(entry.date) <= new Date(endDate)
            );
        }
        
        let content = '';
        const filename = `journal-export-${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'txt') {
            content = this.generateTextExport(filteredEntries, includeEmotions, includeInsights);
            this.downloadFile(content, `${filename}.txt`, 'text/plain');
        } else if (format === 'json') {
            const exportData = {
                entries: filteredEntries,
                insights: includeInsights ? this.insights : [],
                exportDate: new Date().toISOString()
            };
            content = JSON.stringify(exportData, null, 2);
            this.downloadFile(content, `${filename}.json`, 'application/json');
        }
        
        this.closeModal(document.getElementById('exportModal'));
    }
    
    generateTextExport(entries, includeEmotions, includeInsights) {
        let content = 'JOURNAL EXPORT\n';
        content += '='.repeat(50) + '\n\n';
        
        entries.forEach(entry => {
            content += `Date: ${this.formatDate(entry.date)}\n`;
            content += `Word Count: ${entry.wordCount}\n`;
            
            if (includeEmotions && entry.emotions.length > 0) {
                content += `Emotions: ${entry.emotions.map(e => e.emotion).join(', ')}\n`;
                content += `Emotional Intensity: ${entry.intensity}/10\n`;
            }
            
            content += '\n' + entry.text + '\n';
            content += '-'.repeat(30) + '\n\n';
        });
        
        if (includeInsights && this.insights.length > 0) {
            content += '\n\nINSIGHTS\n';
            content += '='.repeat(50) + '\n\n';
            
            this.insights.forEach(insight => {
                content += `${insight.title}\n`;
                content += `${insight.description}\n`;
                content += `Confidence: ${Math.round(insight.confidence * 100)}%\n`;
                content += '-'.repeat(30) + '\n\n';
            });
        }
        
        return content;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the smart journal when the page loads
let smartJournal;
document.addEventListener('DOMContentLoaded', () => {
    smartJournal = new SmartJournal();
});

// Load draft on page load
window.addEventListener('load', () => {
    const draft = localStorage.getItem('journalDraft');
    if (draft) {
        const loadDraft = confirm('You have a saved draft. Would you like to load it?');
        if (loadDraft) {
            document.getElementById('journalText').value = draft;
            smartJournal.updateWordCount();
            smartJournal.analyzeEmotions();
            localStorage.removeItem('journalDraft');
        }
    }
});

// Auto-save draft every 30 seconds
setInterval(() => {
    const text = document.getElementById('journalText')?.value;
    if (text && text.trim().length > 50) {
        localStorage.setItem('journalDraft', text);
    }
}, 30000);