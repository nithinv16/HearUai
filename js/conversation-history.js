// Conversation History Manager for HearUAI
// Advanced conversation tracking, search, and retrieval system

class ConversationHistoryManager {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `hearuai_conversations_${userId}`;
    this.sessions = new Map();
    this.searchIndex = new Map();
    this.currentSession = null;
    
    this.loadConversations();
  }

  async loadConversations() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load sessions
        if (data.sessions) {
          Object.entries(data.sessions).forEach(([sessionId, session]) => {
            this.sessions.set(sessionId, session);
          });
        }
        
        // Rebuild search index
        this.rebuildSearchIndex();
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }

  async saveConversations() {
    try {
      const data = {
        sessions: Object.fromEntries(this.sessions),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  // Start a new conversation session
  startSession(sessionId, metadata = {}) {
    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      endTime: null,
      messages: [],
      metadata: {
        title: metadata.title || `Session ${new Date().toLocaleDateString()}`,
        tags: metadata.tags || [],
        mood: metadata.mood || null,
        goals: metadata.goals || [],
        ...metadata
      },
      summary: null,
      keyMoments: [],
      emotionalJourney: []
    };
    
    this.sessions.set(sessionId, session);
    this.currentSession = sessionId;
    
    return session;
  }

  // End current session
  async endSession(sessionId = null) {
    const targetSessionId = sessionId || this.currentSession;
    if (!targetSessionId) return;
    
    const session = this.sessions.get(targetSessionId);
    if (session) {
      session.endTime = new Date().toISOString();
      session.summary = await this.generateSessionSummary(session);
      
      await this.saveConversations();
    }
    
    if (targetSessionId === this.currentSession) {
      this.currentSession = null;
    }
  }

  // Add message to current session
  addMessage(message, isUser = true, metadata = {}) {
    if (!this.currentSession) {
      console.warn('No active session. Starting new session.');
      this.startSession(this.generateSessionId());
    }
    
    const session = this.sessions.get(this.currentSession);
    if (!session) return;
    
    const messageObj = {
      id: this.generateMessageId(),
      content: message,
      isUser: isUser,
      timestamp: new Date().toISOString(),
      metadata: {
        sentiment: metadata.sentiment || null,
        topics: metadata.topics || [],
        entities: metadata.entities || [],
        importance: metadata.importance || 0.5,
        ...metadata
      }
    };
    
    session.messages.push(messageObj);
    
    // Update search index
    this.addToSearchIndex(messageObj, this.currentSession);
    
    // Track emotional journey
    if (metadata.sentiment) {
      session.emotionalJourney.push({
        timestamp: messageObj.timestamp,
        sentiment: metadata.sentiment,
        messageId: messageObj.id
      });
    }
    
    // Auto-save periodically
    if (session.messages.length % 10 === 0) {
      this.saveConversations();
    }
    
    return messageObj;
  }

  // Mark important moments in conversation
  markKeyMoment(description, messageId = null, metadata = {}) {
    if (!this.currentSession) return;
    
    const session = this.sessions.get(this.currentSession);
    if (!session) return;
    
    const keyMoment = {
      id: this.generateId('moment'),
      description: description,
      timestamp: new Date().toISOString(),
      messageId: messageId,
      metadata: metadata
    };
    
    session.keyMoments.push(keyMoment);
    this.saveConversations();
    
    return keyMoment;
  }

  // Search conversations
  searchConversations(query, options = {}) {
    const {
      sessionIds = null,
      dateRange = null,
      includeMetadata = true,
      sortBy = 'relevance', // relevance, date, importance
      limit = 50
    } = options;
    
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    
    // Search through sessions
    for (const [sessionId, session] of this.sessions) {
      // Filter by session IDs if specified
      if (sessionIds && !sessionIds.includes(sessionId)) continue;
      
      // Filter by date range if specified
      if (dateRange) {
        const sessionDate = new Date(session.startTime);
        if (sessionDate < dateRange.start || sessionDate > dateRange.end) continue;
      }
      
      // Search messages in session
      session.messages.forEach(message => {
        let relevanceScore = 0;
        const messageText = message.content && typeof message.content === 'string' ? message.content.toLowerCase() : '';
        
        // Calculate relevance score
        queryWords.forEach(word => {
          if (messageText.includes(word)) {
            relevanceScore += 1;
            // Boost score for exact phrase matches
            if (messageText.includes(queryLower)) {
              relevanceScore += 2;
            }
          }
        });
        
        // Search in metadata if enabled
        if (includeMetadata && message.metadata) {
          const metadataText = JSON.stringify(message.metadata).toLowerCase();
          queryWords.forEach(word => {
            if (metadataText.includes(word)) {
              relevanceScore += 0.5;
            }
          });
        }
        
        if (relevanceScore > 0) {
          results.push({
            sessionId: sessionId,
            sessionTitle: session.metadata.title,
            message: message,
            relevanceScore: relevanceScore,
            context: this.getMessageContext(sessionId, message.id)
          });
        }
      });
    }
    
    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.message.timestamp) - new Date(a.message.timestamp);
        case 'importance':
          return (b.message.metadata.importance || 0) - (a.message.metadata.importance || 0);
        case 'relevance':
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });
    
    return results.slice(0, limit);
  }

  // Get message context (surrounding messages)
  getMessageContext(sessionId, messageId, contextSize = 2) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return null;
    
    const start = Math.max(0, messageIndex - contextSize);
    const end = Math.min(session.messages.length, messageIndex + contextSize + 1);
    
    return {
      before: session.messages.slice(start, messageIndex),
      target: session.messages[messageIndex],
      after: session.messages.slice(messageIndex + 1, end)
    };
  }

  // Get conversation statistics
  getStatistics(sessionId = null) {
    if (sessionId) {
      return this.getSessionStatistics(sessionId);
    }
    
    // Overall statistics
    let totalMessages = 0;
    let totalSessions = this.sessions.size;
    let totalDuration = 0;
    const topicFrequency = {};
    const emotionalTrends = [];
    
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
      
      if (session.startTime && session.endTime) {
        totalDuration += new Date(session.endTime) - new Date(session.startTime);
      }
      
      // Aggregate topics
      session.messages.forEach(message => {
        if (message.metadata.topics) {
          message.metadata.topics.forEach(topic => {
            topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
          });
        }
      });
      
      // Aggregate emotional trends
      emotionalTrends.push(...session.emotionalJourney);
    }
    
    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession: totalMessages / totalSessions,
      totalDuration,
      averageSessionDuration: totalDuration / totalSessions,
      topTopics: Object.entries(topicFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      emotionalTrends: emotionalTrends
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    };
  }

  getSessionStatistics(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const userMessages = session.messages.filter(m => m.isUser);
    const aiMessages = session.messages.filter(m => !m.isUser);
    
    return {
      sessionId,
      title: session.metadata.title,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? 
        new Date(session.endTime) - new Date(session.startTime) : null,
      totalMessages: session.messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      keyMoments: session.keyMoments.length,
      emotionalJourney: session.emotionalJourney,
      topics: this.extractSessionTopics(session),
      averageMessageLength: session.messages.reduce((sum, m) => 
        sum + m.content.length, 0) / session.messages.length
    };
  }

  // Get total message count across all sessions or for a specific session
  getMessageCount(sessionId = null) {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      return session ? session.messages.length : 0;
    }
    
    // Return total message count across all sessions
    let totalCount = 0;
    for (const session of this.sessions.values()) {
      totalCount += session.messages.length;
    }
    return totalCount;
  }

  // Get all sessions
  getAllSessions() {
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  // Get recent sessions
  getRecentSessions(limit = 10) {
    return this.getAllSessions().slice(0, limit);
  }

  // Get session by ID
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Delete session
  deleteSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      
      // Remove from search index
      this.removeFromSearchIndex(sessionId);
      
      // Update current session if needed
      if (this.currentSession === sessionId) {
        this.currentSession = null;
      }
      
      this.saveConversations();
      return true;
    }
    return false;
  }

  // Export conversations
  exportConversations(format = 'json', sessionIds = null) {
    const sessionsToExport = sessionIds ? 
      sessionIds.map(id => this.sessions.get(id)).filter(Boolean) :
      Array.from(this.sessions.values());
    
    const exportData = {
      userId: this.userId,
      exportDate: new Date().toISOString(),
      format: format,
      sessions: sessionsToExport
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertToCSV(exportData);
      case 'txt':
        return this.convertToText(exportData);
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  // Helper methods
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateId(prefix = 'id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  addToSearchIndex(message, sessionId) {
    if (!message.content || typeof message.content !== 'string') return;
    const words = message.content.toLowerCase().split(/\W+/);
    words.forEach(word => {
      if (word.length > 2) {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word).add(`${sessionId}:${message.id}`);
      }
    });
  }

  removeFromSearchIndex(sessionId) {
    for (const [word, references] of this.searchIndex) {
      const toRemove = Array.from(references).filter(ref => ref.startsWith(sessionId));
      toRemove.forEach(ref => references.delete(ref));
      
      if (references.size === 0) {
        this.searchIndex.delete(word);
      }
    }
  }

  rebuildSearchIndex() {
    this.searchIndex.clear();
    
    for (const [sessionId, session] of this.sessions) {
      session.messages.forEach(message => {
        this.addToSearchIndex(message, sessionId);
      });
    }
  }

  async generateSessionSummary(session) {
    // Simple summary generation - can be enhanced with AI
    const messageCount = session.messages.length;
    const userMessages = session.messages.filter(m => m.isUser).length;
    const duration = session.endTime ? 
      Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000) : 0;
    
    const topics = this.extractSessionTopics(session);
    const keyMoments = session.keyMoments.length;
    
    return {
      messageCount,
      userMessages,
      duration: `${duration} minutes`,
      mainTopics: topics.slice(0, 3),
      keyMoments,
      emotionalTrend: this.calculateEmotionalTrend(session.emotionalJourney)
    };
  }

  extractSessionTopics(session) {
    const topicFreq = {};
    
    session.messages.forEach(message => {
      if (message.metadata.topics) {
        message.metadata.topics.forEach(topic => {
          topicFreq[topic] = (topicFreq[topic] || 0) + 1;
        });
      }
    });
    
    return Object.entries(topicFreq)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);
  }

  calculateEmotionalTrend(emotionalJourney) {
    if (emotionalJourney.length < 2) return 'stable';
    
    const scores = emotionalJourney.map(e => e.sentiment.score || 0);
    const start = scores.slice(0, Math.ceil(scores.length / 3)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 3);
    const end = scores.slice(-Math.ceil(scores.length / 3)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 3);
    
    const change = end - start;
    
    if (change > 0.2) return 'improving';
    if (change < -0.2) return 'declining';
    return 'stable';
  }

  convertToCSV(exportData) {
    // Simple CSV conversion
    let csv = 'Session ID,Timestamp,Speaker,Message,Sentiment\n';
    
    exportData.sessions.forEach(session => {
      session.messages.forEach(message => {
        const row = [
          session.id,
          message.timestamp,
          message.isUser ? 'User' : 'AI',
          `"${message.content.replace(/"/g, '""')}"`,
          message.metadata.sentiment ? message.metadata.sentiment.score : ''
        ].join(',');
        csv += row + '\n';
      });
    });
    
    return csv;
  }

  convertToText(exportData) {
    let text = `HearUAI Conversation Export\n`;
    text += `Export Date: ${exportData.exportDate}\n`;
    text += `User ID: ${exportData.userId}\n\n`;
    
    exportData.sessions.forEach(session => {
      text += `=== ${session.metadata.title} ===\n`;
      text += `Session ID: ${session.id}\n`;
      text += `Start Time: ${session.startTime}\n`;
      if (session.endTime) {
        text += `End Time: ${session.endTime}\n`;
      }
      text += `\n`;
      
      session.messages.forEach(message => {
        const speaker = message.isUser ? 'You' : 'HearUAI';
        text += `[${new Date(message.timestamp).toLocaleTimeString()}] ${speaker}: ${message.content}\n`;
      });
      
      text += `\n\n`;
    });
    
    return text;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ConversationHistoryManager = ConversationHistoryManager;
}