class MemoryUI {
  constructor() {
    // Check authentication first
    if (typeof AuthManager !== 'undefined' && !AuthManager.isUserAuthenticated()) {
      window.location.href = 'auth.html';
      return;
    }
    
    // If AuthManager is not available, continue without authentication check
    if (typeof AuthManager === 'undefined') {
      console.warn('AuthManager not available, continuing without authentication');
      this.currentUser = { id: 'guest', name: 'Guest User' }; // Default user
    } else {
      this.currentUser = AuthManager.getCurrentUser();
    }
    this.memoryManager = null;
    this.conversationHistoryManager = null;
    this.chatReferenceManager = null;
    this.currentTab = 'overview';
    this.searchFilters = {
      conversations: '',
      references: ''
    };
    
    this.init();
  }

  getUserId() {
    // Use authenticated user's ID
    return this.currentUser ? this.currentUser.id : null;
  }

  async init() {
    try {
      // Initialize managers with authenticated user ID
      const userId = this.getUserId();
      if (!userId) {
        window.location.href = 'auth.html';
        return;
      }
      
      this.memoryManager = new MemoryManager(userId);
      this.conversationHistoryManager = new ConversationHistoryManager(userId);
      this.chatReferenceManager = new ChatReferenceManager(this.conversationHistoryManager, this.memoryManager);
      
      // Initialize UI
      this.initializeEventListeners();
      await this.loadOverviewData();
      
    } catch (error) {
      console.error('Error initializing Memory UI:', error);
      this.showError('Failed to initialize memory management interface');
    }
  }

  initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Search functionality
    const conversationSearch = document.getElementById('conversationSearch');
    if (conversationSearch) {
      conversationSearch.addEventListener('input', (e) => {
        this.searchFilters.conversations = e.target.value;
        this.debounce(() => this.loadConversations(), 300)();
      });
    }

    const referenceSearch = document.getElementById('referenceSearch');
    if (referenceSearch) {
      referenceSearch.addEventListener('input', (e) => {
        this.searchFilters.references = e.target.value;
        this.debounce(() => this.loadReferences(), 300)();
      });
    }

