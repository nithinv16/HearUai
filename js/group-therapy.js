// Group Therapy Spaces JavaScript

class GroupTherapyManager {
    constructor() {
        this.currentUser = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            name: 'Anonymous User',
            avatar: 'AU',
            joinedRooms: [],
            supportGiven: 0,
            isAnonymous: true
        };
        
        // Initialize Azure AI client
        this.azureClient = null;
        this.initializeAzureClient();
        
        this.rooms = [
            {
                id: 'anxiety_1',
                name: 'Morning Anxiety Support',
                category: 'anxiety',
                description: 'A safe space to share morning anxiety experiences and coping strategies',
                members: 8,
                maxMembers: 15,
                isActive: true,
                privacy: 'public',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-15'),
                lastActivity: new Date(),
                tags: ['morning', 'coping', 'support']
            },
            {
                id: 'depression_1',
                name: 'Hope & Healing Circle',
                category: 'depression',
                description: 'Finding light in dark moments together',
                members: 12,
                maxMembers: 20,
                isActive: true,
                privacy: 'public',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-10'),
                lastActivity: new Date(),
                tags: ['hope', 'healing', 'support']
            },
            {
                id: 'grief_1',
                name: 'Gentle Grief Support',
                category: 'grief',
                description: 'Compassionate space for those navigating loss',
                members: 6,
                maxMembers: 12,
                isActive: true,
                privacy: 'moderated',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-12'),
                lastActivity: new Date(),
                tags: ['grief', 'loss', 'compassion']
            },
            {
                id: 'relationships_1',
                name: 'Healthy Relationships Workshop',
                category: 'relationships',
                description: 'Building and maintaining healthy connections',
                members: 10,
                maxMembers: 15,
                isActive: true,
                privacy: 'public',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-08'),
                lastActivity: new Date(),
                tags: ['relationships', 'communication', 'boundaries']
            },
            {
                id: 'addiction_1',
                name: 'Recovery Warriors',
                category: 'addiction',
                description: 'Supporting each other on the journey to recovery',
                members: 15,
                maxMembers: 20,
                isActive: true,
                privacy: 'moderated',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-05'),
                lastActivity: new Date(),
                tags: ['recovery', 'sobriety', 'strength']
            },
            {
                id: 'general_1',
                name: 'Daily Check-in Circle',
                category: 'general',
                description: 'Share how you\'re doing today in a supportive environment',
                members: 18,
                maxMembers: 25,
                isActive: true,
                privacy: 'public',
                moderator: 'AI_Moderator',
                created: new Date('2024-01-01'),
                lastActivity: new Date(),
                tags: ['daily', 'check-in', 'support']
            }
        ];
        
        this.activities = [
            {
                id: 'mindfulness_1',
                name: 'Group Mindfulness',
                type: 'mindfulness',
                description: 'Guided meditation and breathing exercises',
                duration: 30,
                maxParticipants: 12,
                currentParticipants: 8,
                nextSession: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                facilitator: 'AI_Guide',
                category: 'wellness'
            },
            {
                id: 'gratitude_1',
                name: 'Gratitude Circle',
                type: 'gratitude',
                description: 'Share what you\'re grateful for in a supportive circle',
                duration: 45,
                maxParticipants: 10,
                currentParticipants: 5,
                nextSession: new Date(Date.now() + 4.5 * 60 * 60 * 1000), // 4.5 hours from now
                facilitator: 'AI_Guide',
                category: 'positivity'
            },
            {
                id: 'coping_1',
                name: 'Coping Strategies',
                type: 'coping',
                description: 'Learn and share effective coping techniques',
                duration: 60,
                maxParticipants: 15,
                currentParticipants: 12,
                nextSession: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
                facilitator: 'AI_Guide',
                category: 'skills'
            }
        ];
        
        this.chatMessages = {};
        this.currentRoom = null;
        this.notificationCount = 3;
        this.settings = {
            anonymousMode: true,
            autoModeration: true,
            crisisDetection: true,
            roomNotifications: true,
            activityReminders: false,
            supportRequests: false,
            autoJoinActivities: false,
            shareProgress: false
        };
        
