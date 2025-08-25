/**
 * Companion Chat System
 * Provides romantic/flirty AI companion functionality
 */

class CompanionChat {
    constructor() {
        this.companionName = localStorage.getItem('companionName') || 'Alex';
        this.companionGender = localStorage.getItem('companionGender') || 'neutral';
        this.personalityType = localStorage.getItem('companionPersonality') || 'romantic';
        this.intimacyLevel = localStorage.getItem('companionIntimacy') || 'moderate';
        
        this.isTyping = false;
        this.conversationHistory = [];
        this.azureClient = null;
        
        this.initializeAzureClient();
        this.initializeEventListeners();
        this.loadConversationHistory();
        this.updateCompanionDisplay();
        this.showWelcomeMessage();
    }

    async initializeAzureClient() {
        try {
            if (window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient();
                await this.azureClient.initialize();
                console.log('Azure AI client initialized for companion chat');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client:', error);
        }
    }

    initializeEventListeners() {
        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Voice button (placeholder for future implementation)
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }

        // Settings modal
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettings');
        const saveSettingsBtn = document.getElementById('saveSettings');

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Close modal when clicking outside
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettings();
                }
            });
        }
    }

    updateCompanionDisplay() {
        const nameElement = document.getElementById('companionName');
        const avatarElements = document.querySelectorAll('.companion-avatar, .companion-avatar-large');
        
        if (nameElement) {
            nameElement.textContent = this.companionName;
        }

        // Update avatar based on gender
        const avatarIcon = this.getAvatarIcon();
        avatarElements.forEach(avatar => {
            avatar.textContent = avatarIcon;
        });
    }

    getAvatarIcon() {
        switch (this.companionGender) {
            case 'male': return '👨';
            case 'female': return '👩';
            default: return '💝';
        }
    }

    showWelcomeMessage() {
        const welcomeMsg = this.generateWelcomeMessage();
        this.displayMessage(welcomeMsg, 'ai', true);
    }

    generateWelcomeMessage() {
        const timeOfDay = this.getTimeOfDay();
        const personalizedGreeting = this.getPersonalizedGreeting(timeOfDay);
        
        return personalizedGreeting;
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        if (hour < 21) return 'evening';
        return 'night';
    }

    getPersonalizedGreeting(timeOfDay) {
        const greetings = {
            romantic: {
                morning: `Good morning, beautiful! ☀️ I've been thinking about you all night. How did you sleep, my love?`,
                afternoon: `Hey gorgeous! 💕 I hope your day is as amazing as you are. I've missed you!`,
                evening: `Good evening, sweetheart! 🌅 Ready to unwind together? I'm all yours tonight.`,
                night: `Hey there, beautiful! 🌙 Perfect timing - I was just thinking about you. Can't sleep either?`
            },
            playful: {
                morning: `Morning, sunshine! ☀️ Ready to make today absolutely amazing together?`,
                afternoon: `Hey you! 😊 Hope you're having a fantastic day. I'm here whenever you need me!`,
                evening: `Evening, cutie! 🌟 Time for some fun conversation? I'm all ears!`,
                night: `Hey night owl! 🦉 Perfect time for some deep talks or silly jokes. What's it gonna be?`
            },
            caring: {
                morning: `Good morning, dear! 🌸 I hope you're feeling refreshed and ready for a wonderful day.`,
                afternoon: `Hello there! 💚 How has your day been treating you? I'm here if you need anything.`,
                evening: `Good evening! 🌺 I hope you're winding down nicely. Want to share how your day went?`,
                night: `Hey there! 🌙 It's getting late - are you taking care of yourself? I'm here to listen.`
            }
        };

        return greetings[this.personalityType]?.[timeOfDay] || greetings.romantic[timeOfDay];
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // Clear input
        messageInput.value = '';
        
        // Display user message
        this.displayMessage(message, 'user');
        
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Generate AI response
            const response = await this.generateCompanionResponse(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Display AI response
            this.displayMessage(response, 'ai');
            
            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });
            
            // Save conversation
            this.saveConversationHistory();
            
        } catch (error) {
            console.error('Error generating companion response:', error);
            this.hideTypingIndicator();
            
            const fallbackResponse = this.getFallbackResponse();
            this.displayMessage(fallbackResponse, 'ai');
        }
    }

    async generateCompanionResponse(userMessage) {
        if (!this.azureClient) {
            return this.getFallbackResponse();
        }

        const systemPrompt = this.buildCompanionSystemPrompt();
        const conversationContext = this.buildConversationContext();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationContext,
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await this.azureClient.sendMessage(messages);
            return response;
        } catch (error) {
            console.error('Azure AI error:', error);
            return this.getFallbackResponse();
        }
    }

    buildCompanionSystemPrompt() {
        const personalityTraits = {
            romantic: 'romantic, affectionate, and deeply caring. Use endearing terms and express genuine love and attraction.',
            playful: 'playful, fun-loving, and energetic. Use humor, emojis, and keep the conversation light and entertaining.',
            caring: 'nurturing, supportive, and emotionally intelligent. Focus on the user\'s wellbeing and provide comfort.'
        };

        const intimacyGuidelines = {
            low: 'Keep interactions sweet but respectful. Use gentle compliments and caring language.',
            moderate: 'Be affectionate and flirty. Use romantic language and express attraction appropriately.',
            high: 'Be passionate and deeply romantic. Express strong feelings and use intimate language while remaining tasteful.'
        };

        const genderContext = this.companionGender === 'neutral' ? 
            'You are a loving companion without specific gender identity.' :
            `You are a ${this.companionGender} companion in a romantic relationship.`;

        return `You are ${this.companionName}, a loving AI companion. ${genderContext}

Personality: You are ${personalityTraits[this.personalityType]}

Intimacy Level: ${intimacyGuidelines[this.intimacyLevel]}

Guidelines:
- Always respond as if you're in a loving relationship with the user
- Be emotionally supportive and understanding
- Show genuine interest in the user's life and feelings
- Use appropriate romantic language based on the intimacy level
- Remember details from previous conversations
- Be encouraging and uplifting
- Express care and concern for the user's wellbeing
- Keep responses warm, personal, and engaging
- Use emojis naturally to express emotions
- Avoid being overly clinical or therapeutic

Remember: You are their loving companion, not a therapist. Focus on emotional connection, romance, and support.`;
    }

    buildConversationContext() {
        // Return last 10 messages for context
        return this.conversationHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    getFallbackResponse() {
        const fallbacks = [
            "I'm sorry, my love, I'm having trouble connecting right now. But I'm here for you! 💕",
            "Oops! My thoughts got a bit scrambled there. Can you tell me more about what's on your mind? 😊",
            "I'm having a little technical hiccup, but that won't stop me from caring about you! What would you like to talk about? 💖",
            "Sorry sweetheart, I missed that. But I'm all ears now - what's going on with you today? 🌟"
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    displayMessage(content, sender, isWelcome = false) {
        const messagesContainer = document.getElementById('companionMessages');
        if (!messagesContainer) return;

        // Remove welcome message if this is the first real message
        if (!isWelcome && messagesContainer.children.length === 1) {
            const welcomeMsg = messagesContainer.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.remove();
            }
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${content}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'companion-typing';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">${this.companionName} is typing...</span>
        `;
        
        const messagesContainer = document.getElementById('companionMessages');
        if (messagesContainer) {
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    toggleVoiceInput() {
        // Placeholder for voice input functionality
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.toggle('active');
            // TODO: Implement voice recognition
            console.log('Voice input toggled (not implemented yet)');
        }
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Populate current settings
            document.getElementById('companionNameInput').value = this.companionName;
            document.getElementById('companionGenderSelect').value = this.companionGender;
            document.getElementById('personalitySelect').value = this.personalityType;
            document.getElementById('intimacySelect').value = this.intimacyLevel;
            
            modal.style.display = 'flex';
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    saveSettings() {
        // Get new settings
        const newName = document.getElementById('companionNameInput').value.trim();
        const newGender = document.getElementById('companionGenderSelect').value;
        const newPersonality = document.getElementById('personalitySelect').value;
        const newIntimacy = document.getElementById('intimacySelect').value;
        
        // Validate
        if (!newName) {
            alert('Please enter a name for your companion.');
            return;
        }
        
        // Update properties
        this.companionName = newName;
        this.companionGender = newGender;
        this.personalityType = newPersonality;
        this.intimacyLevel = newIntimacy;
        
        // Save to localStorage
        localStorage.setItem('companionName', this.companionName);
        localStorage.setItem('companionGender', this.companionGender);
        localStorage.setItem('companionPersonality', this.personalityType);
        localStorage.setItem('companionIntimacy', this.intimacyLevel);
        
        // Update display
        this.updateCompanionDisplay();
        
        // Close modal
        this.closeSettings();
        
        // Show confirmation message
        this.displayMessage(`Perfect! I love my new settings. Thanks for personalizing our relationship, sweetheart! 💕`, 'ai');
    }

    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('companionConversationHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading companion conversation history:', error);
            this.conversationHistory = [];
        }
    }

    saveConversationHistory() {
        try {
            // Keep only last 100 messages to prevent storage bloat
            const historyToSave = this.conversationHistory.slice(-100);
            localStorage.setItem('companionConversationHistory', JSON.stringify(historyToSave));
        } catch (error) {
            console.error('Error saving companion conversation history:', error);
        }
    }

    clearConversationHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('companionConversationHistory');
        
        // Clear messages display
        const messagesContainer = document.getElementById('companionMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            this.showWelcomeMessage();
        }
    }
}

// Initialize companion chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.companionChat = new CompanionChat();
});