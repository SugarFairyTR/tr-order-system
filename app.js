// 앱 초기화 및 전역 변수
class OrderApp {
    constructor() {
        this.database = null;
        this.orders = [];
        this.currentEditId = null;
        this.apiBaseUrl = './api'; // API 기본 URL
        
        // Firebase 설정
        this.firebaseConfig = null;
        this.firebaseDb = null;
        this.isFirebaseEnabled = false;
        
        // 로그인 시스템 관련
        this.userConfig = null;
        this.currentUser = null;
        this.sessionTimeout = null;
        this.isLoggedIn = false;
        
        // 성능 최적화
        this.debounceTimers = new Map();
        this.eventListeners = new Map();
        
        // 오프라인 상태 관리
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        
        // 데이터 백업 관리
        this.lastBackupTime = localStorage.getItem('lastBackupTime');
        this.autoBackupInterval = null;
        
        // 사용자 관리자 초기화
        this.userManager = new UserManager(this);
        
        // 네비게이션 매니저 초기화 (다른 초기화 후에)
        this.navigationManager = null;
        
        this.init();
        this.setupOfflineHandling();
        this.setupAutoBackup();
        this.initFirebase();
    }

    // Firebase 초기화
    async initFirebase() {
        try {
            // Firebase 설정 로드
            await this.loadFirebaseConfig();
            
            if (this.firebaseConfig && typeof firebase !== 'undefined') {
                // Firebase 초기화
                firebase.initializeApp(this.firebaseConfig);
                this.firebaseDb = firebase.database();
                this.isFirebaseEnabled = true;
                
                console.log('✅ Firebase 연결 성공!');
                this.showNotification('☁️ 클라우드 저장 기능이 활성화되었습니다!', 'success');
                
                // 기존 데이터 동기화
                await this.syncWithFirebase();
                
            } else {
                console.log('⚠️ Firebase 설정이 없습니다. 로컬 저장만 사용됩니다.');
            }
        } catch (error) {
            console.error('Firebase 초기화 실패:', error);
            this.isFirebaseEnabled = false;
        }
    }

    // Firebase 설정 로드 (GitHub 공유 및 여러 경로 지원)
    async loadFirebaseConfig() {
        try {
            console.log('🔥 Firebase 설정 로드 시작...');
            
            // 직접 설정 (firebase-config.json 파일이 없을 때 사용)
            const directConfig = {
                "apiKey": "AIzaSyCEvWLIkc1JmDbXK08be7miI7F3hd1LmOk",
                "authDomain": "tr-order-system.firebaseapp.com",
                "databaseURL": "https://tr-order-system-default-rtdb.asia-southeast1.firebasedatabase.app/",
                "projectId": "tr-order-system",
                "storageBucket": "tr-order-system.firebasestorage.app",
                "messagingSenderId": "808479613989",
                "appId": "1:808479613989:web:9ac188b732019adf8c8bcc",
                "measurementId": "G-RMQBCZ4PGM"
            };
            
            // 1순위: 로컬 파일
            let response = await fetch('./firebase-config.json');
            console.log('로컬 파일 응답:', response.status, response.ok);
            
            // 2순위: GitHub Raw 파일 (팀 공유용)
            if (!response.ok) {
                const githubRawUrl = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/firebase-config.json';
                console.log('로컬 설정 파일이 없습니다. GitHub에서 로드를 시도합니다...');
                response = await fetch(githubRawUrl);
                console.log('GitHub 파일 응답:', response.status, response.ok);
            }
            
            // 3순위: 구글 드라이브 공유 링크 (선택사항)
            if (!response.ok) {
                // 구글 드라이브 공유 파일 ID (예시)
                const driveFileId = 'YOUR_GOOGLE_DRIVE_FILE_ID';
                const driveUrl = `https://drive.google.com/uc?id=${driveFileId}&export=download`;
                console.log('GitHub에서도 로드 실패. Google Drive에서 시도합니다...');
                response = await fetch(driveUrl);
                console.log('Google Drive 파일 응답:', response.status, response.ok);
            }
            
            if (response.ok) {
                const configText = await response.text();
                console.log('🔥 설정 파일 내용:', configText);
                
                this.firebaseConfig = JSON.parse(configText);
                console.log('🔥 Firebase 설정 파싱 완료:', this.firebaseConfig);
                
                // 설정 출처 표시
                if (response.url.includes('github')) {
                    console.log('📁 GitHub에서 설정을 로드했습니다.');
                } else if (response.url.includes('drive.google.com')) {
                    console.log('☁️ Google Drive에서 설정을 로드했습니다.');
                } else {
                    console.log('💾 로컬 파일에서 설정을 로드했습니다.');
                }
            } else {
                // 4순위: 직접 설정 사용
                console.log('🔥 파일 로드 실패. 직접 설정을 사용합니다.');
                this.firebaseConfig = directConfig;
                console.log('🔥 Firebase 직접 설정 완료:', this.firebaseConfig);
            }
        } catch (error) {
            console.error('❌ Firebase 설정 로드 실패:', error);
            // 에러 발생시에도 직접 설정 사용
            console.log('🔥 에러 발생. 직접 설정을 사용합니다.');
            this.firebaseConfig = {
                "apiKey": "AIzaSyCEvWLIkc1JmDbXK08be7miI7F3hd1LmOk",
                "authDomain": "tr-order-system.firebaseapp.com", 
                "databaseURL": "https://tr-order-system-default-rtdb.asia-southeast1.firebasedatabase.app/",
                "projectId": "tr-order-system",
                "storageBucket": "tr-order-system.firebasestorage.app",
                "messagingSenderId": "808479613989",
                "appId": "1:808479613989:web:9ac188b732019adf8c8bcc",
                "measurementId": "G-RMQBCZ4PGM"
            };
            console.log('🔧 설정 방법: 설정 → Firebase 클라우드 저장 설정');
        }
    }

    // Firebase와 동기화
    async syncWithFirebase() {
        if (!this.isFirebaseEnabled) return;
        
        try {
            // Firebase에서 기존 데이터 가져오기
            const snapshot = await this.firebaseDb.ref('orders').once('value');
            const firebaseOrders = snapshot.val();
            
            if (firebaseOrders) {
                // 배열로 변환
                const firebaseOrderArray = Object.values(firebaseOrders);
                
                // 로컬 데이터와 병합 (중복 제거)
                const existingIds = this.orders.map(order => order.id);
                const newOrders = firebaseOrderArray.filter(order => !existingIds.includes(order.id));
                
                if (newOrders.length > 0) {
                    this.orders = [...this.orders, ...newOrders];
                    localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
                    console.log(`${newOrders.length}개의 새로운 주문을 Firebase에서 동기화했습니다.`);
                }
            }
        } catch (error) {
            console.error('Firebase 동기화 실패:', error);
        }
    }

    // Firebase에 자동 저장
    async saveToFirebase(order) {
        if (!this.isFirebaseEnabled) return false;
        
        try {
            // Firebase에 주문 저장 (ID를 키로 사용)
            await this.firebaseDb.ref(`orders/${order.id}`).set({
                ...order,
                savedAt: firebase.database.ServerValue.TIMESTAMP,
                savedBy: this.currentUser?.name || 'Unknown'
            });
            
            console.log('✅ Firebase에 자동 저장 완료:', order.id);
            return true;
        } catch (error) {
            console.error('❌ Firebase 저장 실패:', error);
            return false;
        }
    }

    // 디바운싱 헬퍼 함수
    debounce(key, func, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    // 이벤트 리스너 관리
    addEventListenerWithTracking(element, event, handler, options = false) {
        const key = `${element.id || element.tagName}-${event}`;
        
        // 기존 리스너 제거
        if (this.eventListeners.has(key)) {
            const { elem, evt, hdlr } = this.eventListeners.get(key);
            elem.removeEventListener(evt, hdlr);
        }
        
        element.addEventListener(event, handler, options);
        this.eventListeners.set(key, { elem: element, evt: event, hdlr: handler });
    }

    // 메모리 정리
    cleanup() {
        // 타이머 정리
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // 이벤트 리스너 정리
        this.eventListeners.forEach(({ elem, evt, hdlr }) => {
            elem.removeEventListener(evt, hdlr);
        });
        this.eventListeners.clear();
        
        // 세션 타임아웃 정리
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        // 자동 백업 인터벌 정리
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }
    }

    async init() {
        console.log('🔧 OrderApp 초기화 중...');
        
        try {
            // 1. 사용자 설정 로드 (가장 먼저)
            await this.loadUserConfig();
            
            // 2. 데이터베이스 로드
            await this.loadDatabase();
            
            // 3. Firebase 초기화 (있는 경우)
            await this.initializeFirebase();
            
            // 4. 이벤트 리스너 설정
            this.setupEventListeners();
            this.setupLoginEventListeners();
            
            // 5. 세션 복구 시도
            this.restoreSession();
            
            // 6. UI 초기화
            this.initializeUI();
            
            console.log('✅ OrderApp 초기화 완료');
            
        } catch (error) {
            console.error('❌ OrderApp 초기화 실패:', error);
            this.showNotification('앱 초기화에 실패했습니다', 'error');
        }
    }
    
    async initMainApp() {
        await this.loadDatabase();
        this.setupEventListeners();
        this.populateSelects();
        await this.loadOrders(); // localStorage와 order_list.json에서 주문 로드
        
        // 데이터 무결성 검사 및 복구
        const integrityCheck = this.validateDataIntegrity();
        if (!integrityCheck.valid) {
            console.warn('데이터 무결성 문제 발견. 자동 복구를 시도합니다.');
            this.repairData();
        }
        
        this.updateUI();
        
        // 오늘 날짜를 기본값으로 설정
        document.getElementById('deliveryDate').value = new Date().toISOString().split('T')[0];
        
        // PWA 설치 처리
        this.setupPWA();
        
        // 수량/가격 입력 필드 강제 설정
        this.enforceNumberInputSettings();
        
        // 메인 앱 표시
        this.showMainApp();
    }

    // 사용자 설정 로드
    async loadUserConfig() {
        try {
            console.log('📂 사용자 설정 로드 시작...');
            
            // UserManager를 통해 사용자 데이터 로드
            const success = await this.userManager.loadUsers();
            if (!success) {
                throw new Error('UserManager 로드 실패');
            }
            
            // 기본 설정도 로드
            const response = await fetch('./user_config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.userConfig = await response.json();
            console.log('✅ 사용자 설정 로드 완료');
            
            // 로그인 화면의 담당자 목록 업데이트
            this.updateLoginManagerOptions();
            
            return true;
        } catch (error) {
            console.error('❌ 사용자 설정 로드 실패:', error);
            this.showNotification('사용자 설정을 불러올 수 없습니다', 'error');
            return false;
        }
    }

    // 로그인 화면 담당자 옵션 업데이트
    updateLoginManagerOptions() {
        const loginManager = document.getElementById('loginManager');
        if (!loginManager) return;
        
        // 기존 옵션 제거 (첫 번째 옵션 제외)
        while (loginManager.children.length > 1) {
            loginManager.removeChild(loginManager.lastChild);
        }
        
        // UserManager에서 사용자 목록 가져오기
        const userList = this.userManager.getUserList();
        userList.forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = userName;
            loginManager.appendChild(option);
        });
        
