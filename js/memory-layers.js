// Memory Layer Implementations for HearUAI
// Individual memory layer classes for different types of memory storage

// Short-term memory for current session
class ShortTermMemory {
  constructor() {
    this.memories = [];
    this.maxSize = 50; // Keep last 50 interactions
  }

  store(data) {
    this.memories.push({
      ...data,
      id: this.generateId(),
      timestamp: data.timestamp || new Date().toISOString()
    });

    // Keep only the most recent memories
    if (this.memories.length > this.maxSize) {
      this.memories = this.memories.slice(-this.maxSize);
    }
  }

  search(query) {
    const queryLower = query.toLowerCase();
    return this.memories.filter(memory => 
      (memory.message && memory.message.toLowerCase().includes(queryLower)) ||
      (memory.response && memory.response.toLowerCase().includes(queryLower))
    );
  }

  getRecent(count = 10) {
    return this.memories.slice(-count);
  }

  getAll() {
    return [...this.memories];
  }

  clear() {
    this.memories = [];
  }

  generateId() {
    return 'stm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Long-term memory for persistent storage
class LongTermMemory {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `hearuai_longterm_${userId}`;
    this.memories = [];
  }

  async load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.memories = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading long-term memory:', error);
      this.memories = [];
    }
  }

  async store(data) {
    const memory = {
      ...data,
      id: this.generateId(),
      timestamp: data.timestamp || new Date().toISOString(),
      importance: data.importance || 0.5
    };

    this.memories.push(memory);
    
    // Sort by importance and keep only top memories
    this.memories.sort((a, b) => b.importance - a.importance);
    if (this.memories.length > 500) {
      this.memories = this.memories.slice(0, 500);
    }

    await this.save();
  }

  async search(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const matches = this.memories.filter(memory => {
      // Search in message and response
      if ((memory.message && memory.message.toLowerCase().includes(queryLower)) ||
          (memory.response && memory.response.toLowerCase().includes(queryLower))) {
        return true;
      }
      
      // Search in context (handle both string and object contexts)
      if (memory.context) {
        if (typeof memory.context === 'string' && memory.context.toLowerCase().includes(queryLower)) {
          return true;
        }
        // If context is an object, search in its topics and emotions
        if (typeof memory.context === 'object') {
          const contextStr = JSON.stringify(memory.context).toLowerCase();
          if (contextStr.includes(queryLower)) {
            return true;
          }
        }
      }
      
      return false;
    });

    return matches.slice(0, limit);
  }

  async getImportant(count = 5) {
    return this.memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, count);
  }

  async getAll() {
    return [...this.memories];
  }

  async save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memories));
    } catch (error) {
      console.error('Error saving long-term memory:', error);
    }
  }

  async clear() {
    this.memories = [];
    localStorage.removeItem(this.storageKey);
  }

  generateId() {
    return 'ltm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Emotional memory for tracking emotional patterns and triggers
class EmotionalMemory {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `hearuai_emotional_${userId}`;
    this.emotions = [];
    this.patterns = {};
    this.triggers = {};
    this.progressMetrics = {};
    this.moodHistory = [];
    this.emotionalGoals = [];
    this.journalEntries = [];
  }

  async load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const data = stored ? JSON.parse(stored) : { 
        emotions: [], 
        patterns: {}, 
        triggers: {},
        progressMetrics: {},
        moodHistory: [],
        emotionalGoals: [],
        journalEntries: []
      };
      this.emotions = data.emotions || [];
      this.patterns = data.patterns || {};
      this.triggers = data.triggers || {};
      this.progressMetrics = data.progressMetrics || {};
      this.moodHistory = data.moodHistory || [];
      this.emotionalGoals = data.emotionalGoals || [];
      this.journalEntries = data.journalEntries || [];
    } catch (error) {
      console.error('Error loading emotional memory:', error);
      this.emotions = [];
      this.patterns = {};
      this.triggers = {};
      this.progressMetrics = {};
      this.moodHistory = [];
      this.emotionalGoals = [];
      this.journalEntries = [];
    }
  }

  async store(data) {
    const emotionalEntry = {
      ...data,
      id: this.generateId(),
      timestamp: data.timestamp || new Date().toISOString(),
      sessionId: data.sessionId || 'default'
    };

    this.emotions.push(emotionalEntry);
    
    // Update comprehensive patterns
    this.updatePatterns(emotionalEntry);
    this.updateTriggers(emotionalEntry);
    this.updateMoodHistory(emotionalEntry);
    this.updateProgressMetrics(emotionalEntry);
    
    // Keep only recent emotional data (last 2000 entries)
    if (this.emotions.length > 2000) {
      this.emotions = this.emotions.slice(-2000);
    }

    await this.save();
  }

  updatePatterns(emotionalEntry) {
    const { sentiment, context, timestamp, message } = emotionalEntry;
    
    // Initialize patterns if needed
    if (!this.patterns.dailySentiment) this.patterns.dailySentiment = {};
    if (!this.patterns.emotionalStates) this.patterns.emotionalStates = {};
    if (!this.patterns.timeOfDay) this.patterns.timeOfDay = {};
    if (!this.patterns.conversationLength) this.patterns.conversationLength = {};
    if (!this.patterns.topicEmotions) this.patterns.topicEmotions = {};
    
    const date = new Date(timestamp).toDateString();
    const hour = new Date(timestamp).getHours();
    const timeSlot = this.getTimeSlot(hour);
    
    // Track daily sentiment patterns
    if (sentiment && sentiment.score !== undefined) {
      if (!this.patterns.dailySentiment[date]) {
        this.patterns.dailySentiment[date] = [];
      }
      this.patterns.dailySentiment[date].push({
        score: sentiment.score,
        label: sentiment.label,
        timestamp: timestamp
      });
    }
    
    // Track emotional states from context
    if (context && context.emotions) {
      context.emotions.forEach(emotion => {
        this.patterns.emotionalStates[emotion] = (this.patterns.emotionalStates[emotion] || 0) + 1;
      });
    }
    
    // Track time-of-day emotional patterns
    if (sentiment && sentiment.score !== undefined) {
      if (!this.patterns.timeOfDay[timeSlot]) {
        this.patterns.timeOfDay[timeSlot] = [];
      }
      this.patterns.timeOfDay[timeSlot].push(sentiment.score);
    }
    
    // Track conversation length vs emotional state
    if (message && sentiment) {
      const length = message.length;
      const lengthCategory = this.getMessageLengthCategory(length);
      if (!this.patterns.conversationLength[lengthCategory]) {
        this.patterns.conversationLength[lengthCategory] = [];
      }
      this.patterns.conversationLength[lengthCategory].push(sentiment.score);
    }
    
    // Track topic-emotion correlations
    if (context && context.topics && sentiment) {
      context.topics.forEach(topic => {
        if (!this.patterns.topicEmotions[topic]) {
          this.patterns.topicEmotions[topic] = [];
        }
        this.patterns.topicEmotions[topic].push({
          sentiment: sentiment.score,
          timestamp: timestamp
        });
      });
    }
  }

  updateTriggers(emotionalEntry) {
    const { sentiment, context, message, timestamp } = emotionalEntry;
    
    // Detect potential emotional triggers
    if (sentiment && sentiment.score < -0.3) { // Negative emotional response
      const potentialTriggers = this.extractTriggers(message, context);
      
      potentialTriggers.forEach(trigger => {
        if (!this.triggers[trigger]) {
          this.triggers[trigger] = {
            count: 0,
            severity: [],
            contexts: [],
            firstSeen: timestamp,
            lastSeen: timestamp
          };
        }
        
        this.triggers[trigger].count++;
        this.triggers[trigger].severity.push(Math.abs(sentiment.score));
        this.triggers[trigger].contexts.push(context);
        this.triggers[trigger].lastSeen = timestamp;
        
        // Keep only recent contexts (last 10)
        if (this.triggers[trigger].contexts.length > 10) {
          this.triggers[trigger].contexts = this.triggers[trigger].contexts.slice(-10);
        }
        if (this.triggers[trigger].severity.length > 20) {
          this.triggers[trigger].severity = this.triggers[trigger].severity.slice(-20);
        }
      });
    }
  }

  updateMoodHistory(emotionalEntry) {
    const { sentiment, timestamp } = emotionalEntry;
    
    if (sentiment && sentiment.score !== undefined) {
      const date = new Date(timestamp).toDateString();
      const existingEntry = this.moodHistory.find(entry => entry.date === date);
      
      if (existingEntry) {
        existingEntry.scores.push(sentiment.score);
        existingEntry.averageScore = existingEntry.scores.reduce((a, b) => a + b, 0) / existingEntry.scores.length;
        existingEntry.lastUpdated = timestamp;
      } else {
        this.moodHistory.push({
          date: date,
          scores: [sentiment.score],
          averageScore: sentiment.score,
          lastUpdated: timestamp
        });
      }
      
      // Keep only last 90 days of mood history
      if (this.moodHistory.length > 90) {
        this.moodHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.moodHistory = this.moodHistory.slice(-90);
      }
    }
  }

  updateProgressMetrics(emotionalEntry) {
    const { sentiment, timestamp } = emotionalEntry;
    
    if (!this.progressMetrics.weeklyProgress) this.progressMetrics.weeklyProgress = [];
    if (!this.progressMetrics.monthlyProgress) this.progressMetrics.monthlyProgress = [];
    if (!this.progressMetrics.streaks) this.progressMetrics.streaks = { positive: 0, stable: 0, current: 'neutral' };
    
    if (sentiment && sentiment.score !== undefined) {
      const week = this.getWeekKey(timestamp);
      const month = this.getMonthKey(timestamp);
      
      // Update weekly progress
      let weekEntry = this.progressMetrics.weeklyProgress.find(w => w.week === week);
      if (!weekEntry) {
        weekEntry = { week, scores: [], sessions: 0 };
        this.progressMetrics.weeklyProgress.push(weekEntry);
      }
      weekEntry.scores.push(sentiment.score);
      weekEntry.sessions++;
      weekEntry.average = weekEntry.scores.reduce((a, b) => a + b, 0) / weekEntry.scores.length;
      
      // Update monthly progress
      let monthEntry = this.progressMetrics.monthlyProgress.find(m => m.month === month);
      if (!monthEntry) {
        monthEntry = { month, scores: [], sessions: 0 };
        this.progressMetrics.monthlyProgress.push(monthEntry);
      }
      monthEntry.scores.push(sentiment.score);
      monthEntry.sessions++;
      monthEntry.average = monthEntry.scores.reduce((a, b) => a + b, 0) / monthEntry.scores.length;
      
      // Update streaks
      this.updateStreaks(sentiment.score);
      
      // Keep only recent progress data
      if (this.progressMetrics.weeklyProgress.length > 12) {
        this.progressMetrics.weeklyProgress = this.progressMetrics.weeklyProgress.slice(-12);
      }
      if (this.progressMetrics.monthlyProgress.length > 6) {
        this.progressMetrics.monthlyProgress = this.progressMetrics.monthlyProgress.slice(-6);
      }
    }
  }

  // Helper methods for emotional analysis
  extractTriggers(message, context) {
    const triggers = [];
    const triggerKeywords = [
      'stress', 'anxiety', 'worry', 'fear', 'panic', 'overwhelm',
      'sad', 'depressed', 'lonely', 'isolated', 'hopeless',
      'angry', 'frustrated', 'irritated', 'annoyed', 'furious',
      'work', 'job', 'boss', 'deadline', 'pressure',
      'family', 'relationship', 'conflict', 'argument',
      'money', 'financial', 'bills', 'debt',
      'health', 'illness', 'pain', 'tired', 'exhausted',
      'rejection', 'failure', 'mistake', 'criticism'
    ];
    
    if (message) {
      const messageLower = message.toLowerCase();
      triggerKeywords.forEach(keyword => {
        if (messageLower.includes(keyword)) {
          triggers.push(keyword);
        }
      });
    }
    
    if (context && context.topics) {
      context.topics.forEach(topic => {
        if (triggerKeywords.includes(topic.toLowerCase())) {
          triggers.push(topic);
        }
      });
    }
    
    return [...new Set(triggers)]; // Remove duplicates
  }
  
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }
  
  getMessageLengthCategory(length) {
    if (length < 50) return 'short';
    if (length < 200) return 'medium';
    return 'long';
  }
  
  getWeekKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  getMonthKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  updateStreaks(sentimentScore) {
    const currentState = sentimentScore > 0.2 ? 'positive' : 
                        sentimentScore < -0.2 ? 'negative' : 'stable';
    
    if (currentState === this.progressMetrics.streaks.current) {
      this.progressMetrics.streaks[currentState]++;
    } else {
      this.progressMetrics.streaks.current = currentState;
      this.progressMetrics.streaks[currentState] = 1;
    }
  }

  async getRelevantPatterns(query) {
    const queryLower = query.toLowerCase();
    const relevantEmotions = this.emotions.filter(emotion => {
      // Check message content
      if (emotion.message && emotion.message.toLowerCase().includes(queryLower)) {
        return true;
      }
      // Check context topics
      if (emotion.context && emotion.context.topics) {
        return emotion.context.topics.some(topic => 
          topic.toLowerCase().includes(queryLower)
        );
      }
      // Check triggers
      if (this.triggers) {
        return Object.keys(this.triggers).some(trigger => 
          queryLower.includes(trigger.toLowerCase())
        );
      }
      return false;
    });
    
    return {
      emotions: relevantEmotions,
      triggers: this.getTriggersForQuery(queryLower),
      patterns: this.getPatternInsights(queryLower)
    };
  }
  
  getTriggersForQuery(query) {
    const relevantTriggers = {};
    Object.entries(this.triggers).forEach(([trigger, data]) => {
      if (query.includes(trigger.toLowerCase())) {
        relevantTriggers[trigger] = {
          ...data,
          averageSeverity: data.severity.reduce((a, b) => a + b, 0) / data.severity.length,
          riskLevel: this.calculateRiskLevel(data)
        };
      }
    });
    return relevantTriggers;
  }
  
  calculateRiskLevel(triggerData) {
    const avgSeverity = triggerData.severity.reduce((a, b) => a + b, 0) / triggerData.severity.length;
    const frequency = triggerData.count;
    const recency = (Date.now() - new Date(triggerData.lastSeen).getTime()) / (1000 * 60 * 60 * 24); // days
    
    let risk = 0;
    risk += avgSeverity * 40; // Severity weight
    risk += Math.min(frequency / 10, 1) * 30; // Frequency weight
    risk += Math.max(0, (7 - recency) / 7) * 30; // Recency weight
    
    if (risk > 70) return 'high';
    if (risk > 40) return 'medium';
    return 'low';
  }
  
  getPatternInsights(query) {
    const insights = {};
    
    // Time-based insights
    if (this.patterns.timeOfDay) {
      insights.timePatterns = {};
      Object.entries(this.patterns.timeOfDay).forEach(([timeSlot, scores]) => {
        insights.timePatterns[timeSlot] = {
          average: scores.reduce((a, b) => a + b, 0) / scores.length,
          count: scores.length
        };
      });
    }
    
    // Topic-emotion insights
    if (this.patterns.topicEmotions) {
      insights.topicEmotions = {};
      Object.entries(this.patterns.topicEmotions).forEach(([topic, data]) => {
        if (topic.toLowerCase().includes(query)) {
          insights.topicEmotions[topic] = {
            average: data.reduce((sum, item) => sum + item.sentiment, 0) / data.length,
            count: data.length,
            trend: this.calculateTopicTrend(data)
          };
        }
      });
    }
    
    return insights;
  }
  
  calculateTopicTrend(topicData) {
    if (topicData.length < 3) return 'insufficient_data';
    
    const recent = topicData.slice(-5);
    const older = topicData.slice(0, -5);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, item) => sum + item.sentiment, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.sentiment, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  async getPatterns() {
    return {
      ...this.patterns,
      recentEmotions: this.emotions.slice(-10),
      emotionalTrends: this.calculateTrends(),
      triggers: this.getTopTriggers(),
      moodSummary: this.getMoodSummary(),
      progressInsights: this.getProgressInsights()
    };
  }
  
  getTopTriggers(limit = 5) {
    return Object.entries(this.triggers)
      .map(([trigger, data]) => ({
        trigger,
        ...data,
        averageSeverity: data.severity.reduce((a, b) => a + b, 0) / data.severity.length,
        riskLevel: this.calculateRiskLevel(data)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  getMoodSummary() {
    if (this.moodHistory.length === 0) return null;
    
    const recent7Days = this.moodHistory.slice(-7);
    const recent30Days = this.moodHistory.slice(-30);
    
    return {
      last7Days: {
        average: recent7Days.reduce((sum, day) => sum + day.averageScore, 0) / recent7Days.length,
        trend: this.calculateMoodTrend(recent7Days),
        bestDay: recent7Days.reduce((best, day) => day.averageScore > best.averageScore ? day : best),
        worstDay: recent7Days.reduce((worst, day) => day.averageScore < worst.averageScore ? day : worst)
      },
      last30Days: {
        average: recent30Days.reduce((sum, day) => sum + day.averageScore, 0) / recent30Days.length,
        trend: this.calculateMoodTrend(recent30Days),
        consistency: this.calculateMoodConsistency(recent30Days)
      }
    };
  }
  
  calculateMoodTrend(moodData) {
    if (moodData.length < 3) return 'insufficient_data';
    
    const scores = moodData.map(day => day.averageScore);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 0.15) return 'improving';
    if (difference < -0.15) return 'declining';
    return 'stable';
  }
  
  calculateMoodConsistency(moodData) {
    if (moodData.length < 5) return 'insufficient_data';
    
    const scores = moodData.map(day => day.averageScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation < 0.2) return 'very_consistent';
    if (standardDeviation < 0.4) return 'consistent';
    if (standardDeviation < 0.6) return 'somewhat_variable';
    return 'highly_variable';
  }
  
  getProgressInsights() {
    const insights = {
      streaks: this.progressMetrics.streaks,
      weeklyTrend: null,
      monthlyTrend: null,
      recommendations: []
    };
    
    // Weekly trend analysis
    if (this.progressMetrics.weeklyProgress && this.progressMetrics.weeklyProgress.length >= 2) {
      const recent = this.progressMetrics.weeklyProgress.slice(-4);
      const trend = this.calculateProgressTrend(recent.map(w => w.average));
      insights.weeklyTrend = trend;
    }
    
    // Monthly trend analysis
    if (this.progressMetrics.monthlyProgress && this.progressMetrics.monthlyProgress.length >= 2) {
      const recent = this.progressMetrics.monthlyProgress.slice(-3);
      const trend = this.calculateProgressTrend(recent.map(m => m.average));
      insights.monthlyTrend = trend;
    }
    
    // Generate recommendations
    insights.recommendations = this.generateRecommendations();
    
    return insights;
  }
  
  calculateProgressTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const difference = lastValue - firstValue;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze triggers
    const highRiskTriggers = Object.entries(this.triggers)
      .filter(([_, data]) => this.calculateRiskLevel(data) === 'high')
      .map(([trigger, _]) => trigger);
    
    if (highRiskTriggers.length > 0) {
      recommendations.push({
        type: 'trigger_management',
        priority: 'high',
        message: `Consider developing coping strategies for: ${highRiskTriggers.join(', ')}`,
        triggers: highRiskTriggers
      });
    }
    
    // Analyze time patterns
    if (this.patterns.timeOfDay) {
      const timeScores = Object.entries(this.patterns.timeOfDay)
        .map(([time, scores]) => ({
          time,
          average: scores.reduce((a, b) => a + b, 0) / scores.length
        }))
        .sort((a, b) => a.average - b.average);
      
      if (timeScores.length > 0 && timeScores[0].average < -0.3) {
        recommendations.push({
          type: 'time_management',
          priority: 'medium',
          message: `Your mood tends to be lowest during ${timeScores[0].time}. Consider scheduling self-care activities during this time.`,
          timeSlot: timeScores[0].time
        });
      }
    }
    
    // Analyze mood consistency
    const moodSummary = this.getMoodSummary();
    if (moodSummary && moodSummary.last30Days.consistency === 'highly_variable') {
      recommendations.push({
        type: 'mood_stability',
        priority: 'medium',
        message: 'Your mood has been quite variable lately. Consider establishing a more consistent daily routine.',
        consistency: moodSummary.last30Days.consistency
      });
    }
    
    return recommendations;
  }

  async getRecentEmotions(options = {}) {
    const { limit = 10, includeAnalysis = false } = options;
    const recentEmotions = this.emotions.slice(-limit).map(emotion => ({
      ...emotion,
      emotions: emotion.context?.emotions || [],
      sentiment: emotion.sentiment || { score: 0, label: 'neutral' }
    }));
    
    if (includeAnalysis) {
      return {
        emotions: recentEmotions,
        analysis: {
          averageSentiment: recentEmotions.reduce((sum, e) => sum + (e.sentiment.score || 0), 0) / recentEmotions.length,
          dominantEmotions: this.getDominantEmotions(recentEmotions),
          volatility: this.calculateEmotionalVolatility(recentEmotions)
        }
      };
    }
    
    return recentEmotions;
  }
  
  getDominantEmotions(emotions) {
    const emotionCounts = {};
    emotions.forEach(emotion => {
      if (emotion.context && emotion.context.emotions) {
        emotion.context.emotions.forEach(em => {
          emotionCounts[em] = (emotionCounts[em] || 0) + 1;
        });
      }
    });
    
    return Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion, count]) => ({ emotion, count }));
  }
  
  calculateEmotionalVolatility(emotions) {
    const scores = emotions
      .filter(e => e.sentiment && e.sentiment.score !== undefined)
      .map(e => e.sentiment.score);
    
    if (scores.length < 2) return 'insufficient_data';
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation < 0.2) return 'low';
    if (standardDeviation < 0.4) return 'moderate';
    return 'high';
  }

  calculateTrends() {
    if (this.emotions.length < 5) return null;
    
    const recent = this.emotions.slice(-20);
    const sentiments = recent
      .filter(e => e.sentiment && e.sentiment.score !== undefined)
      .map(e => e.sentiment.score);
    
    if (sentiments.length === 0) return null;
    
    const average = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
    const trend = sentiments.length > 1 ? 
      (sentiments[sentiments.length - 1] - sentiments[0]) / sentiments.length : 0;
    
    // Calculate momentum (rate of change)
    let momentum = 'stable';
    if (sentiments.length >= 5) {
      const recentFive = sentiments.slice(-5);
      const previousFive = sentiments.slice(-10, -5);
      
      if (previousFive.length > 0) {
        const recentAvg = recentFive.reduce((a, b) => a + b, 0) / recentFive.length;
        const previousAvg = previousFive.reduce((a, b) => a + b, 0) / previousFive.length;
        const change = recentAvg - previousAvg;
        
        if (change > 0.2) momentum = 'accelerating_positive';
        else if (change > 0.05) momentum = 'gradually_improving';
        else if (change < -0.2) momentum = 'accelerating_negative';
        else if (change < -0.05) momentum = 'gradually_declining';
      }
    }
    
    return {
      averageSentiment: average,
      trend: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
      momentum: momentum,
      confidence: Math.min(sentiments.length / 20, 1),
      dataPoints: sentiments.length,
      volatility: this.calculateEmotionalVolatility(recent)
    };
  }

  async getAll() {
    return {
      emotions: [...this.emotions],
      patterns: { ...this.patterns }
    };
  }

  // Emotional Goals Management
  async addEmotionalGoal(goal) {
    const emotionalGoal = {
      id: this.generateId(),
      ...goal,
      createdAt: new Date().toISOString(),
      status: 'active',
      progress: 0
    };
    
    this.emotionalGoals.push(emotionalGoal);
    await this.save();
    return emotionalGoal;
  }
  
  async updateGoalProgress(goalId, progress, notes = '') {
    const goal = this.emotionalGoals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = Math.max(0, Math.min(100, progress));
      goal.lastUpdated = new Date().toISOString();
      if (notes) {
        if (!goal.progressNotes) goal.progressNotes = [];
        goal.progressNotes.push({
          date: new Date().toISOString(),
          progress: progress,
          notes: notes
        });
      }
      if (goal.progress >= 100) {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();
      }
      await this.save();
    }
    return goal;
  }
  
  async getActiveGoals() {
    return this.emotionalGoals.filter(goal => goal.status === 'active');
  }
  
  async getCompletedGoals() {
    return this.emotionalGoals.filter(goal => goal.status === 'completed');
  }
  
  // Advanced Analytics
  async getEmotionalInsights(timeframe = '30days') {
    const insights = {
      summary: this.getMoodSummary(),
      trends: this.calculateTrends(),
      triggers: this.getTopTriggers(),
      recommendations: this.generateRecommendations(),
      goals: {
        active: await this.getActiveGoals(),
        completed: await this.getCompletedGoals()
      },
      riskAssessment: this.calculateRiskAssessment()
    };
    
    return insights;
  }
  
  calculateRiskAssessment() {
    const assessment = {
      overallRisk: 'low',
      factors: [],
      recommendations: []
    };
    
    // Check for high-risk triggers
    const highRiskTriggers = Object.entries(this.triggers)
      .filter(([_, data]) => this.calculateRiskLevel(data) === 'high');
    
    if (highRiskTriggers.length > 0) {
      assessment.factors.push({
        type: 'triggers',
        severity: 'high',
        description: `${highRiskTriggers.length} high-risk emotional triggers identified`
      });
    }
    
    // Check mood volatility
    const recentEmotions = this.emotions.slice(-20);
    const volatility = this.calculateEmotionalVolatility(recentEmotions);
    
    if (volatility === 'high') {
      assessment.factors.push({
        type: 'volatility',
        severity: 'medium',
        description: 'High emotional volatility detected in recent interactions'
      });
    }
    
    // Check for declining trends
    const trends = this.calculateTrends();
    if (trends && trends.trend === 'declining' && trends.momentum.includes('negative')) {
      assessment.factors.push({
        type: 'trend',
        severity: 'medium',
        description: 'Declining emotional trend with negative momentum'
      });
    }
    
    // Calculate overall risk
    const highSeverityCount = assessment.factors.filter(f => f.severity === 'high').length;
    const mediumSeverityCount = assessment.factors.filter(f => f.severity === 'medium').length;
    
    if (highSeverityCount > 0 || mediumSeverityCount > 2) {
      assessment.overallRisk = 'high';
    } else if (mediumSeverityCount > 0) {
      assessment.overallRisk = 'medium';
    }
    
    return assessment;
  }
  
  // Export/Import functionality for data portability
  async exportData() {
    return {
      emotions: this.emotions,
      patterns: this.patterns,
      triggers: this.triggers,
      progressMetrics: this.progressMetrics,
      moodHistory: this.moodHistory,
      emotionalGoals: this.emotionalGoals,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }
  
  async importData(data) {
    if (data.version && data.exportDate) {
      this.emotions = data.emotions || [];
      this.patterns = data.patterns || {};
      this.triggers = data.triggers || {};
      this.progressMetrics = data.progressMetrics || {};
      this.moodHistory = data.moodHistory || [];
      this.emotionalGoals = data.emotionalGoals || [];
      await this.save();
      return true;
    }
    return false;
  }

  async save() {
    try {
      const data = {
        emotions: this.emotions,
        patterns: this.patterns,
        triggers: this.triggers,
        progressMetrics: this.progressMetrics,
        moodHistory: this.moodHistory,
        emotionalGoals: this.emotionalGoals
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving emotional memory:', error);
    }
  }

  async clear() {
    this.emotions = [];
    this.patterns = {};
    this.triggers = {};
    this.progressMetrics = {};
    this.moodHistory = [];
    this.emotionalGoals = [];
    localStorage.removeItem(this.storageKey);
  }

  // Journal Entry Management
  async storeJournalEntry(entry) {
    const journalEntry = {
      id: this.generateJournalId(),
      content: entry.content,
      prompt: entry.prompt || null,
      type: entry.type || 'free_form', // free_form, guided, cbt, dbt, reflection
      mood: entry.mood || null,
      emotions: entry.emotions || [],
      tags: entry.tags || [],
      timestamp: entry.timestamp || new Date().toISOString(),
      sessionId: entry.sessionId || null,
      aiAnalysis: null, // Will be populated by AI analysis
      insights: [],
      patterns: []
    };

    this.journalEntries.push(journalEntry);
    
    // Keep only recent journal entries (last 500 entries)
    if (this.journalEntries.length > 500) {
      this.journalEntries = this.journalEntries.slice(-500);
    }

    await this.save();
    return journalEntry;
  }

  async getJournalEntries(options = {}) {
    const {
      limit = 20,
      type = null,
      dateRange = null,
      tags = null,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    let entries = [...this.journalEntries];

    // Filter by type
    if (type) {
      entries = entries.filter(entry => entry.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      entries = entries.filter(entry => 
        tags.some(tag => entry.tags.includes(tag))
      );
    }

    // Filter by date range
    if (dateRange) {
      const { start, end } = dateRange;
      entries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= new Date(start) && entryDate <= new Date(end);
      });
    }

    // Sort entries
    entries.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'desc') {
        return new Date(bValue) - new Date(aValue);
      } else {
        return new Date(aValue) - new Date(bValue);
      }
    });

    return entries.slice(0, limit);
  }

  async updateJournalEntry(entryId, updates) {
    const entryIndex = this.journalEntries.findIndex(entry => entry.id === entryId);
    if (entryIndex !== -1) {
      this.journalEntries[entryIndex] = {
        ...this.journalEntries[entryIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.journalEntries[entryIndex];
    }
    return null;
  }

  async deleteJournalEntry(entryId) {
    const entryIndex = this.journalEntries.findIndex(entry => entry.id === entryId);
    if (entryIndex !== -1) {
      const deletedEntry = this.journalEntries.splice(entryIndex, 1)[0];
      await this.save();
      return deletedEntry;
    }
    return null;
  }

  async analyzeJournalPatterns() {
    const patterns = {
      emotionalTrends: {},
      commonThemes: {},
      moodProgression: [],
      writingFrequency: {},
      insightfulEntries: []
    };

    // Analyze emotional trends
    this.journalEntries.forEach(entry => {
      if (entry.emotions && entry.emotions.length > 0) {
        entry.emotions.forEach(emotion => {
          patterns.emotionalTrends[emotion] = (patterns.emotionalTrends[emotion] || 0) + 1;
        });
      }

      // Track mood progression
      if (entry.mood) {
        patterns.moodProgression.push({
          date: entry.timestamp,
          mood: entry.mood
        });
      }

      // Track writing frequency
      const date = new Date(entry.timestamp).toDateString();
      patterns.writingFrequency[date] = (patterns.writingFrequency[date] || 0) + 1;

      // Identify insightful entries (longer entries with emotional depth)
      if (entry.content.length > 200 && entry.emotions.length > 2) {
        patterns.insightfulEntries.push({
          id: entry.id,
          timestamp: entry.timestamp,
          preview: entry.content.substring(0, 100) + '...',
          emotionCount: entry.emotions.length
        });
      }
    });

    return patterns;
  }

  async searchJournalEntries(query) {
    const searchTerms = query.toLowerCase().split(' ');
    
    return this.journalEntries.filter(entry => {
      const content = entry.content.toLowerCase();
      const tags = entry.tags.join(' ').toLowerCase();
      const emotions = entry.emotions.join(' ').toLowerCase();
      
      return searchTerms.some(term => 
        content.includes(term) || 
        tags.includes(term) || 
        emotions.includes(term)
      );
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getJournalInsights() {
    const totalEntries = this.journalEntries.length;
    if (totalEntries === 0) return null;

    const recentEntries = this.journalEntries
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return entryDate >= thirtyDaysAgo;
      });

    const avgWordsPerEntry = this.journalEntries.reduce((sum, entry) => 
      sum + entry.content.split(' ').length, 0) / totalEntries;

    const mostCommonEmotions = {};
    this.journalEntries.forEach(entry => {
      entry.emotions.forEach(emotion => {
        mostCommonEmotions[emotion] = (mostCommonEmotions[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(mostCommonEmotions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    return {
      totalEntries,
      recentEntries: recentEntries.length,
      avgWordsPerEntry: Math.round(avgWordsPerEntry),
      topEmotions,
      longestEntry: this.journalEntries.reduce((longest, entry) => 
        entry.content.length > longest.content.length ? entry : longest, 
        { content: '' }
      ),
      writingStreak: this.calculateWritingStreak()
    };
  }

  calculateWritingStreak() {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateString = currentDate.toDateString();
      const hasEntry = this.journalEntries.some(entry => 
        new Date(entry.timestamp).toDateString() === dateString
      );

      if (hasEntry) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  generateJournalId() {
    return 'journal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateId() {
    return 'emotion_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Contextual memory for topics, entities, and conversation context
class ContextualMemory {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `hearuai_contextual_${userId}`;
    this.contexts = [];
    this.topicFrequency = {};
    this.entityMap = {};
  }

  async load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const data = stored ? JSON.parse(stored) : { 
        contexts: [], 
        topicFrequency: {}, 
        entityMap: {} 
      };
      
      this.contexts = data.contexts || [];
      this.topicFrequency = data.topicFrequency || {};
      this.entityMap = data.entityMap || {};
    } catch (error) {
      console.error('Error loading contextual memory:', error);
      this.contexts = [];
      this.topicFrequency = {};
      this.entityMap = {};
    }
  }

  async store(data) {
    const contextEntry = {
      ...data,
      id: this.generateId(),
      timestamp: data.timestamp || new Date().toISOString()
    };

    this.contexts.push(contextEntry);
    
    // Update topic frequency
    if (data.topics) {
      data.topics.forEach(topic => {
        this.topicFrequency[topic] = (this.topicFrequency[topic] || 0) + 1;
      });
    }
    
    // Update entity map
    if (data.entities) {
      data.entities.forEach(entity => {
        if (!this.entityMap[entity.type]) {
          this.entityMap[entity.type] = {};
        }
        this.entityMap[entity.type][entity.value] = 
          (this.entityMap[entity.type][entity.value] || 0) + 1;
      });
    }
    
    // Keep only recent contexts
    if (this.contexts.length > 1000) {
      this.contexts = this.contexts.slice(-1000);
    }

    await this.save();
  }

  async search(query) {
    const queryLower = query.toLowerCase();
    return this.contexts.filter(context => {
      // Search in topics
      if (context.topics && context.topics.some(topic => 
        topic.toLowerCase().includes(queryLower))) {
        return true;
      }
      
      // Search in entities
      if (context.entities && context.entities.some(entity => 
        entity.value.toLowerCase().includes(queryLower))) {
        return true;
      }
      
      // Search in context text (handle both nested and flat context structures)
      if (context.context && typeof context.context === 'string' && context.context.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // Search in message content if available
      if (context.message && context.message.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // Search in response content if available
      if (context.response && context.response.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      return false;
    });
  }

  async getTopics() {
    return Object.entries(this.topicFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
  }

  async getEntities(type = null) {
    if (type) {
      return this.entityMap[type] || {};
    }
    return this.entityMap;
  }

  async getAll() {
    return {
      contexts: [...this.contexts],
      topicFrequency: { ...this.topicFrequency },
      entityMap: { ...this.entityMap }
    };
  }

  async save() {
    try {
      const data = {
        contexts: this.contexts,
        topicFrequency: this.topicFrequency,
        entityMap: this.entityMap
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving contextual memory:', error);
    }
  }

  async clear() {
    this.contexts = [];
    this.topicFrequency = {};
    this.entityMap = {};
    localStorage.removeItem(this.storageKey);
  }

  generateId() {
    return 'cm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// User preferences and settings
class UserPreferences {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `hearuai_preferences_${userId}`;
    this.preferences = {
      therapyGoals: [],
      communicationStyle: 'balanced', // casual, professional, balanced
      preferredTopics: [],
      avoidedTopics: [],
      triggers: [],
      copingStrategies: [], // Added for azure-ai.js compatibility
      relationshipPatterns: [], // Added for relationship dynamics tracking
      moviePreferences: {
        genres: [],
        favoriteMovies: [],
        favoriteQuotes: []
      },
      personalInfo: {
        name: '',
        fullName: '',
        preferredName: '',
        age: null,
        occupation: '',
        interests: [],
        gender: '', // Added for gender-adaptive personality
        genderPreference: 'auto' // auto, female, male - for AI personality adaptation
      },
      sessionPreferences: {
        sessionLength: 'medium', // short, medium, long
        reminderFrequency: 'weekly',
        voiceEnabled: false,
        proactiveEngagement: true // Added for proactive conversation initiation
      }
    };
  }

  async load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const loadedPrefs = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...loadedPrefs };
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async update(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    await this.save();
  }

  async get(key) {
    return key ? this.preferences[key] : this.preferences;
  }

  async getAll() {
    return { ...this.preferences };
  }

  // Name-specific methods
  async setUserNames(fullName, preferredName) {
    this.preferences.personalInfo.fullName = fullName;
    this.preferences.personalInfo.preferredName = preferredName;
    this.preferences.personalInfo.name = preferredName; // Keep backward compatibility
    await this.save();
  }

  getFullName() {
    return this.preferences.personalInfo.fullName || this.preferences.personalInfo.name;
  }

  getPreferredName() {
    return this.preferences.personalInfo.preferredName || this.preferences.personalInfo.name;
  }

  hasUserNames() {
    return !!(this.preferences.personalInfo.preferredName || this.preferences.personalInfo.name);
  }

  // Coping strategies methods
  async addCopingStrategy(strategy) {
    if (!this.preferences.copingStrategies.includes(strategy)) {
      this.preferences.copingStrategies.push(strategy);
      await this.save();
    }
  }

  async removeCopingStrategy(strategy) {
    const index = this.preferences.copingStrategies.indexOf(strategy);
    if (index > -1) {
      this.preferences.copingStrategies.splice(index, 1);
      await this.save();
    }
  }

  getCopingStrategies() {
    return [...this.preferences.copingStrategies];
  }

  // Gender and personality methods
  async setGenderPreference(gender, genderPreference = 'auto') {
    this.preferences.personalInfo.gender = gender;
    this.preferences.personalInfo.genderPreference = genderPreference;
    await this.save();
  }

  getGenderPreference() {
    return {
      gender: this.preferences.personalInfo.gender,
      genderPreference: this.preferences.personalInfo.genderPreference || 'auto'
    };
  }

  // Relationship patterns methods
  async addRelationshipPattern(pattern) {
    this.preferences.relationshipPatterns.push({
      ...pattern,
      timestamp: new Date().toISOString()
    });
    await this.save();
  }

  getRelationshipPatterns() {
    return [...this.preferences.relationshipPatterns];
  }

  async save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  async clear() {
    this.preferences = {
      therapyGoals: [],
      communicationStyle: 'balanced',
      preferredTopics: [],
      avoidedTopics: [],
      triggers: [],
      copingStrategies: [],
      relationshipPatterns: [],
      moviePreferences: {
        genres: [],
        favoriteMovies: [],
        favoriteQuotes: []
      },
      personalInfo: {
        name: '',
        fullName: '',
        preferredName: '',
        age: null,
        occupation: '',
        interests: [],
        gender: '',
        genderPreference: 'auto'
      },
      sessionPreferences: {
        sessionLength: 'medium',
        reminderFrequency: 'weekly',
        voiceEnabled: false,
        proactiveEngagement: true
      }
    };
    localStorage.removeItem(this.storageKey);
  }
}

// Export classes for use in other modules
if (typeof window !== 'undefined') {
  window.ShortTermMemory = ShortTermMemory;
  window.LongTermMemory = LongTermMemory;
  window.EmotionalMemory = EmotionalMemory;
  window.ContextualMemory = ContextualMemory;
  window.UserPreferences = UserPreferences;
}