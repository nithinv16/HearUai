// HearUAI Memory Management System
// Comprehensive memory layer implementation for personalized AI therapy

class MemoryManager {
  constructor() {
    this.userId = this.getUserId();
    this.memoryLayers = {
      shortTerm: new ShortTermMemory(),
      longTerm: new LongTermMemory(this.userId),
      emotional: new EmotionalMemory(this.userId),
      contextual: new ContextualMemory(this.userId),
      preferences: new UserPreferences(this.userId)
    };
    
    this.initializeMemory();
  }

  getUserId() {
    let userId = localStorage.getItem('hearuai_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('hearuai_user_id', userId);
    }
    return userId;
  }

  async initializeMemory() {
    // Load all memory layers
    await Promise.all([
      this.memoryLayers.longTerm.load(),
      this.memoryLayers.emotional.load(),
      this.memoryLayers.contextual.load(),
      this.memoryLayers.preferences.load()
    ]);
  }

  // Store a new memory across relevant layers
  async storeMemory(data) {
    const { message, response, sentiment, context, sessionId, timestamp } = data;
    
    // Store in short-term memory
    this.memoryLayers.shortTerm.store({
      message,
      response,
      sentiment,
      timestamp: timestamp || new Date().toISOString(),
      sessionId
    });

    // Store in long-term memory if significant
    if (this.isSignificantMemory(data)) {
      await this.memoryLayers.longTerm.store({
        message,
        response,
        sentiment,
        context,
        timestamp: timestamp || new Date().toISOString(),
        sessionId,
        importance: this.calculateImportance(data)
      });
    }

    // Store emotional patterns
    if (sentiment) {
      await this.memoryLayers.emotional.store({
        sentiment,
        triggers: this.extractTriggers(message),
        context,
        timestamp: timestamp || new Date().toISOString()
      });
    }

    // Store contextual information
    await this.memoryLayers.contextual.store({
      topics: this.extractTopics(message),
      entities: this.extractEntities(message),
      context,
      timestamp: timestamp || new Date().toISOString(),
      sessionId
    });
  }

  // Retrieve relevant memories for context
  async getRelevantMemories(query, options = {}) {
    const {
      includeShortTerm = true,
      includeLongTerm = true,
      includeEmotional = true,
      includeContextual = true,
      limit = 10
    } = options;

    const memories = [];

    if (includeShortTerm) {
      memories.push(...this.memoryLayers.shortTerm.search(query));
    }

    if (includeLongTerm) {
      memories.push(...await this.memoryLayers.longTerm.search(query, limit));
    }

    if (includeEmotional) {
      const emotionalData = await this.memoryLayers.emotional.getRelevantPatterns(query);
      if (emotionalData && emotionalData.emotions) {
        memories.push(...emotionalData.emotions);
      }
    }

    if (includeContextual) {
      memories.push(...await this.memoryLayers.contextual.search(query));
    }

    return this.rankMemories(memories, query).slice(0, limit);
  }

  // Get user preferences and patterns
  async getUserContext() {
    try {
      const genderPrefs = this.memoryLayers.preferences.getGenderPreference();
      const userProfile = {
        therapyGoals: this.memoryLayers.preferences.preferences.therapyGoals,
        triggers: this.memoryLayers.preferences.preferences.triggers,
        copingStrategies: this.memoryLayers.preferences.getCopingStrategies(),
        interests: this.memoryLayers.preferences.preferences.personalInfo.interests,
        relationshipPatterns: this.memoryLayers.preferences.getRelationshipPatterns(),
        communicationStyle: this.memoryLayers.preferences.preferences.communicationStyle,
        preferredName: this.memoryLayers.preferences.getPreferredName(),
        fullName: this.memoryLayers.preferences.getFullName(),
        gender: genderPrefs.gender,
        genderPreference: genderPrefs.genderPreference,
        proactiveEngagement: this.memoryLayers.preferences.preferences.sessionPreferences.proactiveEngagement
      };

      const recentMemories = await this.getRecentMemories(10);
      const emotionalPatterns = await this.memoryLayers.emotional.getPatterns();

      return {
        userProfile,
        recentMemories,
        emotionalPatterns
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        userProfile: {},
        recentMemories: [],
        emotionalPatterns: {}
      };
    }
  }