        this.init();
    }
    
    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG.openai, window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Group Therapy');
            } else {
                console.warn('Azure AI configuration not available for Group Therapy');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client for Group Therapy:', error);
        }
    }
    
    init() {
        this.updateStats();
        this.renderRooms();
        this.renderMyRooms();
        this.setupEventListeners();
        this.startRealTimeUpdates();
    }
    
    updateStats() {
        const activeRooms = this.rooms.filter(room => room.isActive).length;
        const onlineMembers = this.rooms.reduce((total, room) => total + room.members, 0);
        
        document.getElementById('active-rooms').textContent = activeRooms;
        document.getElementById('online-members').textContent = onlineMembers;
        document.getElementById('support-given').textContent = this.currentUser.supportGiven;
    }
    
    renderRooms(filter = 'all') {
        const container = document.getElementById('rooms-container');
        let filteredRooms = this.rooms;
        
        if (filter === 'joined') {
            filteredRooms = this.rooms.filter(room => 
                this.currentUser.joinedRooms.includes(room.id)
            );
        } else if (filter === 'recommended') {
            // Simple recommendation based on user's joined rooms categories
            const userCategories = this.rooms
                .filter(room => this.currentUser.joinedRooms.includes(room.id))
                .map(room => room.category);
            
            filteredRooms = this.rooms.filter(room => 
                userCategories.includes(room.category) && 
                !this.currentUser.joinedRooms.includes(room.id)
            );
        }
        
        container.innerHTML = filteredRooms.map(room => this.createRoomCard(room)).join('');
    }
    
    createRoomCard(room) {
        const isJoined = this.currentUser.joinedRooms.includes(room.id);
        const isFull = room.members >= room.maxMembers;
        const statusClass = isFull ? 'full' : 'active';
        const statusText = isFull ? 'Full' : 'Active';
        const buttonText = isJoined ? 'Enter Room' : 'Join Room';
        const buttonAction = isJoined ? `enterRoom('${room.id}')` : `showJoinRoomModal('${room.id}')`;
        
        return `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <div class="room-status ${statusClass}">
                        <i class="fas fa-circle"></i>
                        ${statusText}
                    </div>
                    <div class="room-category">${this.getCategoryName(room.category)}</div>
                </div>
                <div class="room-info">
                    <h3>${room.name}</h3>
                    <p>${room.description}</p>
                </div>
                <div class="room-meta">
                    <div class="room-stats">
                        <span><i class="fas fa-users"></i> ${room.members}/${room.maxMembers}</span>
                        <span><i class="fas fa-shield-alt"></i> ${room.privacy}</span>
                    </div>
                </div>
                <button class="join-room-btn" onclick="${buttonAction}" ${isFull && !isJoined ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>
        `;
    }
    
    getCategoryName(category) {
        const categoryNames = {
            anxiety: 'Anxiety Support',
            depression: 'Depression Support',
            grief: 'Grief & Loss',
            relationships: 'Relationships',
            addiction: 'Addiction Recovery',
            general: 'General Support'
        };
        return categoryNames[category] || category;
    }
    
    renderMyRooms() {
        const container = document.getElementById('my-rooms-container');
        const myRooms = this.rooms.filter(room => 
            this.currentUser.joinedRooms.includes(room.id)
        );
        
        if (myRooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>You haven't joined any rooms yet. Explore the categories above to find support groups that interest you.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = myRooms.map(room => `
            <div class="my-room-item" data-room-id="${room.id}">
                <div class="my-room-info">
                    <div class="my-room-avatar">
                        ${room.name.charAt(0)}
                    </div>
                    <div class="my-room-details">
                        <h4>${room.name}</h4>
                        <p>${room.members} members • Last active ${this.getTimeAgo(room.lastActivity)}</p>
                    </div>
                </div>
                <div class="my-room-actions">
                    <button class="enter-room-btn" onclick="enterRoom('${room.id}')">
                        Enter
                    </button>
                    <button class="leave-room-btn" onclick="leaveRoom('${room.id}')">
                        Leave
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
    
    setupEventListeners() {
        // Room filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderRooms(e.target.dataset.filter);
            });
        });
        
        // Create room form
        document.getElementById('create-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });
        
        // Guidelines agreement checkbox
        document.getElementById('guidelines-agreement').addEventListener('change', (e) => {
            const joinBtn = document.querySelector('.join-btn');
            joinBtn.disabled = !e.target.checked;
        });
        
        // Chat input
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Settings checkboxes
        Object.keys(this.settings).forEach(setting => {
            const checkbox = document.getElementById(setting.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (checkbox) {
                checkbox.checked = this.settings[setting];
                checkbox.addEventListener('change', (e) => {
                    this.settings[setting] = e.target.checked;
                });
            }
        });
    }
    
    showCategoryRooms(category) {
        const categoryRooms = this.rooms.filter(room => room.category === category);
        const modal = document.getElementById('room-modal');
        const title = document.getElementById('room-modal-title');
        const body = document.getElementById('room-modal-body');
        
        title.textContent = `${this.getCategoryName(category)} Rooms`;
        body.innerHTML = `
            <div class="category-rooms-list">
                ${categoryRooms.map(room => this.createRoomCard(room)).join('')}
            </div>
        `;
        
        this.openModal('room-modal');
    }
    
    showJoinRoomModal(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        const modal = document.getElementById('join-room-modal');
        const title = document.getElementById('join-room-title');
        const preview = document.getElementById('join-room-preview');
        
        title.textContent = `Join ${room.name}`;
        preview.innerHTML = `
            <div class="room-preview-card">
                <h4>${room.name}</h4>
                <p>${room.description}</p>
                <div class="room-preview-stats">
                    <span><i class="fas fa-users"></i> ${room.members}/${room.maxMembers} members</span>
                    <span><i class="fas fa-tag"></i> ${this.getCategoryName(room.category)}</span>
                    <span><i class="fas fa-shield-alt"></i> ${room.privacy}</span>
                </div>
                <div class="room-tags">
                    ${room.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            </div>
        `;
        
        // Reset checkbox
        document.getElementById('guidelines-agreement').checked = false;
        document.querySelector('.join-btn').disabled = true;
        
        // Store room ID for joining
        modal.dataset.roomId = roomId;
        
        this.openModal('join-room-modal');
    }
    
    confirmJoinRoom() {
        const modal = document.getElementById('join-room-modal');
        const roomId = modal.dataset.roomId;
        const room = this.rooms.find(r => r.id === roomId);
        
        if (!room || room.members >= room.maxMembers) {
            this.showNotification('Room is full or unavailable', 'error');
            return;
        }
        
        // Add user to room
        this.currentUser.joinedRooms.push(roomId);
        room.members++;
        
        // Update UI
        this.renderRooms();
        this.renderMyRooms();
        this.updateStats();
        
        this.closeModal('join-room-modal');
        this.showNotification(`Successfully joined ${room.name}!`, 'success');
        
        // Auto-enter room if setting is enabled
        if (this.settings.autoJoinActivities) {
            setTimeout(() => this.enterRoom(roomId), 1000);
        }
    }
    
    createRoom() {
        const form = document.getElementById('create-room-form');
        const formData = new FormData(form);
        
        const newRoom = {
            id: 'room_' + Math.random().toString(36).substr(2, 9),
            name: formData.get('room-name') || document.getElementById('room-name').value,
            category: formData.get('room-category') || document.getElementById('room-category').value,
            description: formData.get('room-description') || document.getElementById('room-description').value,
            privacy: formData.get('room-privacy') || document.getElementById('room-privacy').value,
            maxMembers: parseInt(formData.get('max-members') || document.getElementById('max-members').value),
            members: 1, // Creator is first member
            isActive: true,
            moderator: 'AI_Moderator',
            created: new Date(),
            lastActivity: new Date(),
            tags: ['user-created']
        };
        
        // Add room to list
        this.rooms.unshift(newRoom);
        
        // Add creator to room
        this.currentUser.joinedRooms.push(newRoom.id);
        
        // Update UI
        this.renderRooms();
        this.renderMyRooms();
        this.updateStats();
        
        this.closeModal('create-room-modal');
        this.showNotification(`Room "${newRoom.name}" created successfully!`, 'success');
        
        // Reset form
        form.reset();
    }
    
    enterRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        this.currentRoom = room;
        this.initializeChat(room);
        this.showChat();
    }
    
    leaveRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        if (confirm(`Are you sure you want to leave "${room.name}"?`)) {
            // Remove user from room
            this.currentUser.joinedRooms = this.currentUser.joinedRooms.filter(id => id !== roomId);
            room.members--;
            
            // Close chat if this room is open
            if (this.currentRoom && this.currentRoom.id === roomId) {
                this.closeChat();
            }
            
            // Update UI
            this.renderRooms();
            this.renderMyRooms();
            this.updateStats();
            
            this.showNotification(`Left "${room.name}"`, 'info');
        }
    }
    
    initializeChat(room) {
        if (!this.chatMessages[room.id]) {
            this.chatMessages[room.id] = [
                {
                    id: 'welcome',
                    author: 'AI Moderator',
                    avatar: 'AM',
                    text: `Welcome to ${room.name}! This is a safe, moderated space for support and understanding. Please be respectful and follow our community guidelines.`,
                    timestamp: new Date(),
                    type: 'system'
                },
                {
                    id: 'sample1',
                    author: 'Anonymous User',
                    avatar: 'AU',
                    text: 'Thank you for creating this space. It\'s really helpful to know I\'m not alone in this journey.',
                    timestamp: new Date(Date.now() - 10 * 60 * 1000),
                    type: 'user'
                },
                {
                    id: 'sample2',
                    author: 'Support Seeker',
                    avatar: 'SS',
                    text: 'I\'ve been using the breathing techniques we discussed last week, and they\'re really helping during difficult moments.',
                    timestamp: new Date(Date.now() - 5 * 60 * 1000),
                    type: 'user'
                }
            ];
        }
        
        document.getElementById('chat-room-name').textContent = room.name;
        document.getElementById('chat-room-members').textContent = `${room.members} members online`;
        
        this.renderChatMessages(room.id);
    }
    
    renderChatMessages(roomId) {
        const container = document.getElementById('chat-messages');
        const messages = this.chatMessages[roomId] || [];
        
        container.innerHTML = messages.map(message => `
            <div class="chat-message ${message.type}">
                <div class="message-avatar">${message.avatar}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${message.author}</span>
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    </div>
                    <div class="message-text">${message.text}</div>
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        
        if (!text || !this.currentRoom) return;
        
        // AI moderation check
        if (this.settings.autoModeration && await this.containsInappropriateContent(text)) {
            this.showNotification('Message blocked by AI moderator. Please keep conversations supportive and appropriate.', 'warning');
            return;
        }
        
        // Crisis detection
        if (this.settings.crisisDetection && await this.detectsCrisis(text)) {
            this.handleCrisisDetection(text);
        }
        
        const message = {
            id: 'msg_' + Date.now(),
            author: this.currentUser.name,
            avatar: this.currentUser.avatar,
            text: text,
            timestamp: new Date(),
            type: 'user'
        };
        
        // Add message to room
        if (!this.chatMessages[this.currentRoom.id]) {
            this.chatMessages[this.currentRoom.id] = [];
        }
        this.chatMessages[this.currentRoom.id].push(message);
        
        // Update UI
        this.renderChatMessages(this.currentRoom.id);
        input.value = '';
        
        // Update support given counter
        this.currentUser.supportGiven++;
        this.updateStats();
        
        // Simulate AI response occasionally
        if (Math.random() < 0.3) {
            setTimeout(() => this.generateAIResponse(text), 2000 + Math.random() * 3000);
        }
    }
    
    async containsInappropriateContent(text) {
        try {
            if (this.azureClient) {
                const moderationPrompt = `Analyze this message for inappropriate content in a mental health support group context. Return only "true" if inappropriate or "false" if appropriate:
                
                Message: "${text}"
                
                Consider inappropriate: spam, advertisements, harmful advice, trolling, harassment, or content that violates support group guidelines.`;
                
                const response = await this.azureClient.sendMessage(moderationPrompt, [], {
                    maxTokens: 10,
                    temperature: 0.1
                });
                
                return response.toLowerCase().includes('true');
            } else {
                return this.staticInappropriateContentCheck(text);
            }
        } catch (error) {
            console.error('Error in AI moderation:', error);
            return this.staticInappropriateContentCheck(text);
        }
    }
    
    staticInappropriateContentCheck(text) {
        const inappropriateWords = ['spam', 'advertisement', 'inappropriate'];
        return inappropriateWords.some(word => text.toLowerCase().includes(word));
    }
    
    async detectsCrisis(text) {
        try {
            if (this.azureClient) {
                const crisisPrompt = `Analyze this message for signs of mental health crisis or self-harm risk. Return only "true" if crisis indicators are present or "false" if not:
                
                Message: "${text}"
                
                Look for: suicidal ideation, self-harm mentions, hopelessness, immediate danger signals, or expressions of wanting to end life.`;
                
                const response = await this.azureClient.sendMessage(crisisPrompt, [], {
                    maxTokens: 10,
                    temperature: 0.1
                });
                
                return response.toLowerCase().includes('true');
            } else {
                return this.staticCrisisDetection(text);
            }
        } catch (error) {
            console.error('Error in AI crisis detection:', error);
            return this.staticCrisisDetection(text);
        }
    }
    
    staticCrisisDetection(text) {
        const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'no point', 'give up'];
        return crisisKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }
    
    handleCrisisDetection(text) {
        // In a real implementation, this would alert professional moderators
        const crisisMessage = {
            id: 'crisis_' + Date.now(),
            author: 'Crisis Support Bot',
            avatar: 'CS',
            text: 'I notice you might be going through a difficult time. Please remember that you\'re not alone, and help is available. If you\'re in immediate danger, please contact emergency services or a crisis hotline. Would you like me to provide some resources?',
            timestamp: new Date(),
            type: 'system'
        };
        
        this.chatMessages[this.currentRoom.id].push(crisisMessage);
        this.renderChatMessages(this.currentRoom.id);
    }
    
    async generateAIResponse(userMessage = '') {
        if (!this.currentRoom) return;
        
        try {
            if (this.azureClient) {
                const systemPrompt = `You are a compassionate AI moderator for a mental health support group. Your role is to:
                1. Provide empathetic, supportive responses
                2. Encourage healthy discussion
                3. Validate feelings without giving medical advice
                4. Suggest coping strategies when appropriate
                5. Keep responses brief (1-2 sentences)
                
                Room context: ${this.currentRoom.category} support group - ${this.currentRoom.name}
                ${userMessage ? `User message: "${userMessage}"` : ''}
                
                Respond with warmth and understanding, focusing on emotional support.`;
                
                const response = await this.azureClient.sendMessage(systemPrompt, [], {
                    maxTokens: 150,
                    temperature: 0.7
                });
                
                const aiMessage = {
                    id: 'ai_' + Date.now(),
                    author: 'AI Moderator',
                    avatar: 'AM',
                    text: response,
                    timestamp: new Date(),
                    type: 'system'
                };
                
                this.chatMessages[this.currentRoom.id].push(aiMessage);
                this.renderChatMessages(this.currentRoom.id);
            } else {
                this.generateStaticAIResponse();
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            this.generateStaticAIResponse();
        }
    }
    
    generateStaticAIResponse() {
        if (!this.currentRoom) return;
        
        const responses = [
            'Thank you for sharing that. Your courage in opening up helps create a safe space for everyone.',
            'That\'s a really insightful perspective. How has that approach been working for you?',
            'I appreciate you being so supportive to others in this group. Community care is so important.',
            'It sounds like you\'ve been through a lot. Remember to be gentle with yourself during this process.',
            'That\'s a great coping strategy. Has anyone else tried something similar?'
        ];
        
        const aiMessage = {
            id: 'ai_' + Date.now(),
            author: 'AI Moderator',
            avatar: 'AM',
            text: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
            type: 'system'
        };
        
        this.chatMessages[this.currentRoom.id].push(aiMessage);
        this.renderChatMessages(this.currentRoom.id);
    }
    
    showChat() {
        document.getElementById('chat-interface').classList.add('active');
    }
    
    minimizeChat() {
        document.getElementById('chat-interface').classList.toggle('minimized');
    }
    
    closeChat() {
        document.getElementById('chat-interface').classList.remove('active');
        this.currentRoom = null;
    }
    
    joinActivity(activityType) {
        const activity = this.activities.find(a => a.type === activityType);
        if (!activity) return;
        
        if (activity.currentParticipants >= activity.maxParticipants) {
            this.showNotification('Activity is full. You\'ve been added to the waitlist.', 'info');
            return;
        }
        
        activity.currentParticipants++;
        this.showNotification(`Joined ${activity.name}! You\'ll receive a reminder before the session starts.`, 'success');
        
        // Update activity display
        this.updateActivityDisplay(activity);
    }
    
    updateActivityDisplay(activity) {
        const card = document.querySelector(`[data-activity="${activity.type}"]`);
        if (card) {
            const participantsSpan = card.querySelector('.activity-details span:last-child');
            if (participantsSpan) {
                participantsSpan.innerHTML = `<i class="fas fa-users"></i> ${activity.currentParticipants}/${activity.maxParticipants} joined`;
            }
        }
    }
    
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    toggleNotifications() {
        // Toggle notification panel (would show recent notifications)
        this.showNotification('Notification center opened', 'info');
    }
    
    openSettingsModal() {
        this.openModal('settings-modal');
    }
    
    openCreateRoomModal() {
        this.openModal('create-room-modal');
    }
    
    saveSettings() {
        // Settings are already saved in real-time via event listeners
        this.showNotification('Settings saved successfully!', 'success');
        this.closeModal('settings-modal');
    }
    
    resetSettings() {
        // Reset to default settings
        this.settings = {
            anonymousMode: true,
            autoModeration: true,
            crisisDetection: true,
            roomNotifications: true,
            activityReminders: false,
            supportRequests: false,
            autoJoinActivities: false,
            shareProgress: false
        };
        
        // Update checkboxes
        Object.keys(this.settings).forEach(setting => {
            const checkbox = document.getElementById(setting.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (checkbox) {
                checkbox.checked = this.settings[setting];
            }
        });
        
        this.showNotification('Settings reset to default', 'info');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    startRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            // Update room activity
            this.rooms.forEach(room => {
                if (Math.random() < 0.1) { // 10% chance per interval
                    room.lastActivity = new Date();
                    
                    // Occasionally add/remove members
                    if (Math.random() < 0.3) {
                        const change = Math.random() < 0.6 ? 1 : -1;
                        room.members = Math.max(1, Math.min(room.maxMembers, room.members + change));
                    }
                }
            });
            
            // Update stats
            this.updateStats();
            
            // Update my rooms if visible
            if (document.getElementById('my-rooms-container').children.length > 0) {
                this.renderMyRooms();
            }
        }, 30000); // Update every 30 seconds
    }
}

