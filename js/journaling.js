/**
 * Journaling Module for HearuAI
 * Handles journaling functionality integrated with the chat system
 */

class JournalingManager {
  constructor(memoryManager, chatManager) {
    this.memoryManager = memoryManager;
    this.chatManager = chatManager;
    this.isJournalingMode = false;
    this.currentJournalSession = null;
    this.journalPrompts = {
      free_form: [
        "How are you feeling right now?",
        "What's on your mind today?",
        "Describe your current emotional state.",
        "What happened today that you'd like to reflect on?"
      ],
      guided: [
        "What are three things you're grateful for today?",
        "Describe a challenge you faced today and how you handled it.",
        "What emotions did you experience most strongly today?",
        "What would you like to improve about tomorrow?"
      ],
      cbt: [
        "What negative thoughts are you having? Let's examine the evidence for and against them.",
        "Describe a situation that upset you. What thoughts led to those feelings?",
        "What would you tell a friend in your situation?",
        "How can you reframe this situation more positively?"
      ],
      dbt: [
        "Practice mindfulness: What do you notice about your current environment?",
        "Describe your emotions without judgment. What do you feel in your body?",
        "What coping skills have you used today?",
        "How can you practice self-compassion right now?"
      ],
      reflection: [
        "What did you learn about yourself today?",
        "How have you grown since last week?",
        "What patterns do you notice in your thoughts or behaviors?",
        "What are you most proud of recently?"
      ]
    };
    
    this.initializeJournalingUI();
  }

  initializeJournalingUI() {
    this.createJournalingButton();
    this.createJournalingModal();
    this.setupEventListeners();
  }

