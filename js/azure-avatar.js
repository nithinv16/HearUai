/**
 * Azure Text-to-Speech Avatar Service
 * Provides avatar video generation capabilities for AI therapy sessions
 */

class AzureAvatarService {
    constructor(config) {
        this.config = config;
        this.isInitialized = false;
        this.currentSession = null;
        this.avatarElement = null;
    }

    /**
     * Initialize the avatar service
     */
    async initialize() {
        try {
            if (!this.config?.avatar?.endpoint || !this.config?.avatar?.subscriptionKey) {
                console.warn('Azure Avatar configuration missing, avatar features disabled');
                return false;
            }

            this.isInitialized = true;
            console.log('Azure Avatar Service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Azure Avatar Service:', error);
            return false;
        }
    }

    /**
     * Create avatar video element in the specified container
     */
    createAvatarElement(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Avatar container not found:', containerId);
            return null;
        }

        // Create video element for avatar
        this.avatarElement = document.createElement('video');
        this.avatarElement.id = 'avatar-video';
        this.avatarElement.className = 'avatar-video';
        this.avatarElement.autoplay = true;
        this.avatarElement.muted = false;
        this.avatarElement.style.width = '100%';
        this.avatarElement.style.height = 'auto';
        this.avatarElement.style.borderRadius = '10px';
        this.avatarElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';