        console.log('✅ 로그인 담당자 옵션 업데이트 완료:', userList);
    }

    // 로그인 화면 동적 업데이트
    updateLoginScreen() {
        const userSelect = document.getElementById('userSelect');
        if (!userSelect) return;
        
        // 기존 옵션 제거
        userSelect.innerHTML = '<option value="">사용자를 선택하세요</option>';
        
        // 현재 사용자 목록으로 업데이트
        const users = this.userConfig?.users || {};
        
        Object.keys(users).forEach(userName => {
            const user = users[userName];
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = `${userName} (${user.role})`;
            userSelect.appendChild(option);
        });
        
        console.log(`🔄 로그인 화면 업데이트: ${Object.keys(users).length}명`);
    }

    // 사용자 추가 후 로그인 화면 자동 업데이트
    // UserManager 클래스의 addUser 메서드 수정
    addUser(userData) {
        try {
            const { name, pin, role, department, email, phone } = userData;
            
            // 유효성 검사
            if (!name || !pin || !role) {
                this.app.showNotification('이름, PIN, 역할은 필수 입력 항목입니다.', 'error');
                return false;
            }
            
            if (this.users[name]) {
                this.app.showNotification('이미 존재하는 사용자입니다.', 'error');
                return false;
            }
            
            if (pin.length !== 4 || !/^\d+$/.test(pin)) {
                this.app.showNotification('PIN은 4자리 숫자여야 합니다.', 'error');
                return false;
            }
            
            // PIN 중복 확인
            const existingPins = Object.values(this.users).map(user => user.pin);
            if (existingPins.includes(pin)) {
                this.app.showNotification('이미 사용 중인 PIN입니다.', 'error');
                return false;
            }
            
            // 새 사용자 추가
            this.users[name] = {
                pin: pin,
                name: name,
                role: role,
                department: department || '영업팀',
                email: email || '',
                phone: phone || '',
                created_at: new Date().toISOString().split('T')[0],
                last_login: null
            };
            
            console.log(`✅ 새 사용자 추가: ${name}`);
            
            // 파일 업데이트
            this.updateUserConfigFile();
            
            // 로그인 화면 즉시 업데이트
            this.app.updateLoginScreen();
            
            this.app.showNotification(`✅ "${name}" 사용자가 추가되었습니다!`, 'success');
            return true;
            
        } catch (error) {
            console.error('❌ 사용자 추가 실패:', error);
            this.app.showNotification('사용자 추가 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // 사용자 삭제 후 로그인 화면 자동 업데이트
    deleteUser(userName) {
        try {
            if (!this.users[userName]) {
                this.app.showNotification('존재하지 않는 사용자입니다.', 'error');
                return false;
            }
            
            // 현재 로그인한 사용자는 삭제 불가
            if (this.app.currentUser && this.app.currentUser.name === userName) {
                this.app.showNotification('현재 로그인한 사용자는 삭제할 수 없습니다.', 'error');
                return false;
            }
            
            // 사용자 삭제
            delete this.users[userName];
            
            console.log(`🗑️ 사용자 삭제: ${userName}`);
            
            // 파일 업데이트
            this.updateUserConfigFile();
            
            // 로그인 화면 즉시 업데이트
            this.app.updateLoginScreen();
            
            this.app.showNotification(`✅ "${userName}" 사용자가 삭제되었습니다.`, 'success');
            return true;
            
        } catch (error) {
            console.error('❌ 사용자 삭제 실패:', error);
            this.app.showNotification('사용자 삭제 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // user_config.json 파일 업데이트 (Firebase 동기화)
    async updateUserConfigFile() {
        try {
            const updatedConfig = {
                users: this.users,
                settings: this.app.userConfig?.settings || {
                    pin_length: 4,
                    session_timeout: 3600,
                    max_login_attempts: 5,
                    auto_logout_warning: 300,
                    company_name: "주식회사 티알코리아",
                    system_version: "1.0.0"
                },
                security: this.app.userConfig?.security || {
                    password_policy: "4자리 숫자",
                    encryption: false,
                    login_history: true,
                    failed_attempts: {}
                },
                last_updated: new Date().toISOString()
            };
            
            // 로컬 userConfig 업데이트
            this.app.userConfig = updatedConfig;
            
            // Firebase에 저장 (가능한 경우)
            if (this.app.isFirebaseEnabled) {
                await this.app.firebaseDb.ref('user_config').set(updatedConfig);
                console.log('☁️ Firebase에 사용자 설정 저장 완료');
            }
            
            // 로컬 스토리지에도 백업
            localStorage.setItem('user_config_backup', JSON.stringify(updatedConfig));
            
            console.log('✅ 사용자 설정 파일 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 사용자 설정 파일 업데이트 실패:', error);
        }
    }

    // 사용자 설정 유효성 검사
    validateUserConfig(config) {
        return config && 
               typeof config.users === 'object' &&
               typeof config.settings === 'object' &&
               config.settings.company_name &&
               config.settings.system_version;
    }

    // 기본 사용자 설정
    getDefaultUserConfig() {
        console.warn('user_config.json을 로드할 수 없어 기본 설정을 사용합니다.');
        return {
            users: {},
            settings: {
                max_login_attempts: 5,
                pin_length: 4,
                company_name: "주식회사 티알코리아",
                system_version: "1.0.0"
            }
        };
    }

    // 로그인 상태 확인 (세션 만료 없음)
    checkLoginStatus() {
        const loginData = localStorage.getItem('trkorea_login');
        if (loginData) {
            const parsed = JSON.parse(loginData);
            this.currentUser = parsed.user;
            this.isLoggedIn = true;
        } else {
            this.isLoggedIn = false;
        }
    }

    // 로그인 화면 표시
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.querySelector('.main-app');
        
        if (loginScreen) {
            loginScreen.classList.add('active');
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'flex';
        }
        
        if (mainApp) {
            mainApp.classList.add('hidden');
            mainApp.style.display = 'none';
        }
        
        console.log('🔐 로그인 화면 표시');
    }

    // 로그인 화면 숨기기 (누락된 함수 추가)
    hideLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.classList.remove('active');
            loginScreen.classList.add('hidden');
            loginScreen.style.display = 'none';
        }
        console.log('🔒 로그인 화면 숨김');
    }

    // 메인 앱 표시
    showMainApp() {
        const mainApp = document.querySelector('.main-app');
        const loginScreen = document.getElementById('loginScreen');
        
        if (mainApp) {
            mainApp.classList.remove('hidden');
            mainApp.style.display = 'block';
        }
        
        if (loginScreen) {
            loginScreen.classList.remove('active');
            loginScreen.classList.add('hidden');
            loginScreen.style.display = 'none';
        }
        
        console.log('📱 메인 앱 표시');
    }

    // 사용자 표시 업데이트
    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const userNameElements = document.querySelectorAll('.current-user, .user-name');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = this.currentUser.name;
            }
        });
        
        console.log('👤 사용자 표시 업데이트:', this.currentUser.name);
    }

    // 세션 타임아웃 설정
    setupSessionTimeout() {
        // 기존 타임아웃 제거
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
        
        // 1시간 후 자동 로그아웃
        this.sessionTimeout = setTimeout(() => {
            this.showNotification('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
            this.logout();
        }, 3600000); // 1시간
        
        console.log('⏰ 세션 타임아웃 설정 완료 (1시간)');
    }

    // 로그아웃
    logout() {
        console.log('👋 로그아웃 시작...');
        
        // 사용자 정보 초기화
        this.currentUser = null;
        this.isLoggedIn = false;
        
        // UserManager 로그아웃
        if (this.userManager) {
            this.userManager.logout();
        }
        
        // 세션 타임아웃 제거
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
        
        // UI 업데이트
        this.showLoginScreen();
        
        // 입력 필드 초기화
        const loginPin = document.getElementById('loginPin');
        const loginManager = document.getElementById('loginManager');
        
        if (loginPin) loginPin.value = '';
        if (loginManager) loginManager.selectedIndex = 0;
        
        this.showNotification('로그아웃되었습니다', 'info');
        console.log('✅ 로그아웃 완료');
    }

    // 알림 표시 함수 개선
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`📢 알림 [${type.toUpperCase()}]: ${message}`);
        
        // 기존 알림 제거
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // 스타일 적용
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            color: white;
        `;
        
        // 타입별 색상 적용
        const colors = {
            success: '#4CAF50',
            error: '#f44336', 
            warning: '#ff9800',
            info: '#2196F3'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // 자동 제거
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }

    // 알림 아이콘 헬퍼 함수
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle', 
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    // 로그인 이벤트 리스너 설정
    setupLoginEventListeners() {
        console.log('🔧 로그인 이벤트 리스너 설정 중...');
        
        const loginBtn = document.getElementById('loginBtn');
        const loginPin = document.getElementById('loginPin');
        const loginManager = document.getElementById('loginManager');
        
        if (loginBtn) {
            // 기존 이벤트 리스너 제거
            loginBtn.removeEventListener('click', this.handleLogin.bind(this));
            
            // 새 이벤트 리스너 추가
            loginBtn.addEventListener('click', this.handleLogin.bind(this));
            console.log('✅ 로그인 버튼 이벤트 리스너 추가됨');
        }
        
        if (loginPin) {
            // Enter 키 이벤트 추가
            loginPin.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
            console.log('✅ PIN 입력 Enter 키 이벤트 추가됨');
        }
    }

    // 로그인 처리 함수
    async handleLogin() {
        console.log('🔐 로그인 시도 시작...');
        
        const managerSelect = document.getElementById('loginManager');
        const pinInput = document.getElementById('loginPin');
        
        if (!managerSelect || !pinInput) {
            console.error('❌ 로그인 요소를 찾을 수 없습니다');
            this.showNotification('로그인 폼을 찾을 수 없습니다', 'error');
            return;
        }
        
        const selectedManager = managerSelect.value.trim();
        const enteredPin = pinInput.value.trim();
        
        console.log('📝 입력된 정보:', { 
            manager: selectedManager, 
            pin: enteredPin ? '****' : '(비어있음)' 
        });
        
        // 입력 검증
        if (!selectedManager) {
            this.showNotification('담당자를 선택해주세요', 'warning');
            managerSelect.focus();
            return;
        }
        
        if (!enteredPin) {
            this.showNotification('PIN 번호를 입력해주세요', 'warning');
            pinInput.focus();
            return;
        }
        
        if (enteredPin.length !== 4) {
            this.showNotification('PIN 번호는 4자리여야 합니다', 'warning');
            pinInput.focus();
            return;
        }
        
        // UserManager를 통한 인증
        const user = this.userManager.authenticateUser(selectedManager, enteredPin);
        
        if (!user) {
            this.showNotification('담당자 또는 PIN 번호가 올바르지 않습니다', 'error');
            pinInput.value = '';
            pinInput.focus();
            return;
        }
        
        // 로그인 성공
        console.log('✅ 로그인 성공!');
        this.currentUser = user;
        this.isLoggedIn = true;
        
        // 세션 저장
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('loginTime', Date.now().toString());
        
        // UI 업데이트
        this.hideLoginScreen();
        this.showMainApp();
        this.updateUserDisplay();
        
        // 세션 타임아웃 설정
        this.setupSessionTimeout();
        
        this.showNotification(`${user.name}님, 환영합니다!`, 'success');
        console.log('🎉 로그인 프로세스 완료');
    }

    // API 호출 헬퍼 메서드
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API 호출 실패 (${method} ${endpoint}):`, error);
            throw error;
        }
    }

    // 데이터베이스 로딩
    async loadDatabase() {
        try {
            this.showLoading(true);
            
            // 우선순위: database_optimized.json -> database_converted.json
            const dbFiles = ['./database_optimized.json', './database_converted.json'];
            let loadedDb = null;
            
            for (const dbFile of dbFiles) {
                try {
                    console.log(`데이터베이스 로드 시도: ${dbFile}`);
                    const response = await fetch(dbFile);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // database_converted.json 형식인 경우 변환
                        if (Array.isArray(data) && data.length > 0) {
                            loadedDb = this.convertLegacyDatabase(data[0]);
                        } else {
                            loadedDb = data;
                        }
                        
                        console.log(`데이터베이스 로드 성공: ${dbFile}`);
                        break;
                    }
                } catch (error) {
                    console.warn(`${dbFile} 로드 실패:`, error);
                    continue;
                }
            }
            
            if (loadedDb && this.validateDatabase(loadedDb)) {
                this.database = loadedDb;
                console.log('데이터베이스 검증 완료:', {
                    담당자: this.database.categories?.담당자?.length || 0,
                    분류: this.database.categories?.분류?.length || 0,
                    판매처: Object.keys(this.database.sellers_by_manager || {}).length,
                    도착지: Object.keys(this.database.destinations_by_seller || {}).length
                });
            } else {
                throw new Error('유효한 데이터베이스를 찾을 수 없습니다.');
            }
            
        } catch (error) {
            console.error('데이터베이스 로딩 오류:', error);
            this.showNotification('데이터베이스 로딩에 실패했습니다. 기본 데이터를 사용합니다.', 'warning');
            this.database = this.getDefaultDatabase();
        } finally {
            this.showLoading(false);
        }
    }

    // 레거시 데이터베이스 형식 변환
    convertLegacyDatabase(legacyData) {
        return {
            categories: {
                담당자: legacyData.담당자 || [],
                분류: legacyData.분류 || []
            },
            items: {
                설탕: legacyData.설탕 || [],
                식품첨가물: legacyData.식품첨가물 || []
            },
            sellers_by_manager: legacyData.담당자별_거래처 || {},
            destinations_by_seller: legacyData.도착지_정보 || {}
        };
    }

    // 데이터베이스 유효성 검사
    validateDatabase(db) {
        return db && 
               db.categories && 
               Array.isArray(db.categories.담당자) && 
               Array.isArray(db.categories.분류) &&
               typeof db.sellers_by_manager === 'object' &&
               typeof db.destinations_by_seller === 'object';
    }

    // 기본 데이터베이스 (fallback)
    getDefaultDatabase() {
        console.warn('데이터베이스 파일을 로드할 수 없어 기본 데이터를 사용합니다.');
        return {
            categories: {
                담당자: [],
                분류: []
            },
            items: {},
            sellers_by_manager: {},
            destinations_by_seller: {}
        };
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 네비게이션 - 더 안정적인 이벤트 바인딩
        const navButtons = document.querySelectorAll('.nav-btn');
        console.log(`네비게이션 버튼 ${navButtons.length}개 발견`);
        
        navButtons.forEach((btn, index) => {
            const screenName = btn.dataset.screen;
            console.log(`네비게이션 버튼 ${index + 1}: ${screenName}`);
            
            // 기존 이벤트 리스너 제거 (중복 방지)
            btn.removeEventListener('click', btn._switchScreenHandler);
            
            // 새 이벤트 리스너 추가
            btn._switchScreenHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`네비게이션 버튼 클릭됨: ${screenName}`);
                this.switchScreen(screenName);
            };
            
            btn.addEventListener('click', btn._switchScreenHandler);
            this.addEventListenerWithTracking(btn, 'click', btn._switchScreenHandler);
        });

        // 설정 버튼
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            this.addEventListenerWithTracking(settingsBtn, 'click', () => {
                console.log('설정 버튼 클릭됨');
                this.switchScreen('settings');
            });
        }

        // 주문 입력 폼 - 디바운싱 적용
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            this.addEventListenerWithTracking(managerSelect, 'change', () => {
                this.debounce('updateSellers', () => this.updateSellers(), 100);
            });
        }

        const sellerSelect = document.getElementById('seller');
        if (sellerSelect) {
            this.addEventListenerWithTracking(sellerSelect, 'change', () => {
                this.debounce('updateDestinations', () => this.updateDestinations(), 100);
            });
        }

        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            this.addEventListenerWithTracking(categorySelect, 'change', () => {
                this.debounce('updateProducts', () => this.updateProducts(), 100);
            });
        }

        // 수량 입력 - 천단위 콤마 자동 추가 (강화된 버전)
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            // 기존 이벤트 리스너 제거
            quantityInput.removeEventListener('input', quantityInput._formatHandler);
            quantityInput.removeEventListener('blur', quantityInput._blurHandler);
            quantityInput.removeEventListener('focus', quantityInput._focusHandler);
            
            // 새 이벤트 핸들러 생성
            quantityInput._formatHandler = (e) => this.formatQuantity(e);
            quantityInput._blurHandler = (e) => this.formatQuantity(e);
            quantityInput._focusHandler = (e) => {
                // 포커스시 input type을 text로 강제 설정
                e.target.type = 'text';
                e.target.inputMode = 'numeric';
            };
            
            // 이벤트 리스너 등록
            quantityInput.addEventListener('input', quantityInput._formatHandler);
            quantityInput.addEventListener('blur', quantityInput._blurHandler);
            quantityInput.addEventListener('focus', quantityInput._focusHandler);
            
            // 초기 설정 강제 적용
            quantityInput.type = 'text';
            quantityInput.inputMode = 'numeric';
            quantityInput.autocomplete = 'off';
        }

        const priceInput = document.getElementById('price');
        if (priceInput) {
            // 기존 이벤트 리스너 제거
            priceInput.removeEventListener('input', priceInput._formatHandler);
            priceInput.removeEventListener('blur', priceInput._blurHandler);
            priceInput.removeEventListener('focus', priceInput._focusHandler);
            
            // 새 이벤트 핸들러 생성
            priceInput._formatHandler = (e) => this.formatPrice(e);
            priceInput._blurHandler = (e) => this.formatPrice(e);
            priceInput._focusHandler = (e) => {
                // 포커스시 input type을 text로 강제 설정
                e.target.type = 'text';
                e.target.inputMode = 'numeric';
            };
            
            // 이벤트 리스너 등록
            priceInput.addEventListener('input', priceInput._formatHandler);
            priceInput.addEventListener('blur', priceInput._blurHandler);
            priceInput.addEventListener('focus', priceInput._focusHandler);
            
            // 초기 설정 강제 적용
            priceInput.type = 'text';
            priceInput.inputMode = 'numeric';
            priceInput.autocomplete = 'off';
        }

        // 버튼 이벤트
        const saveOrderBtn = document.getElementById('saveOrderBtn');
        if (saveOrderBtn) {
            this.addEventListenerWithTracking(saveOrderBtn, 'click', () => this.saveOrder());
        }

        const resetFormBtn = document.getElementById('resetFormBtn');
        if (resetFormBtn) {
            this.addEventListenerWithTracking(resetFormBtn, 'click', () => this.resetForm());
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            this.addEventListenerWithTracking(exportDataBtn, 'click', () => this.exportData());
        }

        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            this.addEventListenerWithTracking(clearDataBtn, 'click', () => this.clearAllData());
        }

        // 파일 저장/로드 버튼 이벤트
        const saveFileBtn = document.getElementById('saveFileBtn');
        if (saveFileBtn) {
            this.addEventListenerWithTracking(saveFileBtn, 'click', () => this.saveToFile());
        }
        
        const loadFileBtn = document.getElementById('loadFileBtn');
        if (loadFileBtn) {
            this.addEventListenerWithTracking(loadFileBtn, 'click', () => this.loadOrdersFromFile());
        }

        // 필터 이벤트 - 디바운싱 적용
        const filterManager = document.getElementById('filterManager');
        if (filterManager) {
            this.addEventListenerWithTracking(filterManager, 'change', () => {
                this.debounce('filterOrders', () => this.filterOrders(), 150);
            });
        }

        const filterDate = document.getElementById('filterDate');
        if (filterDate) {
            this.addEventListenerWithTracking(filterDate, 'change', () => {
                this.debounce('filterOrders', () => this.filterOrders(), 150);
            });
        }
        
        // 과거 주문 표시 체크박스 (이벤트 위임 사용)
        document.addEventListener('change', (e) => {
            if (e.target.id === 'showPastOrders') {
                this.debounce('filterOrders', () => this.filterOrders(), 150);
            }
        });

        // 알림 닫기
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            this.addEventListenerWithTracking(closeNotification, 'click', () => {
                document.getElementById('notification').classList.remove('show');
            });
        }

        // 설정
        const defaultManager = document.getElementById('defaultManager');
        if (defaultManager) {
            this.addEventListenerWithTracking(defaultManager, 'change', (e) => {
                localStorage.setItem('defaultManager', e.target.value);
            });
        }

        // 검색 기능
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            this.addEventListenerWithTracking(searchBox, 'input', (e) => {
                this.debounce('searchOrders', () => this.performSearch(e.target.value), 300);
            });
        }

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => this.cleanup());
        
        console.log('✅ 모든 이벤트 리스너 설정 완료');
    }

    // 화면 전환
    switchScreen(screenName) {
        console.log(`화면 전환 시도: ${screenName}`);
        
        try {
            // 모든 화면 숨기기
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
                console.log(`화면 비활성화: ${screen.id}`);
            });

            // 모든 네비게이션 버튼 비활성화
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // 선택된 화면 표시
            const targetScreen = document.getElementById(screenName);
            if (targetScreen) {
                targetScreen.classList.add('active');
                console.log(`화면 활성화됨: ${screenName}`);
                
                // 화면 표시 후 약간의 지연을 두고 스크롤 위치 조정
                setTimeout(() => {
                    targetScreen.scrollTop = 0;
                }, 100);
            } else {
                console.error(`화면을 찾을 수 없습니다: ${screenName}`);
                this.showNotification(`화면을 찾을 수 없습니다: ${screenName}`, 'error');
                return;
            }

            // 네비게이션 버튼 활성화 (설정 화면 제외)
            if (screenName !== 'settings') {
                const navBtn = document.querySelector(`[data-screen="${screenName}"]`);
                if (navBtn) {
                    navBtn.classList.add('active');
                    console.log(`네비게이션 버튼 활성화: ${screenName}`);
                } else {
                    console.warn(`네비게이션 버튼을 찾을 수 없습니다: ${screenName}`);
                }
            }

            // 화면별 특별 처리
            if (screenName === 'orderList') {
                console.log('주문 목록 화면 로딩...');
                this.displayOrders();
            } else if (screenName === 'orderEdit') {
                console.log('주문 수정 화면 로딩...');
                this.displayEditOrders();
            } else if (screenName === 'settings') {
                console.log('설정 화면 로딩...');
                this.updateSettings();
            } else if (screenName === 'orderForm') {
                console.log('주문 입력 화면 로딩...');
                // 폼 초기화 (필요시)
                if (this.currentEditId) {
                    this.resetForm();
                    this.currentEditId = null;
                }
            }
            
            console.log(`화면 전환 완료: ${screenName}`);
            
        } catch (error) {
            console.error('화면 전환 중 오류:', error);
            this.showNotification('화면 전환 중 오류가 발생했습니다.', 'error');
        }
    }

    // 셀렉트 박스 초기화
    populateSelects() {
        // 담당자 목록
        const managerSelects = ['manager', 'filterManager', 'defaultManager', 'loginManager'];
        managerSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const isFilter = selectId === 'filterManager' || selectId === 'defaultManager';
                const isLogin = selectId === 'loginManager';
                
                if (isLogin) {
                    // 로그인 화면용
                    select.innerHTML = '<option value="">담당자 선택</option>';
                    if (this.userConfig && this.userConfig.users) {
                        Object.keys(this.userConfig.users).forEach(userName => {
                            const option = document.createElement('option');
                            option.value = userName;
                            option.textContent = userName;
                            select.appendChild(option);
                        });
                    }
                } else {
                    // 일반 화면용
                    select.innerHTML = isFilter 
                        ? '<option value="">전체</option>' 
                        : '<option value="">담당자 선택</option>';
                        
                    if (this.database && this.database.categories && this.database.categories.담당자) {
                        this.database.categories.담당자.forEach(manager => {
                            const option = document.createElement('option');
                            option.value = manager;
                            option.textContent = manager;
                            select.appendChild(option);
                        });
                    }
                }
            }
        });

        // 분류 목록
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">분류 선택</option>';
            if (this.database && this.database.categories && this.database.categories.분류) {
                this.database.categories.분류.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        }

        // 기본 담당자 설정 로딩
        const defaultManager = localStorage.getItem('defaultManager');
        if (defaultManager) {
            const defaultManagerSelect = document.getElementById('defaultManager');
            const managerSelect = document.getElementById('manager');
            
            if (defaultManagerSelect) defaultManagerSelect.value = defaultManager;
            if (managerSelect) {
                managerSelect.value = defaultManager;
                this.updateSellers();
            }
        }
    }

    // 판매처 업데이트
    updateSellers() {
        const manager = document.getElementById('manager').value;
        const sellerSelect = document.getElementById('seller');
        
        if (!sellerSelect) return;
        
        sellerSelect.innerHTML = '<option value="">판매처 선택</option>';
        
        if (manager && this.database && this.database.sellers_by_manager && this.database.sellers_by_manager[manager]) {
            this.database.sellers_by_manager[manager].forEach(seller => {
                const option = document.createElement('option');
                option.value = seller;
                option.textContent = seller;
                sellerSelect.appendChild(option);
            });
        }
        
        // 도착지 초기화
        const destinationSelect = document.getElementById('destination');
        if (destinationSelect) {
            destinationSelect.innerHTML = '<option value="">도착지 선택</option>';
        }
    }

    // 도착지 업데이트
    updateDestinations() {
        const seller = document.getElementById('seller').value;
        const destinationSelect = document.getElementById('destination');
        
        if (!destinationSelect) return;
        
        destinationSelect.innerHTML = '<option value="">도착지 선택</option>';
        
        if (seller && this.database && this.database.destinations_by_seller && this.database.destinations_by_seller[seller]) {
            this.database.destinations_by_seller[seller].forEach(destination => {
                const option = document.createElement('option');
                option.value = destination;
                option.textContent = this.formatDestination(destination);
                destinationSelect.appendChild(option);
            });
        }
    }

    // 도착지 포맷팅 (길이 제한)
    formatDestination(destination) {
        if (destination.length > 50) {
            return destination.substring(0, 50) + '...';
        }
        return destination;
    }

    // 품목 업데이트
    updateProducts() {
        const category = document.getElementById('category').value;
        const productSelect = document.getElementById('product');
        
        if (!productSelect) return;
        
        productSelect.innerHTML = '<option value="">품목 선택</option>';
        
        if (category && this.database && this.database.items && this.database.items[category]) {
            this.database.items[category].forEach(product => {
                const option = document.createElement('option');
                option.value = product;
                option.textContent = product;
                productSelect.appendChild(option);
            });
        }
    }

    // 수량 포맷팅 (천단위 콤마) - 강화된 안정적 버전
    formatQuantity(event) {
        const input = event.target;
        let currentValue = input.value;
        
        // 입력값이 비어있으면 그대로 두고 총액만 계산
        if (!currentValue || currentValue.trim() === '') {
            this.calculateTotal();
            return;
        }
        
        try {
            // 숫자가 아닌 문자 모두 제거 (콤마, 공백 등)
            let numbersOnly = currentValue.replace(/[^\d]/g, '');
            
            // 빈 문자열이면 그대로 유지
            if (numbersOnly === '') {
                input.value = '';
                this.calculateTotal();
                return;
            }
            
            // 숫자로 변환
            let numericValue = parseInt(numbersOnly, 10);
            
            // 유효한 숫자인지 확인
            if (!isNaN(numericValue) && numericValue > 0) {
                // 천단위 콤마 추가
                let formattedValue = numericValue.toLocaleString('ko-KR');
                
                // 값이 실제로 변경된 경우에만 업데이트 (무한 루프 방지)
                if (input.value !== formattedValue) {
                    input.value = formattedValue;
                }
            }
        } catch (error) {
            console.error('수량 포맷팅 오류:', error);
            // 오류 발생시 원래 값 유지
        }
        
        // 총액 계산
        this.calculateTotal();
    }

    // 가격 포맷팅 (천단위 콤마) - 강화된 안정적 버전
    formatPrice(event) {
        const input = event.target;
        let currentValue = input.value;
        
        // 입력값이 비어있으면 그대로 두고 총액만 계산
        if (!currentValue || currentValue.trim() === '') {
            this.calculateTotal();
            return;
        }
        
        try {
            // 숫자가 아닌 문자 모두 제거 (콤마, 공백 등)
            let numbersOnly = currentValue.replace(/[^\d]/g, '');
            
            // 빈 문자열이면 그대로 유지
            if (numbersOnly === '') {
                input.value = '';
                this.calculateTotal();
                return;
            }
            
            // 숫자로 변환
            let numericValue = parseInt(numbersOnly, 10);
            
            // 유효한 숫자인지 확인
            if (!isNaN(numericValue) && numericValue > 0) {
                // 천단위 콤마 추가
                let formattedValue = numericValue.toLocaleString('ko-KR');
                
                // 값이 실제로 변경된 경우에만 업데이트 (무한 루프 방지)
                if (input.value !== formattedValue) {
                    input.value = formattedValue;
                }
            }
        } catch (error) {
            console.error('가격 포맷팅 오류:', error);
            // 오류 발생시 원래 값 유지
        }
        
        // 총액 계산
        this.calculateTotal();
    }

    // 총액 계산
    calculateTotal() {
        const quantityStr = document.getElementById('quantity').value.replace(/[^\d]/g, '');
        const quantity = parseInt(quantityStr) || 0;
        const priceStr = document.getElementById('price').value.replace(/[^\d]/g, '');
        const price = parseInt(priceStr) || 0;
        const total = quantity * price;
        
        document.getElementById('totalAmount').textContent = total.toLocaleString() + '원';
    }

    // 주문 저장 (Firebase 자동 저장 + localStorage 백업)
    async saveOrder() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            this.showLoading(true);
            
            const order = {
                id: this.currentEditId || this.generateOrderId(),
                ...formData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 로컬 배열 업데이트
            if (this.currentEditId) {
                // 수정
                const index = this.orders.findIndex(o => o.id === this.currentEditId);
                if (index !== -1) {
                    this.orders[index] = { ...this.orders[index], ...order };
                }
            } else {
                // 새 주문 추가
                this.orders.push(order);
            }

            // 1. localStorage에 즉시 저장 (항상 실행)
            localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
            
            // 2. Firebase에 자동 저장 시도
            let firebaseSaved = false;
            if (this.isFirebaseEnabled) {
                firebaseSaved = await this.saveToFirebase(order);
            }
            
            // 3. 결과에 따른 피드백
            const action = this.currentEditId ? '수정' : '저장';
            
            if (firebaseSaved) {
                this.showNotification(`✅ 주문이 클라우드에 ${action}되었습니다!\n🌐 모든 팀원이 실시간으로 확인 가능합니다.`, 'success');
            } else if (this.isFirebaseEnabled) {
                this.showNotification(`⚠️ 주문이 로컬에 ${action}되었습니다.\n📶 네트워크 연결을 확인해주세요.`, 'warning');
            } else {
                this.showNotification(`💾 주문이 ${action}되었습니다!\n⚙️ 클라우드 저장을 설정하면 팀원과 자동 공유됩니다.`, 'success');
            }
            
            this.updateUI();
            this.resetForm();
            this.switchScreen('orderList');
            
            // currentEditId 리셋
            this.currentEditId = null;
            
        } catch (error) {
            console.error('주문 저장 오류:', error);
            const action = this.currentEditId ? '수정' : '저장';
            this.showNotification(`❌ 주문 ${action} 실패: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 선택적 파일 저장 옵션 표시
    showFileSaveOption() {
        const notification = document.createElement('div');
        notification.className = 'file-save-notification';
        notification.innerHTML = `
            <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 1rem; margin: 1rem; position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="display: flex; align-items: center; margin-bottom: 0.8rem;">
                    <i class="fas fa-check-circle" style="color: #4caf50; margin-right: 0.5rem;"></i>
                    <strong>저장 완료!</strong>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #666;">
                    데이터가 앱에 저장되었습니다.<br>
                    파일로도 백업하시겠습니까?
                </p>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="saveFileBtn" 
                            style="flex: 1; padding: 0.5rem; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 0.9rem;">
                        💾 파일 저장
                    </button>
                    <button id="skipFileBtn" 
                            style="flex: 1; padding: 0.5rem; background: #ddd; color: #666; border: none; border-radius: 4px; font-size: 0.9rem;">
                        나중에
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 이벤트 리스너 추가
        notification.querySelector('#saveFileBtn').addEventListener('click', () => {
            this.saveToFile();
            notification.remove();
        });
        
        notification.querySelector('#skipFileBtn').addEventListener('click', () => {
            notification.remove();
        });
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // 폼 데이터 가져오기
    getFormData() {
        return {
            manager: document.getElementById('manager').value,
            seller: document.getElementById('seller').value,
            destination: document.getElementById('destination').value,
            category: document.getElementById('category').value,
            product: document.getElementById('product').value,
            quantity: parseInt(document.getElementById('quantity').value.replace(/[^\d]/g, '')),
            price: parseInt(document.getElementById('price').value.replace(/[^\d]/g, '')),
            deliveryDate: document.getElementById('deliveryDate').value,
            deliveryTime: document.getElementById('deliveryTime').value,
            total: parseInt(document.getElementById('quantity').value.replace(/[^\d]/g, '') || 0) * 
                   parseInt(document.getElementById('price').value.replace(/[^\d]/g, '') || 0)
        };
    }

    // 폼 유효성 검사
    validateForm(data) {
        const required = ['manager', 'seller', 'destination', 'category', 'product', 'quantity', 'price', 'deliveryDate', 'deliveryTime'];
        
        for (let field of required) {
            if (!data[field]) {
                this.showNotification(`${this.getFieldName(field)}을(를) 입력해주세요.`, 'error');
                return false;
            }
        }

        if (data.quantity <= 0) {
            this.showNotification('수량은 1 이상이어야 합니다.', 'error');
            return false;
        }

        if (data.price <= 0) {
            this.showNotification('단가는 0원보다 커야 합니다.', 'error');
            return false;
        }

        // 날짜 검증 추가
        const deliveryDate = new Date(data.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (deliveryDate < today) {
            if (!confirm('과거 날짜로 주문을 생성하시겠습니까?')) {
                return false;
            }
        }

        // 중복 주문 검증
        if (!this.currentEditId && this.isDuplicateOrder(data)) {
            if (!confirm('유사한 주문이 이미 존재합니다. 계속 진행하시겠습니까?')) {
                return false;
            }
        }

        return true;
    }

    // 중복 주문 검증
    isDuplicateOrder(newOrder) {
        return this.orders.some(order => 
            order.seller === newOrder.seller &&
            order.product === newOrder.product &&
            order.deliveryDate === newOrder.deliveryDate &&
            Math.abs(order.quantity - newOrder.quantity) < 10 // 수량 차이가 10 이하
        );
    }

    // 필드명 한글 변환
    getFieldName(field) {
        const names = {
            manager: '담당자',
            seller: '판매처',
            destination: '도착지',
            category: '분류',
            product: '품목',
            quantity: '수량',
            price: '단가',
            deliveryDate: '도착일',
            deliveryTime: '도착시간'
        };
        return names[field] || field;
    }

    // 폼 초기화
    resetForm() {
        document.getElementById('manager').value = localStorage.getItem('defaultManager') || '';
        document.getElementById('seller').innerHTML = '<option value="">판매처 선택</option>';
        document.getElementById('destination').innerHTML = '<option value="">도착지 선택</option>';
        document.getElementById('category').value = '';
        document.getElementById('product').innerHTML = '<option value="">품목 선택</option>';
        document.getElementById('quantity').value = '';
        document.getElementById('price').value = '';
        document.getElementById('deliveryDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('deliveryTime').value = '';
        document.getElementById('totalAmount').textContent = '0원';
        
        if (localStorage.getItem('defaultManager')) {
            this.updateSellers();
        }
        
        this.currentEditId = null;
    }

    // 주문 목록 표시
    displayOrders() {
        const searchBox = document.getElementById('searchBox');
        const searchTerm = searchBox ? searchBox.value : '';
        
        if (searchTerm.trim()) {
            this.performSearch(searchTerm);
            return;
        }

        const container = document.getElementById('orderListContainer');
        container.innerHTML = '';

        if (this.orders.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">저장된 주문이 없습니다.</div>';
            this.updateOrderStats([], []);
            return;
        }

        const filteredOrders = this.getFilteredOrders();
        
        // 통계 업데이트
        this.updateOrderStats(this.orders, filteredOrders);
        
        if (filteredOrders.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">조건에 맞는 주문이 없습니다.</div>';
            return;
        }
        
        filteredOrders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            container.appendChild(orderElement);
        });
    }

    // 주문 통계 업데이트
    updateOrderStats(allOrders, filteredOrders) {
        const today = new Date().toISOString().split('T')[0];
        
        // 전체 통계 계산
        const totalOrders = allOrders.length;
        const todayOrders = allOrders.filter(order => order.deliveryDate === today).length;
        const futureOrders = allOrders.filter(order => order.deliveryDate > today).length;
        
        // DOM 업데이트
        const totalElement = document.getElementById('totalOrders');
        const todayElement = document.getElementById('todayOrders');
        const futureElement = document.getElementById('futureOrders');
        
        if (totalElement) totalElement.textContent = totalOrders;
        if (todayElement) todayElement.textContent = todayOrders;
        if (futureElement) futureElement.textContent = futureOrders;
    }

    // 필터링된 주문 가져오기
    getFilteredOrders() {
        return this.applyFiltersToOrders(this.orders);
    }

    // 주문 요소 생성
    createOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.dataset.orderId = order.id;
        
        // 과거 주문인지 확인
        const today = new Date().toISOString().split('T')[0];
        const isPastOrder = order.deliveryDate < today;
        if (isPastOrder) {
            div.classList.add('past-order');
        }
        
        const deliveryDateTime = order.deliveryTime ? 
            `${this.formatDateRelative(order.deliveryDate)} ${order.deliveryTime}` :
            this.formatDateRelative(order.deliveryDate);
        
        div.innerHTML = `
            <div class="order-header">
                <span class="order-id">#${order.id.substr(-6)}</span>
                <span class="order-date">${deliveryDateTime}</span>
            </div>
            <div class="order-details">
                <div><strong>${order.manager}</strong> | ${order.seller}</div>
                <div>${order.category} - ${order.product}</div>
                <div>수량: ${order.quantity.toLocaleString()}개 | 단가: ${order.price.toLocaleString()}원</div>
            </div>
            <div class="order-amount">총액: ${order.total.toLocaleString()}원</div>
        `;

        div.addEventListener('click', () => {
            document.querySelectorAll('.order-item').forEach(item => item.classList.remove('selected'));
            div.classList.add('selected');
        });

        return div;
    }

    // 수정용 주문 목록 표시
    displayEditOrders() {
        const container = document.getElementById('editFormContainer');
        
        if (this.orders.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">수정할 주문이 없습니다.</div>';
            return;
        }

        const currentUser = localStorage.getItem('defaultManager');
        let userOrders = this.orders;
        
        if (currentUser) {
            userOrders = this.orders.filter(order => order.manager === currentUser);
        }

        // 당일 이후 주문만 기본 표시 (수정 가능한 주문)
        const today = new Date().toISOString().split('T')[0];
        const futureOrders = userOrders.filter(order => order.deliveryDate >= today);
        const pastOrders = userOrders.filter(order => order.deliveryDate < today);

        // 미래 주문 정렬 (가까운 날짜순)
        futureOrders.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
        // 과거 주문 정렬 (최근순)
        pastOrders.sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate));

        container.innerHTML = `
            <div class="form-group">
                <label>수정할 주문 선택</label>
                <select id="editOrderSelect">
                    <option value="">주문 선택</option>
                    ${futureOrders.length > 0 ? 
                        `<optgroup label="📅 당일~미래 주문 (${futureOrders.length}건)">` +
                        futureOrders.map(order => {
                            const deliveryInfo = order.deliveryTime ? 
                                `${this.formatDateRelative(order.deliveryDate)} ${order.deliveryTime}` :
                                this.formatDateRelative(order.deliveryDate);
                            return `<option value="${order.id}">#${order.id.substr(-6)} - ${order.seller} (${deliveryInfo})</option>`;
                        }).join('') +
                        '</optgroup>'
                        : ''
                    }
                    ${pastOrders.length > 0 ? 
                        `<optgroup label="📋 과거 주문 (${pastOrders.length}건)">` +
                        pastOrders.map(order => {
                            const deliveryInfo = order.deliveryTime ? 
                                `${this.formatDateRelative(order.deliveryDate)} ${order.deliveryTime}` :
                                this.formatDateRelative(order.deliveryDate);
                            return `<option value="${order.id}">#${order.id.substr(-6)} - ${order.seller} (${deliveryInfo})</option>`;
                        }).join('') +
                        '</optgroup>'
                        : ''
                    }
                </select>
            </div>
            <div class="edit-notice" style="background: #e3f2fd; padding: 0.8rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem; color: #1976d2;">
                <i class="fas fa-info-circle"></i> 당일~미래 주문은 자유롭게 수정 가능하며, 과거 주문은 특별한 경우에만 수정하세요.
            </div>
            <div class="button-group">
                <button type="button" id="loadEditOrderBtn" class="btn btn-primary">
                    <i class="fas fa-edit"></i> 수정하기
                </button>
                <button type="button" id="deleteOrderBtn" class="btn btn-danger">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            </div>
        `;

        // 이벤트 리스너 추가
        document.getElementById('loadEditOrderBtn').addEventListener('click', () => {
            const orderId = document.getElementById('editOrderSelect').value;
            if (orderId) {
                this.loadOrderForEdit(orderId);
            } else {
                this.showNotification('수정할 주문을 선택해주세요.', 'warning');
            }
        });

        document.getElementById('deleteOrderBtn').addEventListener('click', () => {
            const orderId = document.getElementById('editOrderSelect').value;
            if (orderId) {
                this.deleteOrder(orderId);
            } else {
                this.showNotification('삭제할 주문을 선택해주세요.', 'warning');
            }
        });
    }

    // 날짜를 상대적으로 표시하는 헬퍼 메서드
    formatDateRelative(dateString) {
        const today = new Date();
        const targetDate = new Date(dateString);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `${dateString} (오늘)`;
        } else if (diffDays === 1) {
            return `${dateString} (내일)`;
        } else if (diffDays === -1) {
            return `${dateString} (어제)`;
        } else if (diffDays > 1) {
            return `${dateString} (${diffDays}일 후)`;
        } else {
            return `${dateString} (${Math.abs(diffDays)}일 전)`;
        }
    }

    // 주문 수정을 위해 로드
    loadOrderForEdit(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        this.currentEditId = orderId;
        
        // 폼에 데이터 입력
        document.getElementById('manager').value = order.manager;
        this.updateSellers();
        
        setTimeout(() => {
            document.getElementById('seller').value = order.seller;
            this.updateDestinations();
            
            setTimeout(() => {
                document.getElementById('destination').value = order.destination;
                document.getElementById('category').value = order.category;
                this.updateProducts();
                
                setTimeout(() => {
                    document.getElementById('product').value = order.product;
                    document.getElementById('quantity').value = order.quantity.toLocaleString();
                    document.getElementById('price').value = order.price.toLocaleString();
                    document.getElementById('deliveryDate').value = order.deliveryDate;
                    document.getElementById('deliveryTime').value = order.deliveryTime;
                    this.calculateTotal();
                }, 100);
            }, 100);
        }, 100);

        // 주문 입력 화면으로 이동
        this.switchScreen('orderForm');
        this.showNotification('주문을 불러왔습니다. 수정 후 저장해주세요.', 'success');
    }

    // 주문 삭제 (localStorage 사용)
    async deleteOrder(orderId) {
        if (confirm('정말로 이 주문을 삭제하시겠습니까?')) {
            try {
                this.showLoading(true);
                
                // localStorage에서 주문 삭제
                this.orders = this.orders.filter(order => order.id !== orderId);
                localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
                
                this.updateUI();
                this.displayEditOrders();
                this.showNotification('주문이 삭제되었습니다.', 'success');
            } catch (error) {
                this.showNotification(`삭제 실패: ${error.message}`, 'error');
            } finally {
                this.showLoading(false);
            }
        }
    }

    // 필터 적용
    filterOrders() {
        this.displayOrders();
    }

    // 고급 검색 기능
    searchOrders(searchTerm) {
        if (!searchTerm) return this.orders;
        
        const term = searchTerm.toLowerCase();
        return this.orders.filter(order => 
            order.manager?.toLowerCase().includes(term) ||
            order.seller?.toLowerCase().includes(term) ||
            order.destination?.toLowerCase().includes(term) ||
            order.category?.toLowerCase().includes(term) ||
            order.product?.toLowerCase().includes(term) ||
            order.id?.toLowerCase().includes(term)
        );
    }

    // 통계 분석
    generateStatistics() {
        try {
            const stats = {
                총주문수: this.orders.length,
                총매출: this.orders.reduce((sum, order) => sum + (order.total || 0), 0),
                평균주문금액: 0,
                담당자별통계: {},
                카테고리별통계: {},
                월별통계: {},
                최다주문판매처: null,
                최고매출판매처: null
            };

            if (stats.총주문수 > 0) {
                stats.평균주문금액 = Math.round(stats.총매출 / stats.총주문수);

                // 담당자별 통계
                this.orders.forEach(order => {
                    const manager = order.manager || '알 수 없음';
                    if (!stats.담당자별통계[manager]) {
                        stats.담당자별통계[manager] = { 주문수: 0, 매출: 0 };
                    }
                    stats.담당자별통계[manager].주문수++;
                    stats.담당자별통계[manager].매출 += order.total || 0;
                });

                // 카테고리별 통계
                this.orders.forEach(order => {
                    const category = order.category || '기타';
                    if (!stats.카테고리별통계[category]) {
                        stats.카테고리별통계[category] = { 주문수: 0, 매출: 0 };
                    }
                    stats.카테고리별통계[category].주문수++;
                    stats.카테고리별통계[category].매출 += order.total || 0;
                });

                // 월별 통계
                this.orders.forEach(order => {
                    if (order.deliveryDate) {
                        const month = order.deliveryDate.substring(0, 7); // YYYY-MM
                        if (!stats.월별통계[month]) {
                            stats.월별통계[month] = { 주문수: 0, 매출: 0 };
                        }
                        stats.월별통계[month].주문수++;
                        stats.월별통계[month].매출 += order.total || 0;
                    }
                });

                // 판매처별 분석
                const sellerStats = {};
                this.orders.forEach(order => {
                    const seller = order.seller || '알 수 없음';
                    if (!sellerStats[seller]) {
                        sellerStats[seller] = { 주문수: 0, 매출: 0 };
                    }
                    sellerStats[seller].주문수++;
                    sellerStats[seller].매출 += order.total || 0;
                });

                // 최다 주문 판매처
                stats.최다주문판매처 = Object.entries(sellerStats)
                    .sort((a, b) => b[1].주문수 - a[1].주문수)[0];

                // 최고 매출 판매처
                stats.최고매출판매처 = Object.entries(sellerStats)
                    .sort((a, b) => b[1].매출 - a[1].매출)[0];
            }

            return stats;
        } catch (error) {
            console.error('통계 생성 중 오류:', error);
            this.showNotification('통계 생성에 실패했습니다.', 'error');
            return null;
        }
    }

    // 통계 보고서 표시
    showStatistics() {
        const stats = this.generateStatistics();
        if (!stats) return;

        const statsHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 800px; margin: 2rem auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-bottom: 1.5rem;">📊 주문 통계 분석</h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #1976d2;">총 주문수</h3>
                        <p style="font-size: 2rem; font-weight: bold; margin: 0.5rem 0; color: #1976d2;">${stats.총주문수}</p>
                    </div>
                    <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #4caf50;">총 매출</h3>
                        <p style="font-size: 2rem; font-weight: bold; margin: 0.5rem 0; color: #4caf50;">${stats.총매출.toLocaleString()}원</p>
                    </div>
                    <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #ff9800;">평균 주문금액</h3>
                        <p style="font-size: 2rem; font-weight: bold; margin: 0.5rem 0; color: #ff9800;">${stats.평균주문금액.toLocaleString()}원</p>
                    </div>
                </div>

                ${stats.최다주문판매처 ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #333;">🏆 최다 주문 판매처</h3>
                    <p style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 0;">
                        <strong>${stats.최다주문판매처[0]}</strong> - ${stats.최다주문판매처[1].주문수}건
                    </p>
                </div>
                ` : ''}

                ${stats.최고매출판매처 ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #333;">💰 최고 매출 판매처</h3>
                    <p style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 0;">
                        <strong>${stats.최고매출판매처[0]}</strong> - ${stats.최고매출판매처[1].매출.toLocaleString()}원
                    </p>
                </div>
                ` : ''}

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="padding: 0.8rem 2rem; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">
                        닫기
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;';
        overlay.innerHTML = statsHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // 향상된 에러 처리
    handleError(error, context = '작업') {
        console.error(`${context} 중 오류:`, error);
        
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 오류 로그 저장
        this.saveErrorLog(errorInfo);

        // 사용자에게 친근한 메시지 표시
        const userMessage = this.getUserFriendlyErrorMessage(error);
        this.showNotification(userMessage, 'error');
    }

    // 사용자 친화적 오류 메시지
    getUserFriendlyErrorMessage(error) {
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            return '네트워크 연결을 확인해주세요.';
        } else if (error.name === 'QuotaExceededError') {
            return '저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.';
        } else if (error.message.includes('JSON')) {
            return '데이터 형식에 오류가 있습니다.';
        } else {
            return '예상치 못한 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.';
        }
    }

    // 오류 로그 저장
    saveErrorLog(errorInfo) {
        try {
            const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
            errorLogs.push(errorInfo);
            
            // 최대 50개의 로그만 유지
            if (errorLogs.length > 50) {
                errorLogs.shift();
            }
            
            localStorage.setItem('error_logs', JSON.stringify(errorLogs));
        } catch (e) {
            console.error('오류 로그 저장 실패:', e);
        }
    }

    // 설정 업데이트
    updateSettings() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        document.getElementById('orderCount').textContent = this.orders.length;
        
        const defaultManager = localStorage.getItem('defaultManager');
        if (defaultManager) {
            document.getElementById('defaultManager').value = defaultManager;
        }
        
        // 로그인 사용자 표시
        const loginUserElement = document.getElementById('loginUser');
        if (loginUserElement && this.currentUser) {
            loginUserElement.textContent = this.currentUser.name;
        }

        // Firebase 연결 상태 표시
        const settingsInfo = document.querySelector('.settings-info');
        if (settingsInfo) {
            // 기존 Firebase 상태 정보 제거
            const existingFirebaseInfo = settingsInfo.querySelector('.firebase-status');
            if (existingFirebaseInfo) {
                existingFirebaseInfo.remove();
            }

            // 새로운 Firebase 상태 정보 추가
            const firebaseStatusDiv = document.createElement('div');
            firebaseStatusDiv.className = 'firebase-status';
            firebaseStatusDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; border-radius: 8px; border-left: 4px solid;';
            
            if (this.isFirebaseEnabled) {
                firebaseStatusDiv.style.backgroundColor = '#e8f5e8';
                firebaseStatusDiv.style.borderLeftColor = '#4caf50';
                firebaseStatusDiv.innerHTML = `
                    <h4 style="color: #2e7d32; margin: 0 0 0.5rem 0;">🔥 Firebase 클라우드 저장</h4>
                    <p style="color: #333; margin: 0; font-size: 0.9rem;">✅ 연결됨 - 저장 버튼 클릭시 자동으로 클라우드에 저장됩니다</p>
                    <div style="margin-top: 1rem; display: grid; gap: 0.5rem;">
                        <button onclick="app.showTeamSetupCompleteGuide()" 
                                style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer;">
                            🎉 팀 설정 완료 안내보기
                        </button>
                        <button onclick="app.exportFirebaseConfig()" 
                                style="padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer;">
                            📤 설정 파일 내보내기
                        </button>
                        <button onclick="window.open('https://console.firebase.google.com/', '_blank')" 
                                style="padding: 0.5rem 1rem; background: #ff6f00; color: white; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer;">
                            🚀 Firebase 콘솔 열기
                        </button>
                    </div>
                `;
            } else {
                firebaseStatusDiv.style.backgroundColor = '#fff3e0';
                firebaseStatusDiv.style.borderLeftColor = '#ff9800';
                firebaseStatusDiv.innerHTML = `
                    <h4 style="color: #f57c00; margin: 0 0 0.5rem 0;">🔥 Firebase 클라우드 저장</h4>
                    <p style="color: #333; margin: 0; font-size: 0.9rem;">⚠️ 설정되지 않음 - 로컬 저장만 사용중입니다</p>
                    <div style="margin-top: 1rem; display: grid; gap: 0.5rem;">
                        <button onclick="app.showFirebaseSetupGuide()" 
                                style="padding: 0.5rem 1rem; background: #ff9800; color: white; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer;">
                            🚀 Firebase 설정하기
                        </button>
                        <button onclick="app.showTeamSetupGuide()" 
                                style="padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer;">
                            👥 팀 설정 공유 받기
                        </button>
                    </div>
                `;
            }
            
            settingsInfo.appendChild(firebaseStatusDiv);
        }
    }

    // 데이터 내보내기
    exportData() {
        const data = {
            orders: this.orders,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `주문데이터_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('데이터가 성공적으로 내보내졌습니다.', 'success');
    }

    // 모든 데이터 삭제 (Firebase + localStorage)
    async clearAllData() {
        if (confirm('정말로 모든 주문 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            try {
                this.showLoading(true);
                
                // Firebase에서 데이터 삭제
                if (this.isFirebaseEnabled) {
                    await this.firebaseDb.ref('orders').remove();
                    console.log('Firebase 데이터 삭제 완료');
                }
                
                // 로컬 데이터 삭제
                this.orders = [];
                localStorage.removeItem('trkorea_orders');
                
                this.updateUI();
                this.displayOrders();
                this.showNotification('✅ 모든 주문 데이터가 삭제되었습니다.', 'success');
            } catch (error) {
                console.error('데이터 삭제 오류:', error);
                this.showNotification('❌ 데이터 삭제 중 오류가 발생했습니다.', 'error');
            } finally {
                this.showLoading(false);
            }
        }
    }

    // localStorage와 Firebase에서 주문 로드
    async loadOrders() {
        try {
            // 먼저 localStorage에서 로드
            let localStorageOrders = [];
            const ordersData = localStorage.getItem('trkorea_orders');
            if (ordersData) {
                localStorageOrders = JSON.parse(ordersData);
                console.log(`localStorage에서 ${localStorageOrders.length}개의 주문을 로드했습니다.`);
            }

            this.orders = localStorageOrders;
            
            // Firebase가 활성화되어 있으면 동기화는 initFirebase에서 처리됨
            console.log(`총 ${this.orders.length}개의 주문을 로드했습니다.`);
        } catch (error) {
            console.error('주문 로드 실패:', error);
            this.orders = [];
        }
    }

    // UI 업데이트
    updateUI() {
        // 네비게이션 배지 업데이트 등 필요시 구현
    }

    // 로딩 스피너 표시/숨김
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.add('show');
        } else {
            spinner.classList.remove('show');
        }
    }

    // 알림 표시
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        text.textContent = message;
        notification.className = `notification show ${type}`;
        
        // 3초 후 자동 숨김
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // PWA 설정
    setupPWA() {
        // Service Worker 등록
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        }

        // PWA 설치 프롬프트
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 설치 버튼 표시 (필요시)
        });
    }

    // 파일에서 주문 가져오기 (수동)
    async loadOrdersFromFile() {
        try {
            if ('showOpenFilePicker' in window) {
                // File System Access API 사용
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const file = await fileHandle.getFile();
                const contents = await file.text();
                const fileOrders = JSON.parse(contents);
                
                // 기존 주문과 합치기 (중복 제거)
                const existingIds = this.orders.map(order => order.id);
                const newOrders = fileOrders.filter(order => !existingIds.includes(order.id));
                
                this.orders = [...this.orders, ...newOrders];
                
                // 시간순으로 정렬 (최신순)
                this.orders.sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));
                
                localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
                
                // Firebase에도 동기화
                if (this.isFirebaseEnabled) {
                    for (const order of newOrders) {
                        await this.saveToFirebase(order);
                    }
                }
                
                this.displayOrders();
                this.showNotification(`${newOrders.length}개의 새로운 주문을 가져왔습니다.`, 'success');
            } else {
                // File input 방식 사용
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const contents = await file.text();
                        const fileOrders = JSON.parse(contents);
                        
                        const existingIds = this.orders.map(order => order.id);
                        const newOrders = fileOrders.filter(order => !existingIds.includes(order.id));
                        
                        this.orders = [...this.orders, ...newOrders];
                        
                        // 시간순으로 정렬 (최신순)
                        this.orders.sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));
                        
                        localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
                        
                        // Firebase에도 동기화
                        if (this.isFirebaseEnabled) {
                            for (const order of newOrders) {
                                await this.saveToFirebase(order);
                            }
                        }
                        
                        this.displayOrders();
                        this.showNotification(`${newOrders.length}개의 새로운 주문을 가져왔습니다.`, 'success');
                    }
                };
                input.click();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showNotification(`파일 로드 실패: ${error.message}`, 'error');
            }
        }
    }

    // 고유 ID 생성
    generateOrderId() {
        return 'order_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // order_list.json 파일에 저장 (OneDrive 경로 지원)
    async saveToFile() {
        try {
            const fileName = 'order_list.json';
            
            // 시간순으로 정렬된 데이터 준비
            const sortedOrders = [...this.orders].sort((a, b) => 
                new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt)
            );
            
            // File System Access API 지원 확인 (Chrome 계열)
            if ('showSaveFilePicker' in window) {
                try {
                    // OneDrive 경로 제안
                    const suggestedPath = 'OneDrive - 주식회사 티알코리아\\00_OFFICE_AUTOMATION\\117_ORDER_AUTOMATION\\github';
                    
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        startIn: 'documents', // 문서 폴더에서 시작
                        types: [{
                            description: 'JSON files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(sortedOrders, null, 2));
                    await writable.close();
                    
                    // 성공 메시지에 경로 안내 추가
                    this.showNotification(`✅ ${sortedOrders.length}개 주문이 시간순으로 저장되었습니다!\n💡 경로: ${suggestedPath}\\${fileName}`, 'success');
                    console.log('주문 데이터가 시간순으로 order_list.json에 저장되었습니다.');
                    
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('File System Access API 저장 실패:', error);
                        // 실패 시 다운로드 방식으로 대체
                        this.downloadOrderListWithGuide();
                    }
                }
            } else {
                // File System Access API 미지원 시 다운로드 방식 사용
                this.downloadOrderListWithGuide();
            }
        } catch (error) {
            console.error('파일 저장 중 오류:', error);
            // 오류 발생 시에도 다운로드 방식으로 대체
            this.downloadOrderListWithGuide();
        }
    }

    // 경로 안내가 포함된 다운로드 (시간순 정렬)
    downloadOrderListWithGuide() {
        try {
            // 시간순으로 정렬
            const sortedOrders = [...this.orders].sort((a, b) => 
                new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt)
            );
            
            const dataStr = JSON.stringify(sortedOrders, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'order_list.json';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.showNotification(`✅ ${sortedOrders.length}개 주문이 시간순으로 다운로드되었습니다!`, 'success');
            console.log('order_list.json 파일이 시간순으로 다운로드되었습니다.');
            
        } catch (error) {
            console.error('파일 다운로드 실패:', error);
            this.showNotification('❌ 파일 저장에 실패했습니다.', 'error');
        }
    }

    // 오프라인 상태 처리
    setupOfflineHandling() {
        // 오프라인 상태 변경 감지
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('🌐 네트워크 연결됨 - Firebase 동기화를 시작합니다', 'success');
            this.syncData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('📱 오프라인 모드 - 로컬 저장만 사용됩니다', 'warning');
        });
    }

    // 데이터 백업 설정
    setupAutoBackup() {
        // 자동 백업 설정 (localStorage만)
        this.autoBackupInterval = setInterval(() => {
            this.autoBackupToLocalStorage();
        }, 1000 * 60 * 30); // 30분마다 백업
    }

    // 자동 localStorage 백업
    autoBackupToLocalStorage() {
        try {
            if (this.orders.length > 0) {
                // 시간순으로 정렬된 백업
                const sortedOrders = [...this.orders].sort((a, b) => 
                    new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt)
                );
                
                localStorage.setItem('trkorea_orders_backup', JSON.stringify({
                    orders: sortedOrders,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                }));
                localStorage.setItem('lastBackupTime', new Date().toISOString());
                console.log('⏰ 자동 백업 완료 (시간순 정렬):', new Date().toLocaleString());
            }
        } catch (error) {
            console.error('자동 백업 중 오류:', error);
            if (error.name === 'QuotaExceededError') {
                this.showNotification('💾 저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'warning');
            }
        }
    }

    // 데이터 동기화
    async syncData() {
        if (this.isOnline && this.isFirebaseEnabled) {
            try {
                await this.syncWithFirebase();
                this.showNotification('🔄 데이터가 성공적으로 동기화되었습니다.', 'success');
            } catch (error) {
                console.error('데이터 동기화 실패:', error);
                this.showNotification('❌ 데이터 동기화에 실패했습니다.', 'error');
            }
        } else {
            this.showNotification('📱 오프라인 상태로 인해 동기화할 수 없습니다', 'warning');
        }
    }

    // 데이터 무결성 검사
    validateDataIntegrity() {
        try {
            const issues = [];
            
            this.orders.forEach((order, index) => {
                // 필수 필드 검사
                const requiredFields = ['id', 'manager', 'seller', 'destination', 'category', 'product', 'quantity', 'price', 'deliveryDate'];
                requiredFields.forEach(field => {
                    if (!order[field]) {
                        issues.push(`주문 ${index + 1}: ${field} 필드 누락`);
                    }
                });

                // 데이터 타입 검사
                if (order.quantity && (typeof order.quantity !== 'number' || order.quantity <= 0)) {
                    issues.push(`주문 ${index + 1}: 잘못된 수량 값`);
                }

                if (order.price && (typeof order.price !== 'number' || order.price <= 0)) {
                    issues.push(`주문 ${index + 1}: 잘못된 가격 값`);
                }

                // 날짜 형식 검사
                if (order.deliveryDate && isNaN(new Date(order.deliveryDate))) {
                    issues.push(`주문 ${index + 1}: 잘못된 날짜 형식`);
                }
            });

            if (issues.length > 0) {
                console.warn('데이터 무결성 문제 발견:', issues);
                return { valid: false, issues };
            }

            return { valid: true, issues: [] };
        } catch (error) {
            console.error('데이터 무결성 검사 중 오류:', error);
            return { valid: false, issues: ['데이터 검사 중 오류 발생'] };
        }
    }

    // 손상된 데이터 복구
    repairData() {
        try {
            let repairedCount = 0;
            
            this.orders = this.orders.filter(order => {
                // 최소 필수 정보가 있는 주문만 유지
                if (order.id && order.seller && order.product) {
                    // 누락된 필드 기본값으로 복구
                    if (!order.manager) order.manager = '알 수 없음';
                    if (!order.destination) order.destination = '미지정';
                    if (!order.category) order.category = '기타';
                    if (!order.quantity || order.quantity <= 0) order.quantity = 1;
                    if (!order.price || order.price <= 0) order.price = 0;
                    if (!order.deliveryDate) order.deliveryDate = new Date().toISOString().split('T')[0];
                    if (!order.total) order.total = order.quantity * order.price;
                    if (!order.createdAt) order.createdAt = new Date().toISOString();
                    if (!order.updatedAt) order.updatedAt = new Date().toISOString();
                    
                    repairedCount++;
                    return true;
                }
                return false;
            });

            if (repairedCount > 0) {
                // 시간순으로 정렬
                this.orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                localStorage.setItem('trkorea_orders', JSON.stringify(this.orders));
                this.showNotification(`${repairedCount}개의 주문 데이터가 복구되었습니다.`, 'success');
            }

            return repairedCount;
        } catch (error) {
            console.error('데이터 복구 중 오류:', error);
            this.showNotification('데이터 복구에 실패했습니다.', 'error');
            return 0;
        }
    }

    // 검색 수행
    performSearch(searchTerm) {
        const container = document.getElementById('orderListContainer');
        container.innerHTML = '';

        if (this.orders.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">저장된 주문이 없습니다.</div>';
            return;
        }

        let filteredOrders = this.orders;

        // 검색어 필터링
        if (searchTerm.trim()) {
            filteredOrders = this.searchOrders(searchTerm.trim());
        }

        // 기존 필터 적용
        filteredOrders = this.applyFiltersToOrders(filteredOrders);
        
        // 통계 업데이트
        this.updateOrderStats(this.orders, filteredOrders);
        
        if (filteredOrders.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">검색 결과가 없습니다.</div>';
            return;
        }
        
        filteredOrders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            container.appendChild(orderElement);
        });
    }

    // 필터 적용 (검색과 분리)
    applyFiltersToOrders(orders) {
        let filtered = [...orders];
        
        const dateFilter = document.getElementById('filterDate')?.value;
        const managerFilter = document.getElementById('filterManager')?.value;
        const showPastOrders = document.getElementById('showPastOrders')?.checked || false;
        
        // 기본적으로 당일~미래 주문만 표시 (과거 주문 숨김)
        if (!dateFilter && !showPastOrders) {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(order => order.deliveryDate >= today);
        }
        
        if (managerFilter) {
            filtered = filtered.filter(order => order.manager === managerFilter);
        }

        // 특정 날짜가 선택된 경우 해당 날짜만 표시
        if (dateFilter) {
            filtered = filtered.filter(order => order.deliveryDate === dateFilter);
        }

        // 시간순으로 정렬 (입력 시간순 - 최신순)
        filtered.sort((a, b) => {
            // 먼저 배송일로 정렬 (가까운 날짜순)
            const dateCompare = new Date(a.deliveryDate) - new Date(b.deliveryDate);
            if (dateCompare !== 0) return dateCompare;
            
            // 같은 배송일이면 입력 시간순으로 정렬 (최신 입력순)
            return new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt);
        });

        return filtered;
    }

    // Firebase 설정 도우미 표시
    showFirebaseSetupGuide() {
        const setupHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #ff6f00; margin-bottom: 1.5rem; text-align: center;">
                    🔥 Firebase 클라우드 자동 저장 설정
                </h2>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4caf50;">
                    <h3 style="color: #2e7d32; margin-bottom: 1rem;">✨ 설정 후 얻는 혜택</h3>
                    <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                        <li><strong>🚀 버튼 한 번 클릭으로 자동 저장</strong> - 추가 액션 없음</li>
                        <li><strong>🔄 실시간 팀 동기화</strong> - 모든 영업사원 데이터 자동 합쳐짐</li>
                        <li><strong>📊 내근직 실시간 대시보드</strong> - Firebase 콘솔에서 즉시 확인</li>
                        <li><strong>💾 완벽한 백업</strong> - Google 클라우드 인프라로 안전</li>
                        <li><strong>💰 비용 효율적</strong> - 무료 플랜으로도 충분 (1GB 저장공간)</li>
                    </ul>
                </div>

                <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ff9800;">
                    <h3 style="color: #f57c00; margin-bottom: 1rem;">📋 5분 만에 설정 완료</h3>
                    <ol style="color: #333; line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                        <li><strong>Firebase 콘솔 접속</strong> - Google 계정으로 로그인</li>
                        <li><strong>새 프로젝트 생성</strong> - "주문시스템" 등의 이름 입력</li>
                        <li><strong>Realtime Database 활성화</strong> - 테스트 모드로 시작</li>
                        <li><strong>웹앱 추가</strong> - 앱 닉네임 입력</li>
                        <li><strong>설정 복사</strong> - firebaseConfig 객체 복사</li>
                        <li><strong>config 파일 생성</strong> - firebase-config.json 업로드</li>
                    </ol>
                </div>

                <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #2196f3;">
                    <h3 style="color: #1976d2; margin-bottom: 1rem;">💡 config 파일 예시</h3>
                    <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; color: #333; margin: 0;"><code>{
  "apiKey": "AIzaSyB...",
  "authDomain": "your-project.firebaseapp.com",
  "databaseURL": "https://your-project-default-rtdb.firebaseio.com/",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}</code></pre>
                    <p style="color: #666; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                        ⚠️ 이 파일을 <code>firebase-config.json</code> 이름으로 저장하여 웹서버에 업로드하세요.
                    </p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <button onclick="window.open('https://console.firebase.google.com/', '_blank')" 
                            style="padding: 1rem; background: #ff6f00; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        🚀 Firebase 콘솔 열기
                    </button>
                    <button onclick="app.downloadConfigTemplate()" 
                            style="padding: 1rem; background: #2196f3; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        📄 config 템플릿 다운로드
                    </button>
                    <button onclick="app.testFirebaseConnection()" 
                            style="padding: 1rem; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        🔍 연결 상태 확인
                    </button>
                </div>

                <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #f44336;">
                    <h3 style="color: #c62828; margin-bottom: 1rem;">❓ 자주 묻는 질문</h3>
                    <div style="color: #333; line-height: 1.6;">
                        <p><strong>Q: 한 번만 설정하면 되나요?</strong></p>
                        <p style="margin-left: 1rem; color: #666;">A: 네! 최초 1회만 설정하면 영구적으로 사용 가능합니다.</p>
                        
                        <p><strong>Q: 비용이 얼마나 드나요?</strong></p>
                        <p style="margin-left: 1rem; color: #666;">A: 무료 플랜(1GB)으로도 충분하며, 유료 전환시 월 약 33,000원입니다.</p>
                        
                        <p><strong>Q: 데이터 안전한가요?</strong></p>
                        <p style="margin-left: 1rem; color: #666;">A: Google 클라우드 인프라를 사용하므로 매우 안전합니다.</p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                            style="padding: 0.8rem 2rem; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
                        ← 나중에 설정
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = setupHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // Firebase config 템플릿 다운로드
    downloadConfigTemplate() {
        const template = {
            "apiKey": "YOUR_API_KEY_HERE",
            "authDomain": "your-project.firebaseapp.com",
            "databaseURL": "https://your-project-default-rtdb.firebaseio.com/",
            "projectId": "your-project",
            "storageBucket": "your-project.appspot.com",
            "messagingSenderId": "123456789",
            "appId": "1:123456789:web:abcdef"
        };

        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'firebase-config.json';
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('📄 템플릿이 다운로드되었습니다! Firebase 콘솔에서 실제 값으로 수정해주세요.', 'success');
    }

    // Firebase 연결 상태 테스트
    testFirebaseConnection() {
        console.log('🔍 Firebase 연결 상태 테스트 시작...');
        console.log('🔍 isFirebaseEnabled:', this.isFirebaseEnabled);
        console.log('🔍 firebaseConfig:', this.firebaseConfig);
        console.log('🔍 firebaseDb:', this.firebaseDb);
        
        if (this.isFirebaseEnabled && this.firebaseDb) {
            console.log('✅ Firebase 완전 연결됨!');
            this.showNotification('✅ Firebase 연결됨! 저장 버튼 클릭시 자동으로 클라우드에 저장됩니다.', 'success');
        } else if (this.firebaseConfig) {
            console.log('⚠️ Firebase 설정은 있지만 데이터베이스 초기화 실패');
            this.showNotification('⚠️ Firebase 설정은 로드되었지만 데이터베이스 연결에 실패했습니다.', 'warning');
        } else {
            console.log('❌ Firebase 설정이 없음');
            this.showNotification('⚠️ Firebase 설정이 필요합니다. firebase-config.json 파일을 업로드해주세요.', 'warning');
        }
    }

    // 팀 설정 공유 가이드 표시
    showTeamSetupGuide() {
        const teamGuideHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #4caf50; margin-bottom: 1.5rem; text-align: center;">
                    👥 팀 전체 Firebase 설정 공유 방법
                </h2>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4caf50;">
                    <h3 style="color: #2e7d32; margin-bottom: 1rem;">🎯 목표: 한 번 설정으로 모든 팀원 자동 공유</h3>
                    <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                        <li><strong>✅ 모든 영업사원이 같은 Firebase 사용</strong></li>
                        <li><strong>⏰ 입력 데이터가 시간순으로 자동 정렬</strong></li>
                        <li><strong>🔄 실시간으로 모든 팀원 데이터 동기화</strong></li>
                        <li><strong>💾 저장 버튼 한 번으로 팀 전체 공유</strong></li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                            style="padding: 0.8rem 2rem; background: #2196f3; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        완료
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = teamGuideHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // Firebase 설정 파일 내보내기
    exportFirebaseConfig() {
        if (!this.firebaseConfig) {
            this.showNotification('⚠️ Firebase 설정이 로드되지 않았습니다. 먼저 Firebase를 설정해주세요.', 'warning');
            return;
        }

        try {
            const configBlob = new Blob([JSON.stringify(this.firebaseConfig, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(configBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'firebase-config.json';
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('✅ Firebase 설정 파일이 다운로드되었습니다!\n📁 이 파일을 팀원들과 공유하세요.', 'success');
            
            // 추가 안내 표시
            setTimeout(() => {
                this.showConfigSharingTips();
            }, 2000);
        } catch (error) {
            console.error('설정 파일 내보내기 실패:', error);
            this.showNotification('❌ 설정 파일 내보내기에 실패했습니다.', 'error');
        }
    }

    // 설정 공유 팁 표시
    showConfigSharingTips() {
        const tipsHTML = `
            <div style="background: white; padding: 1.5rem; border-radius: 8px; max-width: 400px; margin: 2rem auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2); position: fixed; top: 20%; left: 50%; transform: translateX(-50%); z-index: 10001;">
                <h3 style="color: #4caf50; margin-bottom: 1rem; text-align: center;">📤 설정 파일 공유 팁</h3>
                <div style="color: #333; line-height: 1.6; font-size: 0.9rem;">
                    <p><strong>1. GitHub 업로드:</strong></p>
                    <p style="margin-left: 1rem; color: #666;">저장소에 firebase-config.json 업로드</p>
                    
                    <p><strong>2. 팀원에게 전달:</strong></p>
                    <p style="margin-left: 1rem; color: #666;">카카오톡/이메일로 파일 전송</p>
                    
                    <p><strong>3. 결과:</strong></p>
                    <p style="margin-left: 1rem; color: #4caf50; font-weight: 600;">모든 팀원이 같은 데이터베이스 사용! 🎉</p>
                </div>
                <div style="text-align: center; margin-top: 1rem;">
                    <button onclick="this.parentElement.remove()" 
                            style="padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        확인
                    </button>
                </div>
            </div>
        `;

        const tipOverlay = document.createElement('div');
        tipOverlay.innerHTML = tipsHTML;
        document.body.appendChild(tipOverlay);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (tipOverlay.parentElement) {
                tipOverlay.remove();
            }
        }, 5000);
    }

    // 팀 설정 완료 안내 표시
    showTeamSetupCompleteGuide() {
        const setupCompleteHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #4caf50; margin-bottom: 1.5rem; text-align: center;">
                    🎉 Firebase 클라우드 저장 설정 완료!
                </h2>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4caf50;">
                    <h3 style="color: #2e7d32; margin-bottom: 1rem;">✅ 현재 상태: 완벽 설정됨</h3>
                    <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                        <li><strong>🚀 자동 클라우드 저장</strong> - 저장 버튼 클릭시 즉시 팀 전체 공유</li>
                        <li><strong>🔄 실시간 동기화</strong> - 모든 영업사원 데이터가 자동으로 합쳐짐</li>
                        <li><strong>📊 내근직 대시보드</strong> - Firebase 콘솔에서 실시간 확인 가능</li>
                        <li><strong>💾 완벽한 백업</strong> - Google 클라우드에 안전 보관</li>
                    </ul>
                </div>

                <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #2196f3;">
                    <h3 style="color: #1976d2; margin-bottom: 1rem;">👥 팀원 설정 방법 (2가지 옵션)</h3>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: #1976d2; margin-bottom: 0.5rem;">옵션 1: 설정 파일 공유 (추천)</h4>
                        <ol style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            <li>아래 "설정 파일 다운로드" 버튼 클릭</li>
                            <li>다운로드된 firebase-config.json 파일을 카카오톡/이메일로 팀원에게 전송</li>
                            <li>팀원은 해당 파일을 주문시스템 폴더에 저장</li>
                            <li>완료! 팀원도 같은 데이터베이스 사용</li>
                        </ol>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: #1976d2; margin-bottom: 0.5rem;">옵션 2: GitHub 업로드 (고급)</h4>
                        <ol style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            <li>GitHub 저장소에 firebase-config.json 업로드</li>
                            <li>팀원들이 자동으로 GitHub에서 설정 다운로드</li>
                            <li>한 번 설정으로 모든 팀원 자동 연결</li>
                        </ol>
                    </div>
                </div>

                <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ff9800;">
                    <h3 style="color: #f57c00; margin-bottom: 1rem;">📊 주문 데이터 확인 및 다운로드</h3>
                    <div style="color: #333; line-height: 1.6;">
                        <p><strong>1. Firebase 콘솔에서 실시간 확인:</strong></p>
                        <p style="margin-left: 1rem; color: #666;">• Firebase 콘솔 → Realtime Database → orders 폴더</p>
                        <p style="margin-left: 1rem; color: #666;">• 모든 주문이 시간순으로 정렬되어 표시</p>
                        <p style="margin-left: 1rem; color: #666;">• 실시간으로 새 주문 추가 확인 가능</p>
                        
                        <p><strong>2. 앱에서 파일 다운로드:</strong></p>
                        <p style="margin-left: 1rem; color: #666;">• 설정 → 데이터 내보내기 버튼 클릭</p>
                        <p style="margin-left: 1rem; color: #666;">• Excel/JSON 형태로 다운로드</p>
                        
                        <p><strong>3. Firebase 콘솔에서 전체 다운로드:</strong></p>
                        <p style="margin-left: 1rem; color: #666;">• Database → Export JSON 클릭</p>
                        <p style="margin-left: 1rem; color: #666;">• 모든 데이터를 JSON 파일로 다운로드</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <button onclick="app.exportFirebaseConfig()" 
                            style="padding: 1rem; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        📤 설정 파일 다운로드
                    </button>
                    <button onclick="window.open('https://console.firebase.google.com/', '_blank')" 
                            style="padding: 1rem; background: #ff6f00; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        🚀 Firebase 콘솔 열기
                    </button>
                    <button onclick="app.generateTeamQRCode()" 
                            style="padding: 1rem; background: #2196f3; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">
                        📱 QR코드 생성
                    </button>
                </div>

                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #333; margin-bottom: 1rem;">💡 사용 팁</h3>
                    <div style="color: #666; line-height: 1.6; font-size: 0.9rem;">
                        <p>• <strong>실시간 확인:</strong> Firebase 콘솔을 북마크해두면 언제든 실시간 주문 현황 확인 가능</p>
                        <p>• <strong>정기 백업:</strong> 월 1회 정도 Firebase 콘솔에서 전체 데이터 다운로드 권장</p>
                        <p>• <strong>비용 관리:</strong> 무료 플랜(1GB)으로도 충분하며, 사용량은 Firebase 콘솔에서 확인</p>
                        <p>• <strong>문제 해결:</strong> 팀원 연결 문제시 설정 파일 재전송으로 해결</p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                            style="padding: 0.8rem 2rem; background: #2196f3; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
                        ✅ 완료
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = setupCompleteHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // QR 코드 생성 (팀원 공유용)
    generateTeamQRCode() {
        if (!this.firebaseConfig) {
            this.showNotification('⚠️ Firebase 설정이 없습니다.', 'warning');
            return;
        }

        // 간단한 텍스트 기반 QR 코드 정보
        const configText = JSON.stringify(this.firebaseConfig, null, 2);
        const qrCodeHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #2196f3; margin-bottom: 1.5rem; text-align: center;">📱 팀원 공유용 정보</h2>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h3 style="color: #333; margin-bottom: 0.5rem;">🔗 GitHub 저장소 URL</h3>
                    <p style="color: #666; font-size: 0.9rem; word-break: break-all; margin: 0;">
                        https://github.com/SugarFairyTR/tr-order-system
                    </p>
                </div>

                <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h3 style="color: #1976d2; margin-bottom: 0.5rem;">📋 팀원 설정 방법</h3>
                    <ol style="color: #333; font-size: 0.9rem; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                        <li>위 GitHub 저장소 접속</li>
                        <li>Code → Download ZIP 클릭</li>
                        <li>압축 해제 후 firebase-config.json 파일 확인</li>
                        <li>주문시스템 실행시 자동 연결</li>
                    </ol>
                </div>

                <div style="text-align: center; margin-top: 1.5rem;">
                    <button onclick="navigator.clipboard.writeText('https://github.com/SugarFairyTR/tr-order-system').then(() => alert('✅ URL이 복사되었습니다!'))" 
                            style="padding: 0.8rem 1.5rem; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
                        📋 URL 복사
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="padding: 0.8rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        닫기
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10001; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = qrCodeHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // 수량과 가격 입력 필드 강제 설정 함수
    enforceNumberInputSettings() {
        try {
            const quantityInput = document.getElementById('quantity');
            const priceInput = document.getElementById('price');
            
            // 수량 필드 강제 설정
            if (quantityInput) {
                quantityInput.type = 'text';
                quantityInput.inputMode = 'numeric';
                quantityInput.autocomplete = 'off';
                quantityInput.spellcheck = false;
                quantityInput.setAttribute('data-format', 'number');
                quantityInput.className = 'number-format-input';
                
                // 기존 값이 있으면 포맷팅 적용
                if (quantityInput.value) {
                    this.formatQuantity({ target: quantityInput });
                }
                
                console.log('✅ 수량 입력 필드 설정 완료');
            }
            
            // 가격 필드 강제 설정
            if (priceInput) {
                priceInput.type = 'text';
                priceInput.inputMode = 'numeric';
                priceInput.autocomplete = 'off';
                priceInput.spellcheck = false;
                priceInput.setAttribute('data-format', 'number');
                priceInput.className = 'number-format-input';
                
                // 기존 값이 있으면 포맷팅 적용
                if (priceInput.value) {
                    this.formatPrice({ target: priceInput });
                }
                
                console.log('✅ 가격 입력 필드 설정 완료');
            }
            
            // 5초 후 한 번 더 체크 (브라우저 자동 완성 등에 의한 변경 방지)
            setTimeout(() => {
                if (quantityInput) {
                    quantityInput.type = 'text';
                    quantityInput.inputMode = 'numeric';
                }
                if (priceInput) {
                    priceInput.type = 'text';
                    priceInput.inputMode = 'numeric';
                }
                console.log('🔄 수량/가격 필드 재확인 완료');
            }, 5000);
            
        } catch (error) {
            console.error('입력 필드 설정 중 오류:', error);
        }
    }

    // 하단 네비게이션 완전 재구성
    setupBottomNavigation() {
        console.log('🔧 하단 네비게이션 설정 시작...');
        
        // 기존 이벤트 리스너 완전 제거
        this.removeAllNavigationListeners();
        
        // 네비게이션 버튼 찾기
        const navButtons = document.querySelectorAll('.nav-btn');
        console.log(`📱 네비게이션 버튼 ${navButtons.length}개 발견`);
        
        navButtons.forEach((button, index) => {
            const targetScreen = button.getAttribute('data-screen');
            console.log(`🔗 네비게이션 버튼 ${index + 1}: ${targetScreen}`);
            
            // 각 버튼에 고유 식별자 추가
            button.setAttribute('data-nav-index', index);
            button.setAttribute('data-original-screen', targetScreen);
            
            // 클릭 이벤트 추가 (이벤트 위임 방식)
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 실제 클릭된 버튼의 data-screen 속성 다시 확인
                const actualTarget = e.currentTarget.getAttribute('data-screen');
                console.log(`🎯 실제 클릭된 버튼: ${actualTarget}`);
                
                this.handleNavigationClick(actualTarget, e.currentTarget);
            });
            
            // 터치 이벤트도 추가 (모바일 대응)
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const actualTarget = e.currentTarget.getAttribute('data-screen');
                console.log(`👆 터치 이벤트: ${actualTarget}`);
                this.handleNavigationClick(actualTarget, e.currentTarget);
            });
        });
        
        console.log('✅ 하단 네비게이션 설정 완료');
    }

    // 네비게이션 클릭 처리 로직 개선
    handleNavigationClick(targetScreen, clickedButton) {
        console.log(`🔄 네비게이션 클릭 처리: ${targetScreen}`);
        
        // 현재 활성 화면 정확히 찾기
        const currentActiveScreen = document.querySelector('.screen.active');
        const currentScreenId = currentActiveScreen ? currentActiveScreen.id : null;
        
        console.log(`📍 현재 화면: ${currentScreenId} → 이동할 화면: ${targetScreen}`);
        
        // 같은 화면이면 무시 (정확한 비교)
        if (currentScreenId === targetScreen) {
            console.log('ℹ️ 이미 현재 화면입니다. 이동하지 않습니다.');
            return;
        }
        
        // 버튼 비활성화 체크
        if (clickedButton && clickedButton.disabled) {
            console.log('⚠️ 버튼이 비활성화되어 있습니다.');
            return;
        }
        
        // 화면 전환 실행
        this.switchToScreen(targetScreen, clickedButton);
    }

    // 화면 전환 로직 완전 재작성
    switchToScreen(screenId, clickedButton) {
        try {
            console.log(`🔄 화면 전환 시작: ${screenId}`);
            
            // 1. 모든 화면 비활성화
            const allScreens = document.querySelectorAll('.screen');
            allScreens.forEach(screen => {
                screen.classList.remove('active');
                screen.style.display = 'none';
                console.log(`📴 화면 비활성화: ${screen.id}`);
            });
            
            // 2. 모든 네비게이션 버튼 비활성화
            const allNavButtons = document.querySelectorAll('.nav-btn');
            allNavButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = '';
                btn.style.color = '';
            });
            
            // 3. 대상 화면 활성화
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.style.display = 'block';
                targetScreen.classList.add('active');
                console.log(`✅ 화면 활성화됨: ${screenId}`);
                
                // 4. 클릭된 네비게이션 버튼 활성화
                if (clickedButton) {
                    clickedButton.classList.add('active');
                    clickedButton.style.background = '#2196F3';
                    clickedButton.style.color = 'white';
                    console.log(`🎯 네비게이션 버튼 활성화: ${screenId}`);
                }
                
                // 5. 화면별 초기화 실행
                this.initializeScreen(screenId);
                
                console.log(`✅ 화면 전환 완료: ${screenId}`);
                
            } else {
                console.error(`❌ 화면을 찾을 수 없습니다: ${screenId}`);
                this.showNotification('화면을 찾을 수 없습니다', 'error');
            }
            
        } catch (error) {
            console.error('❌ 화면 전환 중 오류:', error);
            this.showNotification('화면 전환 중 오류가 발생했습니다', 'error');
        }
    }

    // 화면별 초기화 로직 개선
    initializeScreen(screenId) {
        console.log(`🔧 화면 초기화: ${screenId}`);
        
        switch(screenId) {
            case 'orderForm':
                console.log('📝 주문입력 화면 초기화');
                this.resetOrderForm();
                break;
                
            case 'orderList':
                console.log('📋 목록보기 화면 초기화');
                this.loadOrderList();
                break;
                
            case 'orderEdit':
                console.log('✏️ 주문수정 화면 초기화');
                this.loadEditableOrders();
                break;
                
            case 'settings':
                console.log('⚙️ 설정 화면 초기화');
                this.showSettings();
                break;
                
            default:
                console.log(`❓ 알 수 없는 화면: ${screenId}`);
        }
    }

    // 기존 이벤트 리스너 완전 제거
    removeAllNavigationListeners() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            // 기존 이벤트 리스너 제거를 위해 복제본으로 교체
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        console.log('🧹 기존 네비게이션 이벤트 리스너 제거 완료');
    }

    // 주문수정 화면 로드 개선
    loadEditableOrders() {
        console.log('📝 주문수정 화면 로드 시작...');
        
        try {
            const editScreen = document.getElementById('orderEdit');
            if (!editScreen) {
                console.error('❌ 주문수정 화면을 찾을 수 없습니다');
                return;
            }
            
            // 화면 내용 설정
            editScreen.innerHTML = `
                <div class="edit-container">
                    <div class="edit-header">
                        <h2>📝 주문 수정</h2>
                        <button onclick="app.refreshEditList()" class="btn btn-primary btn-sm">
                            🔄 새로고침
                        </button>
                    </div>
                    
                    <div class="edit-filters">
                        <select id="editStatusFilter" onchange="app.filterEditOrders()">
                            <option value="">전체 상태</option>
                            <option value="신규">신규</option>
                            <option value="처리중">처리중</option>
                            <option value="완료">완료</option>
                        </select>
                        
                        <select id="editUserFilter" onchange="app.filterEditOrders()">
                            <option value="">전체 담당자</option>
                        </select>
                    </div>
                    
                    <div id="editOrdersList" class="edit-orders-list">
                        <div class="loading-message">
                            <p>📥 주문 데이터를 불러오는 중...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // 담당자 필터 옵션 추가
            this.populateEditUserFilter();
            
            // 주문 목록 로드
            this.refreshEditList();
            
            console.log('✅ 주문수정 화면 로드 완료');
            
        } catch (error) {
            console.error('❌ 주문수정 화면 로드 실패:', error);
            this.showNotification('주문수정 화면 로드 중 오류가 발생했습니다', 'error');
        }
    }

    // 담당자 필터 옵션 추가
    populateEditUserFilter() {
        const userFilter = document.getElementById('editUserFilter');
        if (!userFilter) return;
        
        // 현재 사용자 목록 가져오기
        const users = this.userConfig?.users || {};
        
        Object.keys(users).forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = userName;
            userFilter.appendChild(option);
        });
    }

    // 주문 목록 새로고침
    refreshEditList() {
        console.log('🔄 주문 목록 새로고침');
        
        const listContainer = document.getElementById('editOrdersList');
        if (!listContainer) return;
        
        // 로딩 표시
        listContainer.innerHTML = '<div class="loading-message"><p>📥 데이터 로드 중...</p></div>';
        
        // 실제 데이터 로드 (비동기)
        setTimeout(() => {
            this.displayEditableOrders();
        }, 500);
    }

    // 수정 가능한 주문 목록 표시
    displayEditableOrders() {
        const listContainer = document.getElementById('editOrdersList');
        if (!listContainer) return;
        
        const orders = this.orders || [];
        
        if (orders.length === 0) {
            listContainer.innerHTML = `
                <div class="no-orders">
                    <p>📭 수정할 주문이 없습니다.</p>
                    <button onclick="app.switchToScreen('orderForm')" class="btn btn-primary">
                        ➕ 새 주문 작성
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '<div class="orders-grid">';
        
        orders.forEach((order, index) => {
            html += `
                <div class="order-card" data-order-index="${index}">
                    <div class="order-header">
                        <span class="order-number">${order.주문번호}</span>
                        <span class="order-status status-${order.상태 || '신규'}">${order.상태 || '신규'}</span>
                    </div>
                    <div class="order-info">
                        <p><strong>담당자:</strong> ${order.담당자}</p>
                        <p><strong>거래처:</strong> ${order.거래처}</p>
                        <p><strong>품목:</strong> ${order.품목}</p>
                        <p><strong>수량:</strong> ${order.수량}</p>
                        <p><strong>단가:</strong> ${order.단가?.toLocaleString()}원</p>
                    </div>
                    <div class="order-actions">
                        <button onclick="app.editOrder(${index})" class="btn btn-primary btn-sm">
                            ✏️ 수정
                        </button>
                        <button onclick="app.deleteOrder(${index})" class="btn btn-danger btn-sm">
                            🗑️ 삭제
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        listContainer.innerHTML = html;
    }

    // 세션 복구 함수 추가
    restoreSession() {
        try {
            const savedUser = sessionStorage.getItem('currentUser');
            const loginTime = sessionStorage.getItem('loginTime');
            
            if (savedUser && loginTime) {
                const user = JSON.parse(savedUser);
                const timeDiff = Date.now() - parseInt(loginTime);
                
                // 1시간 이내면 세션 복구
                if (timeDiff < 3600000) {
                    console.log('🔄 세션 복구 중...');
                    this.currentUser = user;
                    this.isLoggedIn = true;
                    this.hideLoginScreen();
                    this.showMainApp();
                    this.updateUserDisplay();
                    this.setupSessionTimeout();
                    console.log('✅ 세션 복구 완료');
                    return true;
                }
            }
            
            // 세션이 없거나 만료된 경우
            this.showLoginScreen();
            return false;
            
        } catch (error) {
            console.error('❌ 세션 복구 실패:', error);
            this.showLoginScreen();
            return false;
        }
    }

    // UI 초기화 함수 추가
    initializeUI() {
        // 로딩 화면 숨기기
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // 현재 날짜 설정
        const arrivalDateInput = document.getElementById('arrivalDate');
        if (arrivalDateInput) {
            const today = new Date().toISOString().split('T')[0];
            arrivalDateInput.value = today;
        }
        
        console.log('✅ UI 초기화 완료');
    }

    // 전역 에러 핸들러 추가
    setupGlobalErrorHandlers() {
        // 처리되지 않은 Promise 거부
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ 처리되지 않은 Promise 거부:', event.reason);
            this.showNotification('예상치 못한 오류가 발생했습니다', 'error');
            event.preventDefault();
        });
        
        // 일반 JavaScript 오류
        window.addEventListener('error', (event) => {
            console.error('❌ JavaScript 오류:', event.error);
            this.showNotification('스크립트 오류가 발생했습니다', 'error');
        });
        
        console.log('✅ 전역 에러 핸들러 설정 완료');
    }
}

// 앱 초기화 (파일 맨 아래)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 DOM 로드 완료, 앱 초기화 시작...');
    
    try {
        // OrderApp 인스턴스 생성
        window.orderApp = new OrderApp();
        
        // 전역 에러 핸들러 설정
        window.orderApp.setupGlobalErrorHandlers();
        
        // 앱 초기화
        await window.orderApp.init();
        
        console.log('🎉 앱 초기화 완료!');
        
    } catch (error) {
        console.error('❌ 앱 초기화 실패:', error);
        
        // 긴급 알림 표시
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: #f44336; color: white; padding: 2rem; border-radius: 8px; 
                        text-align: center; z-index: 10000;">
                <h3>앱 초기화 실패</h3>
                <p>페이지를 새로고침해주세요</p>
                <button onclick="location.reload()" style="background: white; color: #f44336; 
                        border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                    새로고침
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});

// 버튼 클릭 테스트용 글로벌 함수
function testConnection() {
    console.log('🔍 글로벌 테스트 함수 호출됨');
    if (window.app && window.app.testFirebaseConnection) {
        window.app.testFirebaseConnection();
    } else {
        console.error('❌ app 객체를 찾을 수 없습니다');
        alert('앱이 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
    }
}

// 가격 입력 시 천단위 콤마 자동 추가 함수
function addCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 네비게이션 시스템 완전 재구성
class NavigationManager {
    constructor(app) {
        this.app = app;
        this.currentScreen = 'orderForm';
        this.isTransitioning = false;
        this.navigationButtons = new Map();
        this.init();
    }
    
    init() {
        console.log('🔧 네비게이션 매니저 초기화...');
        this.setupNavigation();
        this.bindEvents();
    }
    
    // 네비게이션 설정
    setupNavigation() {
        // 기존 이벤트 완전 제거
        this.removeAllEvents();
        
        // 네비게이션 버튼 매핑
        const buttons = document.querySelectorAll('.nav-btn');
        console.log(`📱 네비게이션 버튼 ${buttons.length}개 발견`);
        
        buttons.forEach((button, index) => {
            const screenId = button.getAttribute('data-screen');
            if (screenId) {
                this.navigationButtons.set(screenId, button);
                console.log(`🔗 버튼 매핑: ${screenId} → 버튼 ${index}`);
            }
        });
    }
    
    // 모든 이벤트 제거
    removeAllEvents() {
        const buttons = document.querySelectorAll('.nav-btn');
        buttons.forEach(button => {
            // 기존 이벤트 리스너 완전 제거
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        console.log('🧹 모든 네비게이션 이벤트 제거 완료');
    }
    
    // 이벤트 바인딩
    bindEvents() {
        // 이벤트 위임 방식 사용
        const bottomNav = document.querySelector('.bottom-nav');
        if (!bottomNav) {
            console.error('❌ 하단 네비게이션을 찾을 수 없습니다');
            return;
        }
        
        // 단일 이벤트 리스너로 모든 클릭 처리
        bottomNav.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-btn');
            if (button) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetScreen = button.getAttribute('data-screen');
                console.log(`🎯 네비게이션 클릭: ${targetScreen}`);
                
                this.navigateTo(targetScreen);
            }
        });
        
        console.log('✅ 이벤트 위임 방식으로 네비게이션 설정 완료');
    }
    
    // 화면 이동 (메인 함수)
    navigateTo(targetScreen) {
        // 전환 중이면 무시
        if (this.isTransitioning) {
            console.log('⏳ 화면 전환 중입니다. 잠시 기다려주세요.');
            return;
        }
        
        // 현재 화면과 같으면 무시
        if (this.currentScreen === targetScreen) {
            console.log(`ℹ️ 이미 ${targetScreen} 화면입니다.`);
            return;
        }
        
        console.log(`🔄 화면 전환: ${this.currentScreen} → ${targetScreen}`);
        
        this.isTransitioning = true;
        
        try {
            // 1. 모든 화면 숨기기
            this.hideAllScreens();
            
            // 2. 모든 버튼 비활성화
            this.deactivateAllButtons();
            
            // 3. 대상 화면 표시
            this.showScreen(targetScreen);
            
            // 4. 대상 버튼 활성화
            this.activateButton(targetScreen);
            
            // 5. 화면별 초기화
            this.initializeScreen(targetScreen);
            
            // 6. 현재 화면 업데이트
            this.currentScreen = targetScreen;
            
            console.log(`✅ 화면 전환 완료: ${targetScreen}`);
            
        } catch (error) {
            console.error('❌ 화면 전환 실패:', error);
            this.app.showNotification('화면 전환 중 오류가 발생했습니다', 'error');
        } finally {
            // 전환 완료 후 잠금 해제
            setTimeout(() => {
                this.isTransitioning = false;
            }, 300);
        }
    }
    
    // 모든 화면 숨기기
    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
            screen.style.opacity = '0';
        });
    }
    
    // 모든 버튼 비활성화
    deactivateAllButtons() {
        this.navigationButtons.forEach(button => {
            button.classList.remove('active');
            button.style.background = '';
            button.style.color = '';
            button.style.opacity = '0.7';
        });
    }
    
    // 화면 표시
    showScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.style.display = 'block';
            screen.style.opacity = '1';
            screen.classList.add('active');
            console.log(`📺 화면 표시: ${screenId}`);
        } else {
            console.error(`❌ 화면을 찾을 수 없습니다: ${screenId}`);
        }
    }
    
    // 버튼 활성화
    activateButton(screenId) {
        const button = this.navigationButtons.get(screenId);
        if (button) {
            button.classList.add('active');
            button.style.background = '#2196F3';
            button.style.color = 'white';
            button.style.opacity = '1';
        }
    }
    
    // 화면별 초기화
    initializeScreen(screenId) {
        console.log(`🔧 화면 초기화: ${screenId}`);
        
        switch(screenId) {
            case 'orderForm':
                this.app.initOrderForm();
                break;
            case 'orderList':
                this.app.loadOrderList();
                break;
            case 'orderEdit':
                this.app.loadEditableOrders();
                break;
            case 'settings':
                this.app.showSettings();
                break;
        }
    }
    
    // 강제 새로고침
    forceRefresh() {
        console.log('🔄 네비게이션 강제 새로고침');
        this.setupNavigation();
        this.bindEvents();
    }
}

// UserManager 클래스 정의 (OrderApp 클래스 위에 추가)
class UserManager {
    constructor(app) {  // app 매개변수 추가
        this.app = app;
        this.users = {};
        this.currentUser = null;
        console.log('👥 UserManager 초기화 완료');
    }

    // 사용자 데이터 로드
    async loadUsers() {
        try {
            console.log('📂 사용자 데이터 로드 중...');
            const response = await fetch('./user_config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const config = await response.json();
            this.users = config.users || {};
            
            console.log('✅ 사용자 데이터 로드 완료:', Object.keys(this.users));
            return true;
        } catch (error) {
            console.error('❌ 사용자 데이터 로드 실패:', error);
            return false;
        }
    }

    // 사용자 인증
    authenticateUser(username, pin) {
        console.log('🔐 사용자 인증 시도:', { username, pin: '****' });
        
        const user = this.users[username];
        if (!user) {
            console.error('❌ 사용자를 찾을 수 없음:', username);
            return null;
        }

        if (user.pin !== pin) {
            console.error('❌ PIN 불일치');
            return null;
        }

        console.log('✅ 사용자 인증 성공');
        this.currentUser = user;
        return user;
    }

    // 현재 사용자 가져오기
    getCurrentUser() {
        return this.currentUser;
    }

    // 사용자 목록 가져오기
    getUserList() {
        return Object.keys(this.users);
    }

    // 로그아웃
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('loginTime');
        console.log('👋 사용자 로그아웃 완료');
    }
}