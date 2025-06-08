class KosodenApp {
    constructor() {
        this.pens = [];
        this.selectedPenId = 1;
        this.currentPage = 1;
        this.pages = {};
        this.studyData = {};
        this.gridSize = 20;
        this.cellSize = 25;
        this.isDrawing = false;
        this.isErasing = false;
        this.audioContext = null;
        
        // New features
        this.currentUser = null;
        this.users = {};
        this.userProfile = {
            username: '',
            goalTime: 60,
            motivation: ''
        };
        this.achievements = [];
        this.progressChart = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.initializePens();
        this.setupCanvas();
        this.initializeAchievements();
        this.setupTooltips();
        this.setupDragAndDrop();
        this.updateDisplay();
    }

    loadData() {
        const savedPens = localStorage.getItem('kosodenPens');
        const savedPages = localStorage.getItem('kosodenPages');
        const savedStudyData = localStorage.getItem('kosodenStudyData');
        const savedUsers = localStorage.getItem('kosodenUsers');
        const savedCurrentUser = localStorage.getItem('kosodenCurrentUser');
        const savedUserProfile = localStorage.getItem('kosodenUserProfile');
        const savedAchievements = localStorage.getItem('kosodenAchievements');
        
        if (savedPens) {
            this.pens = JSON.parse(savedPens);
        } else {
            this.initializeDefaultPens();
        }
        
        if (savedPages) {
            this.pages = JSON.parse(savedPages);
        } else {
            this.pages = { 1: this.createEmptyGrid() };
        }
        
        if (savedStudyData) {
            this.studyData = JSON.parse(savedStudyData);
        }
        
        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        }
        
        if (savedCurrentUser) {
            this.currentUser = savedCurrentUser;
        }
        
        if (savedUserProfile) {
            this.userProfile = JSON.parse(savedUserProfile);
        }
        
        if (savedAchievements) {
            this.achievements = JSON.parse(savedAchievements);
        }
        
        this.updateUserDisplay();
    }

    saveData() {
        localStorage.setItem('kosodenPens', JSON.stringify(this.pens));
        localStorage.setItem('kosodenPages', JSON.stringify(this.pages));
        localStorage.setItem('kosodenStudyData', JSON.stringify(this.studyData));
        localStorage.setItem('kosodenUsers', JSON.stringify(this.users));
        if (this.currentUser) {
            localStorage.setItem('kosodenCurrentUser', this.currentUser);
        }
        localStorage.setItem('kosodenUserProfile', JSON.stringify(this.userProfile));
        localStorage.setItem('kosodenAchievements', JSON.stringify(this.achievements));
        
        // Auto commit and push to git
        this.gitAutoSave();
    }
    
    async gitAutoSave() {
        try {
            const timestamp = new Date().toLocaleString('ja-JP');
            const commitMessage = `Auto save: ${timestamp}`;
            
            // Git operations via fetch to a backend endpoint
            // Note: This requires a backend server to handle git operations
            // For now, we'll just log the intention
            console.log(`Would auto-commit with message: ${commitMessage}`);
            
            // In a real implementation, you would call:
            // await fetch('/api/git-save', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ message: commitMessage })
            // });
        } catch (error) {
            console.error('Git auto-save error:', error);
        }
    }

    initializeDefaultPens() {
        const defaultColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#FECA57', '#A29BFE', '#FD79A8',
            '#81ECEC', '#FDCB6E', '#6C5CE7', '#A8E6CF'
        ];
        
        this.pens = defaultColors.map((color, index) => ({
            id: index + 1,
            color: color,
            subject: ''
        }));
    }

    initializePens() {
        const penItems = document.querySelectorAll('.pen-item');
        penItems.forEach((item, index) => {
            const input = item.querySelector('.subject-input');
            const penColor = item.querySelector('.pen-color');
            
            if (this.pens[index]) {
                input.value = this.pens[index].subject;
                item.style.setProperty('--pen-color', this.pens[index].color);
            }
            
            input.addEventListener('input', (e) => {
                this.pens[index].subject = e.target.value;
                this.saveData();
                this.updatePenSelector();
            });
            
            penColor.addEventListener('click', () => {
                this.selectedPenId = index + 1;
                this.updateSelectedPenDisplay();
                document.querySelector('[data-tab="grid"]').click();
            });
        });
        
        this.updatePenSelector();
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
        
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateCanvas();
            }
        });
        
        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < Object.keys(this.pages).length) {
                this.currentPage++;
                this.updateCanvas();
            }
        });
        
        document.getElementById('add-page').addEventListener('click', () => {
            const newPageNum = Object.keys(this.pages).length + 1;
            this.pages[newPageNum] = this.createEmptyGrid();
            this.saveData();
            this.currentPage = newPageNum;
            this.updateCanvas();
        });
        
        document.getElementById('eraser-button').addEventListener('click', () => {
            this.isErasing = !this.isErasing;
            this.updateEraserButton();
        });
        
        // User management event listeners
        document.getElementById('login-logout-btn').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.showLoginModal();
            }
        });
        
        document.getElementById('login-btn').addEventListener('click', () => {
            this.login();
        });
        
        document.getElementById('register-btn').addEventListener('click', () => {
            this.register();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            this.hideLoginModal();
        });
        
        // Profile management
        document.getElementById('save-profile').addEventListener('click', () => {
            this.saveProfile();
        });
        
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('import-data').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
        
        document.getElementById('reset-data').addEventListener('click', () => {
            if (confirm('本当に全データをリセットしますか？この操作は元に戻せません。')) {
                this.resetAllData();
            }
        });
        
        // Modal click outside to close
        document.getElementById('login-modal').addEventListener('click', (e) => {
            if (e.target.id === 'login-modal') {
                this.hideLoginModal();
            }
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        if (tabName === 'stats') {
            this.updateStatistics();
            this.updateProgressChart();
            this.updateAchievements();
            this.updateCalendar();
        } else if (tabName === 'profile') {
            this.loadProfileData();
        }
    }

    setupCanvas() {
        const canvas = document.getElementById('study-grid');
        canvas.width = this.gridSize * this.cellSize;
        canvas.height = this.gridSize * this.cellSize;
        
        canvas.addEventListener('click', (e) => this.handleClick(e));
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        });
        
        this.updateCanvas();
    }

    handleClick(e) {
        const canvas = document.getElementById('study-grid');
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            const cellIndex = y * this.gridSize + x;
            const currentPen = this.pens.find(p => p.id === this.selectedPenId);
            
            if (this.isErasing) {
                if (this.pages[this.currentPage][cellIndex]) {
                    delete this.pages[this.currentPage][cellIndex];
                    this.playEraserSound();
                    this.saveData();
                    this.updateCanvas();
                    
                    // Add feedback animation
                    canvas.classList.add('feedback-pulse');
                    setTimeout(() => canvas.classList.remove('feedback-pulse'), 300);
                }
            } else if (currentPen && currentPen.subject) {
                if (!this.pages[this.currentPage][cellIndex]) {
                    this.pages[this.currentPage][cellIndex] = {
                        color: currentPen.color,
                        subject: currentPen.subject,
                        timestamp: Date.now()
                    };
                    
                    this.playPencilSound();
                    this.updateStudyData(currentPen.subject);
                    this.saveData();
                    this.updateCanvas();
                    this.updateTodayTime();
                    
                    // Add success feedback animation
                    canvas.classList.add('success-feedback');
                    setTimeout(() => canvas.classList.remove('success-feedback'), 600);
                    
                    // Check for achievements
                    this.updateAchievements();
                }
            } else {
                this.showFeedback('科目名を設定してから学習を記録してください', 'error');
            }
        }
    }

    getAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume context if it's suspended (due to browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    playPencilSound() {
        try {
            const audioContext = this.getAudioContext();
            
            // Create multiple oscillators for richer pencil sound
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const oscillator3 = audioContext.createOscillator();
            
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            // Configure filter for pencil scratching sound
            filter.type = 'highpass';
            filter.frequency.value = 3000;
            filter.Q.value = 10;
            
            // Connect oscillators
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            oscillator3.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set frequencies for pencil scratch sound
            oscillator1.frequency.value = 4000 + Math.random() * 1000;
            oscillator2.frequency.value = 6000 + Math.random() * 1500;
            oscillator3.frequency.value = 8000 + Math.random() * 2000;
            
            oscillator1.type = 'sawtooth';
            oscillator2.type = 'square';
            oscillator3.type = 'triangle';
            
            // Louder volume and quick fade
            gainNode.gain.value = 0.3;
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            // Start oscillators
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator3.start(audioContext.currentTime);
            
            // Stop after short duration
            oscillator1.stop(audioContext.currentTime + 0.1);
            oscillator2.stop(audioContext.currentTime + 0.1);
            oscillator3.stop(audioContext.currentTime + 0.1);
            
            // Clean up nodes after they finish
            setTimeout(() => {
                oscillator1.disconnect();
                oscillator2.disconnect();
                oscillator3.disconnect();
                filter.disconnect();
                gainNode.disconnect();
            }, 110);
        } catch (e) {
            console.error('Pencil sound error:', e);
        }
    }

    playEraserSound() {
        try {
            const audioContext = this.getAudioContext();
            const bufferSize = 4096;
            
            // Create brown noise for realistic eraser friction sound
            const brownNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
            let lastOut = 0.0;
            
            brownNoise.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 4.5; // Increase amplitude
                }
            };
            
            // Create multiple filters for realistic rubber-on-paper sound
            const lowpass1 = audioContext.createBiquadFilter();
            lowpass1.type = 'lowpass';
            lowpass1.frequency.value = 1200;
            lowpass1.Q.value = 2;
            
            const highpass = audioContext.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 200;
            highpass.Q.value = 0.7;
            
            const bandpass = audioContext.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 600;
            bandpass.Q.value = 1.5;
            
            const gainNode = audioContext.createGain();
            const compressor = audioContext.createDynamicsCompressor();
            
            // Connect the audio graph
            brownNoise.connect(lowpass1);
            lowpass1.connect(highpass);
            highpass.connect(bandpass);
            bandpass.connect(compressor);
            compressor.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set volume with envelope for realistic start/stop
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.02);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            // Clean up after sound finishes
            setTimeout(() => {
                brownNoise.disconnect();
                brownNoise.onaudioprocess = null;
                lowpass1.disconnect();
                highpass.disconnect();
                bandpass.disconnect();
                compressor.disconnect();
                gainNode.disconnect();
            }, 210);
        } catch (e) {
            console.error('Eraser sound error:', e);
        }
    }

    updateStudyData(subject) {
        const today = new Date().toDateString();
        
        if (!this.studyData[today]) {
            this.studyData[today] = {};
        }
        
        if (!this.studyData[today][subject]) {
            this.studyData[today][subject] = 0;
        }
        
        this.studyData[today][subject] += 15;
    }

    createEmptyGrid() {
        return {};
    }

    updateCanvas() {
        const canvas = document.getElementById('study-grid');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(canvas.width, i * this.cellSize);
            ctx.stroke();
        }
        
        const currentGrid = this.pages[this.currentPage] || {};
        Object.keys(currentGrid).forEach(cellIndex => {
            const cell = currentGrid[cellIndex];
            const x = (cellIndex % this.gridSize) * this.cellSize;
            const y = Math.floor(cellIndex / this.gridSize) * this.cellSize;
            
            ctx.fillStyle = cell.color;
            ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        });
        
        document.getElementById('page-display').textContent = `ページ ${this.currentPage}`;
    }

    updateSelectedPenDisplay() {
        const selectedPen = this.pens.find(p => p.id === this.selectedPenId);
        const display = document.querySelector('.selected-pen-display');
        
        if (selectedPen) {
            display.style.backgroundColor = selectedPen.color;
        }
    }
    
    updateEraserButton() {
        const eraserButton = document.getElementById('eraser-button');
        if (this.isErasing) {
            eraserButton.classList.add('active');
            eraserButton.textContent = '消しゴム（ON）';
        } else {
            eraserButton.classList.remove('active');
            eraserButton.textContent = '消しゴム';
        }
    }

    updatePenSelector() {
        const pensWithSubjects = this.pens.filter(p => p.subject);
        this.updateSelectedPenDisplay();
    }

    updateDisplay() {
        this.updateCanvas();
        this.updateSelectedPenDisplay();
        this.updateTodayTime();
    }

    updateTodayTime() {
        const today = new Date().toDateString();
        const todayData = this.studyData[today] || {};
        
        let totalMinutes = 0;
        Object.values(todayData).forEach(minutes => {
            totalMinutes += minutes;
        });
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        document.getElementById('today-time').textContent = `${hours}時間${minutes}分`;
    }

    updateStatistics() {
        let totalMinutes = 0;
        const subjectTotals = {};
        
        Object.values(this.studyData).forEach(dayData => {
            Object.entries(dayData).forEach(([subject, minutes]) => {
                totalMinutes += minutes;
                if (!subjectTotals[subject]) {
                    subjectTotals[subject] = 0;
                }
                subjectTotals[subject] += minutes;
            });
        });
        
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        document.getElementById('total-study-time').textContent = `${totalHours}時間${totalMins}分`;
        
        const chartContainer = document.getElementById('subject-chart');
        chartContainer.innerHTML = '';
        
        Object.entries(subjectTotals).forEach(([subject, minutes]) => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const percentage = (minutes / totalMinutes * 100).toFixed(1);
            
            const pen = this.pens.find(p => p.subject === subject);
            const color = pen ? pen.color : '#999';
            
            const statItem = document.createElement('div');
            statItem.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 1rem;
                padding: 0.5rem;
                background: white;
                border-radius: 4px;
            `;
            
            statItem.innerHTML = `
                <div style="width: 30px; height: 30px; background-color: ${color}; border-radius: 50%; margin-right: 1rem;"></div>
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${subject}</div>
                    <div style="color: #666; font-size: 0.9rem;">${hours}時間${mins}分 (${percentage}%)</div>
                </div>
                <div style="background: ${color}; height: 10px; width: ${percentage}%; max-width: 200px; border-radius: 5px;"></div>
            `;
            
            chartContainer.appendChild(statItem);
        });
        
        if (Object.keys(subjectTotals).length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #999;">まだ勉強記録がありません</p>';
        }
    }

    // User Management Methods
    updateUserDisplay() {
        const userDisplay = document.getElementById('user-display');
        const loginLogoutBtn = document.getElementById('login-logout-btn');
        
        if (this.currentUser) {
            userDisplay.textContent = this.userProfile.username || this.currentUser;
            loginLogoutBtn.textContent = 'ログアウト';
        } else {
            userDisplay.textContent = 'ゲストユーザー';
            loginLogoutBtn.textContent = 'ログイン';
        }
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'block';
    }

    hideLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    }

    login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showFeedback('ユーザー名とパスワードを入力してください', 'error');
            return;
        }
        
        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = username;
            this.userProfile = this.users[username].profile || this.userProfile;
            this.saveData();
            this.updateUserDisplay();
            this.hideLoginModal();
            this.showFeedback('ログインしました', 'success');
        } else {
            this.showFeedback('ユーザー名またはパスワードが間違っています', 'error');
        }
    }

    register() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showFeedback('ユーザー名とパスワードを入力してください', 'error');
            return;
        }
        
        if (this.users[username]) {
            this.showFeedback('このユーザー名は既に使用されています', 'error');
            return;
        }
        
        this.users[username] = {
            password: password,
            profile: {
                username: username,
                goalTime: 60,
                motivation: ''
            },
            createdAt: new Date().toISOString()
        };
        
        this.currentUser = username;
        this.userProfile = this.users[username].profile;
        this.saveData();
        this.updateUserDisplay();
        this.hideLoginModal();
        this.showFeedback('新規登録が完了しました', 'success');
    }

    logout() {
        this.currentUser = null;
        this.userProfile = {
            username: '',
            goalTime: 60,
            motivation: ''
        };
        localStorage.removeItem('kosodenCurrentUser');
        this.updateUserDisplay();
        this.showFeedback('ログアウトしました', 'success');
    }

    loadProfileData() {
        document.getElementById('username').value = this.userProfile.username || '';
        document.getElementById('goal-time').value = this.userProfile.goalTime || 60;
        document.getElementById('motivation').value = this.userProfile.motivation || '';
    }

    saveProfile() {
        this.userProfile.username = document.getElementById('username').value.trim();
        this.userProfile.goalTime = parseInt(document.getElementById('goal-time').value) || 60;
        this.userProfile.motivation = document.getElementById('motivation').value.trim();
        
        if (this.currentUser && this.users[this.currentUser]) {
            this.users[this.currentUser].profile = this.userProfile;
        }
        
        this.saveData();
        this.updateUserDisplay();
        this.showFeedback('プロフィールを保存しました', 'success');
    }

    exportData() {
        const exportData = {
            pens: this.pens,
            pages: this.pages,
            studyData: this.studyData,
            userProfile: this.userProfile,
            achievements: this.achievements,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `kosoden-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showFeedback('データをエクスポートしました', 'success');
    }

    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (confirm('データをインポートすると現在のデータが上書きされます。続行しますか？')) {
                    if (importData.pens) this.pens = importData.pens;
                    if (importData.pages) this.pages = importData.pages;
                    if (importData.studyData) this.studyData = importData.studyData;
                    if (importData.userProfile) this.userProfile = importData.userProfile;
                    if (importData.achievements) this.achievements = importData.achievements;
                    
                    this.saveData();
                    this.updateDisplay();
                    this.loadProfileData();
                    this.showFeedback('データをインポートしました', 'success');
                }
            } catch (error) {
                this.showFeedback('無効なファイル形式です', 'error');
            }
        };
        reader.readAsText(file);
    }

    resetAllData() {
        localStorage.clear();
        location.reload();
    }

    // Feedback Methods
    showFeedback(message, type = 'success') {
        const existingFeedback = document.querySelector('.feedback-message');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        const feedback = document.createElement('div');
        feedback.className = `feedback-message ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #F44336;'}
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            feedback.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }

    // Progress Chart Methods
    updateProgressChart() {
        const canvas = document.getElementById('progress-chart-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const dates = Object.keys(this.studyData).sort();
        if (dates.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('データがありません', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const dailyTotals = dates.map(date => {
            return Object.values(this.studyData[date]).reduce((sum, minutes) => sum + minutes, 0);
        });
        
        const maxMinutes = Math.max(...dailyTotals, this.userProfile.goalTime);
        const margin = 40;
        const chartWidth = canvas.width - margin * 2;
        const chartHeight = canvas.height - margin * 2;
        
        // Draw axes
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, canvas.height - margin);
        ctx.lineTo(canvas.width - margin, canvas.height - margin);
        ctx.stroke();
        
        // Draw goal line
        const goalY = canvas.height - margin - (this.userProfile.goalTime / maxMinutes) * chartHeight;
        ctx.strokeStyle = '#FF6B6B';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(margin, goalY);
        ctx.lineTo(canvas.width - margin, goalY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw data line
        if (dailyTotals.length > 1) {
            ctx.strokeStyle = '#5A67D8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            dailyTotals.forEach((minutes, index) => {
                const x = margin + (index / (dailyTotals.length - 1)) * chartWidth;
                const y = canvas.height - margin - (minutes / maxMinutes) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Draw data points
            ctx.fillStyle = '#5A67D8';
            dailyTotals.forEach((minutes, index) => {
                const x = margin + (index / (dailyTotals.length - 1)) * chartWidth;
                const y = canvas.height - margin - (minutes / maxMinutes) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        
        // Add labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('目標', margin - 5, goalY + 4);
        
        ctx.textAlign = 'center';
        if (dates.length <= 7) {
            dates.forEach((date, index) => {
                const x = margin + (index / Math.max(1, dates.length - 1)) * chartWidth;
                const shortDate = new Date(date).toLocaleDateString('ja-JP', { month: 'M', day: 'n' });
                ctx.fillText(shortDate, x, canvas.height - 5);
            });
        }
    }

    // Achievement System
    initializeAchievements() {
        this.achievementDefinitions = [
            {
                id: 'first_study',
                title: '初回学習',
                description: '初めて学習を記録しました',
                icon: '🎯',
                condition: () => {
                    return Object.keys(this.studyData).length > 0;
                }
            },
            {
                id: 'daily_goal',
                title: '日次目標達成',
                description: '1日の目標時間を達成しました',
                icon: '⭐',
                condition: () => {
                    const today = new Date().toDateString();
                    const todayMinutes = Object.values(this.studyData[today] || {}).reduce((sum, m) => sum + m, 0);
                    return todayMinutes >= this.userProfile.goalTime;
                }
            },
            {
                id: 'week_streak',
                title: '7日連続',
                description: '7日連続で学習しました',
                icon: '🔥',
                condition: () => {
                    const dates = Object.keys(this.studyData).sort();
                    if (dates.length < 7) return false;
                    
                    const today = new Date();
                    for (let i = 0; i < 7; i++) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        const dateStr = date.toDateString();
                        if (!this.studyData[dateStr]) return false;
                    }
                    return true;
                }
            },
            {
                id: 'total_10h',
                title: '累計10時間',
                description: '累計10時間学習しました',
                icon: '📚',
                condition: () => {
                    let totalMinutes = 0;
                    Object.values(this.studyData).forEach(dayData => {
                        Object.values(dayData).forEach(minutes => {
                            totalMinutes += minutes;
                        });
                    });
                    return totalMinutes >= 600;
                }
            },
            {
                id: 'multi_subject',
                title: 'マルチタスカー',
                description: '3科目以上を学習しました',
                icon: '🎨',
                condition: () => {
                    const subjects = new Set();
                    Object.values(this.studyData).forEach(dayData => {
                        Object.keys(dayData).forEach(subject => {
                            subjects.add(subject);
                        });
                    });
                    return subjects.size >= 3;
                }
            }
        ];
    }

    updateAchievements() {
        const container = document.getElementById('achievement-badges');
        container.innerHTML = '';
        
        this.achievementDefinitions.forEach(achievement => {
            const isEarned = this.achievements.includes(achievement.id) || achievement.condition();
            
            if (isEarned && !this.achievements.includes(achievement.id)) {
                this.achievements.push(achievement.id);
                this.saveData();
                this.showFeedback(`実績解除: ${achievement.title}`, 'success');
            }
            
            const badge = document.createElement('div');
            badge.className = `achievement-badge ${isEarned ? 'earned' : ''}`;
            badge.innerHTML = `
                <div class="icon">${achievement.icon}</div>
                <div class="title">${achievement.title}</div>
                <div class="description">${achievement.description}</div>
            `;
            
            if (!isEarned) {
                badge.style.opacity = '0.5';
                badge.style.filter = 'grayscale(100%)';
            }
            
            container.appendChild(badge);
        });
    }

    // Calendar Methods
    updateCalendar() {
        const container = document.getElementById('study-calendar');
        container.innerHTML = '';
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dateStr = date.toDateString();
            const dayData = this.studyData[dateStr];
            const totalMinutes = dayData ? Object.values(dayData).reduce((sum, m) => sum + m, 0) : 0;
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (totalMinutes > 0) {
                dayElement.classList.add('has-study');
            }
            
            if (date.getMonth() !== currentMonth) {
                dayElement.style.opacity = '0.3';
            }
            
            dayElement.innerHTML = `
                <div class="date">${date.getDate()}</div>
                ${totalMinutes > 0 ? `
                    <div class="study-indicator" style="background-color: ${this.getIntensityColor(totalMinutes)}">
                        ${Math.floor(totalMinutes / 60)}
                    </div>
                ` : ''}
            `;
            
            dayElement.addEventListener('mouseenter', (e) => {
                if (totalMinutes > 0) {
                    this.showTooltip(e, `${date.toLocaleDateString('ja-JP')}: ${Math.floor(totalMinutes / 60)}時間${totalMinutes % 60}分`);
                }
            });
            
            dayElement.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
            
            container.appendChild(dayElement);
        }
    }

    getIntensityColor(minutes) {
        const intensity = Math.min(minutes / this.userProfile.goalTime, 1);
        const hue = 120 * intensity;
        return `hsl(${hue}, 70%, 50%)`;
    }

    // Tooltip Methods
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, element.dataset.tooltip);
            });
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(event, text) {
        const tooltip = document.getElementById('tooltip');
        tooltip.textContent = text;
        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = event.pageY - 30 + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show');
    }

    // Drag and Drop Methods
    setupDragAndDrop() {
        const penItems = document.querySelectorAll('.pen-item');
        penItems.forEach(item => {
            item.classList.add('draggable');
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.penId);
                item.style.opacity = '0.5';
            });
            
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = item.dataset.penId;
                
                if (draggedId !== targetId) {
                    this.swapPens(parseInt(draggedId), parseInt(targetId));
                }
            });
        });
    }

    swapPens(id1, id2) {
        const pen1Index = this.pens.findIndex(p => p.id === id1);
        const pen2Index = this.pens.findIndex(p => p.id === id2);
        
        if (pen1Index !== -1 && pen2Index !== -1) {
            const temp = this.pens[pen1Index].subject;
            this.pens[pen1Index].subject = this.pens[pen2Index].subject;
            this.pens[pen2Index].subject = temp;
            
            this.saveData();
            this.initializePens();
            this.showFeedback('ペンの位置を交換しました', 'success');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KosodenApp();
});