  // Get recent memories across all layers
  async getRecentMemories(limit = 10) {
    try {
      const shortTermMemories = this.memoryLayers.shortTerm.getRecent(limit);
      const longTermMemories = await this.memoryLayers.longTerm.getAll();
      
      // Combine and sort by timestamp
      const allMemories = [...shortTermMemories, ...longTermMemories]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
      
      return allMemories;
    } catch (error) {
      console.error('Error getting recent memories:', error);
      return [];
    }
  }

  // Update user preferences based on interactions
  async updatePreferences(preferences) {
    await this.memoryLayers.preferences.update(preferences);
  }

  // Helper methods
  isSignificantMemory(data) {
    const { message, sentiment } = data;
    
    // Consider memory significant if:
    // - Contains emotional keywords
    // - Has strong sentiment (positive or negative)
    // - Contains personal information
    // - Is a breakthrough moment
    
    const emotionalKeywords = ['feel', 'emotion', 'sad', 'happy', 'angry', 'anxious', 'depressed', 'excited', 'love', 'hate', 'fear'];
    const hasEmotionalContent = emotionalKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const hasStrongSentiment = sentiment && (sentiment.score > 0.7 || sentiment.score < -0.7);
    const isLongMessage = message.length > 100;
    
    return hasEmotionalContent || hasStrongSentiment || isLongMessage;
  }

  calculateImportance(data) {
    let importance = 0.5; // Base importance
    
    // Increase importance based on various factors
    if (data.sentiment) {
      importance += Math.abs(data.sentiment.score) * 0.3;
    }
    
    if (data.message.length > 200) {
      importance += 0.2;
    }
    
    // Add more importance calculation logic here
    return Math.min(importance, 1.0);
  }

  extractTriggers(message) {
    // Simple trigger extraction - can be enhanced with NLP
    const triggerWords = ['stress', 'anxiety', 'panic', 'trauma', 'trigger', 'upset', 'overwhelmed'];
    return triggerWords.filter(trigger => 
      message.toLowerCase().includes(trigger)
    );
  }

  extractTopics(message) {
    // Simple topic extraction - can be enhanced with NLP
    const topics = [];
    const topicKeywords = {
      'work': ['work', 'job', 'career', 'boss', 'colleague'],
      'family': ['family', 'parent', 'mother', 'father', 'sibling'],
      'relationship': ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse'],
      'health': ['health', 'sick', 'doctor', 'medicine', 'hospital'],
      'education': ['school', 'study', 'exam', 'university', 'college']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  extractEntities(message) {
    // Simple entity extraction - can be enhanced with NLP
    const entities = [];
    
    // Extract names (simple pattern matching)
    const namePattern = /\b[A-Z][a-z]+\b/g;
    const potentialNames = message.match(namePattern) || [];
    
    entities.push(...potentialNames.map(name => ({ type: 'person', value: name })));
    
    return entities;
  }

  rankMemories(memories, query) {
    // Simple ranking based on relevance and recency
    return memories.sort((a, b) => {
      const aRelevance = this.calculateRelevance(a, query);
      const bRelevance = this.calculateRelevance(b, query);
      
      if (aRelevance !== bRelevance) {
        return bRelevance - aRelevance;
      }
      
      // If relevance is equal, sort by recency
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  calculateRelevance(memory, query) {
    // Simple relevance calculation
    let relevance = 0;
    
    const queryWords = query.toLowerCase().split(' ');
    const memoryText = (memory.message || memory.content || '').toLowerCase();
    
    queryWords.forEach(word => {
      if (memoryText.includes(word)) {
        relevance += 1;
      }
    });
    
    return relevance;
  }

  // Get all memories
  async getAllMemories() {
    return {
      shortTerm: this.memoryLayers.shortTerm.getAll(),
      longTerm: await this.memoryLayers.longTerm.getAll(),
      emotional: await this.memoryLayers.emotional.getAll(),
      contextual: await this.memoryLayers.contextual.getAll(),
      preferences: await this.memoryLayers.preferences.getAll()
    };
  }

  // Export all memories
  async exportMemories() {
    return {
      userId: this.userId,
      exportDate: new Date().toISOString(),
      ...(await this.getAllMemories())
    };
  }

  // Clear all memories (with confirmation)
  async clearAllMemories() {
    await Promise.all([
      this.memoryLayers.shortTerm.clear(),
      this.memoryLayers.longTerm.clear(),
      this.memoryLayers.emotional.clear(),
      this.memoryLayers.contextual.clear(),
      this.memoryLayers.preferences.clear()
    ]);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MemoryManager = MemoryManager;
}