// Global functions for onclick handlers
let groupTherapyManager;

function showCategoryRooms(category) {
    groupTherapyManager.showCategoryRooms(category);
}

function showJoinRoomModal(roomId) {
    groupTherapyManager.showJoinRoomModal(roomId);
}

function confirmJoinRoom() {
    groupTherapyManager.confirmJoinRoom();
}

function enterRoom(roomId) {
    groupTherapyManager.enterRoom(roomId);
}

function leaveRoom(roomId) {
    groupTherapyManager.leaveRoom(roomId);
}

function joinActivity(activityType) {
    groupTherapyManager.joinActivity(activityType);
}

function toggleNotifications() {
    groupTherapyManager.toggleNotifications();
}

function openSettingsModal() {
    groupTherapyManager.openSettingsModal();
}

function openCreateRoomModal() {
    groupTherapyManager.openCreateRoomModal();
}

function closeModal(modalId) {
    groupTherapyManager.closeModal(modalId);
}

function saveSettings() {
    groupTherapyManager.saveSettings();
}

function resetSettings() {
    groupTherapyManager.resetSettings();
}

function sendMessage() {
    groupTherapyManager.sendMessage();
}

function minimizeChat() {
    groupTherapyManager.minimizeChat();
}

function closeChat() {
    groupTherapyManager.closeChat();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    groupTherapyManager = new GroupTherapyManager();
});

// Add notification styles
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 10px;
    padding: 15px 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
}

.notification-success {
    border-left: 4px solid #43e97b;
}

.notification-error {
    border-left: 4px solid #ff4757;
}

.notification-warning {
    border-left: 4px solid #ffa502;
}

.notification-info {
    border-left: 4px solid #667eea;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification-content i {
    font-size: 1.2rem;
}

.notification-success .notification-content i {
    color: #43e97b;
}

.notification-error .notification-content i {
    color: #ff4757;
}

.notification-warning .notification-content i {
    color: #ffa502;
}

.notification-info .notification-content i {
    color: #667eea;
}

.notification-close {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 5px;
    border-radius: 3px;
    transition: all 0.3s ease;
}

.notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    backdrop-filter: blur(10px);
}

.room-preview-card {
    background: rgba(102, 126, 234, 0.05);
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
}

.room-preview-card h4 {
    color: #333;
    margin-bottom: 10px;
    font-weight: 600;
}

.room-preview-card p {
    color: #666;
    margin-bottom: 15px;
    line-height: 1.5;
}

.room-preview-stats {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.room-preview-stats span {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #888;
    font-size: 0.9rem;
}

.room-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.tag {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);
    }
}
