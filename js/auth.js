// Authentication System for HearuAI
// Handles user registration, login, and session management

class AuthManager {
  constructor() {
    this.storageKey = 'hearuai_user_auth';
    this.currentUser = null;
    this.init();
  }

  init() {
    this.loadUserSession();
    this.setupEventListeners();
    
    // Check if user is already logged in
    if (this.isLoggedIn()) {
      this.showWelcomeSection();
    }
  }

  setupEventListeners() {
    // Tab switching
    const authTabs = document.querySelectorAll('.auth-tab');
    if (authTabs && authTabs.length > 0) {
      authTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          this.switchTab(e.target.dataset.tab);
        });
      });
    }

    // Form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSignup();
      });
    }
  }

  switchTab(tabName) {
    // Update tab appearance
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Show corresponding form
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active');
    });
    document.getElementById(`${tabName}Form`).classList.add('active');

    // Clear messages
    this.clearMessages();
  }

  async handleLogin() {
    const name = document.getElementById('loginName').value.trim();
    
    if (!name) {
      this.showError('Please enter your name');
      return;
    }

    this.showLoading(true);

    try {
      // Check if user exists
      const existingUsers = this.getStoredUsers();
      const user = existingUsers.find(u => 
        u.fullName.toLowerCase() === name.toLowerCase() || 
        u.preferredName.toLowerCase() === name.toLowerCase()
      );

      if (user) {
        // User exists, log them in
        this.currentUser = user;
        this.saveUserSession();
        this.showSuccess(`Welcome back, ${user.preferredName}!`);
        
        setTimeout(() => {
          this.showWelcomeSection();
        }, 1500);
      } else {
        // User doesn't exist, suggest signup
        this.showError('I don\'t recognize that name. Would you like to create a new profile?');
        setTimeout(() => {
          this.switchTab('signup');
          document.getElementById('fullName').value = name;
          document.getElementById('preferredName').value = name;
        }, 2000);
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async handleSignup() {
    const fullName = document.getElementById('fullName').value.trim();
    const preferredName = document.getElementById('preferredName').value.trim();
    
    if (!fullName || !preferredName) {
      this.showError('Please fill in both fields');
      return;
    }

    this.showLoading(true);

    try {
      // Check if user already exists
      const existingUsers = this.getStoredUsers();
      const userExists = existingUsers.some(u => 
        u.fullName.toLowerCase() === fullName.toLowerCase() ||
        u.preferredName.toLowerCase() === preferredName.toLowerCase()
      );

      if (userExists) {
        this.showError('A user with this name already exists. Try logging in instead.');
        setTimeout(() => {
          this.switchTab('login');
          document.getElementById('loginName').value = preferredName;
        }, 2000);
        return;
      }

      // Create new user
      const newUser = {
        id: this.generateUserId(),
        fullName: fullName,
        preferredName: preferredName,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      // Save user
      this.saveUser(newUser);
      this.currentUser = newUser;
      this.saveUserSession();
      
      this.showSuccess(`Welcome to HearuAI, ${preferredName}! Your profile has been created.`);
      
      setTimeout(() => {
        this.showWelcomeSection();
      }, 2000);

    } catch (error) {
      console.error('Signup error:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  saveUser(user) {
    const users = this.getStoredUsers();
    users.push(user);
    localStorage.setItem('hearuai_users', JSON.stringify(users));
  }

  getStoredUsers() {
    try {
      const stored = localStorage.getItem('hearuai_users');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  saveUserSession() {
    if (this.currentUser) {
      // Update last login time
      this.currentUser.lastLoginAt = new Date().toISOString();
      
      // Save current session
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
      
      // Update user in storage
      const users = this.getStoredUsers();
      const userIndex = users.findIndex(u => u.id === this.currentUser.id);
      if (userIndex !== -1) {
        users[userIndex] = this.currentUser;
        localStorage.setItem('hearuai_users', JSON.stringify(users));
      }
    }
  }

  loadUserSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user session:', error);
      this.currentUser = null;
    }
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  getPreferredName() {
    return this.currentUser ? this.currentUser.preferredName : null;
  }

  getFullName() {
    return this.currentUser ? this.currentUser.fullName : null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
    window.location.href = 'auth.html';
  }

  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  showWelcomeSection() {
    const authContent = document.querySelector('.auth-content');
    const welcomeSection = document.getElementById('welcomeSection');
    const welcomeName = document.getElementById('welcomeName');
    
    if (authContent) {
      authContent.style.display = 'none';
    }
    if (welcomeSection) {
      welcomeSection.classList.add('active');
    }
    if (welcomeName && this.currentUser) {
      welcomeName.textContent = this.currentUser.preferredName;
    }
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    const forms = document.querySelectorAll('.auth-form');
    
    if (show) {
      loading.style.display = 'block';
      forms.forEach(form => form.style.display = 'none');
    } else {
      loading.style.display = 'none';
      document.querySelector('.auth-form.active').style.display = 'block';
    }
  }

  showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Hide success message
    document.getElementById('successMessage').style.display = 'none';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Hide error message
    document.getElementById('errorMessage').style.display = 'none';
  }

  clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
  }

  // Static method to check if user is authenticated (for other pages)
  static isUserAuthenticated() {
    try {
      const stored = localStorage.getItem('hearuai_user_auth');
      return stored !== null;
    } catch (error) {
      return false;
    }
  }

  // Static method to get current user (for other pages)
  static getCurrentUser() {
    try {
      const stored = localStorage.getItem('hearuai_user_auth');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  // Static method to redirect to auth if not logged in
  static requireAuth() {
    if (!AuthManager.isUserAuthenticated()) {
      window.location.href = 'auth.html';
      return false;
    }
    return true;
  }
}

// Global function for navigation
function goToChat() {
  window.location.href = 'chat.html';
}

// Initialize auth manager when page loads
let authManager;
document.addEventListener('DOMContentLoaded', function() {
  authManager = new AuthManager();
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
  window.authManager = authManager;
}