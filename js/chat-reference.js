// Chat Reference System for HearUAI
// Advanced system for creating, managing, and retrieving conversation references

class ChatReferenceManager {
  constructor(conversationHistoryManager, memoryManager) {
    this.conversationHistory = conversationHistoryManager;
    this.memoryManager = memoryManager;
    this.userId = conversationHistoryManager ? conversationHistoryManager.userId : this.getUserId();
    this.storageKey = `hearuai_references_${this.userId}`;
    
    // Reference storage
    this.references = new Map();
    this.tags = new Map();
    this.collections = new Map();
    this.bookmarks = new Map();
    
    // Search and indexing
    this.searchIndex = new Map();
    this.topicIndex = new Map();
    this.emotionIndex = new Map();
    
    this.loadReferences();
  }

  getUserId() {
    let userId = localStorage.getItem('hearuai_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('hearuai_user_id', userId);
    }
    return userId;
  }

  async loadReferences() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load references
        if (data.references) {
          Object.entries(data.references).forEach(([id, ref]) => {
            this.references.set(id, ref);
          });
        }
        
        // Load tags
        if (data.tags) {
          Object.entries(data.tags).forEach(([tag, refs]) => {
            this.tags.set(tag, refs);
          });
        }
        
        // Load collections
        if (data.collections) {
          Object.entries(data.collections).forEach(([id, collection]) => {
            this.collections.set(id, collection);
          });
        }
        
        // Load bookmarks
        if (data.bookmarks) {
          Object.entries(data.bookmarks).forEach(([id, bookmark]) => {
            this.bookmarks.set(id, bookmark);
          });
        }
        