    // Button event listeners
    this.setupButtonListeners();
  }

  setupButtonListeners() {
    // Export buttons
    document.getElementById('exportConversations')?.addEventListener('click', () => this.exportConversations());
    document.getElementById('exportEmotions')?.addEventListener('click', () => this.exportEmotions());
    
    // Clear buttons
    document.getElementById('clearConversations')?.addEventListener('click', () => this.clearConversations());
    
    // Create reference button
    document.getElementById('createReference')?.addEventListener('click', () => this.showCreateReferenceModal());
    
    // Save preferences button
    document.getElementById('savePreferences')?.addEventListener('click', () => this.savePreferences());
  }

  async switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific data
    switch (tabName) {
      case 'overview':
        await this.loadOverviewData();
        break;
      case 'conversations':
        await this.loadConversations();
        break;
      case 'emotions':
        await this.loadEmotionalData();
        break;
      case 'references':
        await this.loadReferences();
        break;
      case 'preferences':
        await this.loadPreferences();
        break;
    }
  }

  async loadOverviewData() {
    try {
      // Load statistics
      const stats = await this.getMemoryStatistics();
      
      // Check if elements exist before setting content (for compatibility with chat.html)
      const totalMemoriesEl = document.getElementById('totalMemories');
      const totalSessionsEl = document.getElementById('totalSessions');
      const totalReferencesEl = document.getElementById('totalReferences');
      const avgSentimentEl = document.getElementById('avgSentiment');
      
      if (totalMemoriesEl) totalMemoriesEl.textContent = stats.totalMemories;
      if (totalSessionsEl) totalSessionsEl.textContent = stats.totalSessions;
      if (totalReferencesEl) totalReferencesEl.textContent = stats.totalReferences;
      if (avgSentimentEl) avgSentimentEl.textContent = stats.avgSentiment;

      // Load recent activity
      await this.loadRecentActivity();
      
    } catch (error) {
      console.error('Error loading overview data:', error);
      this.showError('Failed to load overview data');
    }
  }

  async getMemoryStatistics() {
    const memoryData = await this.memoryManager.getAllMemories();
    const conversations = this.conversationHistoryManager.getAllSessions();
    const references = this.chatReferenceManager ? this.chatReferenceManager.getAllReferences() : [];
    
    // Flatten all memories from different layers
    const allMemories = [
      ...(memoryData.shortTerm || []),
      ...(memoryData.longTerm || []),
      ...(memoryData.emotional?.emotions || []),
      ...(memoryData.contextual?.contexts || [])
    ];
    
    // Calculate average sentiment from emotional memories
    const emotionalMemories = memoryData.emotional?.emotions || [];
    const sentiments = emotionalMemories.map(m => m.sentiment?.score || 0).filter(s => s !== 0);
    const avgSentiment = sentiments.length > 0 
      ? (sentiments.reduce((a, b) => a + b, 0) / sentiments.length).toFixed(1)
      : '0.0';

    return {
      totalMemories: allMemories.length,
      totalSessions: conversations.length,
      totalReferences: references.length,
      avgSentiment
    };
  }

  async loadRecentActivity() {
    try {
      const container = document.getElementById('recentActivity');
      if (!container) return; // Skip if element doesn't exist (e.g., in chat.html)
      
      const recentMemories = await this.memoryManager.getRecentMemories(10);
      
      if (recentMemories.length === 0) {
        container.innerHTML = this.getEmptyState('No recent activity found');
        return;
      }

      const html = recentMemories.map(memory => `
        <div class="memory-item">
          <div class="memory-item-header">
            <div class="memory-item-title">
              ${this.truncateText(memory.message || 'Memory Entry', 50)}
            </div>
            <div class="memory-item-date">
              ${this.formatDate(memory.timestamp)}
            </div>
          </div>
          <div class="memory-item-content">
            ${this.truncateText(memory.response || memory.content || '', 100)}
          </div>
          <div class="memory-item-tags">
            ${this.getSentimentTag(memory.sentiment)}
            ${memory.context?.topics?.slice(0, 3).map(topic => 
              `<span class="tag">${topic}</span>`
            ).join('') || ''}
          </div>
        </div>
      `).join('');
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading recent activity:', error);
      document.getElementById('recentActivity').innerHTML = this.getErrorState('Failed to load recent activity');
    }
  }

  async loadConversations() {
    try {
      const container = document.getElementById('conversationList');
      const sessions = this.conversationHistoryManager.getAllSessions();
      
      let filteredSessions = sessions;
      if (this.searchFilters.conversations) {
        filteredSessions = sessions.filter(session => 
          session.messages.some(msg => 
            msg.content.toLowerCase().includes(this.searchFilters.conversations.toLowerCase())
          )
        );
      }
      
      if (filteredSessions.length === 0) {
        container.innerHTML = this.getEmptyState('No conversations found');
        return;
      }

      const html = filteredSessions.map(session => {
        const messageCount = session.messages.length;
        const lastMessage = session.messages[messageCount - 1];
        const avgSentiment = this.calculateSessionSentiment(session);
        
        return `
          <div class="memory-item">
            <div class="memory-item-header">
              <div class="memory-item-title">
                Session ${session.id.slice(-8)}
              </div>
              <div class="memory-item-date">
                ${this.formatDate(session.startTime)}
              </div>
            </div>
            <div class="memory-item-content">
              ${messageCount} messages • Last: ${this.truncateText(lastMessage?.content || '', 80)}
            </div>
            <div class="memory-item-tags">
              <span class="tag">${messageCount} messages</span>
              ${this.getSentimentTag({ score: avgSentiment })}
              <button class="btn btn-primary" onclick="memoryUI.viewSession('${session.id}')">
                <i class="fas fa-eye"></i> View
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      document.getElementById('conversationList').innerHTML = this.getErrorState('Failed to load conversations');
    }
  }

  async loadEmotionalData() {
    try {
      // Load emotional patterns
      await this.loadEmotionalPatterns();
      
      // Load triggers and insights
      await this.loadTriggersInsights();
      
    } catch (error) {
      console.error('Error loading emotional data:', error);
      this.showError('Failed to load emotional data');
    }
  }

  async loadEmotionalPatterns() {
    try {
      const container = document.getElementById('emotionalPatterns');
      
      if (!this.memoryManager.emotionalMemory) {
        container.innerHTML = this.getEmptyState('Emotional tracking not available');
        return;
      }
      
      const patterns = await this.memoryManager.emotionalMemory.getPatterns();
      const recentEmotions = await this.memoryManager.emotionalMemory.getRecentEmotions(30);
      
      const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-number">${patterns.dailySentiment?.length || 0}</div>
            <div class="stat-label">Days Tracked</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${Object.keys(patterns.triggers || {}).length}</div>
            <div class="stat-label">Identified Triggers</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${recentEmotions.length}</div>
            <div class="stat-label">Recent Entries</div>
          </div>
        </div>
        
        <div class="memory-section">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-chart-line"></i> Recent Emotional Trends</h4>
          ${this.renderEmotionalTrends(recentEmotions)}
        </div>
        
        <div class="memory-section">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-tags"></i> Common Topics</h4>
          ${this.renderTopicEmotions(patterns.topicEmotions || {})}
        </div>
      `;
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading emotional patterns:', error);
      document.getElementById('emotionalPatterns').innerHTML = this.getErrorState('Failed to load emotional patterns');
    }
  }

  async loadTriggersInsights() {
    try {
      const container = document.getElementById('triggersInsights');
      
      if (!this.memoryManager.emotionalMemory) {
        container.innerHTML = this.getEmptyState('Emotional tracking not available');
        return;
      }
      
      const patterns = await this.memoryManager.emotionalMemory.getPatterns();
      const triggers = patterns.triggers || {};
      
      const html = `
        <div class="memory-section">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-exclamation-triangle"></i> Emotional Triggers</h4>
          ${this.renderTriggers(triggers)}
        </div>
        
        <div class="memory-section">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-lightbulb"></i> Insights & Recommendations</h4>
          ${this.renderInsights(patterns)}
        </div>
      `;
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading triggers and insights:', error);
      document.getElementById('triggersInsights').innerHTML = this.getErrorState('Failed to load triggers and insights');
    }
  }

  async loadReferences() {
    try {
      const container = document.getElementById('referenceList');
      const references = this.chatReferenceManager.getAllReferences();
      
      let filteredReferences = references;
      if (this.searchFilters.references) {
        filteredReferences = references.filter(ref => 
          ref.title.toLowerCase().includes(this.searchFilters.references.toLowerCase()) ||
          ref.description.toLowerCase().includes(this.searchFilters.references.toLowerCase()) ||
          ref.tags.some(tag => tag.toLowerCase().includes(this.searchFilters.references.toLowerCase()))
        );
      }
      
      if (filteredReferences.length === 0) {
        container.innerHTML = this.getEmptyState('No references found');
        return;
      }

      const html = filteredReferences.map(reference => `
        <div class="memory-item">
          <div class="memory-item-header">
            <div class="memory-item-title">
              <i class="fas fa-${this.getReferenceIcon(reference.type)}"></i>
              ${reference.title}
            </div>
            <div class="memory-item-date">
              ${this.formatDate(reference.createdAt)}
            </div>
          </div>
          <div class="memory-item-content">
            ${reference.description}
          </div>
          <div class="memory-item-tags">
            <span class="tag">${reference.type}</span>
            ${reference.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            <button class="btn btn-primary" onclick="memoryUI.viewReference('${reference.id}')">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-danger" onclick="memoryUI.deleteReference('${reference.id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `).join('');
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading references:', error);
      document.getElementById('referenceList').innerHTML = this.getErrorState('Failed to load references');
    }
  }

  async loadPreferences() {
    try {
      const container = document.getElementById('userPreferences');
      const preferences = await this.memoryManager.getUserPreferences();
      
      const html = `
        <div style="display: grid; gap: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Therapy Goals:</label>
            <textarea id="therapyGoals" style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; resize: vertical;">${preferences.therapyGoals?.join('\n') || ''}</textarea>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Triggers to Avoid:</label>
            <textarea id="triggersToAvoid" style="width: 100%; min-height: 80px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; resize: vertical;">${preferences.triggers?.join('\n') || ''}</textarea>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Preferred Communication Style:</label>
            <select id="communicationStyle" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px;">
              <option value="supportive" ${preferences.communicationStyle === 'supportive' ? 'selected' : ''}>Supportive & Encouraging</option>
              <option value="direct" ${preferences.communicationStyle === 'direct' ? 'selected' : ''}>Direct & Straightforward</option>
              <option value="gentle" ${preferences.communicationStyle === 'gentle' ? 'selected' : ''}>Gentle & Patient</option>
              <option value="analytical" ${preferences.communicationStyle === 'analytical' ? 'selected' : ''}>Analytical & Logical</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Session Reminders:</label>
            <label style="display: block; margin-bottom: 0.5rem;">
              <input type="checkbox" id="dailyReminders" ${preferences.reminders?.daily ? 'checked' : ''} style="margin-right: 0.5rem;">
              Daily check-in reminders
            </label>
            <label style="display: block; margin-bottom: 0.5rem;">
              <input type="checkbox" id="weeklyReviews" ${preferences.reminders?.weekly ? 'checked' : ''} style="margin-right: 0.5rem;">
              Weekly progress reviews
            </label>
          </div>
        </div>
      `;
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading preferences:', error);
      document.getElementById('userPreferences').innerHTML = this.getErrorState('Failed to load preferences');
    }
  }

  // Helper methods for rendering
  renderEmotionalTrends(emotions) {
    if (emotions.length === 0) {
      return '<p style="color: var(--text-light); text-align: center; padding: 1rem;">No emotional data available</p>';
    }
    
    const recent = emotions.slice(-7); // Last 7 entries
    return recent.map(emotion => `
      <div class="memory-item" style="margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${this.formatDate(emotion.timestamp)}</span>
          <div>
            ${this.getSentimentTag(emotion.sentiment)}
            <span class="tag">${emotion.emotionalState?.primary || 'neutral'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderTopicEmotions(topicEmotions) {
    const topics = Object.entries(topicEmotions).slice(0, 10);
    if (topics.length === 0) {
      return '<p style="color: var(--text-light); text-align: center; padding: 1rem;">No topic data available</p>';
    }
    
    return topics.map(([topic, data]) => `
      <div class="memory-item" style="margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500;">${topic}</span>
          <div>
            <span class="tag">${data.count} mentions</span>
            ${this.getSentimentTag({ score: data.avgSentiment })}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderTriggers(triggers) {
    const triggerList = Object.entries(triggers).slice(0, 10);
    if (triggerList.length === 0) {
      return '<p style="color: var(--text-light); text-align: center; padding: 1rem;">No triggers identified</p>';
    }
    
    return triggerList.map(([trigger, data]) => `
      <div class="memory-item" style="margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500;">${trigger}</span>
          <div>
            <span class="tag ${this.getTriggerSeverityClass(data.severity)}">${data.severity}</span>
            <span class="tag">${data.count} occurrences</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderInsights(patterns) {
    const insights = [];
    
    // Generate insights based on patterns
    if (patterns.dailySentiment?.length > 7) {
      const recent = patterns.dailySentiment.slice(-7);
      const avg = recent.reduce((sum, day) => sum + day.avgSentiment, 0) / recent.length;
      if (avg > 0.3) {
        insights.push('Your mood has been generally positive this week! Keep up the good work.');
      } else if (avg < -0.3) {
        insights.push('Your mood has been lower this week. Consider reaching out for additional support.');
      }
    }
    
    if (Object.keys(patterns.triggers || {}).length > 0) {
      insights.push('We\'ve identified some emotional triggers. Being aware of these can help you prepare and cope better.');
    }
    
    if (insights.length === 0) {
      insights.push('Continue tracking your emotions to receive personalized insights.');
    }
    
    return insights.map(insight => `
      <div class="memory-item" style="margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
          <i class="fas fa-lightbulb" style="color: var(--warning-color); margin-top: 0.25rem;"></i>
          <span>${insight}</span>
        </div>
      </div>
    `).join('');
  }

  // Action methods
  async exportConversations() {
    try {
      const sessions = this.conversationHistoryManager.getAllSessions();
      const data = JSON.stringify(sessions, null, 2);
      this.downloadFile(data, 'conversations.json', 'application/json');
    } catch (error) {
      console.error('Error exporting conversations:', error);
      this.showError('Failed to export conversations');
    }
  }

  async exportEmotions() {
    try {
      if (!this.memoryManager.emotionalMemory) {
        this.showError('Emotional tracking not available');
        return;
      }
      
      const emotions = await this.memoryManager.emotionalMemory.getAll();
      const data = JSON.stringify(emotions, null, 2);
      this.downloadFile(data, 'emotions.json', 'application/json');
    } catch (error) {
      console.error('Error exporting emotions:', error);
      this.showError('Failed to export emotional data');
    }
  }

  async clearConversations() {
    if (!confirm('Are you sure you want to clear all conversations? This action cannot be undone.')) {
      return;
    }
    
    try {
      this.conversationHistoryManager.clearAllSessions();
      await this.loadConversations();
      await this.loadOverviewData();
      this.showSuccess('All conversations cleared successfully');
    } catch (error) {
      console.error('Error clearing conversations:', error);
      this.showError('Failed to clear conversations');
    }
  }

  async savePreferences() {
    try {
      const preferences = {
        therapyGoals: document.getElementById('therapyGoals')?.value.split('\n').filter(g => g.trim()) || [],
        triggers: document.getElementById('triggersToAvoid')?.value.split('\n').filter(t => t.trim()) || [],
        communicationStyle: document.getElementById('communicationStyle')?.value || 'supportive',
        reminders: {
          daily: document.getElementById('dailyReminders')?.checked || false,
          weekly: document.getElementById('weeklyReviews')?.checked || false
        }
      };
      
      await this.memoryManager.updateUserPreferences(preferences);
      this.showSuccess('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      this.showError('Failed to save preferences');
    }
  }

  viewSession(sessionId) {
    // Open session in a modal or navigate to detailed view
    console.log('Viewing session:', sessionId);
    // Implementation would show session details
  }

  viewReference(referenceId) {
    // Open reference in a modal or navigate to detailed view
    console.log('Viewing reference:', referenceId);
    // Implementation would show reference details
  }

  deleteReference(referenceId) {
    if (!confirm('Are you sure you want to delete this reference?')) {
      return;
    }
    
    try {
      this.chatReferenceManager.deleteReference(referenceId);
      this.loadReferences();
      this.showSuccess('Reference deleted successfully');
    } catch (error) {
      console.error('Error deleting reference:', error);
      this.showError('Failed to delete reference');
    }
  }

  showCreateReferenceModal() {
    // Implementation would show a modal to create new reference
    console.log('Show create reference modal');
  }

  // Utility methods
  calculateSessionSentiment(session) {
    const sentiments = session.messages
      .filter(msg => msg.metadata?.sentiment?.score)
      .map(msg => msg.metadata.sentiment.score);
    
    return sentiments.length > 0 
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;
  }

  getSentimentTag(sentiment) {
    if (!sentiment || sentiment.score === undefined) {
      return '<span class="tag sentiment-neutral">neutral</span>';
    }
    
    const score = sentiment.score;
    if (score > 0.3) {
      return '<span class="tag sentiment-positive">positive</span>';
    } else if (score < -0.3) {
      return '<span class="tag sentiment-negative">negative</span>';
    } else {
      return '<span class="tag sentiment-neutral">neutral</span>';
    }
  }

  getReferenceIcon(type) {
    const icons = {
      message: 'comment',
      moment: 'star',
      insight: 'lightbulb',
      bookmark: 'bookmark',
      collection: 'folder'
    };
    return icons[type] || 'bookmark';
  }

  getTriggerSeverityClass(severity) {
    const classes = {
      low: 'sentiment-positive',
      medium: 'sentiment-neutral', 
      high: 'sentiment-negative'
    };
    return classes[severity] || 'sentiment-neutral';
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  getEmptyState(message) {
    return `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>${message}</p>
      </div>
    `;
  }

  getErrorState(message) {
    return `
      <div class="empty-state" style="color: var(--danger-color);">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Skip notifications if document.body is not available (e.g., during initialization)
    if (!document.body) {
      console.log(`${type.toUpperCase()}: ${message}`);
      return;
    }
    
    const notification = document.createElement('div');
    notification.className = `reference-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
        ${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}
      </div>
      <div class="notification-body">${message}</div>
      <button class="close-notification" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add('removing');
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
}

// Initialize Memory UI when page loads
let memoryUI;
document.addEventListener('DOMContentLoaded', function() {
  memoryUI = new MemoryUI();
});

// Export for global access
if (typeof window !== 'undefined') {
  window.MemoryUI = MemoryUI;
  window.memoryUI = memoryUI;
}