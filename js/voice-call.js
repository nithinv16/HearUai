/**
 * Voice and Video Call Manager for HearUAI
 * Handles voice-only and video call functionality with Azure Speech and Avatar services
 */

class VoiceCallManager {
    constructor(azureAIClient, config, azureAvatarService = null) {
        this.azureAI = azureAIClient;
        this.avatarService = azureAvatarService;
        this.config = config;
        
        // Call state
        this.isVoiceCallActive = false;
        this.isVideoCallActive = false;
        this.isMuted = false;
        this.isSpeakerOn = true;
        this.callStartTime = null;
        this.callTimer = null;
        
        // Speech recognition and synthesis
        this.speechRecognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.isAISpeaking = false;
        this.isStartingRecognition = false;
        
        // Conversation state
        this.callConversationHistory = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Voice call button
        const voiceCallBtn = document.getElementById('voiceCallBtn');
        if (voiceCallBtn) {
            voiceCallBtn.addEventListener('click', () => this.startVoiceCall());
        }

        // Video call button
        const videoCallBtn = document.getElementById('videoCallBtn');
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', () => this.startVideoCall());
        }

        // Voice call controls
        const voiceMuteBtn = document.getElementById('voiceMuteBtn');
        const voiceSpeakerBtn = document.getElementById('voiceSpeakerBtn');
        const voiceEndBtn = document.getElementById('voiceEndBtn');

        if (voiceMuteBtn) voiceMuteBtn.addEventListener('click', () => this.toggleMute('voice'));
        if (voiceSpeakerBtn) voiceSpeakerBtn.addEventListener('click', () => this.toggleSpeaker('voice'));
        if (voiceEndBtn) voiceEndBtn.addEventListener('click', () => this.endVoiceCall());

        // Video call controls
        const videoMuteBtn = document.getElementById('videoMuteBtn');
        const videoSpeakerBtn = document.getElementById('videoSpeakerBtn');
        const videoEndBtn = document.getElementById('videoEndBtn');

