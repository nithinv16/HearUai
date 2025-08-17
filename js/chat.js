// Enhanced Chat Interface for HearUAI
// Integrates with Azure AI services for real therapy conversations

class HearUAIChat {
  constructor() {
    // Check authentication first
    if (!AuthManager.isUserAuthenticated()) {
      window.location.href = 'auth.html';
      return;
    }
    
    this.currentUser = AuthManager.getCurrentUser();
    this.azureClient = null;
    this.speechToText = new SpeechToText();
    this.textToSpeech = new TextToSpeech();

    this.conversationHistory = [];
    this.isVoiceMode = false;
    this.isListening = false;
    this.currentSessionId = this.generateSessionId();
    this.memoryManager = new MemoryManager(this.currentUser.id);
    this.conversationHistoryManager = new ConversationHistoryManager(this.currentUser.id);
    this.chatReferenceManager = new ChatReferenceManager(this.conversationHistoryManager, this.memoryManager);
    this.voiceCallManager = null; // Will be initialized after Azure client is loaded
    this.translationService = null; // Will be initialized after configuration is loaded
    this.userLanguage = 'en'; // Default language
    this.aiResponseLanguage = 'en'; // Language for AI responses
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadConfiguration();
    this.syncUserProfile();
    this.loadPreviousConversations();
    this.startNewSession();
    
    // Initialize proactive engagement after a delay to ensure memory manager is ready
    setTimeout(() => {
      this.initializeProactiveEngagement();
    }, 3000);
  }

  initializeElements() {
    this.chatMessages = document.getElementById('chatMessages');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendBtn');
    this.voiceButton = document.getElementById('voiceBtn');
    this.settingsButton = document.getElementById('settingsBtn');

  }

  initializeEventListeners() {
    // Send message on Enter key
    this.messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button click
    this.sendButton?.addEventListener('click', () => {
      this.sendMessage();
    });

    // Voice button click
    this.voiceButton?.addEventListener('click', () => this.toggleVoiceMode());

    // Settings button click
    this.settingsButton?.addEventListener('click', () => this.showSettings());


  }