  createJournalingButton() {
    const controlsContainer = document.querySelector('.chat-controls');
    if (controlsContainer) {
      const journalButton = document.createElement('button');
      journalButton.id = 'journal-btn';
      journalButton.className = 'control-btn';
      journalButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        <span>Journal</span>
      `;
      journalButton.title = 'Start Journaling Session';
      
      // Insert after memory button
      const memoryButton = document.getElementById('memory-btn');
      if (memoryButton) {
        memoryButton.parentNode.insertBefore(journalButton, memoryButton.nextSibling);
      } else {
        controlsContainer.appendChild(journalButton);
      }
    }
  }

  createJournalingModal() {
    const modalHTML = `
      <div id="journaling-modal" class="modal" style="display: none;">
        <div class="modal-content journaling-modal-content">
          <div class="modal-header">
            <h3>Journaling Session</h3>
            <span class="close" id="close-journaling">&times;</span>
          </div>
          <div class="modal-body">
            <div class="journaling-options">
              <h4>Choose your journaling style:</h4>
              <div class="journal-type-buttons">
                <button class="journal-type-btn" data-type="free_form">Free Writing</button>
                <button class="journal-type-btn" data-type="guided">Guided Prompts</button>
                <button class="journal-type-btn" data-type="cbt">CBT Reflection</button>
                <button class="journal-type-btn" data-type="dbt">DBT Mindfulness</button>
                <button class="journal-type-btn" data-type="reflection">Self Reflection</button>
              </div>
            </div>
            
            <div class="journaling-interface" style="display: none;">
              <div class="journal-prompt-container">
                <p class="journal-prompt"></p>
                <button class="new-prompt-btn" style="display: none;">Get New Prompt</button>
              </div>
              
              <div class="journal-entry-container">
                <textarea 
                  id="journal-entry" 
                  placeholder="Start writing your thoughts here..."
                  rows="8"
                ></textarea>
                
                <div class="journal-metadata">
                  <div class="mood-selector">
                    <label>Current Mood:</label>
                    <select id="journal-mood">
                      <option value="">Select mood...</option>
                      <option value="very_happy">😄 Very Happy</option>
                      <option value="happy">😊 Happy</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="sad">😢 Sad</option>
                      <option value="very_sad">😭 Very Sad</option>
                      <option value="angry">😠 Angry</option>
                      <option value="anxious">😰 Anxious</option>
                      <option value="excited">🤩 Excited</option>
                      <option value="calm">😌 Calm</option>
                      <option value="confused">😕 Confused</option>
                    </select>
                  </div>
                  
                  <div class="emotion-tags">
                    <label>Emotions (click to add):</label>
                    <div class="emotion-tag-buttons">
                      <button class="emotion-tag" data-emotion="grateful">Grateful</button>
                      <button class="emotion-tag" data-emotion="hopeful">Hopeful</button>
                      <button class="emotion-tag" data-emotion="worried">Worried</button>
                      <button class="emotion-tag" data-emotion="peaceful">Peaceful</button>
                      <button class="emotion-tag" data-emotion="frustrated">Frustrated</button>
                      <button class="emotion-tag" data-emotion="content">Content</button>
                      <button class="emotion-tag" data-emotion="overwhelmed">Overwhelmed</button>
                      <button class="emotion-tag" data-emotion="motivated">Motivated</button>
                    </div>
                    <div class="selected-emotions"></div>
                  </div>
                </div>
                
                <div class="journal-actions">
                  <button class="save-journal-btn">Save Entry</button>
                  <button class="save-and-analyze-btn">Save & Get AI Insights</button>
                  <button class="cancel-journal-btn">Cancel</button>
                </div>
              </div>
            </div>
            
            <div class="journal-history" style="display: none;">
              <h4>Recent Journal Entries</h4>
              <div class="journal-entries-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  setupEventListeners() {
    // Journal button click
    document.getElementById('journal-btn')?.addEventListener('click', () => {
      this.openJournalingModal();
    });

    // Close modal
    document.getElementById('close-journaling')?.addEventListener('click', () => {
      this.closeJournalingModal();
    });

    // Journal type selection
    document.querySelectorAll('.journal-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.startJournalingSession(e.target.dataset.type);
      });
    });

    // New prompt button
    document.querySelector('.new-prompt-btn')?.addEventListener('click', () => {
      this.generateNewPrompt();
    });

    // Emotion tags
    document.querySelectorAll('.emotion-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.toggleEmotionTag(e.target.dataset.emotion);
      });
    });

    // Save buttons
    document.querySelector('.save-journal-btn')?.addEventListener('click', () => {
      this.saveJournalEntry(false);
    });

    document.querySelector('.save-and-analyze-btn')?.addEventListener('click', () => {
      this.saveJournalEntry(true);
    });

    document.querySelector('.cancel-journal-btn')?.addEventListener('click', () => {
      this.cancelJournaling();
    });

    // Auto-save functionality
    document.getElementById('journal-entry')?.addEventListener('input', () => {
      this.autoSaveEntry();
    });
  }

  openJournalingModal() {
    const modal = document.getElementById('journaling-modal');
    modal.style.display = 'block';
    
    // Reset modal state
    document.querySelector('.journaling-options').style.display = 'block';
    document.querySelector('.journaling-interface').style.display = 'none';
    document.querySelector('.journal-history').style.display = 'none';
    
    // Load recent entries for quick access
    this.loadRecentEntries();
  }

  closeJournalingModal() {
    const modal = document.getElementById('journaling-modal');
    modal.style.display = 'none';
    this.isJournalingMode = false;
    this.currentJournalSession = null;
  }

  startJournalingSession(type) {
    this.isJournalingMode = true;
    this.currentJournalSession = {
      type: type,
      startTime: new Date().toISOString(),
      selectedEmotions: [],
      currentPrompt: null
    };

    // Hide options, show interface
    document.querySelector('.journaling-options').style.display = 'none';
    document.querySelector('.journaling-interface').style.display = 'block';

    // Generate initial prompt
    this.generateNewPrompt();

    // Focus on textarea
    setTimeout(() => {
      document.getElementById('journal-entry').focus();
    }, 100);
  }

  generateNewPrompt() {
    if (!this.currentJournalSession) return;

    const prompts = this.journalPrompts[this.currentJournalSession.type];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    this.currentJournalSession.currentPrompt = randomPrompt;
    
    const promptElement = document.querySelector('.journal-prompt');
    promptElement.textContent = randomPrompt;
    
    // Show new prompt button for guided types
    const newPromptBtn = document.querySelector('.new-prompt-btn');
    if (this.currentJournalSession.type !== 'free_form') {
      newPromptBtn.style.display = 'inline-block';
    }
  }

  toggleEmotionTag(emotion) {
    if (!this.currentJournalSession) return;

    const emotions = this.currentJournalSession.selectedEmotions;
    const index = emotions.indexOf(emotion);
    
    if (index > -1) {
      emotions.splice(index, 1);
    } else {
      emotions.push(emotion);
    }

    this.updateSelectedEmotionsDisplay();
  }

  updateSelectedEmotionsDisplay() {
    const container = document.querySelector('.selected-emotions');
    const emotions = this.currentJournalSession?.selectedEmotions || [];
    
    container.innerHTML = emotions.map(emotion => 
      `<span class="selected-emotion">${emotion} <button onclick="this.parentElement.remove()">&times;</button></span>`
    ).join('');
  }

  async saveJournalEntry(requestAnalysis = false) {
    const content = document.getElementById('journal-entry').value.trim();
    if (!content) {
      alert('Please write something before saving.');
      return;
    }

    const mood = document.getElementById('journal-mood').value;
    const emotions = this.currentJournalSession?.selectedEmotions || [];
    
    const entry = {
      content: content,
      prompt: this.currentJournalSession?.currentPrompt,
      type: this.currentJournalSession?.type || 'free_form',
      mood: mood,
      emotions: emotions,
      tags: this.extractTagsFromContent(content),
      sessionId: this.chatManager?.currentSessionId,
      timestamp: new Date().toISOString(),
      wordCount: content.split(' ').length
    };

    try {
      // Perform AI analysis if available
      if (this.chatManager?.azureClient) {
        entry.aiAnalysis = await this.analyzeJournalEntry(content, mood, emotions);
      }

      const savedEntry = await this.memoryManager.emotionalMemory.storeJournalEntry(entry);
      
      if (requestAnalysis) {
        await this.requestAIAnalysis(savedEntry);
      }
      
      this.showSuccessMessage('Journal entry saved successfully!');
      this.closeJournalingModal();
      
      // Optionally add to chat as a system message
      this.addJournalEntryToChat(savedEntry);
      
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Failed to save journal entry. Please try again.');
    }
  }

  async requestAIAnalysis(entry) {
    // Send journal entry to AI for analysis
    const analysisPrompt = `I just completed a journal entry. Here's what I wrote:\n\n"${entry.content}"\n\nCan you provide some gentle insights about my emotional state and any patterns you notice? Please be supportive and offer helpful suggestions.`;
    
    if (this.chatManager && this.chatManager.sendMessage) {
      await this.chatManager.sendMessage(analysisPrompt, true); // true for system message
    }
  }

  addJournalEntryToChat(entry) {
    if (!this.chatManager) return;
    
    const journalMessage = {
      type: 'journal_entry',
      content: `📝 Journal Entry Saved\n\nType: ${entry.type}\nMood: ${entry.mood || 'Not specified'}\nEmotions: ${entry.emotions.join(', ') || 'None selected'}\n\nEntry preview: "${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}"`,
      timestamp: new Date().toISOString()
    };
    
    this.chatManager.addSystemMessage(journalMessage.content);
  }

  extractTagsFromContent(content) {
    // Simple tag extraction based on keywords
    const keywords = {
      'work': ['work', 'job', 'career', 'office', 'meeting', 'project'],
      'family': ['family', 'mom', 'dad', 'parent', 'sibling', 'child'],
      'relationship': ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse'],
      'health': ['health', 'exercise', 'diet', 'sleep', 'tired', 'energy'],
      'stress': ['stress', 'pressure', 'overwhelmed', 'anxious', 'worried'],
      'growth': ['learn', 'grow', 'improve', 'goal', 'achievement', 'progress']
    };
    
    const tags = [];
    const lowerContent = content.toLowerCase();
    
    Object.entries(keywords).forEach(([tag, words]) => {
      if (words.some(word => lowerContent.includes(word))) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  autoSaveEntry() {
    // Auto-save to localStorage for recovery
    const content = document.getElementById('journal-entry')?.value;
    if (content) {
      localStorage.setItem('journal_draft', JSON.stringify({
        content: content,
        timestamp: new Date().toISOString(),
        type: this.currentJournalSession?.type
      }));
    }
  }

  loadRecentEntries() {
    // This could be expanded to show recent entries in the modal
    // For now, we'll just clear any draft
    const draft = localStorage.getItem('journal_draft');
    if (draft) {
      const draftData = JSON.parse(draft);
      // Could offer to restore draft here
    }
  }

  cancelJournaling() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      localStorage.removeItem('journal_draft');
      this.closeJournalingModal();
    }
  }

  showSuccessMessage(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'journal-notification success';
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

  // Method to detect journaling intent in chat
  detectJournalingIntent(message) {
    const journalingKeywords = [
      'journal', 'write', 'reflect', 'thoughts', 'feelings',
      'diary', 'record', 'document', 'express', 'vent'
    ];
    
    const lowerMessage = message.toLowerCase();
    return journalingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Method to suggest journaling during chat
  suggestJournaling() {
    return "I notice you might benefit from journaling about this. Would you like to start a journaling session? I can guide you through different types of reflective writing.";
  }

  // AI analysis method for journal entries
  async analyzeJournalEntry(content, mood, emotions) {
    try {
      const analysisPrompt = `Analyze this journal entry for emotional patterns, insights, and provide supportive feedback:

Content: "${content}"
Mood: ${mood || 'Not specified'}
Emotions: ${emotions.join(', ') || 'None specified'}

Provide a brief, supportive analysis focusing on:
1. Emotional themes
2. Positive aspects to acknowledge
3. Gentle suggestions for growth
4. Patterns or insights

Keep the response concise and encouraging.`;

      const response = await this.chatManager.azureClient.getChatCompletion([
        {
          role: 'system',
          content: 'You are a compassionate AI assistant providing supportive analysis of journal entries. Be gentle, encouraging, and focus on emotional well-being.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ]);

      return {
        analysis: response.choices[0].message.content,
        timestamp: new Date().toISOString(),
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error analyzing journal entry:', error);
      return {
        analysis: 'Analysis unavailable at this time.',
        timestamp: new Date().toISOString(),
        confidence: 0.0,
        error: error.message
      };
    }
  }

  // Method to get insights from multiple journal entries
  async getJournalInsights(entries) {
    try {
      const entrySummaries = entries.map(entry => ({
        date: entry.timestamp,
        mood: entry.mood,
        emotions: entry.emotions,
        contentPreview: entry.content.substring(0, 200)
      }));

      const insightsPrompt = `Analyze these journal entries for patterns and provide insights:

${JSON.stringify(entrySummaries, null, 2)}

Provide insights about:
1. Emotional patterns over time
2. Recurring themes
3. Growth areas
4. Positive trends
5. Recommendations for continued well-being

Be supportive and focus on personal growth.`;

      const response = await this.chatManager.azureClient.getChatCompletion([
        {
          role: 'system',
          content: 'You are a supportive AI assistant analyzing journal patterns to help with emotional well-being and personal growth.'
        },
        {
          role: 'user',
          content: insightsPrompt
        }
      ]);

      return {
        insights: response.choices[0].message.content,
        timestamp: new Date().toISOString(),
        entryCount: entries.length
      };
    } catch (error) {
      console.error('Error generating journal insights:', error);
      return {
        insights: 'Insights unavailable at this time.',
        timestamp: new Date().toISOString(),
        entryCount: entries.length,
        error: error.message
      };
    }
  }

  // Journal history and progress tracking methods
  async showJournalHistory() {
    try {
      const entries = await this.memoryManager.emotionalMemory.getJournalEntries();
      const historyModal = this.createHistoryModal(entries);
      document.body.appendChild(historyModal);
    } catch (error) {
      console.error('Error loading journal history:', error);
      alert('Failed to load journal history.');
    }
  }

  createHistoryModal(entries) {
    const modal = document.createElement('div');
    modal.className = 'journal-modal';
    modal.id = 'journal-history-modal';

    const progressStats = this.calculateProgressStats(entries);
    
    modal.innerHTML = `
      <div class="journal-modal-content history-modal">
        <div class="journal-modal-header">
          <h2>📖 Journal History & Progress</h2>
          <button class="journal-close-btn" onclick="this.closest('.journal-modal').remove()">&times;</button>
        </div>
        
        <div class="journal-progress-stats">
          <div class="progress-stat">
            <div class="stat-number">${entries.length}</div>
            <div class="stat-label">Total Entries</div>
          </div>
          <div class="progress-stat">
            <div class="stat-number">${progressStats.currentStreak}</div>
            <div class="stat-label">Day Streak</div>
          </div>
          <div class="progress-stat">
            <div class="stat-number">${progressStats.averageWordsPerEntry}</div>
            <div class="stat-label">Avg Words</div>
          </div>
          <div class="progress-stat">
            <div class="stat-number">${progressStats.mostCommonMood}</div>
            <div class="stat-label">Common Mood</div>
          </div>
        </div>

        <div class="journal-history-filters">
          <select id="history-filter-period">
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
          </select>
          <select id="history-filter-mood">
            <option value="all">All Moods</option>
            <option value="happy">Happy</option>
            <option value="sad">Sad</option>
            <option value="anxious">Anxious</option>
            <option value="calm">Calm</option>
            <option value="excited">Excited</option>
            <option value="frustrated">Frustrated</option>
          </select>
          <button onclick="hearuaiChat.journalingManager.filterHistory()">Filter</button>
        </div>

        <div class="journal-history-list" id="journal-history-list">
          ${this.renderHistoryEntries(entries)}
        </div>

        <div class="journal-history-actions">
          <button onclick="hearuaiChat.journalingManager.exportJournalData()">📤 Export Data</button>
          <button onclick="hearuaiChat.journalingManager.generateInsightsReport()">📊 Generate Insights</button>
        </div>
      </div>
    `;

    return modal;
  }

  renderHistoryEntries(entries) {
    if (entries.length === 0) {
      return '<div class="no-entries">No journal entries found. Start writing to see your history here!</div>';
    }

    return entries.map(entry => `
      <div class="history-entry" data-entry-id="${entry.id}">
        <div class="entry-header">
          <div class="entry-date">${new Date(entry.timestamp).toLocaleDateString()}</div>
          <div class="entry-mood mood-${entry.mood}">${entry.mood || 'No mood'}</div>
        </div>
        <div class="entry-preview">${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}</div>
        <div class="entry-metadata">
          <span class="word-count">${entry.wordCount || 0} words</span>
          <span class="entry-type">${entry.type || 'free-form'}</span>
          ${entry.emotions ? `<span class="emotion-tags">${entry.emotions.slice(0, 3).join(', ')}</span>` : ''}
        </div>
        <div class="entry-actions">
          <button onclick="hearuaiChat.journalingManager.viewFullEntry('${entry.id}')">View Full</button>
          <button onclick="hearuaiChat.journalingManager.editEntry('${entry.id}')">Edit</button>
          <button onclick="hearuaiChat.journalingManager.deleteEntry('${entry.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  calculateProgressStats(entries) {
    if (entries.length === 0) {
      return {
        currentStreak: 0,
        averageWordsPerEntry: 0,
        mostCommonMood: 'N/A',
        totalWords: 0
      };
    }

    // Calculate current streak
    const currentStreak = this.memoryManager.emotionalMemory.calculateWritingStreak();
    
    // Calculate average words per entry
    const totalWords = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
    const averageWordsPerEntry = Math.round(totalWords / entries.length);
    
    // Find most common mood
    const moodCounts = {};
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });
    
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, 'N/A'
    );

    return {
      currentStreak,
      averageWordsPerEntry,
      mostCommonMood,
      totalWords
    };
  }

  async filterHistory() {
    const period = document.getElementById('history-filter-period').value;
    const mood = document.getElementById('history-filter-mood').value;
    
    const filters = {};
    
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      
      filters.startDate = startDate.toISOString();
    }
    
    if (mood !== 'all') {
      filters.mood = mood;
    }
    
    try {
      const filteredEntries = await this.memoryManager.emotionalMemory.getJournalEntries(filters);
      document.getElementById('journal-history-list').innerHTML = this.renderHistoryEntries(filteredEntries);
    } catch (error) {
      console.error('Error filtering journal history:', error);
    }
  }

  async viewFullEntry(entryId) {
    try {
      const entries = await this.memoryManager.emotionalMemory.getJournalEntries();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        alert('Entry not found.');
        return;
      }
      
      const modal = document.createElement('div');
      modal.className = 'journal-modal';
      modal.innerHTML = `
        <div class="journal-modal-content">
          <div class="journal-modal-header">
            <h2>📖 Journal Entry - ${new Date(entry.timestamp).toLocaleDateString()}</h2>
            <button class="journal-close-btn" onclick="this.closest('.journal-modal').remove()">&times;</button>
          </div>
          
          <div class="full-entry-content">
            <div class="entry-metadata-full">
              <span class="entry-mood mood-${entry.mood}">${entry.mood || 'No mood'}</span>
              <span class="entry-type">${entry.type || 'free-form'}</span>
              <span class="word-count">${entry.wordCount || 0} words</span>
            </div>
            
            ${entry.emotions && entry.emotions.length > 0 ? `
              <div class="entry-emotions">
                <strong>Emotions:</strong> ${entry.emotions.join(', ')}
              </div>
            ` : ''}
            
            <div class="entry-full-text">${entry.content}</div>
            
            ${entry.aiAnalysis ? `
              <div class="ai-analysis-section">
                <h3>🤖 AI Analysis</h3>
                <div class="ai-analysis-content">${entry.aiAnalysis.analysis}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    } catch (error) {
      console.error('Error viewing full entry:', error);
      alert('Failed to load entry.');
    }
  }

  async exportJournalData() {
    try {
      const entries = await this.memoryManager.emotionalMemory.getJournalEntries();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalEntries: entries.length,
        entries: entries.map(entry => ({
          date: entry.timestamp,
          mood: entry.mood,
          emotions: entry.emotions,
          type: entry.type,
          content: entry.content,
          wordCount: entry.wordCount,
          aiAnalysis: entry.aiAnalysis?.analysis
        }))
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showSuccessMessage('Journal data exported successfully!');
    } catch (error) {
      console.error('Error exporting journal data:', error);
      alert('Failed to export journal data.');
    }
  }

  async generateInsightsReport() {
    try {
      const entries = await this.memoryManager.emotionalMemory.getJournalEntries();
      
      if (entries.length === 0) {
        alert('No journal entries found to analyze.');
        return;
      }
      
      const insights = await this.getJournalInsights(entries);
      const patterns = await this.memoryManager.emotionalMemory.analyzeJournalPatterns();
      
      const modal = document.createElement('div');
      modal.className = 'journal-modal';
      modal.innerHTML = `
        <div class="journal-modal-content insights-modal">
          <div class="journal-modal-header">
            <h2>📊 Journal Insights Report</h2>
            <button class="journal-close-btn" onclick="this.closest('.journal-modal').remove()">&times;</button>
          </div>
          
          <div class="insights-content">
            <div class="insights-section">
              <h3>🤖 AI Analysis</h3>
              <div class="ai-insights">${insights.insights}</div>
            </div>
            
            <div class="insights-section">
              <h3>📈 Emotional Trends</h3>
              <div class="emotion-trends">
                ${Object.entries(patterns.emotionalTrends).map(([emotion, count]) => 
                  `<div class="trend-item"><span class="emotion">${emotion}</span><span class="count">${count} times</span></div>`
                ).join('')}
              </div>
            </div>
            
            <div class="insights-section">
              <h3>📝 Writing Patterns</h3>
              <div class="writing-patterns">
                <p><strong>Most productive days:</strong> ${Object.entries(patterns.writingFrequency)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([date, count]) => `${date} (${count} entries)`)
                  .join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    } catch (error) {
      console.error('Error generating insights report:', error);
      alert('Failed to generate insights report.');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JournalingManager;
}