        if (videoMuteBtn) videoMuteBtn.addEventListener('click', () => this.toggleMute('video'));
        if (videoSpeakerBtn) videoSpeakerBtn.addEventListener('click', () => this.toggleSpeaker('video'));
        if (videoEndBtn) videoEndBtn.addEventListener('click', () => this.endVideoCall());
    }

    async startVoiceCall() {
        try {
            console.log('Starting voice call...');
            
            // Show voice call modal
            const modal = document.getElementById('voiceCallModal');
            if (modal) {
                modal.style.display = 'flex';
            }

            // Initialize speech recognition
            await this.initializeSpeechRecognition();
            
            // Set call state
            this.isVoiceCallActive = true;
            this.callStartTime = new Date();
            this.callConversationHistory = [];
            
            // Update UI
            this.updateCallStatus('voice', 'Connected');
            this.startCallTimer('voice');
            
            // Initial AI greeting (don't start listening yet to prevent feedback)
            await this.speakAIResponse("Hello! I'm here to listen and support you. How are you feeling today?", 'voice');
            
        } catch (error) {
            console.error('Failed to start voice call:', error);
            this.updateCallStatus('voice', 'Connection failed');
        }
    }

    async startVideoCall() {
        try {
            console.log('Starting video call...');
            
            // Show video call modal
            const modal = document.getElementById('videoCallModal');
            if (modal) {
                modal.style.display = 'flex';
            }

            // Initialize avatar service
            if (this.avatarService && this.avatarService.isInitialized) {
                await this.initializeVideoAvatar();
            }

            // Initialize speech recognition
            await this.initializeSpeechRecognition();
            
            // Set call state
            this.isVideoCallActive = true;
            this.callStartTime = new Date();
            this.callConversationHistory = [];
            
            // Update UI
            this.updateCallStatus('video', 'Connected');
            this.startCallTimer('video');
            
            // Start listening
            this.startListening();
            
            // Initial AI greeting with avatar
            await this.speakAIResponse("Hello! I'm so glad to see you today. I'm here to provide support and listen to whatever you'd like to share.", 'video');
            
        } catch (error) {
            console.error('Failed to start video call:', error);
            this.updateCallStatus('video', 'Connection failed');
        }
    }

    async initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = false; // Changed to false to prevent feedback
            this.speechRecognition.interimResults = false; // Changed to false for cleaner results
            this.speechRecognition.lang = 'en-US';
            this.isListening = false;
        this.isAISpeaking = false; // Track AI speaking state
        this.isStartingRecognition = false; // Track if recognition start is in progress
            
            this.speechRecognition.onstart = () => {
                this.isListening = true; // Ensure flag is set when recognition actually starts
                this.isStartingRecognition = false; // Clear the starting flag
                console.log('Speech recognition started');
            };
            
            this.speechRecognition.onresult = (event) => {
                // With continuous=false, we get the final result directly
                const transcript = event.results[0][0].transcript;
                
                if (transcript.trim() && !this.isAISpeaking) {
                    console.log('Speech recognition result:', transcript);
                    this.handleUserSpeech(transcript.trim());
                }
            };
            
            this.speechRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.isStartingRecognition = false; // Clear the starting flag on error
                
                // Handle different error types
                if (event.error === 'no-speech') {
                    // Restart recognition after a brief pause for no-speech
                    setTimeout(() => {
                        if ((this.isVoiceCallActive || this.isVideoCallActive) && !this.isMuted) {
                            this.startListening();
                        }
                    }, 1000);
                } else if (event.error === 'network') {
                    // For network errors, wait longer before retry
                    console.warn('Network error in speech recognition, retrying in 3 seconds...');
                    setTimeout(() => {
                        if ((this.isVoiceCallActive || this.isVideoCallActive) && !this.isMuted) {
                            this.startListening();
                        }
                    }, 3000);
                } else if (event.error === 'not-allowed') {
                    console.error('Microphone access denied');
                    alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
                }
            };
            
            this.speechRecognition.onend = () => {
                this.isListening = false;
                console.log('Speech recognition ended');
                
                // Only restart if call is active, not muted, and AI is not speaking
                if ((this.isVoiceCallActive || this.isVideoCallActive) && !this.isMuted && !this.isAISpeaking) {
                    setTimeout(() => {
                        if (!this.isListening && !this.isAISpeaking && (this.isVoiceCallActive || this.isVideoCallActive)) {
                            this.startListening();
                        }
                    }, 1000); // Increased delay to prevent rapid restarts
                }
            };
        } else {
            throw new Error('Speech recognition not supported in this browser');
        }
    }

    async initializeVideoAvatar() {
        try {
            const avatarVideo = document.getElementById('avatarVideo');
            const avatarPlaceholder = document.getElementById('avatarPlaceholder');
            
            if (this.avatarService && this.avatarService.isInitialized) {
                // Start avatar session with configured video call voice and avatar
                const avatarId = this.config.avatar?.defaultAvatar || 'meg-casual';
                const voiceId = this.config.speech?.videoCall?.voice || this.config.avatar?.defaultVoice || 'en-IN-AartiNeural';
                console.log('Initializing video avatar with:', { avatarId, voiceId });
                await this.avatarService.startRealTimeSession(avatarId, voiceId);
                
                // Show video, hide placeholder
                if (avatarVideo && avatarPlaceholder) {
                    avatarVideo.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to initialize video avatar:', error);
            // Keep placeholder visible if avatar fails
        }
    }

    startListening() {
        if (this.speechRecognition && !this.isMuted && !this.isListening && !this.isStartingRecognition) {
            try {
                this.isStartingRecognition = true;
                this.speechRecognition.start();
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
                this.isStartingRecognition = false;
                this.isListening = false;
                // If recognition is already started, just ignore the error
                if (error.name === 'InvalidStateError') {
                    console.log('Speech recognition already active, continuing...');
                    this.isListening = true;
                }
            }
        }
    }

    stopListening() {
        if (this.speechRecognition && this.isListening) {
            this.speechRecognition.stop();
            this.isListening = false;
        }
    }

    async handleUserSpeech(transcript) {
        console.log('User said:', transcript);
        
        // Stop listening to prevent feedback during processing
        this.stopListening();
        
        // Add to conversation history
        this.callConversationHistory.push({
            role: 'user',
            content: transcript,
            timestamp: new Date()
        });
        
        // Add to transcript UI
        this.addToTranscript(transcript, 'user');
        
        // Stop current AI speech if any
        this.stopAISpeech();
        
        // Get AI response
        try {
            const response = await this.azureAI.sendMessage(transcript, this.callConversationHistory);
            
            // Add AI response to conversation history
            this.callConversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
            });
            
            // Speak AI response
            const callType = this.isVideoCallActive ? 'video' : 'voice';
            await this.speakAIResponse(response, callType);
            
        } catch (error) {
            console.error('Failed to get AI response:', error);
            const errorResponse = "I'm sorry, I'm having trouble processing that right now. Could you please try again?";
            await this.speakAIResponse(errorResponse, this.isVideoCallActive ? 'video' : 'voice');
        }
    }

    async speakAIResponse(text, callType) {
        // Add to transcript
        this.addToTranscript(text, 'ai');
        
        // Set AI speaking state and stop listening
        this.isAISpeaking = true;
        this.stopListening();
        
        // Temporarily disable Azure Avatar due to API unavailability
        // Use browser TTS for both voice and video calls with female voice preference
        console.log('Using browser TTS with female voice preference');
        this.speakWithBrowserTTS(text);
        
        // Clear AI speaking state after TTS is handled in speakWithBrowserTTS method
    }

    speakWithBrowserTTS(text, voiceOptions = null) {
        if (this.speechSynthesis && this.isSpeakerOn) {
            // Stop any current speech
            this.speechSynthesis.cancel();
            
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Get available voices
            const voices = this.speechSynthesis.getVoices();
            let selectedVoice = null;
            
            if (voices.length > 0) {
                // If voice options are provided, try to use them
                if (voiceOptions && voiceOptions.voiceId) {
                    selectedVoice = voices.find(voice => 
                        voice.name.toLowerCase().includes(voiceOptions.voiceId.toLowerCase()) ||
                        voice.lang.toLowerCase().includes(voiceOptions.language?.toLowerCase())
                    );
                }
                
                // If no specific voice found or no options provided, use default logic
                if (!selectedVoice) {
                    // Determine target language (default to English)
                    const targetLang = voiceOptions?.language || 'en';
                    
                    // First try to find a female voice for the target language
                    selectedVoice = voices.find(voice => 
                        voice.lang.toLowerCase().startsWith(targetLang.toLowerCase()) && (
                            voice.name.toLowerCase().includes('female') ||
                            voice.name.toLowerCase().includes('woman') ||
                            voice.name.toLowerCase().includes('aria') ||
                            voice.name.toLowerCase().includes('zira') ||
                            voice.name.toLowerCase().includes('hazel') ||
                            voice.name.toLowerCase().includes('susan') ||
                            voice.name.toLowerCase().includes('cortana') ||
                            voice.name.toLowerCase().includes('eva') ||
                            voice.name.toLowerCase().includes('jenny') ||
                            voice.name.toLowerCase().includes('michelle')
                        )
                    );
                    
                    // If no female voice found, use any voice for the target language
                    if (!selectedVoice) {
                        selectedVoice = voices.find(voice => voice.lang.toLowerCase().startsWith(targetLang.toLowerCase()));
                    }
                    
                    // Last resort: first available voice
                    if (!selectedVoice) {
                        selectedVoice = voices[0];
                    }
                }
                
                console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
            }
            
            if (selectedVoice) {
                this.currentUtterance.voice = selectedVoice;
            }
            
            this.currentUtterance.rate = 0.9;
            this.currentUtterance.pitch = 1.0;
            this.currentUtterance.volume = 1.0;
            
            // Clear AI speaking state and resume listening after speech ends
            this.currentUtterance.onend = () => {
                this.isAISpeaking = false;
                console.log('AI speech ended, resuming listening...');
                // Delay to ensure audio has fully stopped
                setTimeout(() => {
                    if ((this.isVoiceCallActive || this.isVideoCallActive) && !this.isMuted && !this.isAISpeaking) {
                        this.startListening();
                    }
                }, 1000);
            };
            
            // Handle speech errors
            this.currentUtterance.onerror = (event) => {
                this.isAISpeaking = false;
                console.error('Speech synthesis error:', event.error);
                // Resume listening even if speech fails
                setTimeout(() => {
                    if ((this.isVoiceCallActive || this.isVideoCallActive) && !this.isMuted && !this.isAISpeaking) {
                        this.startListening();
                    }
                }, 1000);
            };
            
            this.speechSynthesis.speak(this.currentUtterance);
        } else {
            // If speaker is off or synthesis unavailable, clear AI speaking state
            this.isAISpeaking = false;
        }
    }

    stopAISpeech() {
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        this.isAISpeaking = false;
        console.log('AI speech stopped manually');
    }

    addToTranscript(text, speaker) {
        const callType = this.isVideoCallActive ? 'video' : 'voice';
        const transcriptId = callType === 'video' ? 'videoCallTranscript' : 'voiceCallTranscript';
        const transcript = document.getElementById(transcriptId);
        
        if (transcript) {
            const line = document.createElement('div');
            line.className = `transcript-line ${speaker}`;
            line.textContent = `${speaker === 'user' ? 'You' : 'HearUAI'}: ${text}`;
            
            transcript.appendChild(line);
            transcript.scrollTop = transcript.scrollHeight;
        }
    }

    toggleMute(callType) {
        this.isMuted = !this.isMuted;
        
        const muteBtn = document.getElementById(callType === 'video' ? 'videoMuteBtn' : 'voiceMuteBtn');
        if (muteBtn) {
            const icon = muteBtn.querySelector('i');
            if (this.isMuted) {
                icon.className = 'fas fa-microphone-slash';
                muteBtn.classList.add('active');
                this.stopListening();
            } else {
                icon.className = 'fas fa-microphone';
                muteBtn.classList.remove('active');
                this.startListening();
            }
        }
    }

    toggleSpeaker(callType) {
        this.isSpeakerOn = !this.isSpeakerOn;
        
        const speakerBtn = document.getElementById(callType === 'video' ? 'videoSpeakerBtn' : 'voiceSpeakerBtn');
        if (speakerBtn) {
            const icon = speakerBtn.querySelector('i');
            if (this.isSpeakerOn) {
                icon.className = 'fas fa-volume-up';
                speakerBtn.classList.remove('active');
            } else {
                icon.className = 'fas fa-volume-mute';
                speakerBtn.classList.add('active');
                this.stopAISpeech();
            }
        }
    }

    endVoiceCall() {
        this.isVoiceCallActive = false;
        this.stopListening();
        this.stopAISpeech();
        this.stopCallTimer();
        
        // Hide modal
        const modal = document.getElementById('voiceCallModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset state
        this.resetCallState();
    }

    async endVideoCall() {
        this.isVideoCallActive = false;
        this.stopListening();
        this.stopAISpeech();
        this.stopCallTimer();
        
        // Stop avatar session
        if (this.avatarService) {
            await this.avatarService.stopSession();
        }
        
        // Hide modal
        const modal = document.getElementById('videoCallModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset avatar UI
        const avatarVideo = document.getElementById('avatarVideo');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');
        if (avatarVideo && avatarPlaceholder) {
            avatarVideo.style.display = 'none';
            avatarPlaceholder.style.display = 'flex';
        }
        
        // Reset state
        this.resetCallState();
    }

    resetCallState() {
        this.isMuted = false;
        this.isSpeakerOn = true;
        this.callStartTime = null;
        this.callConversationHistory = [];
        this.isListening = false;
        this.isAISpeaking = false;
        this.isStartingRecognition = false;
        
        // Stop speech recognition
        this.stopListening();
        
        // Stop any ongoing speech synthesis
        this.stopAISpeech();
        
        // Reset button states
        const muteButtons = document.querySelectorAll('.call-btn.mute');
        const speakerButtons = document.querySelectorAll('.call-btn.speaker');
        
        muteButtons.forEach(btn => {
            btn.classList.remove('active');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
        });
        
        speakerButtons.forEach(btn => {
            btn.classList.remove('active');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-volume-up';
        });
    }

    updateCallStatus(callType, status) {
        const statusId = callType === 'video' ? 'videoCallStatus' : 'voiceCallStatus';
        const statusElement = document.getElementById(statusId);
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    startCallTimer(callType) {
        const timerId = callType === 'video' ? 'videoCallTimer' : 'voiceCallTimer';
        const timerElement = document.getElementById(timerId);
        
        if (timerElement) {
            this.callTimer = setInterval(() => {
                if (this.callStartTime) {
                    const elapsed = new Date() - this.callStartTime;
                    const minutes = Math.floor(elapsed / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }, 1000);
        }
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoiceCallManager };
} else if (typeof window !== 'undefined') {
    window.VoiceCallManager = VoiceCallManager;
}