  async loadConfiguration() {
    try {
      // Load configuration from config.js
      if (typeof AZURE_CONFIG !== 'undefined' && AZURE_CONFIG.openai) {
        this.azureClient = new AzureAIClient(AZURE_CONFIG.openai);
        console.log('Azure AI client initialized successfully');
        
        // Initialize VoiceCallManager now that Azure client is ready
        this.voiceCallManager = new VoiceCallManager(this.azureClient, AZURE_CONFIG);
        console.log('Voice call manager initialized successfully');
        
        // Initialize Translation Service
        this.translationService = new AzureTranslationService(AZURE_CONFIG);
        console.log('Translation service initialized successfully');
      } else {
        throw new Error('Azure configuration not found');
      }
      
      // Initialize memory manager
      await this.memoryManager.initializeMemory();
      console.log('Memory system initialized successfully');
      

    } catch (error) {
      console.error('Failed to initialize Azure AI client:', error);
      this.azureClient = null;
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async syncUserProfile() {
    try {
      // Sync user names from authentication to memory system
      if (!this.memoryManager || !this.memoryManager.userPreferences) {
        console.warn('Memory manager or user preferences not initialized yet');
        return;
      }
      
      const userPreferences = this.memoryManager.userPreferences;
      
      // Check if userPreferences has the required methods before calling them
      if (typeof userPreferences.hasUserNames !== 'function' ||
          typeof userPreferences.getFullName !== 'function' ||
          typeof userPreferences.getPreferredName !== 'function' ||
          typeof userPreferences.setUserNames !== 'function') {
        console.warn('UserPreferences methods not available, skipping sync');
        return;
      }
      
      // Set user names if not already set or if they've changed
      if (!userPreferences.hasUserNames() || 
          userPreferences.getFullName() !== this.currentUser.fullName ||
          userPreferences.getPreferredName() !== this.currentUser.nickname) {
        
        await userPreferences.setUserNames(this.currentUser.fullName, this.currentUser.nickname);
        console.log('User profile synced with authentication data');
      }
    } catch (error) {
      console.error('Error syncing user profile:', error);
    }
  }

  async sendMessage(messageText = null) {
    const message = messageText || this.messageInput?.value.trim();
    if (!message) return;

    // Clear input
    if (this.messageInput) {
      this.messageInput.value = '';
    }

    // Add user message to chat
    this.addMessage(message, true);
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Detect user language
    if (this.translationService) {
      try {
        const detectedLanguage = await this.translationService.detectLanguage(message);
        if (detectedLanguage && detectedLanguage !== this.userLanguage) {
          this.userLanguage = detectedLanguage;
          console.log(`Language detected: ${detectedLanguage}`);
          
          // Update AI response language preference
          this.aiResponseLanguage = detectedLanguage;
        }
      } catch (error) {
        console.warn('Language detection failed:', error);
      }
    }

    // Show typing indicator
    const typingIndicator = this.showTypingIndicator();

    try {
      let response;
      
      if (this.azureClient) {
        // Get relevant memories and user context
        const relevantMemories = await this.memoryManager.getRelevantMemories(message, { limit: 5 });
        const userContext = await this.memoryManager.getUserContext();
        
        // Build enhanced conversation history with memory context
        const enhancedHistory = this.buildEnhancedHistory(relevantMemories, userContext);
        
        // Prepare memory context for AI
        const memoryContext = {
          userProfile: userContext.userProfile,
          recentMemories: userContext.recentMemories,
          emotionalPatterns: userContext.emotionalPatterns
        };
        
        // Enhance memory context with adaptive personality
        const enhancedMemoryContext = await this.enhanceMessageWithPersonality(memoryContext);
        
        // Add language context to memory
        enhancedMemoryContext.languageContext = {
          userLanguage: this.userLanguage,
          responseLanguage: this.aiResponseLanguage,
          supportsMixedLanguages: this.translationService?.supportsMixedLanguages || false
        };
        
        // Send message to Azure AI with enhanced context and memory
        response = await this.azureClient.sendMessage(message, enhancedHistory, enhancedMemoryContext);
      } else {
        // Use fallback responses
        response = this.getFallbackResponse(message);
      }

      // Remove typing indicator
      this.removeTypingIndicator();

      // Handle translation if needed
      let finalResponse = response;
      if (this.translationService && this.userLanguage !== 'en' && this.aiResponseLanguage !== 'en') {
        try {
          // Check if response needs translation
          const responseLanguage = await this.translationService.detectLanguage(response);
          if (responseLanguage === 'en' && this.aiResponseLanguage !== 'en') {
            // Translate English response to user's language
            finalResponse = await this.translationService.translateText(response, 'en', this.aiResponseLanguage);
            console.log(`Response translated from English to ${this.aiResponseLanguage}`);
          }
        } catch (error) {
          console.warn('Response translation failed:', error);
          // Use original response if translation fails
        }
      }

      // Add AI response to chat
      this.addMessage(finalResponse, false);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: finalResponse
      });

      // Detect user gender for adaptive personality
      await this.detectUserGender(message);

      // Analyze sentiment and store in memory
      const sentiment = await this.analyzeSentiment(message);
      
      // Identify and store coping strategies
      const copingStrategies = this.identifyCopingStrategies(message);
      if (copingStrategies.length > 0) {
        await this.storeCopingStrategies(copingStrategies);
      }

      // Detect relationship patterns
      const relationshipPatterns = this.detectRelationshipPatterns(message, response);
      if (relationshipPatterns.length > 0) {
        await this.storeRelationshipPatterns(relationshipPatterns);
      }

      // Store in memory with enhanced emotional context
      const emotionalContext = this.extractContext(message);
      const memoryEntry = {
        message: message,
        response: response,
        sentiment: sentiment,
        context: emotionalContext,
        sessionId: this.currentSessionId,
        timestamp: new Date().toISOString(),
        messageLength: message.length,
        responseLength: response.length,
        conversationTurn: this.conversationHistoryManager.getMessageCount(),
        copingStrategies: copingStrategies,
        relationshipPatterns: relationshipPatterns
      };
      
      // Store in all memory layers
      await this.memoryManager.storeMemory(memoryEntry);
      
      // Enhanced emotional memory storage with trigger detection
      if (this.memoryManager.emotionalMemory) {
        await this.memoryManager.emotionalMemory.store({
          message: memoryEntry.message,
          response: memoryEntry.response,
          sentiment: memoryEntry.sentiment,
          context: memoryEntry.context,
          sessionId: memoryEntry.sessionId,
          timestamp: memoryEntry.timestamp,
          messageLength: memoryEntry.messageLength,
          responseLength: memoryEntry.responseLength,
          conversationTurn: memoryEntry.conversationTurn,
          emotionalState: this.analyzeEmotionalState(message, sentiment),
          triggers: this.detectEmotionalTriggers(message, sentiment),
          therapyContext: this.extractTherapyContext(message, response)
        });
      }
      
      // Store in conversation history
      this.conversationHistoryManager.addMessage(message, true, {
        sentiment: sentiment,
        topics: this.extractTopics(message),
        entities: this.extractEntities(message),
        importance: this.calculateMessageImportance(message, sentiment)
      });
      
      this.conversationHistoryManager.addMessage(response, false, {
        topics: this.extractTopics(response),
        responseType: 'therapy'
      });

      // Auto-detect and create references for significant moments
      this.detectAndCreateAutoReferences(message, response, sentiment);

      // Speak response if voice mode is enabled
      if (this.isVoiceMode) {
        // Get appropriate voice for the language
        const voiceOptions = this.translationService ? 
          this.translationService.getVoiceForLanguage(this.aiResponseLanguage) : null;
        
        // Use browser TTS for voice output with language-specific voice
        await this.voiceCallManager.speakWithBrowserTTS(finalResponse, voiceOptions);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.removeTypingIndicator();
      this.addMessage('I apologize, but I\'m having trouble responding right now. Please try again.', false);
    }
  }

  addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    messageDiv.setAttribute('data-timestamp', new Date().toISOString());
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    
    if (this.chatMessages) {
      this.chatMessages.appendChild(messageDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Add fade-in animation
    setTimeout(() => {
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    }, 10);
  }

  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typing-indicator';
    
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      indicatorDiv.appendChild(dot);
    }
    
    typingDiv.appendChild(indicatorDiv);
    
    if (this.chatMessages) {
      this.chatMessages.appendChild(typingDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    return typingDiv;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  async toggleVoiceMode() {
    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.isListening = true;
      this.updateVoiceButton('listening');
      
      const transcript = await this.speechToText.startListening();
      
      if (transcript) {
        await this.sendMessage(transcript);
      }
    } catch (error) {
      console.error('Voice recognition error:', error);
      this.addMessage('Sorry, I couldn\'t hear you clearly. Please try typing your message.', false);
    } finally {
      this.isListening = false;
      this.updateVoiceButton('idle');
    }
  }

  stopListening() {
    this.speechToText.stopListening();
    this.isListening = false;
    this.updateVoiceButton('idle');
  }

  updateVoiceButton(state) {
    if (!this.voiceButton) return;
    
    const icon = this.voiceButton.querySelector('i');
    if (!icon) return;
    
    switch (state) {
      case 'listening':
        icon.className = 'fas fa-stop';
        this.voiceButton.classList.add('listening');
        break;
      case 'idle':
      default:
        icon.className = 'fas fa-microphone';
        this.voiceButton.classList.remove('listening');
        break;
    }
  }

  getFallbackResponse(message) {
    return "I'm having trouble connecting to my AI services right now. Please check your internet connection and try again.";
  }

  async analyzeSentiment(message) {
    try {
      if (this.azureClient) {
        const sentiment = await this.azureClient.analyzeSentiment(message);
        this.storeSentiment(sentiment);
        return sentiment;
      }
      return null;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return null;
    }
  }

  storeSentiment(sentiment) {
    // Store sentiment data for session insights
    const sessionData = JSON.parse(localStorage.getItem('hearuai_session_data') || '{}');
    
    if (!sessionData[this.currentSessionId]) {
      sessionData[this.currentSessionId] = {
        startTime: new Date().toISOString(),
        sentiments: [],
        messageCount: 0
      };
    }
    
    sessionData[this.currentSessionId].sentiments.push({
      sentiment: sentiment,
      timestamp: new Date().toISOString()
    });
    sessionData[this.currentSessionId].messageCount++;
    
    localStorage.setItem('hearuai_session_data', JSON.stringify(sessionData));
  }

  async showSettings() {
    // Get current user preferences
    const userPrefs = await this.memoryManager?.memoryLayers?.userPreferences?.getAll() || {};
    const genderPrefs = this.memoryManager?.memoryLayers?.userPreferences?.getGenderPreference() || {};
    
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-content">
        <h3>Chat Settings</h3>
        
        <div class="setting-section">
          <h4>Voice & Audio</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="voiceModeToggle" ${this.isVoiceMode ? 'checked' : ''}>
              Enable voice responses
            </label>
          </div>
          <div class="setting-item">
            <label>
              Voice speed:
              <input type="range" id="voiceSpeed" min="0.5" max="2" step="0.1" value="0.9">
            </label>
          </div>
        </div>
        
        <div class="setting-section">
          <h4>AI Personality</h4>
          <div class="setting-item">
            <label>
              Your gender (for personalized responses):
              <select id="userGender">
                <option value="" ${!genderPrefs.gender ? 'selected' : ''}>Prefer not to say</option>
                <option value="male" ${genderPrefs.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${genderPrefs.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="non-binary" ${genderPrefs.gender === 'non-binary' ? 'selected' : ''}>Non-binary</option>
                <option value="other" ${genderPrefs.gender === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </label>
          </div>
          <div class="setting-item">
            <label>
              AI personality preference:
              <select id="aiPersonalityPref">
                <option value="auto" ${genderPrefs.genderPreference === 'auto' ? 'selected' : ''}>Auto (adaptive)</option>
                <option value="female" ${genderPrefs.genderPreference === 'female' ? 'selected' : ''}>Nurturing & empathetic</option>
                <option value="male" ${genderPrefs.genderPreference === 'male' ? 'selected' : ''}>Solution-focused & supportive</option>
                <option value="balanced" ${genderPrefs.genderPreference === 'balanced' ? 'selected' : ''}>Balanced approach</option>
              </select>
            </label>
          </div>
          <div class="setting-item">
            <label>
              Communication style:
              <select id="communicationStyle">
                <option value="balanced" ${userPrefs.communicationStyle === 'balanced' ? 'selected' : ''}>Balanced</option>
                <option value="casual" ${userPrefs.communicationStyle === 'casual' ? 'selected' : ''}>Casual & friendly</option>
                <option value="professional" ${userPrefs.communicationStyle === 'professional' ? 'selected' : ''}>Professional</option>
              </select>
            </label>
          </div>
        </div>
        
        <div class="setting-section">
          <h4>Session Preferences</h4>
          <div class="setting-item">
            <label>
              Session length preference:
              <select id="sessionLength">
                <option value="short" ${userPrefs.sessionPreferences?.sessionLength === 'short' ? 'selected' : ''}>Short (brief responses)</option>
                <option value="medium" ${userPrefs.sessionPreferences?.sessionLength === 'medium' ? 'selected' : ''}>Medium (balanced)</option>
                <option value="long" ${userPrefs.sessionPreferences?.sessionLength === 'long' ? 'selected' : ''}>Long (detailed responses)</option>
              </select>
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="proactiveEngagement" ${userPrefs.sessionPreferences?.proactiveEngagement !== false ? 'checked' : ''}>
              Enable proactive check-ins
            </label>
          </div>
        </div>
        
        <div class="setting-section">
          <h4>Language Preferences</h4>
          <div class="setting-item">
            <label>
              Preferred Language:
              <select id="preferredLanguage">
                <option value="en" ${userPrefs.preferredLanguage === 'en' ? 'selected' : ''}>English</option>
                <option value="hi" ${userPrefs.preferredLanguage === 'hi' ? 'selected' : ''}>हिंदी (Hindi)</option>
                <option value="ta" ${userPrefs.preferredLanguage === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
                <option value="te" ${userPrefs.preferredLanguage === 'te' ? 'selected' : ''}>తెలుగు (Telugu)</option>
                <option value="kn" ${userPrefs.preferredLanguage === 'kn' ? 'selected' : ''}>ಕನ್ನಡ (Kannada)</option>
                <option value="ml" ${userPrefs.preferredLanguage === 'ml' ? 'selected' : ''}>മലയാളം (Malayalam)</option>
                <option value="gu" ${userPrefs.preferredLanguage === 'gu' ? 'selected' : ''}>ગુજરાતી (Gujarati)</option>
                <option value="mr" ${userPrefs.preferredLanguage === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
                <option value="bn" ${userPrefs.preferredLanguage === 'bn' ? 'selected' : ''}>বাংলা (Bengali)</option>
                <option value="pa" ${userPrefs.preferredLanguage === 'pa' ? 'selected' : ''}>ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="or" ${userPrefs.preferredLanguage === 'or' ? 'selected' : ''}>ଓଡ଼ିଆ (Odia)</option>
                <option value="as" ${userPrefs.preferredLanguage === 'as' ? 'selected' : ''}>অসমীয়া (Assamese)</option>
                <option value="ur" ${userPrefs.preferredLanguage === 'ur' ? 'selected' : ''}>اردو (Urdu)</option>
              </select>
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="autoDetectLanguage" ${userPrefs.autoDetectLanguage !== false ? 'checked' : ''}>
              Auto-detect language from messages
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="supportMixedLanguages" ${userPrefs.supportMixedLanguages !== false ? 'checked' : ''}>
              Support mixed languages (Hinglish, Manglish, etc.)
            </label>
          </div>
        </div>
        
        <div class="setting-section">
          <h4>Session Management</h4>
          <div class="setting-item">
            <button onclick="hearuaiChat.exportSession()">Export Session</button>
            <button onclick="hearuaiChat.clearSession()">Clear Session</button>
          </div>
        </div>
        
        <div class="settings-actions">
          <button class="save-settings" onclick="hearuaiChat.saveSettings()">Save Settings</button>
          <button class="close-settings" onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for settings
    document.getElementById('voiceModeToggle')?.addEventListener('change', (e) => {
      this.isVoiceMode = e.target.checked;
    });
    
    document.getElementById('voiceSpeed')?.addEventListener('input', (e) => {
      this.textToSpeech.rate = parseFloat(e.target.value);
    });
  }
  
  // Save user settings and preferences
  async saveSettings() {
    try {
      if (!this.memoryManager?.memoryLayers?.userPreferences) {
        console.warn('User preferences not available');
        return;
      }
      
      // Get form values
      const userGender = document.getElementById('userGender')?.value || '';
      const aiPersonalityPref = document.getElementById('aiPersonalityPref')?.value || 'auto';
      const communicationStyle = document.getElementById('communicationStyle')?.value || 'balanced';
      const sessionLength = document.getElementById('sessionLength')?.value || 'medium';
      const proactiveEngagement = document.getElementById('proactiveEngagement')?.checked !== false;
      
      // Get language preferences
      const preferredLanguage = document.getElementById('preferredLanguage')?.value || 'en';
      const autoDetectLanguage = document.getElementById('autoDetectLanguage')?.checked !== false;
      const supportMixedLanguages = document.getElementById('supportMixedLanguages')?.checked !== false;
      
      // Update gender preferences
      await this.memoryManager.memoryLayers.userPreferences.setGenderPreference(
        userGender, 
        aiPersonalityPref
      );
      
      // Update communication and session preferences
      await this.memoryManager.memoryLayers.userPreferences.update({
        communicationStyle: communicationStyle,
        sessionPreferences: {
          sessionLength: sessionLength,
          proactiveEngagement: proactiveEngagement,
          voiceEnabled: this.isVoiceMode,
          reminderFrequency: 'weekly'
        },
        languagePreferences: {
          preferredLanguage: preferredLanguage,
          autoDetectLanguage: autoDetectLanguage,
          supportMixedLanguages: supportMixedLanguages
        }
      });
      
      // Update current language settings
      if (this.translationService) {
        this.translationService.setCurrentLanguage(preferredLanguage);
        this.userLanguage = preferredLanguage;
        this.aiResponseLanguage = preferredLanguage;
      }
      
      // Show success notification
      this.showSuccessNotification('Settings saved successfully!');
      
      // Close modal
      document.querySelector('.settings-modal')?.remove();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showErrorNotification('Failed to save settings. Please try again.');
    }
  }
  
  // Show success notification
  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  exportSession() {
    try {
      // Get current session data from conversation history manager
      const currentSession = this.conversationHistoryManager.getCurrentSession();
      
      if (!currentSession) {
        alert('No active session to export.');
        return;
      }
      
      // Create comprehensive export data
      const exportData = {
        sessionInfo: {
          sessionId: this.currentSessionId,
          title: currentSession.metadata.title,
          startTime: currentSession.startTime,
          endTime: currentSession.endTime || new Date().toISOString(),
          tags: currentSession.metadata.tags,
          goals: currentSession.metadata.goals
        },
        messages: currentSession.messages,
        statistics: {
          messageCount: currentSession.messages.length,
          duration: currentSession.endTime ? 
            new Date(currentSession.endTime) - new Date(currentSession.startTime) : 
            new Date() - new Date(currentSession.startTime),
          topics: [...new Set(currentSession.messages.flatMap(m => m.metadata?.topics || []))],
          averageSentiment: this.calculateAverageSentiment(currentSession.messages)
        },
        exportTimestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `hearuai-session-${this.currentSessionId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      console.log('Session exported successfully');
    } catch (error) {
      console.error('Error exporting session:', error);
      alert('Failed to export session. Please try again.');
    }
  }
  
  calculateAverageSentiment(messages) {
    const sentiments = messages
      .filter(m => m.metadata?.sentiment !== undefined)
      .map(m => m.metadata.sentiment);
    
    if (sentiments.length === 0) return 0;
    
    return sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length;
  }

  async loadPreviousConversations() {
    try {
      const recentSessions = this.conversationHistoryManager.getRecentSessions(3);
      if (recentSessions.length > 0) {
        console.log(`Loaded ${recentSessions.length} previous conversation sessions`);
        
        // Display recent session info in chat if helpful
        this.displaySessionHistory(recentSessions);
      }
    } catch (error) {
      console.error('Error loading previous conversations:', error);
    }
  }

  startNewSession() {
    const sessionMetadata = {
      title: `Therapy Session - ${new Date().toLocaleDateString()}`,
      tags: ['therapy', 'support'],
      goals: ['emotional support', 'personal growth']
    };
    
    this.conversationHistoryManager.startSession(this.currentSessionId, sessionMetadata);
    console.log(`Started new session: ${this.currentSessionId}`);
  }

  displaySessionHistory(recentSessions) {
    if (recentSessions.length === 0) return;
    
    const welcomeMessage = `Welcome back! I remember our previous conversations. ` +
      `We've had ${recentSessions.length} recent sessions. ` +
      `How are you feeling today?`;
    
    this.addMessage(welcomeMessage, false);
  }

  buildEnhancedHistory(relevantMemories, userContext) {
    let enhancedHistory = [...this.conversationHistory.slice(-10)];
    
    if (relevantMemories.length > 0) {
      const memoryContext = {
        role: 'system',
        content: `Previous relevant conversations: ${relevantMemories.map(m => 
          `User: ${m.message} | Response: ${m.response}`
        ).join(' | ')}`
      };
      enhancedHistory.unshift(memoryContext);
    }
    
    if (userContext) {
      const contextMessage = {
        role: 'system',
        content: `User context: ${JSON.stringify(userContext)}`
      };
      enhancedHistory.unshift(contextMessage);
    }
    
    return enhancedHistory;
  }

  extractContext(message) {
    // Extract topics, emotions, and themes from the message
    const topics = [];
    const emotions = [];
    const themes = [];
    
    if (!message || typeof message !== 'string') {
      return {
        topics,
        emotions,
        themes,
        messageLength: 0,
        wordCount: 0
      };
    }
    
    // Simple keyword-based extraction (can be enhanced with NLP)
    const emotionKeywords = {
      'happy': ['happy', 'joy', 'excited', 'glad', 'cheerful'],
      'sad': ['sad', 'depressed', 'down', 'upset', 'crying'],
      'angry': ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
      'anxious': ['anxious', 'worried', 'nervous', 'stressed', 'panic'],
      'calm': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil']
    };
    
    const topicKeywords = {
      'work': ['work', 'job', 'career', 'office', 'boss', 'colleague'],
      'family': ['family', 'mother', 'father', 'parent', 'sibling', 'child'],
      'relationship': ['relationship', 'partner', 'boyfriend', 'girlfriend', 'marriage'],
      'health': ['health', 'sick', 'doctor', 'medicine', 'hospital', 'pain'],
      'education': ['school', 'university', 'study', 'exam', 'teacher', 'student']
    };
    
    const messageLower = message.toLowerCase();
    
    // Extract emotions
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        emotions.push(emotion);
      }
    }
    
    // Extract topics
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return {
      topics,
      emotions,
      themes,
      messageLength: message.length,
      wordCount: message.split(' ').length
    };
  }
  
  extractTopics(message) {
    if (!message || typeof message !== 'string') {
      return [];
    }
    const context = this.extractContext(message);
    return context.topics || [];
  }
  
  extractEntities(message) {
    // Simple entity extraction - can be enhanced with NLP libraries
    const entities = [];
    if (!message || typeof message !== 'string') {
      return entities;
    }
    const messageLower = message.toLowerCase();
    
    // Extract person names (simple pattern matching)
    const namePattern = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g;
    const names = message.match(namePattern) || [];
    entities.push(...names.map(name => ({ type: 'person', value: name })));
    
    // Extract dates
    const datePattern = /\b(today|tomorrow|yesterday|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})\b/gi;
    const dates = message.match(datePattern) || [];
    entities.push(...dates.map(date => ({ type: 'date', value: date })));
    
    // Extract locations
    const locationKeywords = ['home', 'work', 'school', 'hospital', 'office', 'park', 'restaurant'];
    locationKeywords.forEach(location => {
      if (messageLower.includes(location)) {
        entities.push({ type: 'location', value: location });
      }
    });
    
    return entities;
  }
  
  calculateMessageImportance(message, sentiment) {
    let importance = 0.5; // Base importance
    
    // Increase importance for emotional content
    if (sentiment && Math.abs(sentiment) > 0.7) {
      importance += 0.3;
    }
    
    // Increase importance for longer messages
    if (message.length > 100) {
      importance += 0.1;
    }
    
    // Increase importance for certain keywords
    const importantKeywords = ['crisis', 'emergency', 'suicide', 'help', 'urgent', 'important', 'breakthrough'];
    const messageLower = message.toLowerCase();
    
    importantKeywords.forEach(keyword => {
      if (messageLower.includes(keyword)) {
        importance += 0.2;
      }
    });
    
    // Cap importance at 1.0
    return Math.min(importance, 1.0);
  }
  
  // Enhanced emotional analysis methods
  analyzeEmotionalState(message, sentiment) {
    const emotionalState = {
      primary: sentiment.label || 'neutral',
      intensity: Math.abs(sentiment.score || 0),
      valence: sentiment.score > 0 ? 'positive' : sentiment.score < 0 ? 'negative' : 'neutral',
      arousal: this.calculateArousal(message),
      complexity: this.calculateEmotionalComplexity(message)
    };
    
    // Detect secondary emotions
    emotionalState.secondary = this.detectSecondaryEmotions(message);
    
    return emotionalState;
  }
  
  detectEmotionalTriggers(message, sentiment) {
    const triggers = [];
    
    // Only detect triggers for negative emotional responses
    if (sentiment.score < -0.2) {
      const triggerPatterns = {
        stress: /stress|pressure|overwhelm|burden|deadline/i,
        anxiety: /anxious|worry|nervous|panic|fear/i,
        sadness: /sad|depressed|down|lonely|hopeless/i,
        anger: /angry|frustrated|mad|irritated|furious/i,
        work: /work|job|boss|colleague|office|meeting/i,
        relationship: /relationship|partner|family|friend|conflict/i,
        health: /sick|pain|tired|exhausted|illness/i,
        financial: /money|bills|debt|financial|broke/i,
        rejection: /rejected|ignored|dismissed|excluded/i,
        failure: /failed|mistake|wrong|stupid|useless/i
      };
      
      Object.entries(triggerPatterns).forEach(([trigger, pattern]) => {
        if (pattern.test(message)) {
          triggers.push({
            type: trigger,
            severity: Math.abs(sentiment.score),
            context: this.extractTriggerContext(message, trigger)
          });
        }
      });
    }
    
    return triggers;
  }
  
  extractTherapyContext(message, response) {
    return {
      sessionPhase: this.determineSessionPhase(),
      therapeuticTechniques: this.identifyTherapeuticTechniques(response),
      userEngagement: this.assessUserEngagement(message),
      progressIndicators: this.identifyProgressIndicators(message),
      copingStrategies: this.identifyCopingStrategies(message),
      supportNeeds: this.assessSupportNeeds(message, response)
    };
  }
  
  calculateArousal(message) {
    const highArousalWords = /excited|energetic|intense|overwhelming|panic|rage|ecstatic/i;
    const lowArousalWords = /calm|peaceful|tired|relaxed|sleepy|content/i;
    
    if (highArousalWords.test(message)) return 'high';
    if (lowArousalWords.test(message)) return 'low';
    return 'medium';
  }
  
  calculateEmotionalComplexity(message) {
    const emotionWords = message.match(/\b(happy|sad|angry|fear|surprise|disgust|joy|love|hate|hope|despair|excited|calm|anxious|confident|confused|proud|ashamed|grateful|jealous|content)\b/gi);
    const uniqueEmotions = emotionWords ? [...new Set(emotionWords.map(w => w.toLowerCase()))] : [];
    
    if (uniqueEmotions.length >= 3) return 'complex';
    if (uniqueEmotions.length === 2) return 'mixed';
    return 'simple';
  }
  
  detectSecondaryEmotions(message) {
    const emotionPatterns = {
      hope: /hope|optimistic|better|improve|future/i,
      fear: /scared|afraid|terrified|worried/i,
      shame: /ashamed|embarrassed|guilty|regret/i,
      pride: /proud|accomplished|achieved|success/i,
      gratitude: /grateful|thankful|appreciate|blessed/i,
      confusion: /confused|lost|unclear|don't understand/i,
      determination: /determined|will|going to|committed/i,
      vulnerability: /vulnerable|exposed|raw|open/i
    };
    
    const detected = [];
    Object.entries(emotionPatterns).forEach(([emotion, pattern]) => {
      if (pattern.test(message)) {
        detected.push(emotion);
      }
    });
    
    return detected;
  }
  
  extractTriggerContext(message, triggerType) {
    // Extract surrounding context for the trigger
    const sentences = message.split(/[.!?]+/);
    const triggerSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(triggerType)
    );
    
    return {
      sentence: triggerSentence?.trim(),
      intensity: this.assessTriggerIntensity(triggerSentence || message),
      timeReference: this.extractTimeReference(message),
      peopleInvolved: this.extractPeopleReferences(message)
    };
  }
  
  determineSessionPhase() {
    const messageCount = this.conversationHistoryManager.getMessageCount();
    if (messageCount <= 3) return 'opening';
    if (messageCount <= 10) return 'exploration';
    if (messageCount <= 20) return 'working';
    return 'integration';
  }
  
  identifyTherapeuticTechniques(response) {
    const techniques = [];
    
    if (/how does that make you feel|what emotions/i.test(response)) {
      techniques.push('emotional_exploration');
    }
    if (/let's try|practice|exercise/i.test(response)) {
      techniques.push('skill_building');
    }
    if (/reframe|different perspective|another way/i.test(response)) {
      techniques.push('cognitive_restructuring');
    }
    if (/notice|aware|mindful/i.test(response)) {
      techniques.push('mindfulness');
    }
    if (/strength|capable|resilient/i.test(response)) {
      techniques.push('strength_based');
    }
    
    return techniques;
  }
  
  assessUserEngagement(message) {
    const length = message.length;
    const emotionalWords = (message.match(/\b(feel|emotion|think|believe|hope|fear|love|hate|want|need)\b/gi) || []).length;
    const personalPronouns = (message.match(/\b(I|me|my|myself)\b/gi) || []).length;
    
    let score = 0;
    if (length > 50) score += 1;
    if (length > 150) score += 1;
    if (emotionalWords > 2) score += 1;
    if (personalPronouns > 3) score += 1;
    
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
  
  identifyProgressIndicators(message) {
    const indicators = [];
    
    if (/better|improving|progress|growth/i.test(message)) {
      indicators.push('improvement');
    }
    if (/understand|realize|insight|clarity/i.test(message)) {
      indicators.push('insight');
    }
    if (/cope|manage|handle|deal with/i.test(message)) {
      indicators.push('coping_development');
    }
    if (/confident|strong|capable|resilient/i.test(message)) {
      indicators.push('self_efficacy');
    }
    
    return indicators;
  }
  
  identifyCopingStrategies(message) {
    const strategies = [];
    const text = message.toLowerCase();
    
    // Common coping strategy patterns
    const patterns = {
      'breathing': /breath|breathing|inhale|exhale|deep breath/,
      'exercise': /exercise|walk|run|gym|workout|physical activity/,
      'meditation': /meditat|mindful|calm|relax|zen|peace/,
      'journaling': /write|journal|diary|note|reflect/,
      'music': /music|song|listen|playlist|sound/,
      'social': /friend|family|talk|call|support|connect/,
      'nature': /nature|outside|park|garden|fresh air|outdoors/,
      'creative': /draw|paint|create|art|craft|hobby/,
      'grounding': /ground|5 things|senses|present|here and now/,
      'positive_self_talk': /affirmation|positive|self-talk|encourage/,
      'problem_solving': /plan|solution|step|organize|prioritize/,
      'distraction': /distract|movie|book|game|activity/
    };
    
    for (const [strategy, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        strategies.push(strategy);
      }
    }
    
    return strategies;
  }
  
  // Store identified coping strategies in user preferences
  async storeCopingStrategies(strategies) {
    if (this.memoryManager && this.memoryManager.memoryLayers && this.memoryManager.memoryLayers.userPreferences) {
      for (const strategy of strategies) {
        await this.memoryManager.memoryLayers.userPreferences.addCopingStrategy(strategy);
      }
    }
  }

  // Detect relationship patterns from conversation
  detectRelationshipPatterns(message, response) {
    const patterns = [];
    const text = message.toLowerCase();
    
    // Relationship pattern indicators
    const relationshipPatterns = {
      'conflict_resolution': /conflict|argue|fight|disagree|resolve|compromise/,
      'communication_style': /communicate|express|listen|understand|explain/,
      'emotional_support': /support|comfort|care|empathy|understanding/,
      'boundary_setting': /boundary|limit|say no|respect|space/,
      'trust_issues': /trust|betrayal|honest|reliable|depend/,
      'attachment_style': /close|distance|independent|clingy|secure/,
      'social_anxiety': /social|crowd|people|shy|awkward|nervous/,
      'family_dynamics': /family|parent|sibling|relative|home/,
      'romantic_relationship': /partner|boyfriend|girlfriend|spouse|dating/,
      'friendship': /friend|buddy|companion|peer|social circle/
    };
    
    for (const [pattern, regex] of Object.entries(relationshipPatterns)) {
      if (regex.test(text)) {
        patterns.push({
          type: pattern,
          context: this.extractRelationshipContext(message, pattern),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return patterns;
  }

  // Extract specific context for relationship patterns
  extractRelationshipContext(message, patternType) {
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const relevantSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes(patternType.replace('_', ' ')) ||
      this.isRelatedToPattern(sentence, patternType)
    );
    
    return {
      relevantText: relevantSentences.join('. '),
      messageLength: message.length,
      emotionalTone: this.detectEmotionalTone(message)
    };
  }

  // Check if sentence is related to relationship pattern
  isRelatedToPattern(sentence, patternType) {
    const patternKeywords = {
      'conflict_resolution': ['problem', 'issue', 'solution', 'work out'],
      'communication_style': ['talk', 'speak', 'conversation', 'discuss'],
      'emotional_support': ['help', 'there for', 'understand', 'feel'],
      'boundary_setting': ['no', 'stop', 'enough', 'respect'],
      'trust_issues': ['believe', 'faith', 'doubt', 'suspicious'],
      'attachment_style': ['need', 'want', 'alone', 'together'],
      'social_anxiety': ['uncomfortable', 'worried', 'scared', 'nervous'],
      'family_dynamics': ['mother', 'father', 'sister', 'brother'],
      'romantic_relationship': ['love', 'relationship', 'together', 'couple'],
      'friendship': ['hang out', 'spend time', 'close', 'best friend']
    };
    
    const keywords = patternKeywords[patternType] || [];
    return keywords.some(keyword => sentence.toLowerCase().includes(keyword));
  }

  // Store relationship patterns in user preferences
  async storeRelationshipPatterns(patterns) {
    if (this.memoryManager && this.memoryManager.memoryLayers && this.memoryManager.memoryLayers.userPreferences) {
      for (const pattern of patterns) {
        await this.memoryManager.memoryLayers.userPreferences.addRelationshipPattern(pattern);
      }
    }
  }

  // Detect emotional tone for relationship context
  detectEmotionalTone(message) {
    const text = message.toLowerCase();
    
    const toneIndicators = {
      'positive': /happy|joy|excited|grateful|love|amazing|wonderful|great/,
      'negative': /sad|angry|frustrated|upset|hurt|disappointed|terrible|awful/,
      'anxious': /worried|nervous|scared|anxious|panic|stress|overwhelmed/,
      'neutral': /okay|fine|normal|usual|regular|standard/,
      'confused': /confused|unsure|don't know|not sure|unclear|puzzled/,
      'hopeful': /hope|optimistic|better|improve|positive|forward|future/
    };
    
    for (const [tone, regex] of Object.entries(toneIndicators)) {
      if (regex.test(text)) {
        return tone;
      }
    }
    
    return 'neutral';
  }

  // Detect user gender from conversation patterns
  async detectUserGender(message) {
    const text = message.toLowerCase();
    let genderScore = { male: 0, female: 0, neutral: 0 };
    
    // Gender indicator patterns (based on linguistic research)
    const genderIndicators = {
      female: {
        pronouns: /\b(she|her|hers|herself)\b/g,
        selfReference: /\b(i'm a (woman|girl|lady|female)|i am a (woman|girl|lady|female))\b/g,
        linguisticPatterns: /\b(really|totally|absolutely|definitely|literally)\b/g,
        emotionalExpression: /\b(feel|feeling|feelings|emotional|emotions)\b/g,
        relationships: /\b(boyfriend|husband|partner|relationship)\b/g
      },
      male: {
        pronouns: /\b(he|him|his|himself)\b/g,
        selfReference: /\b(i'm a (man|guy|male|dude)|i am a (man|guy|male|dude))\b/g,
        linguisticPatterns: /\b(basically|actually|obviously|clearly)\b/g,
        directness: /\b(fix|solve|handle|deal with|tackle)\b/g,
        relationships: /\b(girlfriend|wife|partner|relationship)\b/g
      }
    };
    
    // Score based on patterns
    for (const [gender, patterns] of Object.entries(genderIndicators)) {
      for (const [category, regex] of Object.entries(patterns)) {
        const matches = (text.match(regex) || []).length;
        genderScore[gender] += matches;
      }
    }
    
    // Determine most likely gender
    const maxScore = Math.max(genderScore.male, genderScore.female);
    if (maxScore === 0) return null; // No clear indicators
    
    const detectedGender = genderScore.male > genderScore.female ? 'male' : 'female';
    const confidence = maxScore / (genderScore.male + genderScore.female + genderScore.neutral);
    
    // Only update if confidence is high enough
    if (confidence > 0.6 && this.memoryManager?.memoryLayers?.userPreferences) {
      const currentPrefs = this.memoryManager.memoryLayers.userPreferences.getGenderPreference();
      if (!currentPrefs.gender) {
        await this.memoryManager.memoryLayers.userPreferences.setGenderPreference(detectedGender);
      }
    }
    
    return { gender: detectedGender, confidence };
  }

  // Get adaptive personality settings based on user gender, preferences, and current mood
  async getAdaptivePersonality() {
    if (!this.memoryManager?.memoryLayers?.userPreferences) {
      return { tone: 'balanced', style: 'supportive' };
    }
    
    const genderPrefs = this.memoryManager.memoryLayers.userPreferences.getGenderPreference();
    const userGender = genderPrefs.gender;
    const genderPreference = genderPrefs.genderPreference || 'auto';
    const userPrefs = await this.memoryManager.memoryLayers.userPreferences.getAll();
    
    // Get current emotional state and mood patterns
    const currentMood = await this.getCurrentMoodState();
    const emotionalPatterns = await this.getEmotionalPatterns();
    
    // Base personality from gender preferences
    let aiPersonality = {
      tone: 'balanced',
      style: 'supportive',
      communicationStyle: 'empathetic',
      responseLength: 'medium',
      emotionalSupport: 'balanced',
      validationLevel: 'moderate',
      adaptationLevel: 'standard'
    };
    
    // Adapt based on user's gender preference for AI
    if (genderPreference === 'female' || (genderPreference === 'auto' && userGender === 'male')) {
      aiPersonality = {
        ...aiPersonality,
        tone: 'warm',
        style: 'nurturing',
        communicationStyle: 'empathetic',
        responseLength: 'detailed',
        emotionalSupport: 'high',
        validationLevel: 'high'
      };
    } else if (genderPreference === 'male' || (genderPreference === 'auto' && userGender === 'female')) {
      aiPersonality = {
        ...aiPersonality,
        tone: 'supportive',
        style: 'solution-focused',
        communicationStyle: 'direct-empathetic',
        responseLength: 'concise',
        emotionalSupport: 'balanced',
        validationLevel: 'moderate'
      };
    }
    
    // Mood-based adaptations
    if (currentMood) {
      aiPersonality = this.adaptPersonalityToMood(aiPersonality, currentMood, emotionalPatterns);
    }
    
    // User preference adaptations
    if (userPrefs.communicationStyle) {
      aiPersonality.communicationStyle = this.blendCommunicationStyles(
        aiPersonality.communicationStyle, 
        userPrefs.communicationStyle
      );
    }
    
    if (userPrefs.sessionPreferences?.sessionLength) {
      aiPersonality.responseLength = this.adaptResponseLength(
        aiPersonality.responseLength,
        userPrefs.sessionPreferences.sessionLength
      );
    }
    
    return aiPersonality;
  }

  // Apply adaptive personality to message context
  async enhanceMessageWithPersonality(memoryContext) {
    const personality = await this.getAdaptivePersonality();
    
    return {
      ...memoryContext,
      aiPersonality: personality,
      adaptiveInstructions: this.generatePersonalityInstructions(personality),
      moodAdaptations: personality.moodAdaptations || []
    };
  }

  // Generate specific instructions for AI personality adaptation
  generatePersonalityInstructions(personality) {
    const instructions = [];
    
    if (personality.tone === 'warm') {
      instructions.push('Use warm, caring language with emotional validation');
      instructions.push('Include supportive phrases and gentle encouragement');
    } else if (personality.tone === 'supportive') {
      instructions.push('Balance emotional support with practical guidance');
      instructions.push('Offer both validation and actionable suggestions');
    } else if (personality.tone === 'gentle') {
      instructions.push('Use gentle, soothing language to provide comfort');
      instructions.push('Focus on emotional safety and reassurance');
    } else if (personality.tone === 'energetic') {
      instructions.push('Use uplifting, motivational language');
      instructions.push('Encourage positive action and forward momentum');
    }
    
    if (personality.style === 'nurturing') {
      instructions.push('Focus on emotional comfort and understanding');
      instructions.push('Use inclusive, protective language');
    } else if (personality.style === 'solution-focused') {
      instructions.push('Emphasize practical solutions and coping strategies');
      instructions.push('Provide clear, actionable advice while maintaining empathy');
    } else if (personality.style === 'crisis-aware') {
      instructions.push('Prioritize emotional safety and immediate support');
      instructions.push('Use calm, grounding language and offer immediate coping strategies');
    }
    
    if (personality.responseLength === 'detailed') {
      instructions.push('Provide comprehensive responses with thorough explanations');
    } else if (personality.responseLength === 'concise') {
      instructions.push('Keep responses focused and to the point while remaining supportive');
    } else if (personality.responseLength === 'brief') {
      instructions.push('Provide short, immediate support with key points only');
    }
    
    if (personality.emotionalSupport === 'high') {
      instructions.push('Prioritize emotional validation and deep empathy');
    } else if (personality.emotionalSupport === 'crisis') {
      instructions.push('Focus on immediate emotional stabilization and safety');
    }
    
    if (personality.moodAdaptations && personality.moodAdaptations.length > 0) {
      instructions.push(personality.moodAdaptations.join('. '));
    }
    
    return instructions.join('. ');
  }
  
  // Adapt personality based on current mood state
  adaptPersonalityToMood(basePersonality, currentMood, emotionalPatterns) {
    const adaptedPersonality = { ...basePersonality };
    const moodAdaptations = [];
    
    // Handle crisis or severe emotional states
    if (currentMood.riskLevel === 'high' || currentMood.intensity > 0.8) {
      adaptedPersonality.style = 'crisis-aware';
      adaptedPersonality.tone = 'gentle';
      adaptedPersonality.responseLength = 'brief';
      adaptedPersonality.emotionalSupport = 'crisis';
      adaptedPersonality.validationLevel = 'high';
      moodAdaptations.push('Prioritize immediate emotional safety and crisis support');
      moodAdaptations.push('Use grounding techniques and immediate coping strategies');
    }
    // Handle low mood or depression indicators
    else if (currentMood.dominantEmotion === 'sadness' || currentMood.energy < 0.3) {
      adaptedPersonality.tone = 'gentle';
      adaptedPersonality.emotionalSupport = 'high';
      adaptedPersonality.validationLevel = 'high';
      moodAdaptations.push('Focus on emotional validation and gentle encouragement');
      moodAdaptations.push('Avoid overwhelming with too many suggestions');
    }
    // Handle anxiety or stress
    else if (currentMood.dominantEmotion === 'anxiety' || currentMood.arousal > 0.7) {
      adaptedPersonality.tone = 'calm';
      adaptedPersonality.style = 'grounding';
      adaptedPersonality.responseLength = 'concise';
      moodAdaptations.push('Use calming, grounding language');
      moodAdaptations.push('Offer immediate anxiety management techniques');
    }
    // Handle positive or energetic moods
    else if (currentMood.dominantEmotion === 'joy' || currentMood.energy > 0.7) {
      adaptedPersonality.tone = 'energetic';
      adaptedPersonality.style = 'motivational';
      moodAdaptations.push('Match positive energy while maintaining therapeutic focus');
      moodAdaptations.push('Encourage building on current positive momentum');
    }
    
    // Consider emotional patterns for long-term adaptations
    if (emotionalPatterns) {
      if (emotionalPatterns.volatility > 0.7) {
        adaptedPersonality.tone = 'stable';
        moodAdaptations.push('Provide consistent, stable emotional anchoring');
      }
      
      if (emotionalPatterns.progressTrend < 0) {
        adaptedPersonality.emotionalSupport = 'high';
        moodAdaptations.push('Focus on rebuilding confidence and hope');
      }
    }
    
    adaptedPersonality.moodAdaptations = moodAdaptations;
    return adaptedPersonality;
  }
  
  // Blend communication styles based on user preferences
  blendCommunicationStyles(aiStyle, userPreference) {
    const styleMap = {
      'casual': {
        'empathetic': 'casual-empathetic',
        'direct-empathetic': 'casual-direct',
        'supportive': 'casual-supportive'
      },
      'professional': {
        'empathetic': 'professional-empathetic',
        'direct-empathetic': 'professional-direct',
        'supportive': 'professional-supportive'
      },
      'balanced': {
        'empathetic': aiStyle, // Keep original for balanced
        'direct-empathetic': aiStyle,
        'supportive': aiStyle
      }
    };
    
    return styleMap[userPreference]?.[aiStyle] || aiStyle;
  }
  
  // Adapt response length based on session preferences
  adaptResponseLength(aiLength, sessionPreference) {
    const lengthMap = {
      'short': {
        'detailed': 'medium',
        'medium': 'concise',
        'concise': 'brief'
      },
      'medium': {
        'detailed': 'detailed',
        'medium': 'medium',
        'concise': 'medium'
      },
      'long': {
        'detailed': 'detailed',
        'medium': 'detailed',
        'concise': 'medium'
      }
    };
    
    return lengthMap[sessionPreference]?.[aiLength] || aiLength;
  }
  
  // Get current mood state from recent emotional data
  async getCurrentMoodState() {
    try {
      if (!this.memoryManager?.memoryLayers?.emotionalMemory) {
        return null;
      }
      
      const recentEmotions = await this.memoryManager.memoryLayers.emotionalMemory.getRecentEmotions({
        limit: 5,
        timeframe: '1hour'
      });
      
      if (!recentEmotions || recentEmotions.length === 0) {
        return null;
      }
      
      // Calculate current mood state
      const dominantEmotion = this.getDominantEmotion(recentEmotions);
      const averageIntensity = recentEmotions.reduce((sum, emotion) => sum + emotion.intensity, 0) / recentEmotions.length;
      const averageArousal = recentEmotions.reduce((sum, emotion) => sum + (emotion.arousal || 0.5), 0) / recentEmotions.length;
      const averageEnergy = recentEmotions.reduce((sum, emotion) => sum + (emotion.energy || 0.5), 0) / recentEmotions.length;
      
      // Assess risk level based on recent patterns
      const riskLevel = this.assessCurrentRiskLevel(recentEmotions);
      
      return {
        dominantEmotion,
        intensity: averageIntensity,
        arousal: averageArousal,
        energy: averageEnergy,
        riskLevel,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting current mood state:', error);
      return null;
    }
  }
  
  // Get dominant emotion from recent emotional data
  getDominantEmotion(emotions) {
    const emotionCounts = {};
    emotions.forEach(emotion => {
      const primary = emotion.primaryEmotion || emotion.emotion || 'neutral';
      emotionCounts[primary] = (emotionCounts[primary] || 0) + emotion.intensity;
    });
    
    return Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    ) || 'neutral';
  }
  
  // Assess current risk level based on emotional patterns
  assessCurrentRiskLevel(recentEmotions) {
    let riskScore = 0;
    
    recentEmotions.forEach(emotion => {
      // High-risk emotions
      if (['despair', 'hopelessness', 'rage', 'panic'].includes(emotion.primaryEmotion)) {
        riskScore += emotion.intensity * 3;
      }
      // Medium-risk emotions
      else if (['sadness', 'anxiety', 'anger', 'fear'].includes(emotion.primaryEmotion)) {
        riskScore += emotion.intensity * 2;
      }
      // Crisis indicators
      if (emotion.triggers && emotion.triggers.some(trigger => 
        ['self-harm', 'suicide', 'crisis'].includes(trigger.type)
      )) {
        riskScore += 5;
      }
    });
    
    const averageRisk = riskScore / recentEmotions.length;
    
    if (averageRisk > 3) return 'high';
    if (averageRisk > 1.5) return 'medium';
    return 'low';
  }

  // Proactive engagement system
  async initializeProactiveEngagement() {
    if (!this.memoryManager?.memoryLayers?.userPreferences?.preferences?.sessionPreferences?.proactiveEngagement) {
      return;
    }
    
    // Check for proactive engagement opportunities every 30 minutes
    this.proactiveEngagementInterval = setInterval(() => {
      this.checkProactiveEngagementTriggers();
    }, 30 * 60 * 1000);
    
    // Initial check after 5 minutes
    setTimeout(() => {
      this.checkProactiveEngagementTriggers();
    }, 5 * 60 * 1000);
    
    // Time-based triggers (morning, afternoon, evening)
    this.setupTimeBasedTriggers();
  }

  async checkProactiveEngagementTriggers() {
    try {
      const lastActivity = this.getLastActivityTime();
      const timeSinceLastActivity = Date.now() - lastActivity;
      const emotionalPatterns = await this.getEmotionalPatterns();
      
      // Check various triggers for proactive engagement
      const triggers = {
        inactivity: timeSinceLastActivity > 24 * 60 * 60 * 1000, // 24 hours
        lowMoodPattern: this.detectLowMoodPattern(emotionalPatterns),
        stressPattern: this.detectStressPattern(emotionalPatterns),
        anxietyPattern: this.detectAnxietyPattern(emotionalPatterns),
        isolationPattern: this.detectIsolationPattern(emotionalPatterns),
        goalReminder: await this.shouldRemindAboutGoals(),
        checkIn: this.shouldDoRegularCheckIn(),
        crisisRisk: this.assessCurrentRiskLevel(emotionalPatterns.recentEmotions || []) === 'high'
      };
      
      // Determine which proactive message to send (prioritize by urgency)
      const proactiveMessage = this.generateProactiveMessage(triggers, emotionalPatterns);
      if (proactiveMessage) {
        await this.sendProactiveMessage(proactiveMessage);
      }
    } catch (error) {
      console.error('Error in proactive engagement check:', error);
    }
  }

  getLastActivityTime() {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMessage ? new Date(lastMessage.timestamp || Date.now()).getTime() : Date.now();
  }

  detectLowMoodPattern(emotionalPatterns) {
    if (!emotionalPatterns.recentTrend) return false;
    
    const lowMoodEmotions = ['sad', 'depressed', 'hopeless', 'lonely', 'empty'];
    const hasLowMoodEmotions = emotionalPatterns.commonEmotions?.some(emotion => 
      lowMoodEmotions.includes(emotion.toLowerCase())
    );
    
    const hasNegativeTrend = emotionalPatterns.recentTrend === 'Negative';
    const hasLowIntensity = emotionalPatterns.averageIntensity < 0.3;
    
    return hasNegativeTrend && (hasLowMoodEmotions || hasLowIntensity);
  }

  detectStressPattern(emotionalPatterns) {
    if (!emotionalPatterns.commonEmotions) return false;
    
    const stressEmotions = ['anxious', 'overwhelmed', 'stressed', 'worried', 'panic', 'tense'];
    const hasStressEmotions = emotionalPatterns.commonEmotions.some(emotion => 
      stressEmotions.includes(emotion.toLowerCase())
    );
    
    const hasHighArousal = emotionalPatterns.averageArousal > 0.7;
    const hasFrequentEmotionalShifts = emotionalPatterns.emotionalVariability > 0.6;
    
    return hasStressEmotions || (hasHighArousal && hasFrequentEmotionalShifts);
  }
  
  detectAnxietyPattern(emotionalPatterns) {
    const anxietyEmotions = ['anxious', 'worried', 'nervous', 'fearful', 'panic'];
    const hasAnxietyEmotions = emotionalPatterns.commonEmotions?.some(emotion => 
      anxietyEmotions.includes(emotion.toLowerCase())
    );
    
    const hasHighArousal = emotionalPatterns.averageArousal > 0.6;
    const hasRepetitivePatterns = emotionalPatterns.repetitiveThoughts > 0.5;
    
    return hasAnxietyEmotions && (hasHighArousal || hasRepetitivePatterns);
  }
  
  detectIsolationPattern(emotionalPatterns) {
    const isolationEmotions = ['lonely', 'isolated', 'disconnected', 'empty'];
    const hasIsolationEmotions = emotionalPatterns.commonEmotions?.some(emotion => 
      isolationEmotions.includes(emotion.toLowerCase())
    );
    
    const hasLowSocialEngagement = emotionalPatterns.socialReferences < 0.3;
    
    return hasIsolationEmotions || hasLowSocialEngagement;
  }

  async shouldRemindAboutGoals() {
    if (!this.memoryManager?.memoryLayers?.userPreferences) return false;
    
    const therapyGoals = this.memoryManager.memoryLayers.userPreferences.preferences.therapyGoals;
    const lastGoalDiscussion = this.getLastGoalDiscussionTime();
    const timeSinceGoalDiscussion = Date.now() - lastGoalDiscussion;
    
    return therapyGoals.length > 0 && timeSinceGoalDiscussion > 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  getLastGoalDiscussionTime() {
    // Check recent conversations for goal-related discussions
    const goalKeywords = ['goal', 'progress', 'achievement', 'working on', 'improve'];
    const recentMessages = this.conversationHistory.slice(-20);
    
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const message = recentMessages[i];
      if (goalKeywords.some(keyword => message.content?.toLowerCase().includes(keyword))) {
        return new Date(message.timestamp || Date.now()).getTime();
      }
    }
    
    return Date.now() - (30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
  }

  shouldDoRegularCheckIn() {
    const lastActivity = this.getLastActivityTime();
    const timeSinceLastActivity = Date.now() - lastActivity;
    const daysSinceLastActivity = timeSinceLastActivity / (24 * 60 * 60 * 1000);
    
    // Regular check-in every 3-5 days based on user activity patterns
    return daysSinceLastActivity >= 3 && daysSinceLastActivity <= 5;
  }

  generateProactiveMessage(triggers, emotionalPatterns) {
    const userName = this.memoryManager?.memoryLayers?.userPreferences?.getPreferredName() || '';
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    // Prioritize crisis risk first
    if (triggers.crisisRisk) {
      return {
        type: 'crisis_support',
        message: `${greeting}, I'm sensing you might be going through a really difficult time right now. Please know that you're not alone, and I'm here to support you. Would you like to talk about what you're experiencing? 💜`,
        priority: 'critical'
      };
    }
    
    if (triggers.lowMoodPattern) {
      return {
        type: 'mood_support',
        message: `${greeting}, I noticed you might be going through a tough time lately. I'm here if you'd like to talk about what's on your mind. Sometimes sharing can help lighten the load. 💙`,
        priority: 'high'
      };
    }
    
    if (triggers.anxietyPattern) {
      return {
        type: 'anxiety_support',
        message: `${greeting}, I've noticed some signs that you might be feeling anxious lately. Would you like to try some grounding techniques together, or talk through what's been on your mind? 🌸`,
        priority: 'high'
      };
    }
    
    if (triggers.stressPattern) {
      return {
        type: 'stress_support',
        message: `${greeting}, it seems like you've been dealing with some stress recently. Would you like to try a quick breathing exercise together, or talk about what's been weighing on you? 🌱`,
        priority: 'high'
      };
    }
    
    if (triggers.isolationPattern) {
      return {
        type: 'connection_support',
        message: `${greeting}, I've been thinking about you and wanted to reach out. Sometimes when we're feeling disconnected, a gentle conversation can help. How are you doing today? 🤝`,
        priority: 'medium'
      };
    }
    
    if (triggers.goalReminder) {
      return {
        type: 'goal_reminder',
        message: `${greeting}, I was thinking about the goals we discussed. How have you been feeling about your progress lately? I'd love to hear about any steps you've taken, big or small! 🎯`,
        priority: 'medium'
      };
    }
    
    if (triggers.checkIn) {
      return {
        type: 'regular_checkin',
        message: `${greeting}, just wanted to check in and see how you're doing. What's been the highlight of your day or week so far? ✨`,
        priority: 'low'
      };
    }
    
    if (triggers.inactivity) {
      return {
        type: 'reconnection',
        message: `${greeting}, it's been a while since we last talked. I hope you're doing well! I'm here whenever you need someone to listen or if you'd like to catch up. 🤗`,
        priority: 'medium'
      };
    }
    
    return null;
  }

  async sendProactiveMessage(proactiveMessage) {
    // Add proactive message to chat with special styling
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message proactive';
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-header">
          <i class="fas fa-heart"></i>
          <span>Proactive Check-in</span>
        </div>
        <div class="message-text">${proactiveMessage.message}</div>
        <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content: proactiveMessage.message,
      timestamp: new Date().toISOString(),
      type: 'proactive',
      proactiveType: proactiveMessage.type
    });
    
    // Store in memory as a proactive engagement
    if (this.memoryManager) {
      const memoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userMessage: '',
        aiResponse: proactiveMessage.message,
        type: 'proactive_engagement',
        proactiveType: proactiveMessage.type,
        priority: proactiveMessage.priority
      };
      
      await this.memoryManager.storeMemory(memoryEntry);
    }
  }
  
  setupTimeBasedTriggers() {
    // Morning check-in (9 AM)
    this.scheduleTimeBasedTrigger(9, 0, 'morning_checkin');
    
    // Afternoon check-in (2 PM)
    this.scheduleTimeBasedTrigger(14, 0, 'afternoon_checkin');
    
    // Evening reflection (7 PM)
    this.scheduleTimeBasedTrigger(19, 0, 'evening_reflection');
  }
  
  scheduleTimeBasedTrigger(hour, minute, triggerType) {
    const now = new Date();
    const triggerTime = new Date();
    triggerTime.setHours(hour, minute, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (triggerTime <= now) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }
    
    const timeUntilTrigger = triggerTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.handleTimeBasedTrigger(triggerType);
      // Schedule the next occurrence (24 hours later)
      setInterval(() => {
        this.handleTimeBasedTrigger(triggerType);
      }, 24 * 60 * 60 * 1000);
    }, timeUntilTrigger);
  }
  
  async handleTimeBasedTrigger(triggerType) {
    // Only trigger if user has been active recently or if it's been a while
    const lastActivity = this.getLastActivityTime();
    const timeSinceLastActivity = Date.now() - lastActivity;
    const hoursSinceLastActivity = timeSinceLastActivity / (60 * 60 * 1000);
    
    // Don't interrupt if user is currently active (less than 30 minutes ago)
    if (hoursSinceLastActivity < 0.5) {
      return;
    }
    
    const emotionalPatterns = await this.getEmotionalPatterns();
    const proactiveMessage = this.generateTimeBasedMessage(triggerType, emotionalPatterns);
    
    if (proactiveMessage) {
      await this.sendProactiveMessage(proactiveMessage);
    }
  }
  
  generateTimeBasedMessage(triggerType, emotionalPatterns) {
    const userName = this.memoryManager?.memoryLayers?.userPreferences?.getPreferredName() || '';
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    switch (triggerType) {
      case 'morning_checkin':
        return {
          type: 'morning_checkin',
          message: `${greeting}, good morning! ☀️ How are you feeling as you start your day? I'm here if you'd like to set some intentions or just check in.`,
          priority: 'low'
        };
        
      case 'afternoon_checkin':
        if (emotionalPatterns.recentTrend === 'Negative') {
          return {
            type: 'afternoon_support',
            message: `${greeting}, I hope your afternoon is going well. If you're feeling overwhelmed, remember that it's okay to take a moment to breathe. 🌱`,
            priority: 'medium'
          };
        }
        return {
          type: 'afternoon_checkin',
          message: `${greeting}, how's your day unfolding? Sometimes a mid-day check-in can help us stay grounded. 🌿`,
          priority: 'low'
        };
        
      case 'evening_reflection':
        return {
          type: 'evening_reflection',
          message: `${greeting}, as the day winds down, how are you feeling? Would you like to reflect on something that went well today? 🌙`,
          priority: 'low'
        };
        
      default:
        return null;
    }
  }
  
  assessSupportNeeds(message, response) {
    const needs = {
      emotional: /comfort|support|understand|listen/i.test(message),
      practical: /help|advice|solution|what should/i.test(message),
      informational: /how|why|what|explain/i.test(message),
      validation: /normal|okay|right|wrong/i.test(message)
    };
    
    return Object.entries(needs)
      .filter(([_, present]) => present)
      .map(([need, _]) => need);
  }
  
  assessTriggerIntensity(text) {
    const intensifiers = /very|extremely|really|so|totally|completely|absolutely/i;
    const minimizers = /little|bit|somewhat|kind of|sort of/i;
    
    if (intensifiers.test(text)) return 'high';
    if (minimizers.test(text)) return 'low';
    return 'medium';
  }
  
  extractTimeReference(message) {
    if (/today|now|currently|right now/i.test(message)) return 'present';
    if (/yesterday|last|ago|before/i.test(message)) return 'past';
    if (/tomorrow|will|going to|future/i.test(message)) return 'future';
    return 'unspecified';
  }
  
  extractPeopleReferences(message) {
    const people = [];
    
    if (/boss|manager|supervisor/i.test(message)) people.push('work_authority');
    if (/colleague|coworker/i.test(message)) people.push('work_peer');
    if (/partner|spouse|husband|wife/i.test(message)) people.push('romantic_partner');
    if (/parent|mom|dad|mother|father/i.test(message)) people.push('parent');
    if (/child|son|daughter|kid/i.test(message)) people.push('child');
    if (/friend/i.test(message)) people.push('friend');
    if (/doctor|therapist|counselor/i.test(message)) people.push('professional');
    
    return people;
  }

  async getEmotionalPatterns() {
    try {
      // Get recent emotional memories
      const recentEmotions = await this.memoryManager.memoryLayers.emotional.getRecentEmotions({ limit: 10 });
      
      if (recentEmotions.length === 0) {
        return {
          recentTrend: 'Neutral',
          commonEmotions: [],
          progressNotes: 'No emotional data available yet'
        };
      }
      
      // Calculate recent trend
      const recentSentiments = recentEmotions.map(e => e.sentiment).filter(s => s !== undefined);
      const avgSentiment = recentSentiments.length > 0 ? 
        recentSentiments.reduce((sum, s) => sum + s, 0) / recentSentiments.length : 0;
      
      let recentTrend = 'Neutral';
      if (avgSentiment > 0.3) recentTrend = 'Positive';
      else if (avgSentiment < -0.3) recentTrend = 'Negative';
      
      // Get common emotions
      const emotionCounts = {};
      recentEmotions.forEach(emotion => {
        if (emotion.emotions) {
          emotion.emotions.forEach(e => {
            emotionCounts[e] = (emotionCounts[e] || 0) + 1;
          });
        }
      });
      
      const commonEmotions = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);
      
      return {
        recentTrend,
        commonEmotions,
        progressNotes: `Based on ${recentEmotions.length} recent interactions`
      };
    } catch (error) {
      console.error('Error getting emotional patterns:', error);
      return {
        recentTrend: 'Neutral',
        commonEmotions: [],
        progressNotes: 'Unable to analyze emotional patterns'
      };
    }
  }

  // Chat Reference System Methods
  createMessageReference(messageId, options = {}) {
    try {
      const {
        title = null,
        description = '',
        tags = [],
        type = 'message',
        importance = 'medium',
        isPrivate = false
      } = options;

      const reference = this.chatReferenceManager.createReference({
        sessionId: this.currentSessionId,
        messageId: messageId,
        title: title,
        description: description,
        tags: tags,
        type: type,
        importance: importance,
        isPrivate: isPrivate,
        context: {
          emotionalState: this.getLastEmotionalState(),
          topics: this.getLastTopics(),
          entities: this.getLastEntities()
        }
      });

      this.showReferenceCreatedNotification(reference);
      return reference;
    } catch (error) {
      console.error('Error creating message reference:', error);
      this.showErrorNotification('Failed to create reference');
      return null;
    }
  }

  createMomentReference(description, options = {}) {
    try {
      const {
        title = null,
        tags = [],
        importance = 'high',
        isPrivate = false
      } = options;

      const reference = this.chatReferenceManager.createReference({
        sessionId: this.currentSessionId,
        messageId: null,
        title: title || `Key Moment: ${description}`,
        description: description,
        tags: ['key-moment', ...tags],
        type: 'moment',
        importance: importance,
        isPrivate: isPrivate,
        context: {
          emotionalState: this.getLastEmotionalState(),
          topics: this.getLastTopics(),
          entities: this.getLastEntities(),
          sessionPhase: this.determineSessionPhase()
        }
      });

      this.showReferenceCreatedNotification(reference);
      return reference;
    } catch (error) {
      console.error('Error creating moment reference:', error);
      this.showErrorNotification('Failed to create moment reference');
      return null;
    }
  }

  createInsightReference(insight, options = {}) {
    try {
      const {
        title = null,
        tags = [],
        importance = 'high',
        isPrivate = false
      } = options;

      const reference = this.chatReferenceManager.createReference({
        sessionId: this.currentSessionId,
        messageId: null,
        title: title || `Insight: ${insight.substring(0, 50)}...`,
        description: insight,
        tags: ['insight', 'breakthrough', ...tags],
        type: 'insight',
        importance: importance,
        isPrivate: isPrivate,
        context: {
          emotionalState: this.getLastEmotionalState(),
          topics: this.getLastTopics(),
          entities: this.getLastEntities(),
          therapeuticTechniques: this.getLastTherapeuticTechniques()
        }
      });

      this.showReferenceCreatedNotification(reference);
      return reference;
    } catch (error) {
      console.error('Error creating insight reference:', error);
      this.showErrorNotification('Failed to create insight reference');
      return null;
    }
  }

  searchReferences(query, options = {}) {
    try {
      return this.chatReferenceManager.searchReferences(query, options);
    } catch (error) {
      console.error('Error searching references:', error);
      return [];
    }
  }

  getRecentReferences(limit = 10) {
    try {
      return this.chatReferenceManager.getRecentReferences(limit);
    } catch (error) {
      console.error('Error getting recent references:', error);
      return [];
    }
  }

  getReferencesByTag(tag) {
    try {
      return this.chatReferenceManager.getReferencesByTag(tag);
    } catch (error) {
      console.error('Error getting references by tag:', error);
      return [];
    }
  }

  createBookmark(referenceId, label = null, color = 'blue') {
    try {
      return this.chatReferenceManager.createBookmark(referenceId, label, color);
    } catch (error) {
      console.error('Error creating bookmark:', error);
      return null;
    }
  }

  createCollection(name, description = '', referenceIds = [], tags = []) {
    try {
      return this.chatReferenceManager.createCollection(name, description, referenceIds, tags);
    } catch (error) {
      console.error('Error creating collection:', error);
      return null;
    }
  }

  // Auto-reference detection
  detectAndCreateAutoReferences(message, response, sentiment) {
    try {
      // Auto-create references for breakthrough moments
      if (this.isBreakthroughMoment(message, response, sentiment)) {
        this.createMomentReference('Breakthrough moment detected', {
          tags: ['breakthrough', 'auto-detected'],
          importance: 'critical'
        });
      }

      // Auto-create references for significant insights
      if (this.isSignificantInsight(message, response)) {
        this.createInsightReference(message, {
          tags: ['insight', 'auto-detected'],
          importance: 'high'
        });
      }

      // Auto-create references for emotional milestones
      if (this.isEmotionalMilestone(sentiment)) {
        this.createMomentReference('Emotional milestone reached', {
          tags: ['emotional-milestone', 'auto-detected'],
          importance: 'high'
        });
      }

      // Auto-create references for goal-related discussions
      if (this.isGoalRelated(message)) {
        this.createMessageReference(null, {
          title: 'Goal-related discussion',
          tags: ['goals', 'progress', 'auto-detected'],
          importance: 'medium'
        });
      }
    } catch (error) {
      console.error('Error in auto-reference detection:', error);
    }
  }

  // Helper methods for context extraction
  getLastEmotionalState() {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMessage?.metadata?.emotionalState || null;
  }

  getLastTopics() {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMessage?.metadata?.topics || [];
  }

  getLastEntities() {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMessage?.metadata?.entities || [];
  }

  getLastTherapeuticTechniques() {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMessage?.metadata?.therapeuticTechniques || [];
  }

  // Detection methods for auto-referencing
  isBreakthroughMoment(message, response, sentiment) {
    const breakthroughKeywords = /breakthrough|realize|understand|clarity|insight|aha|epiphany|revelation/i;
    const positiveShift = sentiment && sentiment.score > 0.3;
    const responseIndicatesBreakthrough = /that's a significant|important realization|breakthrough|insight/i.test(response);
    
    return (breakthroughKeywords.test(message) || responseIndicatesBreakthrough) && positiveShift;
  }

  isSignificantInsight(message, response) {
    const insightKeywords = /I realize|I understand|I see now|it makes sense|I get it|I learned/i;
    const responseValidation = /that's insightful|important understanding|valuable insight/i;
    
    return insightKeywords.test(message) || responseValidation.test(response);
  }

  isEmotionalMilestone(sentiment) {
    // Detect significant positive emotional shifts
    if (!sentiment || typeof sentiment.score !== 'number') {
      return false;
    }
    
    const previousSentiments = this.conversationHistory
      .slice(-5)
      .map(msg => msg.metadata?.sentiment?.score || 0);
    
    const averagePrevious = previousSentiments.reduce((a, b) => a + b, 0) / previousSentiments.length;
    const currentScore = sentiment.score;
    
    return currentScore > 0.5 && (currentScore - averagePrevious) > 0.4;
  }

  isGoalRelated(message) {
    const goalKeywords = /goal|objective|target|aim|want to|plan to|working towards|achieve|accomplish/i;
    return goalKeywords.test(message);
  }

  // UI notification methods
  showReferenceCreatedNotification(reference) {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.className = 'reference-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-bookmark"></i>
        <span>Reference created: ${reference.title}</span>
        <button class="view-reference-btn" data-reference-id="${reference.id}">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    `;
    
    // Add to chat area
    this.chatMessages.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
    
    // Add click handler for view button
    notification.querySelector('.view-reference-btn')?.addEventListener('click', () => {
      this.showReferenceDetails(reference.id);
    });
  }

  showErrorNotification(message) {
    console.error('Reference error:', message);
    // Could add UI notification here
  }

  showReferenceDetails(referenceId) {
    const reference = this.chatReferenceManager.getReference(referenceId);
    if (reference) {
      // This would open a modal or sidebar with reference details
      console.log('Reference details:', reference);
      // TODO: Implement reference details UI
    }
  }

  clearSession() {
    if (confirm('Are you sure you want to clear this session? This cannot be undone.')) {
      // End current session
      this.conversationHistoryManager.endSession();
      
      // Clear proactive engagement intervals
      if (this.proactiveEngagementInterval) {
        clearInterval(this.proactiveEngagementInterval);
        this.proactiveEngagementInterval = null;
      }
      
      // Clear current conversation
      this.conversationHistory = [];
      if (this.chatMessages) {
        this.chatMessages.innerHTML = '<!-- Messages will be dynamically added here -->';
      }
      
      // Start new session
      this.currentSessionId = this.generateSessionId();
      this.startNewSession();
      
      // Reinitialize proactive engagement
      this.initializeProactiveEngagement();
      
      this.addMessage('Session cleared. How can I help you today?', false);
    }
  }

}


// Initialize chat when DOM is loaded
let hearuaiChat;
document.addEventListener('DOMContentLoaded', function() {
  hearuaiChat = new HearUAIChat();
});

// Export for global access
if (typeof window !== 'undefined') {
  window.HearUAIChat = HearUAIChat;
  window.hearuaiChat = hearuaiChat;
}