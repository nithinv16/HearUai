// Growth Path JavaScript
class GrowthPathSystem {
    constructor() {
        this.azureClient = null;
        this.initializeAzureClient();
        
        this.userData = {
            level: 12,
            currentXP: 1250,
            nextLevelXP: 2000,
            currentStreak: 7,
            totalSessions: 45,
            skillsUnlocked: 8,
            achievementsEarned: 12,
            wellnessCoins: 1250,
            unlockedSkills: ['mindfulness', 'breathing', 'gratitude', 'self-compassion', 'stress-management', 'emotional-regulation', 'sleep-hygiene', 'positive-thinking'],
            availableSkills: ['cognitive-restructuring', 'progressive-relaxation'],
            lockedSkills: ['advanced-meditation', 'trauma-processing', 'relationship-skills', 'career-wellness']
        };
        
        this.achievements = {
            earned: [
                { id: 'first-session', title: 'First Steps', description: 'Complete your first therapy session', icon: 'fas fa-baby', progress: '1/1' },
                { id: 'week-streak', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'fas fa-fire', progress: '7/7' },
                { id: 'mood-tracker', title: 'Mood Master', description: 'Log your mood for 30 days', icon: 'fas fa-heart', progress: '30/30' }
            ],
            available: [
                { id: 'month-streak', title: 'Monthly Champion', description: 'Maintain a 30-day streak', icon: 'fas fa-crown', progress: '7/30' },
                { id: 'skill-collector', title: 'Skill Collector', description: 'Unlock 10 different skills', icon: 'fas fa-collection', progress: '8/10' }
            ],
            locked: [
                { id: 'zen-master', title: 'Zen Master', description: 'Complete 100 meditation sessions', icon: 'fas fa-lotus', progress: '0/100' },
                { id: 'helper', title: 'Community Helper', description: 'Help 5 other users', icon: 'fas fa-hands-helping', progress: '0/5' }
            ]
        };
        
        this.challenges = [
            {
                id: 'daily-mindfulness',
                type: 'daily',
                title: 'Mindful Moments',
                description: 'Practice 5 minutes of mindfulness',
                progress: 3,
                target: 5,
                reward: { type: 'xp', amount: 50 },
                timeLeft: '18:42:15'
            },
            {
                id: 'weekly-journal',
                type: 'weekly',
                title: 'Weekly Reflection',
                description: 'Complete 3 journal entries this week',
                progress: 1,
                target: 3,
                reward: { type: 'coins', amount: 100 },
                timeLeft: '3 days'
            },
            {
                id: 'special-gratitude',
                type: 'special',
                title: 'Gratitude Challenge',
                description: 'List 10 things you\'re grateful for',
                progress: 0,
                target: 10,
                reward: { type: 'skill', name: 'Advanced Gratitude' },
                timeLeft: '7 days'
            }
        ];
        
        this.rewards = [
            {
                id: 'custom-theme',
                title: 'Custom Theme',
                description: 'Unlock a personalized app theme',
                cost: 500,
                icon: 'fas fa-palette',
                available: true
            },
            {
                id: 'meditation-music',
                title: 'Premium Meditation Music',
                description: 'Access to exclusive meditation tracks',
                cost: 750,
                icon: 'fas fa-music',
                available: true
            },
            {
                id: 'personal-coach',
                title: 'Personal AI Coach',
                description: 'Unlock advanced AI coaching features',
                cost: 2000,
                icon: 'fas fa-user-tie',
                available: false
            }
        ];
        
        this.activities = [
            {
                id: 'session-complete',
                title: 'Therapy Session Completed',
                description: 'Completed a 30-minute session on anxiety management',
                time: '2 hours ago',
                reward: { type: 'xp', amount: 75 },
                icon: 'fas fa-comments'
            },
            {
                id: 'skill-unlocked',
                title: 'New Skill Unlocked',
                description: 'Unlocked "Positive Thinking" skill',
                time: '1 day ago',
                reward: { type: 'skill', name: 'Positive Thinking' },
                icon: 'fas fa-star'
            },
            {
                id: 'challenge-completed',
                title: 'Challenge Completed',
                description: 'Completed daily mindfulness challenge',
                time: '2 days ago',
                reward: { type: 'coins', amount: 50 },
                icon: 'fas fa-trophy'
            }
        ];
        
        this.skillTree = {
            mindfulness: { x: 400, y: 500, level: 0, unlocked: true },
            breathing: { x: 300, y: 400, level: 1, unlocked: true },
            gratitude: { x: 500, y: 400, level: 1, unlocked: true },
            'self-compassion': { x: 200, y: 300, level: 2, unlocked: true },
            'stress-management': { x: 350, y: 300, level: 2, unlocked: true },
            'emotional-regulation': { x: 500, y: 300, level: 2, unlocked: true },
            'sleep-hygiene': { x: 650, y: 300, level: 2, unlocked: true },
            'positive-thinking': { x: 400, y: 200, level: 3, unlocked: true },
            'cognitive-restructuring': { x: 250, y: 150, level: 4, unlocked: false, available: true },
            'progressive-relaxation': { x: 550, y: 150, level: 4, unlocked: false, available: true },
            'advanced-meditation': { x: 150, y: 100, level: 5, unlocked: false, available: false },
            'trauma-processing': { x: 350, y: 50, level: 5, unlocked: false, available: false },
            'relationship-skills': { x: 550, y: 50, level: 5, unlocked: false, available: false },
            'career-wellness': { x: 650, y: 100, level: 5, unlocked: false, available: false }
        };
        
        this.init();
    }
    
    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for Growth Path');
            } else {
                console.warn('Azure AI configuration not available for Growth Path');
            }
        } catch (error) {
            console.error('Failed to initialize Azure AI client for Growth Path:', error);
        }
    }
    
    init() {
        this.updateUI();
        this.bindEvents();
        this.renderSkillTree();
        this.renderChallenges();
        this.renderRewards();
        this.renderActivities();
        this.renderAchievements();
        this.startTimers();
    }
    
    updateUI() {
        // Update level and XP
        document.getElementById('currentLevel').textContent = this.userData.level;
        document.getElementById('currentXP').textContent = this.userData.currentXP.toLocaleString();
        document.getElementById('nextLevelXP').textContent = this.userData.nextLevelXP.toLocaleString();
        
        const xpProgress = (this.userData.currentXP / this.userData.nextLevelXP) * 100;
        document.getElementById('xpFill').style.width = `${xpProgress}%`;
        
        // Update stats
        document.getElementById('currentStreak').textContent = this.userData.currentStreak;
        document.getElementById('totalSessions').textContent = this.userData.totalSessions;
        document.getElementById('skillsUnlocked').textContent = this.userData.skillsUnlocked;
        document.getElementById('achievementsEarned').textContent = this.userData.achievementsEarned;
        document.getElementById('wellnessCoins').textContent = this.userData.wellnessCoins.toLocaleString();
        
        // Update achievement badge
        const newAchievements = this.achievements.available.length;
        document.getElementById('achievementBadge').textContent = newAchievements;
        document.getElementById('achievementBadge').style.display = newAchievements > 0 ? 'block' : 'none';
    }
    
    bindEvents() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Modal controls
        this.bindModalEvents();
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openModal('settingsModal');
        });
        
        document.getElementById('saveGrowthSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Achievements
        document.getElementById('achievementsBtn').addEventListener('click', () => {
            this.openModal('achievementsModal');
        });
        
        // Achievement tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // View all activities
        document.getElementById('viewAllActivities').addEventListener('click', () => {
            this.showAllActivities();
        });
    }
    
    bindModalEvents() {
        // Close modal buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });
        
        // Click outside to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }
    
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    renderSkillTree() {
        const svg = document.getElementById('treeSvg');
        const nodesContainer = document.getElementById('skillNodes');
        
        // Clear existing content
        svg.innerHTML = '';
        nodesContainer.innerHTML = '';
        
        // Draw connections
        this.drawSkillConnections(svg);
        
        // Create skill nodes
        Object.entries(this.skillTree).forEach(([skillId, skill]) => {
            const node = this.createSkillNode(skillId, skill);
            nodesContainer.appendChild(node);
        });
    }
    
    drawSkillConnections(svg) {
        const connections = [
            ['mindfulness', 'breathing'],
            ['mindfulness', 'gratitude'],
            ['breathing', 'self-compassion'],
            ['breathing', 'stress-management'],
            ['gratitude', 'emotional-regulation'],
            ['gratitude', 'sleep-hygiene'],
            ['self-compassion', 'positive-thinking'],
            ['stress-management', 'positive-thinking'],
            ['emotional-regulation', 'positive-thinking'],
            ['positive-thinking', 'cognitive-restructuring'],
            ['positive-thinking', 'progressive-relaxation'],
            ['cognitive-restructuring', 'advanced-meditation'],
            ['cognitive-restructuring', 'trauma-processing'],
            ['progressive-relaxation', 'relationship-skills'],
            ['progressive-relaxation', 'career-wellness']
        ];
        
        connections.forEach(([from, to]) => {
            const fromSkill = this.skillTree[from];
            const toSkill = this.skillTree[to];
            
            if (fromSkill && toSkill) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromSkill.x);
                line.setAttribute('y1', fromSkill.y);
                line.setAttribute('x2', toSkill.x);
                line.setAttribute('y2', toSkill.y);
                line.setAttribute('stroke', fromSkill.unlocked && toSkill.unlocked ? '#667eea' : '#ddd');
                line.setAttribute('stroke-width', '3');
                line.setAttribute('opacity', fromSkill.unlocked && toSkill.unlocked ? '1' : '0.3');
                svg.appendChild(line);
            }
        });
    }
    
    createSkillNode(skillId, skill) {
        const node = document.createElement('div');
        node.className = 'skill-node';
        node.style.left = `${skill.x - 40}px`;
        node.style.top = `${skill.y - 40}px`;
        
        if (skill.unlocked) {
            node.classList.add('unlocked');
            node.innerHTML = '<i class="fas fa-check"></i>';
        } else if (skill.available) {
            node.classList.add('available');
            node.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            node.classList.add('locked');
            node.innerHTML = '<i class="fas fa-lock"></i>';
        }
        
        node.addEventListener('click', () => {
            this.showSkillDetails(skillId, skill);
        });
        
        return node;
    }
    
    showSkillDetails(skillId, skill) {
        const modal = document.getElementById('skillModal');
        const title = document.getElementById('skillModalTitle');
        const details = document.getElementById('skillDetails');
        
        title.textContent = this.formatSkillName(skillId);
        
        const skillInfo = this.getSkillInfo(skillId);
        details.innerHTML = `
            <div class="skill-detail-content">
                <div class="skill-status ${skill.unlocked ? 'unlocked' : skill.available ? 'available' : 'locked'}">
                    <i class="fas ${skill.unlocked ? 'fa-check' : skill.available ? 'fa-star' : 'fa-lock'}"></i>
                    <span>${skill.unlocked ? 'Unlocked' : skill.available ? 'Available to Unlock' : 'Locked'}</span>
                </div>
                <p class="skill-description">${skillInfo.description}</p>
                <div class="skill-benefits">
                    <h4>Benefits:</h4>
                    <ul>
                        ${skillInfo.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                    </ul>
                </div>
                ${skill.available && !skill.unlocked ? `
                    <div class="skill-requirements">
                        <h4>Requirements:</h4>
                        <p>${skillInfo.requirements}</p>
                    </div>
                    <button class="unlock-skill-btn" onclick="growthPath.unlockSkill('${skillId}')">
                        <i class="fas fa-unlock"></i>
                        Unlock Skill (${skillInfo.cost} XP)
                    </button>
                ` : ''}
            </div>
        `;
        
        this.openModal('skillModal');
    }
    
    getSkillInfo(skillId) {
        const skillData = {
            'mindfulness': {
                description: 'Foundation skill for present-moment awareness and mental clarity.',
                benefits: ['Reduced anxiety', 'Improved focus', 'Better emotional regulation'],
                requirements: 'Complete first therapy session',
                cost: 0
            },
            'breathing': {
                description: 'Learn various breathing techniques for stress relief and relaxation.',
                benefits: ['Instant stress relief', 'Better sleep quality', 'Improved emotional control'],
                requirements: 'Unlock Mindfulness skill',
                cost: 100
            },
            'cognitive-restructuring': {
                description: 'Advanced technique for identifying and changing negative thought patterns.',
                benefits: ['Reduced negative thinking', 'Improved self-esteem', 'Better problem-solving'],
                requirements: 'Complete 10 therapy sessions and unlock Positive Thinking',
                cost: 500
            }
        };
        
        return skillData[skillId] || {
            description: 'A valuable mental wellness skill.',
            benefits: ['Improved mental health', 'Better coping strategies'],
            requirements: 'Meet prerequisite conditions',
            cost: 200
        };
    }
    
    formatSkillName(skillId) {
        return skillId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    unlockSkill(skillId) {
        const skill = this.skillTree[skillId];
        const skillInfo = this.getSkillInfo(skillId);
        
        if (skill && skill.available && !skill.unlocked && this.userData.currentXP >= skillInfo.cost) {
            // Deduct XP
            this.userData.currentXP -= skillInfo.cost;
            
            // Unlock skill
            skill.unlocked = true;
            skill.available = false;
            this.userData.skillsUnlocked++;
            
            // Update UI
            this.updateUI();
            this.renderSkillTree();
            this.closeModal('skillModal');
            
            // Show success message
            this.showNotification(`Skill "${this.formatSkillName(skillId)}" unlocked!`, 'success');
            
            // Award XP for unlocking
            this.awardXP(25, 'Skill Unlocked');
            
            // Generate AI-powered skill recommendations
            this.generateSkillRecommendations();
        }
    }
    
    async generateSkillRecommendations() {
        if (!this.azureClient) {
            return this.generateStaticRecommendations();
        }
        
        try {
            const userContext = this.formatUserDataForAI();
            const prompt = `Based on this user's mental wellness journey data, recommend the next 2-3 skills they should focus on and explain why each would be beneficial:

${userContext}

Available skills to unlock: ${this.userData.availableSkills.join(', ')}
Locked skills for future: ${this.userData.lockedSkills.join(', ')}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "skill": "skill-name",
      "priority": "high|medium|low",
      "reason": "explanation of why this skill would benefit the user",
      "benefits": ["benefit1", "benefit2"]
    }
  ],
  "insights": "Overall insight about the user's growth path"
}`;
            
            const response = await this.azureClient.generateResponse(prompt);
            const recommendations = this.parseAIRecommendations(response);
            
            if (recommendations) {
                this.displaySkillRecommendations(recommendations);
            }
        } catch (error) {
            console.error('Error generating AI skill recommendations:', error);
            this.generateStaticRecommendations();
        }
    }
    
    formatUserDataForAI() {
        return `User Profile:
- Level: ${this.userData.level}
- Current XP: ${this.userData.currentXP}
- Current Streak: ${this.userData.currentStreak} days
- Total Sessions: ${this.userData.totalSessions}
- Skills Unlocked: ${this.userData.unlockedSkills.join(', ')}
- Recent Activities: ${this.activities.slice(0, 3).map(a => a.title).join(', ')}
- Current Challenges: ${this.challenges.filter(c => c.progress < c.target).map(c => c.title).join(', ')}`;
    }
    
    parseAIRecommendations(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing AI recommendations:', error);
        }
        return null;
    }
    
    generateStaticRecommendations() {
        const recommendations = {
            recommendations: [
                {
                    skill: this.userData.availableSkills[0] || 'cognitive-restructuring',
                    priority: 'high',
                    reason: 'This skill builds on your current progress and helps with advanced emotional regulation.',
                    benefits: ['Improved thought patterns', 'Better emotional control']
                }
            ],
            insights: 'Continue building on your strong foundation of mental wellness skills.'
        };
        
        this.displaySkillRecommendations(recommendations);
    }
    
    displaySkillRecommendations(recommendations) {
        // Create a notification with skill recommendations
        const message = `AI Recommendation: Focus on "${recommendations.recommendations[0]?.skill}" - ${recommendations.recommendations[0]?.reason}`;
        this.showNotification(message, 'info', 8000);
    }
    
    renderChallenges() {
        const container = document.getElementById('challengesGrid');
        container.innerHTML = '';
        
        this.challenges.forEach(challenge => {
            const card = this.createChallengeCard(challenge);
            container.appendChild(card);
        });
    }
    
    createChallengeCard(challenge) {
        const card = document.createElement('div');
        card.className = `challenge-card ${challenge.type}`;
        
        const progressPercent = (challenge.progress / challenge.target) * 100;
        const isCompleted = challenge.progress >= challenge.target;
        
        card.innerHTML = `
            <div class="challenge-header">
                <span class="challenge-type ${challenge.type}">${challenge.type}</span>
                <div class="challenge-reward">
                    <i class="fas ${challenge.reward.type === 'xp' ? 'fa-star' : challenge.reward.type === 'coins' ? 'fa-coins' : 'fa-gift'}"></i>
                    ${challenge.reward.amount || challenge.reward.name}
                </div>
            </div>
            <h3 class="challenge-title">${challenge.title}</h3>
            <p class="challenge-description">${challenge.description}</p>
            <div class="challenge-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                <div class="progress-text">${challenge.progress}/${challenge.target} completed</div>
            </div>
            <div class="challenge-actions">
                ${isCompleted ? 
                    '<button class="challenge-btn primary" onclick="growthPath.claimReward(\'' + challenge.id + '\')">' +
                    '<i class="fas fa-gift"></i> Claim Reward</button>' :
                    '<button class="challenge-btn primary" onclick="growthPath.startChallenge(\'' + challenge.id + '\')">' +
                    '<i class="fas fa-play"></i> Continue</button>'
                }
                <button class="challenge-btn secondary" onclick="growthPath.showChallengeDetails('${challenge.id}')">
                    <i class="fas fa-info"></i> Details
                </button>
            </div>
        `;
        
        return card;
    }
    
    startChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (challenge) {
            // Simulate challenge interaction
            this.showNotification(`Starting ${challenge.title}...`, 'info');
            
            // For demo purposes, advance progress
            setTimeout(() => {
                challenge.progress = Math.min(challenge.progress + 1, challenge.target);
                this.renderChallenges();
                
                if (challenge.progress >= challenge.target) {
                    this.showNotification(`Challenge "${challenge.title}" completed!`, 'success');
                }
            }, 1000);
        }
    }
    
    claimReward(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (challenge && challenge.progress >= challenge.target) {
            // Award reward
            if (challenge.reward.type === 'xp') {
                this.awardXP(challenge.reward.amount, `Challenge: ${challenge.title}`);
            } else if (challenge.reward.type === 'coins') {
                this.userData.wellnessCoins += challenge.reward.amount;
            }
            
            // Remove completed challenge
            this.challenges = this.challenges.filter(c => c.id !== challengeId);
            
            // Generate new challenge
            this.generateNewChallenge();
            
            this.updateUI();
            this.renderChallenges();
            this.showNotification('Reward claimed!', 'success');
        }
    }
    
    generateNewChallenge() {
        const newChallenges = [
            {
                id: 'meditation-streak',
                type: 'daily',
                title: 'Meditation Master',
                description: 'Complete a 10-minute meditation',
                progress: 0,
                target: 1,
                reward: { type: 'xp', amount: 75 }
            },
            {
                id: 'mood-check',
                type: 'daily',
                title: 'Mood Awareness',
                description: 'Log your mood 3 times today',
                progress: 0,
                target: 3,
                reward: { type: 'coins', amount: 25 }
            }
        ];
        
        const randomChallenge = newChallenges[Math.floor(Math.random() * newChallenges.length)];
        this.challenges.push(randomChallenge);
    }
    
    renderRewards() {
        const container = document.getElementById('rewardsGrid');
        container.innerHTML = '';
        
        this.rewards.forEach(reward => {
            const card = this.createRewardCard(reward);
            container.appendChild(card);
        });
    }
    
    createRewardCard(reward) {
        const card = document.createElement('div');
        card.className = 'reward-card';
        
        const canAfford = this.userData.wellnessCoins >= reward.cost;
        
        card.innerHTML = `
            <div class="reward-icon">
                <i class="${reward.icon}"></i>
            </div>
            <h3 class="reward-title">${reward.title}</h3>
            <p class="reward-description">${reward.description}</p>
            <div class="reward-cost">
                <i class="fas fa-coins"></i>
                ${reward.cost}
            </div>
            <button class="reward-btn" ${!canAfford || !reward.available ? 'disabled' : ''} 
                    onclick="growthPath.purchaseReward('${reward.id}')">
                ${!reward.available ? 'Coming Soon' : !canAfford ? 'Insufficient Coins' : 'Purchase'}
            </button>
        `;
        
        return card;
    }
    
    purchaseReward(rewardId) {
        const reward = this.rewards.find(r => r.id === rewardId);
        if (reward && reward.available && this.userData.wellnessCoins >= reward.cost) {
            this.userData.wellnessCoins -= reward.cost;
            
            // Mark as purchased
            reward.purchased = true;
            
            this.updateUI();
            this.renderRewards();
            this.showNotification(`"${reward.title}" purchased!`, 'success');
        }
    }
    
    renderActivities() {
        const container = document.getElementById('activitiesTimeline');
        container.innerHTML = '';
        
        this.activities.slice(0, 5).forEach(activity => {
            const item = this.createActivityItem(activity);
            container.appendChild(item);
        });
    }
    
    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        item.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
            <div class="activity-reward">
                <i class="fas ${activity.reward.type === 'xp' ? 'fa-star' : activity.reward.type === 'coins' ? 'fa-coins' : 'fa-gift'}"></i>
                ${activity.reward.amount || activity.reward.name}
            </div>
        `;
        
        return item;
    }
    
    renderAchievements() {
        this.renderAchievementTab('earned', this.achievements.earned);
        this.renderAchievementTab('available', this.achievements.available);
        this.renderAchievementTab('locked', this.achievements.locked);
    }
    
    renderAchievementTab(tabName, achievements) {
        const container = document.getElementById(`${tabName}Achievements`);
        container.innerHTML = '';
        
        achievements.forEach(achievement => {
            const card = this.createAchievementCard(achievement, tabName);
            container.appendChild(card);
        });
    }
    
    createAchievementCard(achievement, status) {
        const card = document.createElement('div');
        card.className = `achievement-card ${status}`;
        
        card.innerHTML = `
            <div class="achievement-icon">
                <i class="${achievement.icon}"></i>
            </div>
            <h3 class="achievement-title">${achievement.title}</h3>
            <p class="achievement-description">${achievement.description}</p>
            <div class="achievement-progress">${achievement.progress}</div>
        `;
        
        return card;
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
    }
    
    awardXP(amount, reason) {
        this.userData.currentXP += amount;
        
        // Check for level up
        while (this.userData.currentXP >= this.userData.nextLevelXP) {
            this.levelUp();
        }
        
        this.updateUI();
        this.showNotification(`+${amount} XP: ${reason}`, 'success');
        
        // Generate AI-powered achievement insights
        this.generateAchievementInsights(amount, reason);
    }
    
    levelUp() {
        this.userData.currentXP -= this.userData.nextLevelXP;
        this.userData.level++;
        this.userData.nextLevelXP = Math.floor(this.userData.nextLevelXP * 1.2);
        
        // Award level up bonus
        this.userData.wellnessCoins += 100;
        
        this.showNotification(`Level Up! You are now level ${this.userData.level}!`, 'success');
        
        // Generate AI-powered level up insights
        this.generateLevelUpInsights();
    }
    
    async generateAchievementInsights(xpAmount, reason) {
        if (!this.azureClient) {
            return;
        }
        
        try {
            const userContext = this.formatUserDataForAI();
            const prompt = `The user just earned ${xpAmount} XP for "${reason}". Based on their progress data, provide a brief, encouraging insight about their achievement and suggest what they might focus on next:

${userContext}

Provide a personalized, motivational message (max 100 words) that acknowledges their progress and offers gentle guidance.`;
            
            const response = await this.azureClient.generateResponse(prompt);
            
            if (response && response.trim()) {
                // Show AI insight as a delayed notification
                setTimeout(() => {
                    this.showNotification(`💡 ${response.trim()}`, 'info', 10000);
                }, 2000);
            }
        } catch (error) {
            console.error('Error generating achievement insights:', error);
        }
    }
    
    async generateLevelUpInsights() {
        if (!this.azureClient) {
            return;
        }
        
        try {
            const userContext = this.formatUserDataForAI();
            const prompt = `The user just reached level ${this.userData.level}! Based on their mental wellness journey data, provide an inspiring message about their growth and suggest meaningful goals for this new level:

${userContext}

Provide a celebratory yet insightful message (max 120 words) that:
1. Celebrates their achievement
2. Reflects on their growth
3. Suggests 1-2 specific goals for their new level`;
            
            const response = await this.azureClient.generateResponse(prompt);
            
            if (response && response.trim()) {
                // Show AI level up insight as a delayed notification
                setTimeout(() => {
                    this.showNotification(`🎉 Level ${this.userData.level} Insight: ${response.trim()}`, 'success', 12000);
                }, 3000);
            }
        } catch (error) {
            console.error('Error generating level up insights:', error);
        }
    }
    
    startTimers() {
        // Update challenge timer
        setInterval(() => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const timeLeft = tomorrow - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            document.getElementById('challengeTimer').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    saveSettings() {
        const settings = {
            dailyChallengeNotifications: document.getElementById('dailyChallengeNotifications').checked,
            streakReminders: document.getElementById('streakReminders').checked,
            achievementNotifications: document.getElementById('achievementNotifications').checked,
            shareProgress: document.getElementById('shareProgress').checked,
            anonymousLeaderboard: document.getElementById('anonymousLeaderboard').checked,
            challengeDifficulty: document.getElementById('challengeDifficulty').value
        };
        
        localStorage.setItem('growthPathSettings', JSON.stringify(settings));
        this.closeModal('settingsModal');
        this.showNotification('Settings saved!', 'success');
    }
    
    loadSettings() {
        const saved = localStorage.getItem('growthPathSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            document.getElementById('dailyChallengeNotifications').checked = settings.dailyChallengeNotifications ?? true;
            document.getElementById('streakReminders').checked = settings.streakReminders ?? true;
            document.getElementById('achievementNotifications').checked = settings.achievementNotifications ?? true;
            document.getElementById('shareProgress').checked = settings.shareProgress ?? false;
            document.getElementById('anonymousLeaderboard').checked = settings.anonymousLeaderboard ?? false;
            document.getElementById('challengeDifficulty').value = settings.challengeDifficulty ?? 'moderate';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    showAllActivities() {
        this.showNotification('All activities feature coming soon!', 'info');
    }
    
    showChallengeDetails(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (challenge) {
            const modal = document.getElementById('challengeModal');
            const title = document.getElementById('challengeModalTitle');
            const details = document.getElementById('challengeDetails');
            
            title.textContent = challenge.title;
            details.innerHTML = `
                <div class="challenge-detail-content">
                    <p><strong>Type:</strong> ${challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)} Challenge</p>
                    <p><strong>Description:</strong> ${challenge.description}</p>
                    <p><strong>Progress:</strong> ${challenge.progress}/${challenge.target}</p>
                    <p><strong>Reward:</strong> ${challenge.reward.amount || challenge.reward.name} ${challenge.reward.type}</p>
                    <p><strong>Time Remaining:</strong> ${challenge.timeLeft}</p>
                </div>
            `;
            
            this.openModal('challengeModal');
        }
    }
}

// Initialize Growth Path System
let growthPath;
document.addEventListener('DOMContentLoaded', () => {
    growthPath = new GrowthPathSystem();
    growthPath.loadSettings();
});