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

    // Firebase 설정 로드
    async loadFirebaseConfig() {
        try {
            const response = await fetch('./firebase-config.json');
            if (response.ok) {
                this.firebaseConfig = await response.json();
                console.log('Firebase 설정 로드 완료');
            }
        } catch (error) {
            console.log('Firebase 설정 파일이 없습니다. 설정이 필요합니다.');
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
        // 사용자 설정 로드
        await this.loadUserConfig();
        
        // 로그인 상태 확인
        this.checkLoginStatus();
        
        // 로그인되지 않은 경우 로그인 화면 표시
        if (!this.isLoggedIn) {
            this.showLoginScreen();
            this.setupLoginEventListeners();
            return;
        }
        
        // 로그인된 경우 메인 앱 초기화
        await this.initMainApp();
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
        
        // 메인 앱 표시
        this.showMainApp();
    }

    // 사용자 설정 로드
    async loadUserConfig() {
        try {
            console.log('사용자 설정 로드 시도: ./user_config.json');
            const response = await fetch('./user_config.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: 사용자 설정 파일을 찾을 수 없습니다.`);
            }
            
            const data = await response.json();
            
            if (this.validateUserConfig(data)) {
                this.userConfig = data;
                console.log('사용자 설정 로드 성공:', {
                    사용자수: Object.keys(data.users || {}).length,
                    회사명: data.settings?.company_name || 'N/A',
                    버전: data.settings?.system_version || 'N/A'
                });
            } else {
                throw new Error('사용자 설정 파일 형식이 올바르지 않습니다.');
            }
            
        } catch (error) {
            console.error('사용자 설정 로딩 실패:', error);
            this.showNotification('사용자 설정 로딩에 실패했습니다. 기본 설정을 사용합니다.', 'warning');
            this.userConfig = this.getDefaultUserConfig();
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
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainApp').classList.add('hidden');
    }

    // 메인 앱 표시
    showMainApp() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // 사용자 이름 표시
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement && this.currentUser) {
            currentUserElement.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
        }
    }

    // 로그인 이벤트 리스너 설정
    setupLoginEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const loginPin = document.getElementById('loginPin');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        if (loginPin) {
            loginPin.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    // 로그인 처리
    async handleLogin() {
        const managerSelect = document.getElementById('loginManager');
        const pinInput = document.getElementById('loginPin');
        
        const selectedManager = managerSelect.value;
        const enteredPin = pinInput.value;

        if (!selectedManager) {
            this.showNotification('담당자를 선택해주세요.', 'error');
            return;
        }

        if (!enteredPin || enteredPin.length !== 4) {
            this.showNotification('4자리 PIN 번호를 입력해주세요.', 'error');
            return;
        }

        // PIN 확인
        const user = this.userConfig.users[selectedManager];
        if (!user || user.pin !== enteredPin) {
            this.showNotification('PIN 번호가 틀렸습니다.', 'error');
            pinInput.value = '';
            return;
        }

        // 로그인 성공
        this.currentUser = user;
        this.isLoggedIn = true;

        // 로그인 정보 저장 (세션 만료 없음)
        const loginData = {
            user: user,
            loginTime: new Date().getTime()
        };
        localStorage.setItem('trkorea_login', JSON.stringify(loginData));

        // 성공 메시지
        this.showNotification(`${user.name}님, 환영합니다!`, 'success');

        // 메인 앱 초기화
        await this.initMainApp();
    }

    // 로그아웃 처리
    handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            this.currentUser = null;
            this.isLoggedIn = false;
            localStorage.removeItem('trkorea_login');
            
            this.showNotification('로그아웃되었습니다.', 'success');
            
            // 로그인 화면으로 전환
            this.showLoginScreen();
            
            // 페이지 새로고침
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
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
        // 네비게이션
        document.querySelectorAll('.nav-btn').forEach(btn => {
            this.addEventListenerWithTracking(btn, 'click', () => this.switchScreen(btn.dataset.screen));
        });

        // 설정 버튼
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            this.addEventListenerWithTracking(settingsBtn, 'click', () => this.switchScreen('settings'));
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

        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            this.addEventListenerWithTracking(quantityInput, 'input', () => {
                this.debounce('calculateTotal', () => this.calculateTotal(), 200);
            });
        }

        const priceInput = document.getElementById('price');
        if (priceInput) {
            this.addEventListenerWithTracking(priceInput, 'input', (e) => {
                this.formatPrice(e);
                this.debounce('calculateTotal', () => this.calculateTotal(), 200);
            });
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
    }

    // 화면 전환
    switchScreen(screenName) {
        // 모든 화면 숨기기
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // 모든 네비게이션 버튼 비활성화
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 선택된 화면 표시
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            console.error(`화면을 찾을 수 없습니다: ${screenName}`);
            return;
        }

        // 해당 네비게이션 버튼 활성화 (설정 화면이 아닌 경우에만)
        if (screenName !== 'settings') {
            const navBtn = document.querySelector(`[data-screen="${screenName}"]`);
            if (navBtn) {
                navBtn.classList.add('active');
            }
        }

        // 화면별 특별 처리
        if (screenName === 'orderList') {
            this.displayOrders();
        } else if (screenName === 'orderEdit') {
            this.displayEditOrders();
        } else if (screenName === 'settings') {
            this.updateSettings();
            // 설정 화면으로 갈 때는 어떤 네비게이션 버튼도 활성화하지 않음
        }

        // 설정 화면에서 다른 화면으로 갈 때는 해당 네비게이션 버튼 활성화
        if (screenName !== 'settings') {
            const navBtn = document.querySelector(`[data-screen="${screenName}"]`);
            if (navBtn) {
                navBtn.classList.add('active');
            }
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

    // 가격 포맷팅 (천단위 콤마)
    formatPrice(event) {
        let value = event.target.value.replace(/[^\d]/g, '');
        if (value) {
            value = parseInt(value).toLocaleString();
        }
        event.target.value = value;
    }

    // 총액 계산
    calculateTotal() {
        const quantity = parseInt(document.getElementById('quantity').value) || 0;
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
            quantity: parseInt(document.getElementById('quantity').value),
            price: parseInt(document.getElementById('price').value.replace(/[^\d]/g, '')),
            deliveryDate: document.getElementById('deliveryDate').value,
            deliveryTime: document.getElementById('deliveryTime').value,
            total: parseInt(document.getElementById('quantity').value || 0) * 
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
                    document.getElementById('quantity').value = order.quantity;
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
                `;
            } else {
                firebaseStatusDiv.style.backgroundColor = '#fff3e0';
                firebaseStatusDiv.style.borderLeftColor = '#ff9800';
                firebaseStatusDiv.innerHTML = `
                    <h4 style="color: #f57c00; margin: 0 0 0.5rem 0;">🔥 Firebase 클라우드 저장</h4>
                    <p style="color: #333; margin: 0; font-size: 0.9rem;">⚠️ 설정되지 않음 - 로컬 저장만 사용중입니다</p>
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
                    await writable.write(JSON.stringify(this.orders, null, 2));
                    await writable.close();
                    
                    // 성공 메시지에 경로 안내 추가
                    this.showNotification(`✅ 파일이 저장되었습니다!\n💡 다음 경로에 저장하세요:\n${suggestedPath}\\${fileName}`, 'success');
                    console.log('주문 데이터가 order_list.json에 저장되었습니다.');
                    
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

    // 경로 안내가 포함된 다운로드
    downloadOrderListWithGuide() {
        try {
            const dataStr = JSON.stringify(this.orders, null, 2);
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
            
            this.showNotification('✅ 파일이 다운로드되었습니다!', 'success');
            console.log('order_list.json 파일이 다운로드되었습니다.');
            
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
            this.showNotification('네트워크 연결됨', 'success');
            this.syncData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('네트워크 연결 끊김', 'warning');
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
                localStorage.setItem('trkorea_orders_backup', JSON.stringify({
                    orders: this.orders,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                }));
                localStorage.setItem('lastBackupTime', new Date().toISOString());
                console.log('자동 백업 완료:', new Date().toLocaleString());
            }
        } catch (error) {
            console.error('자동 백업 중 오류:', error);
            if (error.name === 'QuotaExceededError') {
                this.showNotification('저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'warning');
            }
        }
    }

    // 데이터 동기화
    async syncData() {
        if (this.isOnline && this.isFirebaseEnabled) {
            try {
                await this.syncWithFirebase();
                this.showNotification('데이터가 성공적으로 동기화되었습니다.', 'success');
            } catch (error) {
                console.error('데이터 동기화 실패:', error);
                this.showNotification('데이터 동기화에 실패했습니다.', 'error');
            }
        } else {
            this.showNotification('오프라인 상태로 인해 동기화 실패', 'warning');
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
        
        const dateFilter = document.getElementById('filterDate').value;
        const managerFilter = document.getElementById('filterManager').value;
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

        // 도착일 기준으로 정렬 (가까운 날짜순)
        filtered.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));

        return filtered;
    }

    // OneDrive 자동 저장 대안 방법들 안내
    showCloudSaveAlternatives() {
        const alternativesHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 800px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #2196f3; margin-bottom: 1.5rem; text-align: center;">
                    ☁️ OneDrive 자동 저장 대안 방법들
                </h2>
                
                <div style="display: grid; gap: 1.5rem;">
                    <!-- 방법 1: 브라우저 기본 다운로드 + 수동 이동 -->
                    <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4caf50;">
                        <h3 style="color: #2e7d32; margin-bottom: 1rem;">
                            🎯 권장 방법: 다운로드 + 수동 이동
                        </h3>
                        <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            <li><strong>장점:</strong> 간단하고 안전함, 모든 브라우저 지원</li>
                            <li><strong>단점:</strong> 매번 수동으로 파일 이동 필요</li>
                            <li><strong>추천도:</strong> ⭐⭐⭐⭐⭐ (현재 최선의 방법)</li>
                        </ul>
                    </div>

                    <!-- 방법 2: PWA + File System Access API -->
                    <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #2196f3;">
                        <h3 style="color: #1976d2; margin-bottom: 1rem;">
                            🔧 개선 방법: File System Access API (Chrome)
                        </h3>
                        <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            <li><strong>장점:</strong> 한 번 설정하면 같은 위치에 저장</li>
                            <li><strong>단점:</strong> Chrome/Edge만 지원, 여전히 수동 선택 필요</li>
                            <li><strong>추천도:</strong> ⭐⭐⭐⭐ (Chrome 사용시 권장)</li>
                        </ul>
                    </div>

                    <!-- 방법 3: 웹 기반 클라우드 솔루션 -->
                    <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ff9800;">
                        <h3 style="color: #f57c00; margin-bottom: 1rem;">
                            ☁️ 웹 기반 솔루션들
                        </h3>
                        <div style="margin-bottom: 1rem;">
                            <strong>A. GitHub Repository (무료)</strong>
                            <ul style="color: #333; line-height: 1.6; margin: 0.5rem 0; padding-left: 1.5rem;">
                                <li>API를 통해 자동 커밋/푸시 가능</li>
                                <li>버전 관리와 백업이 자동으로 됨</li>
                                <li>팀원들과 실시간 동기화</li>
                                <li><strong>구현 난이도:</strong> 중간</li>
                            </ul>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>B. Firebase Realtime Database (구글)</strong>
                            <ul style="color: #333; line-height: 1.6; margin: 0.5rem 0; padding-left: 1.5rem;">
                                <li>실시간 동기화 지원</li>
                                <li>무료 할당량: 1GB 저장공간</li>
                                <li>모바일 앱도 쉽게 연동 가능</li>
                                <li><strong>구현 난이도:</strong> 쉬움</li>
                            </ul>
                        </div>
                        <div>
                            <strong>C. Supabase (오픈소스)</strong>
                            <ul style="color: #333; line-height: 1.6; margin: 0.5rem 0; padding-left: 1.5rem;">
                                <li>PostgreSQL 기반 무료 데이터베이스</li>
                                <li>실시간 구독 지원</li>
                                <li>무료 할당량: 500MB + 2GB 대역폭</li>
                                <li><strong>구현 난이도:</strong> 쉬움</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 방법 4: 전용 앱 개발 -->
                    <div style="background: #f3e5f5; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #9c27b0;">
                        <h3 style="color: #7b1fa2; margin-bottom: 1rem;">
                            📱 전용 앱 개발 (장기적 해결책)
                        </h3>
                        <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            <li><strong>Electron 앱:</strong> 웹 기술로 데스크톱 앱 제작</li>
                            <li><strong>모바일 앱:</strong> React Native, Flutter 등</li>
                            <li><strong>OneDrive API 직접 연동</strong> 가능</li>
                            <li><strong>추천도:</strong> ⭐⭐⭐ (개발 비용 높음)</li>
                        </ul>
                    </div>
                </div>

                <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem;">
                    <h3 style="color: #c62828; margin-bottom: 1rem;">⚠️ 브라우저 보안 제한 사항</h3>
                    <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                        <li>웹 앱은 사용자 동의 없이 파일을 저장할 수 없음</li>
                        <li>특정 폴더에 직접 접근하는 것은 불가능</li>
                        <li>이는 사용자 보안을 위한 필수 제한사항</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="padding: 0.8rem 2rem; background: #2196f3; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
                        💡 이해했습니다
                    </button>
                    <button onclick="app.showGitHubImplementation()" 
                            style="padding: 0.8rem 2rem; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        🚀 GitHub 연동 방법 보기
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = alternativesHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // GitHub 자동 저장 구현 방법 안내
    showGitHubImplementation() {
        const githubHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; margin: 2rem auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="color: #24292e; margin-bottom: 1.5rem; text-align: center;">
                    <i class="fab fa-github"></i> GitHub 자동 저장 구현 방법
                </h2>
                
                <div style="background: #f6f8fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #24292e; margin-bottom: 1rem;">📋 필요한 설정</h3>
                    <ol style="color: #333; line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                        <li><strong>GitHub Repository 생성</strong> (Private 권장)</li>
                        <li><strong>Personal Access Token 발급</strong></li>
                        <li><strong>JavaScript 코드 추가</strong></li>
                        <li><strong>팀원들에게 권한 부여</strong></li>
                    </ol>
                </div>

                <div style="background: #fff5b4; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #7c4d00; margin-bottom: 1rem;">💡 GitHub API 연동 코드 예시</h3>
                    <pre style="background: #f1f3f4; padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 0.85rem; color: #333;"><code>// GitHub에 파일 저장하는 함수
async function saveToGitHub(data) {
    const token = 'ghp_your_personal_access_token';
    const repo = 'your-username/order-system';
    const path = 'order_list.json';
    
    try {
        // 기존 파일 정보 가져오기 (sha 필요)
        const getResponse = await fetch(\`https://api.github.com/repos/\${repo}/contents/\${path}\`, {
            headers: { 'Authorization': \`token \${token}\` }
        });
        
        const fileInfo = getResponse.ok ? await getResponse.json() : null;
        
        // 파일 업데이트 또는 생성
        const response = await fetch(\`https://api.github.com/repos/\${repo}/contents/\${path}\`, {
            method: 'PUT',
            headers: {
                'Authorization': \`token \${token}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: \`주문 데이터 업데이트 - \${new Date().toLocaleString()}\`,
                content: btoa(JSON.stringify(data, null, 2)),
                sha: fileInfo?.sha // 업데이트시 필요
            })
        });
        
        if (response.ok) {
            console.log('GitHub에 성공적으로 저장됨');
            return true;
        } else {
            throw new Error('GitHub 저장 실패');
        }
    } catch (error) {
        console.error('GitHub 저장 오류:', error);
        return false;
    }
}</code></pre>
                </div>

                <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #1976d2; margin-bottom: 1rem;">🔧 구현 단계</h3>
                    <div style="display: grid; gap: 1rem;">
                        <div style="padding: 1rem; background: white; border-radius: 4px; border-left: 3px solid #2196f3;">
                            <strong>1단계: GitHub Repository 설정</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666;">
                                <li>새 Private Repository 생성</li>
                                <li>팀원들을 Collaborator로 추가</li>
                            </ul>
                        </div>
                        <div style="padding: 1rem; background: white; border-radius: 4px; border-left: 3px solid #4caf50;">
                            <strong>2단계: Personal Access Token 생성</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666;">
                                <li>GitHub Settings → Developer settings</li>
                                <li>Personal access tokens → Generate new token</li>
                                <li>repo 권한 체크하여 생성</li>
                            </ul>
                        </div>
                        <div style="padding: 1rem; background: white; border-radius: 4px; border-left: 3px solid #ff9800;">
                            <strong>3단계: 앱에 GitHub 연동 코드 추가</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666;">
                                <li>위의 코드를 app.js에 추가</li>
                                <li>저장 버튼 클릭시 GitHub API 호출</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div style="background: #f3e5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #7b1fa2; margin-bottom: 1rem;">📊 비용 및 제한</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        <div>
                            <strong style="color: #4caf50;">무료 계정</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666; font-size: 0.9rem;">
                                <li>Private repo: 무제한</li>
                                <li>API 호출: 5,000회/시간</li>
                                <li>저장 공간: 1GB</li>
                                <li>충분히 사용 가능</li>
                            </ul>
                        </div>
                        <div>
                            <strong style="color: #2196f3;">Pro 계정 ($4/월)</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666; font-size: 0.9rem;">
                                <li>API 호출: 제한 완화</li>
                                <li>저장 공간: 추가 용량</li>
                                <li>고급 기능 사용 가능</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="padding: 0.8rem 2rem; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
                        ← 뒤로
                    </button>
                    <button onclick="app.implementGitHubSave()" 
                            style="padding: 0.8rem 2rem; background: #24292e; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        🚀 GitHub 연동 활성화
                    </button>
                </div>
            </div>
        `;

        // 기존 오버레이 제거 후 새 오버레이 생성
        const existingOverlay = document.querySelector('.github-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'github-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10001; overflow-y: auto; display: flex; align-items: center; justify-content: center;';
        overlay.innerHTML = githubHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }

    // GitHub 연동 활성화 (실제 구현을 위한 준비)
    async implementGitHubSave() {
        // 여기에 실제 GitHub API 연동 코드를 구현할 수 있습니다
        alert('GitHub 연동 기능은 Personal Access Token 설정이 필요합니다.\n보안상 직접 구현이 필요한 부분입니다.');
        
        // 실제 구현시에는 환경 설정 창을 표시하여 
        // 사용자가 토큰과 저장소 정보를 입력하도록 할 수 있습니다
    }
}

// 앱 초기화
let app; // 전역 변수로 선언
document.addEventListener('DOMContentLoaded', () => {
    app = new OrderApp(); // 전역 변수에 할당
});

// 가격 입력 시 천단위 콤마 자동 추가 함수
function addCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
} 