        container.appendChild(this.avatarElement);
        return this.avatarElement;
    }

    /**
     * Start real-time avatar session
     */
    async startRealTimeSession(avatarId = null, voiceId = null) {
        // Use configuration defaults if not specified
        avatarId = avatarId || this.config?.avatar?.defaultAvatar || 'meg-casual';
        voiceId = voiceId || this.config?.avatar?.defaultVoice || 'en-IN-AartiNeural';
        if (!this.isInitialized) {
            console.error('Avatar service not initialized');
            return false;
        }

        try {
            // Real-time avatar synthesis configuration
            const sessionConfig = {
                avatar: {
                    character: avatarId,
                    style: 'graceful-sitting'
                },
                voice: {
                    name: voiceId,
                    rate: '0%',
                    pitch: '0%'
                },
                video: {
                    format: 'mp4',
                    codec: 'h264',
                    resolution: '1920x1080',
                    fps: 25
                }
            };

            // Initialize WebRTC connection for real-time avatar
            await this.initializeWebRTCConnection(sessionConfig);
            
            this.currentSession = {
                id: Date.now().toString(),
                avatarId,
                voiceId,
                isActive: true
            };

            console.log('Real-time avatar session started:', this.currentSession.id);
            return true;
        } catch (error) {
            console.error('Failed to start real-time avatar session:', error);
            return false;
        }
    }

    /**
     * Initialize WebRTC connection for real-time avatar streaming
     */
    async initializeWebRTCConnection(config) {
        try {
            console.log('Initializing Azure Avatar WebRTC connection...');
            
            // Create WebRTC peer connection
            const iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ];
            
            this.peerConnection = new RTCPeerConnection({ iceServers });
            
            // Set up event handlers
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE candidate:', event.candidate);
                }
            };
            
            this.peerConnection.ontrack = (event) => {
                console.log('Received media stream from Azure Avatar');
                if (this.avatarElement && event.streams[0]) {
                    this.avatarElement.srcObject = event.streams[0];
                }
            };
            
            // Connect to Azure Avatar streaming endpoint
            const avatarEndpoint = `${this.config.avatar.endpoint}/cognitiveservices/avatar/relay/token/v1`;
            
            // Create offer for Azure Avatar service
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Send offer to Azure Avatar service
            const response = await fetch(avatarEndpoint, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.config.avatar.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    synthesisConfig: {
                        voice: config.voice.name
                    },
                    avatarConfig: {
                        character: config.avatar.character,
                        style: config.avatar.style,
                        backgroundColor: '#FFFFFFFF'
                    },
                    videoFormat: {
                        codec: config.video.codec,
                        resolution: config.video.resolution,
                        fps: config.video.fps
                    },
                    sdp: offer.sdp
                })
            });
            
            if (!response.ok) {
                throw new Error(`Azure Avatar connection failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Set remote description from Azure
            if (result.sdp) {
                await this.peerConnection.setRemoteDescription({
                    type: 'answer',
                    sdp: result.sdp
                });
            }
            
            console.log('Azure Avatar WebRTC connection established successfully');
            
        } catch (error) {
            console.error('Failed to establish Azure Avatar connection, falling back to demo mode:', error);
            // Fallback to demo avatar if Azure connection fails
            await this.createDemoAvatar();
        }
    }
    
    /**
     * Create a demo avatar for testing purposes
     */
    async createDemoAvatar() {
        const avatarVideo = document.getElementById('avatarVideo');
        if (avatarVideo) {
            // Create a canvas-based animated avatar
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.borderRadius = '10px';
            
            const ctx = canvas.getContext('2d');
            
            // Replace the video element with canvas
            avatarVideo.style.display = 'none';
            avatarVideo.parentNode.insertBefore(canvas, avatarVideo);
            
            // Animate the demo avatar
            this.animateDemoAvatar(ctx, canvas);
            
            console.log('Demo avatar created and animated');
        }
    }
    
    /**
     * Animate the demo avatar
     */
    animateDemoAvatar(ctx, canvas) {
        let frame = 0;
        const animate = () => {
            // Clear canvas
            ctx.fillStyle = '#f0f8ff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw avatar background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw avatar figure
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Head
            ctx.fillStyle = '#fdbcb4';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 80, 60, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(centerX - 20, centerY - 90, 5, 0, Math.PI * 2);
            ctx.arc(centerX + 20, centerY - 90, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Mouth (animated based on speaking state)
             ctx.strokeStyle = '#333';
             ctx.lineWidth = 3;
             ctx.beginPath();
             const mouthY = centerY - 60;
             if (this.isSpeaking) {
                 // More pronounced mouth movement when speaking
                 const mouthWidth = 15 + Math.sin(frame * 0.5) * 8;
                 const mouthHeight = 8 + Math.sin(frame * 0.7) * 4;
                 ctx.ellipse(centerX, mouthY, mouthWidth, mouthHeight, 0, 0, Math.PI);
             } else {
                 // Subtle smile when not speaking
                 ctx.arc(centerX, mouthY + Math.sin(frame * 0.1) * 1, 12, 0, Math.PI);
             }
             ctx.stroke();
            
            // Body
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(centerX - 40, centerY - 20, 80, 120);
            
            // Arms (slightly animated)
            ctx.fillStyle = '#fdbcb4';
            const armOffset = Math.sin(frame * 0.1) * 5;
            ctx.fillRect(centerX - 60, centerY + armOffset, 20, 60);
            ctx.fillRect(centerX + 40, centerY - armOffset, 20, 60);
            
            // Text overlay
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(10, 10, 200, 40);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.fillText('HearUAI Avatar (Demo)', 20, 35);
            
            frame++;
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Speak text with avatar animation
     */
    async speakWithAvatar(text, options = {}) {
        if (!this.isInitialized || !this.currentSession?.isActive) {
            console.error('Avatar session not active');
            return false;
        }

        try {
            const requestBody = {
                text: text,
                avatar: {
                    character: this.currentSession.avatarId,
                    style: options.style || 'graceful-sitting'
                },
                voice: {
                    name: this.currentSession.voiceId,
                    rate: options.rate || '0%',
                    pitch: options.pitch || '0%',
                    volume: options.volume || '0%'
                },
                video: {
                    format: 'mp4',
                    codec: 'h264'
                }
            };

            // Send text to Azure Avatar API for real-time synthesis
            await this.sendTextToAvatar(requestBody);
            
            console.log('Avatar speaking:', text.substring(0, 50) + '...');
            return true;
        } catch (error) {
            console.error('Failed to speak with avatar:', error);
            return false;
        }
    }

    /**
     * Send text to Azure Avatar API
     */
    async sendTextToAvatar(requestBody) {
        try {
            console.log('Sending text to Azure Avatar API:', requestBody.text.substring(0, 30) + '...');
            
            if (this.peerConnection && this.peerConnection.connectionState === 'connected') {
                // Send text through WebRTC data channel for real-time synthesis
                const textMessage = {
                    type: 'speak',
                    text: requestBody.text,
                    voice: requestBody.voice,
                    avatar: requestBody.avatar
                };
                
                // Create data channel if it doesn't exist
                if (!this.dataChannel) {
                    this.dataChannel = this.peerConnection.createDataChannel('avatar-control');
                    this.dataChannel.onopen = () => {
                        console.log('Avatar data channel opened');
                    };
                }
                
                // Send the text message
                if (this.dataChannel.readyState === 'open') {
                    this.dataChannel.send(JSON.stringify(textMessage));
                } else {
                    console.warn('Data channel not ready, queuing message');
                    // Queue the message for when channel opens
                    this.dataChannel.onopen = () => {
                        this.dataChannel.send(JSON.stringify(textMessage));
                    };
                }
            } else {
                // Fallback to HTTP API if WebRTC is not available
                const endpoint = `${this.config.avatar.endpoint}/cognitiveservices/avatar/batchsynthesis/talkingavatar/synthesize`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.config.avatar.subscriptionKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(`Azure Avatar API error: ${response.status}`);
                }
                
                console.log('Text sent to Azure Avatar successfully');
            }
            
        } catch (error) {
            console.error('Failed to send text to Azure Avatar:', error);
            // Fallback to visual update only
            if (this.avatarElement) {
                this.updateAvatarVisuals(requestBody.text);
            }
        }
    }

    /**
     * Update avatar visuals (placeholder for actual video stream)
     */
    updateAvatarVisuals(text) {
        // In a real implementation, this would update the video stream
        // For demo purposes, we'll add visual feedback to the canvas avatar
        const canvas = document.querySelector('canvas');
        if (canvas) {
            // Add speaking indicator
            this.isSpeaking = true;
            
            // Create speech bubble overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.bottom = '20px';
            overlay.style.left = '20px';
            overlay.style.right = '20px';
            overlay.style.background = 'rgba(255, 255, 255, 0.95)';
            overlay.style.color = '#333';
            overlay.style.padding = '10px 15px';
            overlay.style.borderRadius = '15px';
            overlay.style.fontSize = '14px';
            overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            overlay.style.border = '2px solid #667eea';
            overlay.style.zIndex = '1000';
            overlay.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    <span><strong>HearUAI:</strong> ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}</span>
                </div>
            `;
            
            // Add CSS animation for pulse effect
            if (!document.getElementById('avatar-animations')) {
                const style = document.createElement('style');
                style.id = 'avatar-animations';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.2); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            const container = canvas.parentElement;
            if (container) {
                container.style.position = 'relative';
                container.appendChild(overlay);
                
                // Remove overlay after speech duration (estimate 100ms per character)
                const duration = Math.max(3000, text.length * 100);
                setTimeout(() => {
                    this.isSpeaking = false;
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, duration);
            }
        }
    }

    /**
     * Stop current avatar session
     */
    async stopSession() {
        if (this.currentSession?.isActive) {
            this.currentSession.isActive = false;
            console.log('Avatar session stopped:', this.currentSession.id);
            this.currentSession = null;
        }
    }

    /**
     * Get available avatars
     */
    getAvailableAvatars() {
        return [
            { id: 'lisa', name: 'Lisa', description: 'Professional therapist avatar' },
            { id: 'james', name: 'James', description: 'Calm and supportive male therapist' },
            { id: 'anna', name: 'Anna', description: 'Warm and empathetic female therapist' }
        ];
    }

    /**
     * Get available voices for avatars
     */
    getAvailableVoices() {
        return [
            { id: 'en-US-JennyNeural', name: 'Jenny (US English)', gender: 'female' },
            { id: 'en-US-GuyNeural', name: 'Guy (US English)', gender: 'male' },
            { id: 'en-US-AriaNeural', name: 'Aria (US English)', gender: 'female' },
            { id: 'en-US-DavisNeural', name: 'Davis (US English)', gender: 'male' }
        ];
    }

    /**
     * Check if avatar service is available
     */
    isAvailable() {
        return this.isInitialized && this.config?.avatar?.endpoint;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AzureAvatarService };
} else if (typeof window !== 'undefined') {
    window.AzureAvatarService = AzureAvatarService;
}