        // Rebuild search indices
        this.rebuildSearchIndices();
      }
    } catch (error) {
      console.error('Error loading chat references:', error);
    }
  }

  async saveReferences() {
    try {
      const data = {
        references: Object.fromEntries(this.references),
        tags: Object.fromEntries(this.tags),
        collections: Object.fromEntries(this.collections),
        bookmarks: Object.fromEntries(this.bookmarks),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving chat references:', error);
    }
  }

  // Create a reference to a specific message or conversation moment
  createReference(options = {}) {
    const {
      sessionId,
      messageId = null,
      title,
      description = '',
      tags = [],
      type = 'message', // message, moment, insight, breakthrough, goal
      importance = 'medium', // low, medium, high, critical
      context = {},
      isPrivate = false
    } = options;

    if (!sessionId) {
      throw new Error('Session ID is required to create a reference');
    }

    const session = this.conversationHistory.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const referenceId = this.generateId('ref');
    const timestamp = new Date().toISOString();

    const reference = {
      id: referenceId,
      sessionId: sessionId,
      messageId: messageId,
      title: title || this.generateReferenceTitle(session, messageId),
      description: description,
      type: type,
      importance: importance,
      tags: [...new Set(tags)], // Remove duplicates
      context: {
        sessionTitle: session.metadata.title,
        sessionDate: session.startTime,
        messageContext: messageId ? this.conversationHistory.getMessageContext(sessionId, messageId, 3) : null,
        emotionalState: context.emotionalState || null,
        topics: context.topics || [],
        entities: context.entities || [],
        ...context
      },
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        accessCount: 0,
        lastAccessed: null,
        isPrivate: isPrivate,
        linkedReferences: [],
        relatedSessions: []
      },
      insights: {
        keyPoints: [],
        emotionalSignificance: null,
        therapeuticValue: null,
        progressMarkers: []
      }
    };

    // Store reference
    this.references.set(referenceId, reference);

    // Update tag index
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, []);
      }
      this.tags.get(tag).push(referenceId);
    });

    // Add to search index
    this.addToSearchIndex(reference);

    // Auto-detect and link related references
    this.linkRelatedReferences(referenceId);

    this.saveReferences();
    return reference;
  }

  // Create a bookmark for quick access
  createBookmark(referenceId, label = null, color = 'blue') {
    const reference = this.references.get(referenceId);
    if (!reference) {
      throw new Error('Reference not found');
    }

    const bookmarkId = this.generateId('bookmark');
    const bookmark = {
      id: bookmarkId,
      referenceId: referenceId,
      label: label || reference.title,
      color: color,
      createdAt: new Date().toISOString(),
      position: this.bookmarks.size // For ordering
    };

    this.bookmarks.set(bookmarkId, bookmark);
    this.saveReferences();
    return bookmark;
  }

  // Create a collection of related references
  createCollection(name, description = '', referenceIds = [], tags = []) {
    const collectionId = this.generateId('collection');
    const collection = {
      id: collectionId,
      name: name,
      description: description,
      referenceIds: [...new Set(referenceIds)],
      tags: [...new Set(tags)],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessCount: 0,
        isShared: false
      },
      insights: {
        commonThemes: [],
        emotionalPatterns: [],
        progressNarrative: ''
      }
    };

    this.collections.set(collectionId, collection);
    this.saveReferences();
    return collection;
  }

  // Search references with advanced filtering
  searchReferences(query, options = {}) {
    const {
      tags = null,
      type = null,
      importance = null,
      dateRange = null,
      sessionIds = null,
      includeContext = true,
      sortBy = 'relevance', // relevance, date, importance, access
      limit = 50
    } = options;

    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);

    for (const [id, reference] of this.references) {
      // Apply filters
      if (tags && !tags.some(tag => reference.tags.includes(tag))) continue;
      if (type && reference.type !== type) continue;
      if (importance && reference.importance !== importance) continue;
      if (sessionIds && !sessionIds.includes(reference.sessionId)) continue;
      
      // Date range filter
      if (dateRange) {
        const refDate = new Date(reference.metadata.createdAt);
        if (refDate < dateRange.start || refDate > dateRange.end) continue;
      }

      // Calculate relevance score
      let relevanceScore = 0;
      
      // Search in title
      if (reference.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 5;
      }
      queryWords.forEach(word => {
        if (reference.title.toLowerCase().includes(word)) {
          relevanceScore += 2;
        }
      });

      // Search in description
      if (reference.description.toLowerCase().includes(queryLower)) {
        relevanceScore += 3;
      }
      queryWords.forEach(word => {
        if (reference.description.toLowerCase().includes(word)) {
          relevanceScore += 1;
        }
      });

      // Search in tags
      reference.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          relevanceScore += 2;
        }
        queryWords.forEach(word => {
          if (tag.toLowerCase().includes(word)) {
            relevanceScore += 1;
          }
        });
      });

      // Search in context if enabled
      if (includeContext && reference.context) {
        const contextText = JSON.stringify(reference.context).toLowerCase();
        queryWords.forEach(word => {
          if (contextText.includes(word)) {
            relevanceScore += 0.5;
          }
        });
      }

      if (relevanceScore > 0) {
        results.push({
          reference: reference,
          relevanceScore: relevanceScore
        });
      }
    }

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.reference.metadata.createdAt) - new Date(a.reference.metadata.createdAt);
        case 'importance':
          const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return importanceOrder[b.reference.importance] - importanceOrder[a.reference.importance];
        case 'access':
          return b.reference.metadata.accessCount - a.reference.metadata.accessCount;
        case 'relevance':
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });

    return results.slice(0, limit).map(result => result.reference);
  }

  // Get reference by ID and track access
  getReference(referenceId) {
    const reference = this.references.get(referenceId);
    if (reference) {
      // Track access
      reference.metadata.accessCount++;
      reference.metadata.lastAccessed = new Date().toISOString();
      this.saveReferences();
    }
    return reference;
  }

  // Get references by tag
  getReferencesByTag(tag) {
    const referenceIds = this.tags.get(tag) || [];
    return referenceIds.map(id => this.references.get(id)).filter(Boolean);
  }

  // Get references by type
  getReferencesByType(type) {
    return Array.from(this.references.values()).filter(ref => ref.type === type);
  }

  // Get all references
  getAllReferences() {
    return Array.from(this.references.values())
      .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
  }

  // Get recent references
  getRecentReferences(limit = 10) {
    return this.getAllReferences().slice(0, limit);
  }

  // Get frequently accessed references
  getPopularReferences(limit = 10) {
    return Array.from(this.references.values())
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, limit);
  }

  // Get all bookmarks
  getBookmarks() {
    return Array.from(this.bookmarks.values())
      .sort((a, b) => a.position - b.position);
  }

  // Get collection by ID
  getCollection(collectionId) {
    const collection = this.collections.get(collectionId);
    if (collection) {
      // Track access
      collection.metadata.accessCount++;
      this.saveReferences();
      
      // Return collection with populated references
      return {
        ...collection,
        references: collection.referenceIds.map(id => this.references.get(id)).filter(Boolean)
      };
    }
    return null;
  }

  // Get all collections
  getCollections() {
    return Array.from(this.collections.values())
      .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
  }

  // Update reference
  updateReference(referenceId, updates) {
    const reference = this.references.get(referenceId);
    if (!reference) {
      throw new Error('Reference not found');
    }

    // Handle tag updates
    if (updates.tags) {
      // Remove from old tags
      reference.tags.forEach(tag => {
        const tagRefs = this.tags.get(tag) || [];
        const index = tagRefs.indexOf(referenceId);
        if (index > -1) {
          tagRefs.splice(index, 1);
          if (tagRefs.length === 0) {
            this.tags.delete(tag);
          }
        }
      });

      // Add to new tags
      updates.tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, []);
        }
        this.tags.get(tag).push(referenceId);
      });
    }

    // Update reference
    Object.assign(reference, updates);
    reference.metadata.updatedAt = new Date().toISOString();

    // Update search index
    this.addToSearchIndex(reference);

    this.saveReferences();
    return reference;
  }

  // Delete reference
  deleteReference(referenceId) {
    const reference = this.references.get(referenceId);
    if (!reference) return false;

    // Remove from tags
    reference.tags.forEach(tag => {
      const tagRefs = this.tags.get(tag) || [];
      const index = tagRefs.indexOf(referenceId);
      if (index > -1) {
        tagRefs.splice(index, 1);
        if (tagRefs.length === 0) {
          this.tags.delete(tag);
        }
      }
    });

    // Remove from collections
    for (const [collectionId, collection] of this.collections) {
      const index = collection.referenceIds.indexOf(referenceId);
      if (index > -1) {
        collection.referenceIds.splice(index, 1);
      }
    }

    // Remove bookmarks
    for (const [bookmarkId, bookmark] of this.bookmarks) {
      if (bookmark.referenceId === referenceId) {
        this.bookmarks.delete(bookmarkId);
      }
    }

    // Remove from search index
    this.removeFromSearchIndex(referenceId);

    // Delete reference
    this.references.delete(referenceId);

    this.saveReferences();
    return true;
  }

  // Link related references
  linkRelatedReferences(referenceId) {
    const reference = this.references.get(referenceId);
    if (!reference) return;

    const related = [];
    
    // Find references with similar tags
    reference.tags.forEach(tag => {
      const taggedRefs = this.tags.get(tag) || [];
      taggedRefs.forEach(id => {
        if (id !== referenceId && !related.includes(id)) {
          related.push(id);
        }
      });
    });

    // Find references from same session
    for (const [id, ref] of this.references) {
      if (id !== referenceId && ref.sessionId === reference.sessionId && !related.includes(id)) {
        related.push(id);
      }
    }

    // Find references with similar topics
    if (reference.context.topics) {
      for (const [id, ref] of this.references) {
        if (id !== referenceId && ref.context.topics) {
          const commonTopics = reference.context.topics.filter(topic => 
            ref.context.topics.includes(topic)
          );
          if (commonTopics.length > 0 && !related.includes(id)) {
            related.push(id);
          }
        }
      }
    }

    // Update linked references (limit to top 10 most relevant)
    reference.metadata.linkedReferences = related.slice(0, 10);
  }

  // Get reference statistics
  getStatistics() {
    const totalReferences = this.references.size;
    const totalBookmarks = this.bookmarks.size;
    const totalCollections = this.collections.size;
    const totalTags = this.tags.size;

    // Type distribution
    const typeDistribution = {};
    for (const reference of this.references.values()) {
      typeDistribution[reference.type] = (typeDistribution[reference.type] || 0) + 1;
    }

    // Importance distribution
    const importanceDistribution = {};
    for (const reference of this.references.values()) {
      importanceDistribution[reference.importance] = (importanceDistribution[reference.importance] || 0) + 1;
    }

    // Most used tags
    const tagUsage = Array.from(this.tags.entries())
      .map(([tag, refs]) => ({ tag, count: refs.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent activity
    const recentActivity = Array.from(this.references.values())
      .filter(ref => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return new Date(ref.metadata.createdAt) > dayAgo;
      }).length;

    return {
      totalReferences,
      totalBookmarks,
      totalCollections,
      totalTags,
      typeDistribution,
      importanceDistribution,
      topTags: tagUsage,
      recentActivity
    };
  }

  // Export references
  exportReferences(format = 'json', options = {}) {
    const {
      includeCollections = true,
      includeBookmarks = true,
      referenceIds = null
    } = options;

    let referencesToExport;
    if (referenceIds) {
      referencesToExport = referenceIds.map(id => this.references.get(id)).filter(Boolean);
    } else {
      referencesToExport = Array.from(this.references.values());
    }

    const exportData = {
      references: referencesToExport,
      collections: includeCollections ? Array.from(this.collections.values()) : [],
      bookmarks: includeBookmarks ? Array.from(this.bookmarks.values()) : [],
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    switch (format) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'markdown':
        return this.convertToMarkdown(exportData);
      case 'json':
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  // Helper methods
  generateId(prefix = 'ref') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateReferenceTitle(session, messageId = null) {
    if (messageId) {
      const message = session.messages.find(m => m.id === messageId);
      if (message) {
        const preview = message.content.substring(0, 50);
        return `${preview}${message.content.length > 50 ? '...' : ''}`;
      }
    }
    return `Reference from ${session.metadata.title}`;
  }

  addToSearchIndex(reference) {
    const searchText = [
      reference.title,
      reference.description,
      ...reference.tags,
      JSON.stringify(reference.context)
    ].join(' ').toLowerCase();

    const words = searchText.split(/\s+/).filter(word => word.length > 2);
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word).add(reference.id);
    });
  }

  removeFromSearchIndex(referenceId) {
    for (const [word, refs] of this.searchIndex) {
      refs.delete(referenceId);
      if (refs.size === 0) {
        this.searchIndex.delete(word);
      }
    }
  }

  rebuildSearchIndices() {
    this.searchIndex.clear();
    this.topicIndex.clear();
    this.emotionIndex.clear();

    for (const reference of this.references.values()) {
      this.addToSearchIndex(reference);
    }
  }

  convertToCSV(exportData) {
    const headers = ['ID', 'Title', 'Type', 'Importance', 'Tags', 'Created', 'Session'];
    const rows = [headers.join(',')];

    exportData.references.forEach(ref => {
      const row = [
        ref.id,
        `"${ref.title.replace(/"/g, '""')}"`,
        ref.type,
        ref.importance,
        `"${ref.tags.join(', ')}"`,
        ref.metadata.createdAt,
        ref.sessionId
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  convertToMarkdown(exportData) {
    let markdown = '# Chat References Export\n\n';
    markdown += `Exported on: ${exportData.exportedAt}\n\n`;

    // References
    markdown += '## References\n\n';
    exportData.references.forEach(ref => {
      markdown += `### ${ref.title}\n\n`;
      markdown += `- **Type:** ${ref.type}\n`;
      markdown += `- **Importance:** ${ref.importance}\n`;
      markdown += `- **Tags:** ${ref.tags.join(', ')}\n`;
      markdown += `- **Created:** ${ref.metadata.createdAt}\n`;
      if (ref.description) {
        markdown += `- **Description:** ${ref.description}\n`;
      }
      markdown += '\n';
    });

    // Collections
    if (exportData.collections.length > 0) {
      markdown += '## Collections\n\n';
      exportData.collections.forEach(collection => {
        markdown += `### ${collection.name}\n\n`;
        markdown += `${collection.description}\n\n`;
        markdown += `**References:** ${collection.referenceIds.length}\n\n`;
      });
    }

    return markdown;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ChatReferenceManager = ChatReferenceManager;
}