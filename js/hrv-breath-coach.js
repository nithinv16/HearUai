class HRVBreathCoach {
    constructor() {
        this.isRecording = false;
        this.isBreathing = false;
        this.ppgData = [];
        this.heartRateData = [];
        this.hrvData = [];
        this.breathingTimer = null;
        this.breathingPhase = 'ready';
        this.breathingPattern = {
            inhale: 4,
            hold: 4,
            exhale: 4,
            pause: 0
        };
        this.exerciseDuration = 5; // minutes
        this.exerciseStartTime = null;
        this.signalCanvas = null;
        this.signalCtx = null;
        this.trendCanvas = null;
        this.trendCtx = null;
        this.camera = null;
        this.azureClient = null;
        this.settings = {
            measurementInterval: 60,
            coherenceThreshold: 1.0,
            enableNotifications: true,
            enableVibration: true,
            dataRetention: 30
        };
        this.connectedDevices = {
            apple: false,
            polar: false,
            fitbit: false
        };
        this.initializeAzureClient();
        this.init();
    }

    async initializeAzureClient() {
        try {
            if (window.AZURE_CONFIG && window.AzureAIClient) {
                this.azureClient = new window.AzureAIClient(window.AZURE_CONFIG);
                console.log('Azure AI client initialized for HRV Breath Coach');
            }
        } catch (error) {
            console.warn('Failed to initialize Azure AI client for HRV Breath Coach:', error);
        }
    }

    init() {
        this.setupEventListeners();
        this.initializeCanvases();
        this.loadSettings();
        this.loadHRVData();
        this.updateConnectionStatus();
        this.renderTrendChart();
        this.updateInsights();
    }

    setupEventListeners() {
        // PPG Controls
        document.getElementById('startPPGBtn').addEventListener('click', () => {
            this.startPPGDetection();
        });
        
        document.getElementById('stopPPGBtn').addEventListener('click', () => {
            this.stopPPGDetection();
        });

        // Breathing Controls
        document.getElementById('startBreathingBtn').addEventListener('click', () => {
            this.startBreathingExercise();
        });
        
        document.getElementById('stopBreathingBtn').addEventListener('click', () => {
            this.stopBreathingExercise();
        });

        // Exercise type change
        document.getElementById('exerciseType').addEventListener('change', (e) => {
            this.updateBreathingPattern(e.target.value);
        });

        // Duration change
        document.getElementById('exerciseDuration').addEventListener('change', (e) => {
            this.exerciseDuration = parseInt(e.target.value);
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Device connections
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const device = e.target.dataset.device;
                this.toggleDeviceConnection(device);
            });
        });

        // Settings modal controls
        document.getElementById('coherenceThreshold').addEventListener('input', (e) => {
            document.getElementById('coherenceValue').textContent = e.target.value;
        });

        // Global functions
        window.closeModal = (modalId) => this.closeModal(modalId);
        window.saveSettings = () => this.saveSettings();
        window.saveCustomPattern = () => this.saveCustomPattern();
    }

    initializeCanvases() {
        // Signal canvas
        this.signalCanvas = document.getElementById('signalCanvas');
        this.signalCtx = this.signalCanvas.getContext('2d');
        
        // Trend canvas
        this.trendCanvas = document.getElementById('trendChart');
        this.trendCtx = this.trendCanvas.getContext('2d');
        
        // Clear canvases
        this.clearSignalCanvas();
        this.clearTrendCanvas();
    }

    async startPPGDetection() {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            const video = document.getElementById('cameraVideo');
            video.srcObject = stream;
            this.camera = stream;

            // Hide overlay and show controls
            document.querySelector('.camera-overlay').style.display = 'none';
            document.getElementById('startPPGBtn').style.display = 'none';
            document.getElementById('stopPPGBtn').style.display = 'inline-flex';

            this.isRecording = true;
            this.updateConnectionStatus('connected');
            this.startPPGProcessing();

        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showNotification('Camera access denied. Please allow camera access for PPG detection.', 'error');
        }
    }

    stopPPGDetection() {
        if (this.camera) {
            this.camera.getTracks().forEach(track => track.stop());
            this.camera = null;
        }

        this.isRecording = false;
        this.updateConnectionStatus('disconnected');
        
        // Show overlay and hide controls
        document.querySelector('.camera-overlay').style.display = 'flex';
        document.getElementById('startPPGBtn').style.display = 'inline-flex';
        document.getElementById('stopPPGBtn').style.display = 'none';

        this.clearSignalCanvas();
    }

    startPPGProcessing() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('ppgCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const processFrame = () => {
            if (!this.isRecording) return;

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data for PPG analysis
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const ppgValue = this.extractPPGSignal(imageData);
            
            // Store PPG data
            this.ppgData.push({
                timestamp: Date.now(),
                value: ppgValue
            });

            // Keep only recent data (last 30 seconds)
            const cutoff = Date.now() - 30000;
            this.ppgData = this.ppgData.filter(d => d.timestamp > cutoff);

            // Update signal visualization
            this.updateSignalVisualization();

            // Calculate heart rate and HRV
            if (this.ppgData.length > 100) {
                this.calculateHeartRateAndHRV();
            }

            requestAnimationFrame(processFrame);
        };

        // Start processing when video is ready
        video.addEventListener('loadedmetadata', () => {
            processFrame();
        });
    }

    extractPPGSignal(imageData) {
        const data = imageData.data;
        let redSum = 0;
        let greenSum = 0;
        let blueSum = 0;
        let pixelCount = 0;

        // Sample pixels from center region
        const centerX = imageData.width / 2;
        const centerY = imageData.height / 2;
        const sampleRadius = 50;

        for (let y = centerY - sampleRadius; y < centerY + sampleRadius; y++) {
            for (let x = centerX - sampleRadius; x < centerX + sampleRadius; x++) {
                if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
                    const index = (y * imageData.width + x) * 4;
                    redSum += data[index];
                    greenSum += data[index + 1];
                    blueSum += data[index + 2];
                    pixelCount++;
                }
            }
        }

        // Return green channel average (most sensitive to blood volume changes)
        return pixelCount > 0 ? greenSum / pixelCount : 0;
    }

    calculateHeartRateAndHRV() {
        if (this.ppgData.length < 100) return;

        // Simple peak detection for heart rate
        const signal = this.ppgData.map(d => d.value);
        const peaks = this.findPeaks(signal);
        
        if (peaks.length > 2) {
            // Calculate RR intervals
            const rrIntervals = [];
            for (let i = 1; i < peaks.length; i++) {
                const interval = (this.ppgData[peaks[i]].timestamp - this.ppgData[peaks[i-1]].timestamp);
                rrIntervals.push(interval);
            }

            // Calculate heart rate (BPM)
            const avgRRInterval = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
            const heartRate = Math.round(60000 / avgRRInterval);

            // Calculate HRV (RMSSD)
            let sumSquaredDiffs = 0;
            for (let i = 1; i < rrIntervals.length; i++) {
                const diff = rrIntervals[i] - rrIntervals[i-1];
                sumSquaredDiffs += diff * diff;
            }
            const hrv = Math.round(Math.sqrt(sumSquaredDiffs / (rrIntervals.length - 1)));

            // Calculate coherence score
            const coherence = this.calculateCoherence(rrIntervals);

            // Update UI
            this.updateMetrics(hrv, heartRate, coherence);
            
            // Store data
            this.storeHRVData(hrv, heartRate, coherence);
        }
    }

    findPeaks(signal) {
        const peaks = [];
        const threshold = Math.max(...signal) * 0.6; // 60% of max value
        
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > signal[i-1] && signal[i] > signal[i+1] && signal[i] > threshold) {
                // Ensure minimum distance between peaks (avoid double detection)
                if (peaks.length === 0 || i - peaks[peaks.length - 1] > 10) {
                    peaks.push(i);
                }
            }
        }
        
        return peaks;
    }

    calculateCoherence(rrIntervals) {
        if (rrIntervals.length < 10) return 0;
        
        // Simple coherence calculation based on HRV variability
        const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
        const variance = rrIntervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - mean, 2);
        }, 0) / rrIntervals.length;
        
        // Normalize to 0-100 scale
        const coherence = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / mean) * 100));
        return Math.round(coherence);
    }

    updateMetrics(hrv, heartRate, coherence) {
        document.getElementById('hrvValue').textContent = hrv;
        document.getElementById('heartRate').textContent = heartRate;
        document.getElementById('coherenceScore').textContent = coherence + '%';
    }

    updateSignalVisualization() {
        if (!this.signalCtx || this.ppgData.length === 0) return;

        const canvas = this.signalCanvas;
        const ctx = this.signalCtx;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw signal
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const maxValue = Math.max(...this.ppgData.map(d => d.value));
        const minValue = Math.min(...this.ppgData.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        this.ppgData.forEach((point, index) => {
            const x = (index / this.ppgData.length) * canvas.width;
            const y = canvas.height - ((point.value - minValue) / range) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    updateConnectionStatus(status = 'disconnected') {
        const statusElement = document.getElementById('connectionStatus');
        const icon = statusElement.querySelector('i');
        const text = statusElement.querySelector('span');
        
        if (status === 'connected') {
            statusElement.classList.add('connected');
            text.textContent = 'Connected';
            icon.style.color = '#27ae60';
        } else {
            statusElement.classList.remove('connected');
            text.textContent = 'Disconnected';
            icon.style.color = '#e74c3c';
        }
    }

    startBreathingExercise() {
        const exerciseType = document.getElementById('exerciseType').value;
        this.exerciseDuration = parseInt(document.getElementById('exerciseDuration').value);
        
        if (exerciseType === 'custom') {
            this.openCustomPatternModal();
            return;
        }
        
        this.updateBreathingPattern(exerciseType);
        this.isBreathing = true;
        this.exerciseStartTime = Date.now();
        
        // Update UI
        document.getElementById('startBreathingBtn').style.display = 'none';
        document.getElementById('stopBreathingBtn').style.display = 'inline-flex';
        
        this.runBreathingCycle();
        this.updateExerciseProgress();
    }

    stopBreathingExercise() {
        this.isBreathing = false;
        if (this.breathingTimer) {
            clearTimeout(this.breathingTimer);
            this.breathingTimer = null;
        }
        
        // Reset UI
        document.getElementById('startBreathingBtn').style.display = 'inline-flex';
        document.getElementById('stopBreathingBtn').style.display = 'none';
        document.getElementById('breathText').textContent = 'Ready';
        document.getElementById('breathCircle').className = 'breath-circle';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('timeRemaining').textContent = this.exerciseDuration + ':00';
    }

    updateBreathingPattern(type) {
        switch (type) {
            case '4-7-8':
                this.breathingPattern = { inhale: 4, hold: 7, exhale: 8, pause: 0 };
                break;
            case 'box':
                this.breathingPattern = { inhale: 4, hold: 4, exhale: 4, pause: 4 };
                break;
            case 'coherent':
                this.breathingPattern = { inhale: 5, hold: 0, exhale: 5, pause: 0 };
                break;
        }
    }

    runBreathingCycle() {
        if (!this.isBreathing) return;
        
        const circle = document.getElementById('breathCircle');
        const text = document.getElementById('breathText');
        
        // Inhale phase
        this.breathingPhase = 'inhale';
        text.textContent = 'Breathe In';
        circle.className = 'breath-circle inhale';
        
        this.breathingTimer = setTimeout(() => {
            if (!this.isBreathing) return;
            
            // Hold phase
            if (this.breathingPattern.hold > 0) {
                this.breathingPhase = 'hold';
                text.textContent = 'Hold';
                circle.className = 'breath-circle inhale';
                
                this.breathingTimer = setTimeout(() => {
                    if (!this.isBreathing) return;
                    this.exhalePhase();
                }, this.breathingPattern.hold * 1000);
            } else {
                this.exhalePhase();
            }
        }, this.breathingPattern.inhale * 1000);
    }

    exhalePhase() {
        const circle = document.getElementById('breathCircle');
        const text = document.getElementById('breathText');
        
        // Exhale phase
        this.breathingPhase = 'exhale';
        text.textContent = 'Breathe Out';
        circle.className = 'breath-circle exhale';
        
        this.breathingTimer = setTimeout(() => {
            if (!this.isBreathing) return;
            
            // Pause phase
            if (this.breathingPattern.pause > 0) {
                this.breathingPhase = 'pause';
                text.textContent = 'Pause';
                circle.className = 'breath-circle';
                
                this.breathingTimer = setTimeout(() => {
                    if (!this.isBreathing) return;
                    this.runBreathingCycle();
                }, this.breathingPattern.pause * 1000);
            } else {
                this.runBreathingCycle();
            }
        }, this.breathingPattern.exhale * 1000);
    }

    updateExerciseProgress() {
        if (!this.isBreathing) return;
        
        const elapsed = Date.now() - this.exerciseStartTime;
        const totalDuration = this.exerciseDuration * 60 * 1000; // Convert to milliseconds
        const progress = Math.min(100, (elapsed / totalDuration) * 100);
        const remaining = Math.max(0, totalDuration - elapsed);
        
        // Update progress bar
        document.getElementById('progressFill').style.width = progress + '%';
        
        // Update time remaining
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        document.getElementById('timeRemaining').textContent = 
            minutes + ':' + seconds.toString().padStart(2, '0');
        
        // Check if exercise is complete
        if (progress >= 100) {
            this.stopBreathingExercise();
            this.showNotification('Breathing exercise completed! Great job!', 'success');
            return;
        }
        
        // Continue updating
        setTimeout(() => this.updateExerciseProgress(), 1000);
    }

    toggleDeviceConnection(device) {
        const btn = document.querySelector(`[data-device="${device}"]`);
        const statusElement = btn.parentElement.querySelector('.device-status');
        
        if (this.connectedDevices[device]) {
            // Disconnect
            this.connectedDevices[device] = false;
            btn.textContent = 'Connect';
            btn.classList.remove('connected');
            statusElement.textContent = 'Not Connected';
            statusElement.classList.remove('connected');
        } else {
            // Connect (simulate connection)
            this.connectedDevices[device] = true;
            btn.textContent = 'Disconnect';
            btn.classList.add('connected');
            statusElement.textContent = 'Connected';
            statusElement.classList.add('connected');
            
            this.showNotification(`${device.charAt(0).toUpperCase() + device.slice(1)} device connected successfully!`, 'success');
        }
    }

    storeHRVData(hrv, heartRate, coherence) {
        const data = {
            timestamp: Date.now(),
            hrv: hrv,
            heartRate: heartRate,
            coherence: coherence
        };
        
        this.hrvData.push(data);
        
        // Keep only data within retention period
        const retentionPeriod = this.settings.dataRetention * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionPeriod;
        this.hrvData = this.hrvData.filter(d => d.timestamp > cutoff);
        
        // Save to localStorage
        localStorage.setItem('hrv_data', JSON.stringify(this.hrvData));
        
        // Update trend chart
        this.renderTrendChart();
        this.updateInsights();
    }

    loadHRVData() {
        const stored = localStorage.getItem('hrv_data');
        if (stored) {
            this.hrvData = JSON.parse(stored);
        } else {
            // Generate sample data for demo
            this.generateSampleData();
        }
    }

    generateSampleData() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        for (let i = 7; i >= 0; i--) {
            const timestamp = now - (i * oneDay);
            this.hrvData.push({
                timestamp: timestamp,
                hrv: 35 + Math.random() * 20,
                heartRate: 65 + Math.random() * 15,
                coherence: 70 + Math.random() * 25
            });
        }
    }

    renderTrendChart() {
        if (!this.trendCtx || this.hrvData.length === 0) return;
        
        const canvas = this.trendCanvas;
        const ctx = this.trendCtx;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get recent data (last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentData = this.hrvData.filter(d => d.timestamp > sevenDaysAgo);
        
        if (recentData.length === 0) return;
        
        // Draw HRV trend line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const maxHRV = Math.max(...recentData.map(d => d.hrv));
        const minHRV = Math.min(...recentData.map(d => d.hrv));
        const range = maxHRV - minHRV || 1;
        
        recentData.forEach((point, index) => {
            const x = (index / (recentData.length - 1)) * canvas.width;
            const y = canvas.height - ((point.hrv - minHRV) / range) * (canvas.height - 40) - 20;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#667eea';
        recentData.forEach((point, index) => {
            const x = (index / (recentData.length - 1)) * canvas.width;
            const y = canvas.height - ((point.hrv - minHRV) / range) * (canvas.height - 40) - 20;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    async updateInsights() {
        if (this.hrvData.length === 0) return;
        
        // Calculate basic metrics
        const weeklyData = this.hrvData.filter(d => d.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000));
        const weeklyAvg = weeklyData.reduce((sum, d) => sum + d.hrv, 0) / weeklyData.length;
        document.getElementById('weeklyAverage').textContent = weeklyAvg.toFixed(1) + ' ms';
        
        const bestSession = this.hrvData.reduce((best, current) => 
            current.coherence > best.coherence ? current : best
        );
        const bestDate = new Date(bestSession.timestamp);
        document.getElementById('bestSession').textContent = 
            bestDate.toLocaleDateString() + ', ' + bestDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const highCoherenceSessions = this.hrvData.filter(d => d.coherence >= this.settings.coherenceThreshold * 50);
        const achievementRate = (highCoherenceSessions.length / this.hrvData.length) * 100;
        document.getElementById('coherenceGoal').textContent = Math.round(achievementRate) + '% achieved';
        
        // Generate AI-powered insights
        try {
            if (this.azureClient && this.hrvData.length >= 3) {
                await this.generateAIInsights();
            }
        } catch (error) {
            console.warn('AI insights generation failed:', error);
        }
    }

    async generateAIInsights() {
        const recentData = this.hrvData.slice(-14); // Last 14 sessions
        const prompt = `Analyze this HRV and breathing exercise data to provide personalized wellness insights:

HRV Data:
${this.formatHRVDataForAI(recentData)}

Current Settings:
- Coherence Threshold: ${this.settings.coherenceThreshold}
- Preferred Exercise Duration: ${this.exerciseDuration} minutes
- Current Breathing Pattern: ${this.breathingPattern.inhale}-${this.breathingPattern.hold}-${this.breathingPattern.exhale}-${this.breathingPattern.pause}

Please provide insights in JSON format:
{
  "insights": [
    {
      "title": "Insight Title",
      "message": "Personalized insight message",
      "type": "progress|recommendation|pattern",
      "priority": "high|medium|low"
    }
  ],
  "recommendations": {
    "breathingPattern": {
      "inhale": 4,
      "hold": 4,
      "exhale": 6,
      "pause": 0,
      "reason": "Why this pattern is recommended"
    },
    "exerciseTiming": "Best time of day for exercises",
    "frequency": "Recommended exercise frequency"
  }
}

Focus on:
1. HRV trends and what they indicate about stress/recovery
2. Coherence patterns and breathing effectiveness
3. Optimal breathing patterns for this user
4. Personalized recommendations for improvement`;

        const response = await this.azureClient.generateResponse(prompt);
        this.displayAIInsights(response);
    }

    formatHRVDataForAI(data) {
        return data.map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            const time = new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return `${date} ${time}: HRV ${entry.hrv}ms, HR ${entry.heartRate}bpm, Coherence ${entry.coherence.toFixed(2)}`;
        }).join('\n');
    }

    displayAIInsights(aiResponse) {
        try {
            const parsed = JSON.parse(aiResponse);
            
            // Display insights
            if (parsed.insights && parsed.insights.length > 0) {
                this.updateInsightsDisplay(parsed.insights);
            }
            
            // Display recommendations
            if (parsed.recommendations) {
                this.updateRecommendationsDisplay(parsed.recommendations);
            }
        } catch (error) {
            console.warn('Failed to parse AI insights:', error);
        }
    }

    updateInsightsDisplay(insights) {
        const insightsContainer = document.querySelector('.ai-insights');
        if (!insightsContainer) return;
        
        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.priority}">
                <h4>${insight.title}</h4>
                <p>${insight.message}</p>
                <span class="insight-type">${insight.type}</span>
            </div>
        `).join('');
    }

    updateRecommendationsDisplay(recommendations) {
        const recContainer = document.querySelector('.ai-recommendations');
        if (!recContainer) return;
        
        let html = '';
        
        if (recommendations.breathingPattern) {
            const pattern = recommendations.breathingPattern;
            html += `
                <div class="recommendation-card">
                    <h4>Recommended Breathing Pattern</h4>
                    <p>Inhale: ${pattern.inhale}s, Hold: ${pattern.hold}s, Exhale: ${pattern.exhale}s, Pause: ${pattern.pause}s</p>
                    <p class="reason">${pattern.reason}</p>
                    <button onclick="hrvBreathCoach.applyRecommendedPattern(${pattern.inhale}, ${pattern.hold}, ${pattern.exhale}, ${pattern.pause})" class="btn btn-primary btn-sm">Apply Pattern</button>
                </div>
            `;
        }
        
        if (recommendations.exerciseTiming) {
            html += `
                <div class="recommendation-card">
                    <h4>Optimal Exercise Timing</h4>
                    <p>${recommendations.exerciseTiming}</p>
                </div>
            `;
        }
        
        if (recommendations.frequency) {
            html += `
                <div class="recommendation-card">
                    <h4>Exercise Frequency</h4>
                    <p>${recommendations.frequency}</p>
                </div>
            `;
        }
        
        recContainer.innerHTML = html;
    }

    applyRecommendedPattern(inhale, hold, exhale, pause) {
        this.breathingPattern = { inhale, hold, exhale, pause };
        document.getElementById('exerciseType').value = 'custom';
        this.showNotification('Recommended breathing pattern applied!', 'success');
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('active');
        
        // Load current settings
        document.getElementById('measurementInterval').value = this.settings.measurementInterval;
        document.getElementById('coherenceThreshold').value = this.settings.coherenceThreshold;
        document.getElementById('coherenceValue').textContent = this.settings.coherenceThreshold;
        document.getElementById('enableNotifications').checked = this.settings.enableNotifications;
        document.getElementById('enableVibration').checked = this.settings.enableVibration;
        document.getElementById('dataRetention').value = this.settings.dataRetention;
    }

    openCustomPatternModal() {
        const modal = document.getElementById('customPatternModal');
        modal.classList.add('active');
        
        // Load current pattern
        document.getElementById('inhaleTime').value = this.breathingPattern.inhale;
        document.getElementById('holdTime').value = this.breathingPattern.hold;
        document.getElementById('exhaleTime').value = this.breathingPattern.exhale;
        document.getElementById('pauseTime').value = this.breathingPattern.pause;
        
        this.previewCustomPattern();
    }

    previewCustomPattern() {
        const inhale = parseInt(document.getElementById('inhaleTime').value);
        const hold = parseInt(document.getElementById('holdTime').value);
        const exhale = parseInt(document.getElementById('exhaleTime').value);
        const pause = parseInt(document.getElementById('pauseTime').value);
        
        const previewCircle = document.getElementById('previewCircle');
        const previewText = document.getElementById('previewText');
        
        // Simple preview animation
        let phase = 0;
        const phases = ['Inhale', 'Hold', 'Exhale', 'Pause'];
        const durations = [inhale, hold, exhale, pause];
        
        const animate = () => {
            if (durations[phase] > 0) {
                previewText.textContent = phases[phase];
                previewCircle.style.transform = phase === 0 || phase === 1 ? 'scale(1.2)' : 'scale(0.8)';
            }
            
            setTimeout(() => {
                phase = (phase + 1) % 4;
                if (phase === 0) {
                    setTimeout(animate, 1000);
                } else {
                    animate();
                }
            }, durations[phase] * 200); // Faster preview
        };
        
        animate();
    }

    saveSettings() {
        this.settings = {
            measurementInterval: parseInt(document.getElementById('measurementInterval').value),
            coherenceThreshold: parseFloat(document.getElementById('coherenceThreshold').value),
            enableNotifications: document.getElementById('enableNotifications').checked,
            enableVibration: document.getElementById('enableVibration').checked,
            dataRetention: parseInt(document.getElementById('dataRetention').value)
        };
        
        localStorage.setItem('hrv_settings', JSON.stringify(this.settings));
        this.closeModal('settingsModal');
        this.showNotification('Settings saved successfully!', 'success');
    }

    saveCustomPattern() {
        this.breathingPattern = {
            inhale: parseInt(document.getElementById('inhaleTime').value),
            hold: parseInt(document.getElementById('holdTime').value),
            exhale: parseInt(document.getElementById('exhaleTime').value),
            pause: parseInt(document.getElementById('pauseTime').value)
        };
        
        this.closeModal('customPatternModal');
        this.startBreathingExercise();
    }

    loadSettings() {
        const stored = localStorage.getItem('hrv_settings');
        if (stored) {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }

    clearSignalCanvas() {
        if (this.signalCtx) {
            this.signalCtx.clearRect(0, 0, this.signalCanvas.width, this.signalCanvas.height);
        }
    }

    clearTrendCanvas() {
        if (this.trendCtx) {
            this.trendCtx.clearRect(0, 0, this.trendCanvas.width, this.trendCanvas.height);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = '#27ae60';
                break;
            case 'error':
                notification.style.background = '#e74c3c';
                break;
            default:
                notification.style.background = '#667eea';
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // Vibration feedback if enabled
        if (this.settings.enableVibration && navigator.vibrate) {
            navigator.vibrate(type === 'error' ? [100, 50, 100] : [100]);
        }
    }
}

// Initialize HRV Breath Coach when page loads
document.addEventListener('DOMContentLoaded', () => {
    new HRVBreathCoach();
});