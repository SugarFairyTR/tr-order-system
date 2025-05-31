// 🚀 티알코리아 주문시스템 V2.0 - 재작성
// 📅 작성일: 2025년 1월
// 👨‍💻 목표: 단순하고 강력한 웹앱

class OrderSystemApp {
    constructor() {
        // 🔧 기본 설정
        this.currentUser = null;
        this.orders = [];
        this.database = null;
        this.users = {};
        
        // 🎯 초기화
        this.init();
    }

    // 🚀 앱 초기화 (개선된 버전)
    async init() {
        console.log('🚀 티알코리아 주문시스템 V2.0 초기화 시작...');
        
        try {
            // 1️⃣ 기본 설정
            this.showLoadingSpinner();
            
            // 2️⃣ 사용자 설정 로드 (먼저)
            await this.loadUserConfig();
            
            // 3️⃣ 데이터베이스 로드
            await this.loadDatabase();
            
            // 4️⃣ Firebase 초기화 (선택사항)
            if (this.isFirebaseConfigured()) {
                await this.initializeFirebase();
            }
            
            // 5️⃣ 이벤트 리스너 설정 (DOM 로드 후)
            this.setupEventListeners();
            
            // 6️⃣ 반응형 디자인 초기 체크
            this.checkResponsiveDesign();
            
            // 7️⃣ PWA 설정
            this.registerServiceWorker();
            
            // 📱 반응형 디자인 초기화 (중요!)
            this.checkResponsiveDesign();
            
            // 📱 윈도우 리사이즈 이벤트 등록
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.checkResponsiveDesign();
                }, 250); // 디바운싱으로 성능 최적화
            });
            
            // 📱 방향 전환 이벤트
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.checkResponsiveDesign();
                }, 500);
            });
            
            this.hideLoadingSpinner();
            console.log('✅ 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.hideLoadingSpinner();
            this.showNotification('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
        }
    }

    // 📁 사용자 설정 로드 (개선된 버전)
    async loadUserConfig() {
        console.log('👥 사용자 설정 로드 시작...');
        
        try {
            // 🔄 여러 방법으로 user_config.json 로드 시도
            const response = await fetch('./user_config.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const userConfig = await response.json();
            
            if (!userConfig || !userConfig.users) {
                throw new Error('사용자 데이터가 올바르지 않습니다');
            }
            
            this.users = userConfig.users;
            console.log(`✅ 사용자 ${Object.keys(this.users).length}명 로드 완료`);
            
            // 🔐 로그인 옵션 업데이트
            this.populateUserSelect();
            
        } catch (error) {
            console.error('❌ 사용자 설정 로드 실패:', error);
            
            // 🚨 대체 방법: 하드코딩된 사용자 데이터 사용
            console.log('🔄 대체 사용자 데이터 로드 중...');
            this.users = this.getDefaultUsers();
            this.populateUserSelect();
            
            // 사용자에게 알림
            this.showNotification(
                '⚠️ 사용자 설정 파일을 로드할 수 없어 기본 설정을 사용합니다.\n' +
                '관리자에게 문의하세요.', 
                'warning'
            );
        }
    }

    // 🚨 기본 사용자 데이터 (대체용)
    getDefaultUsers() {
        return {
            "김정진": {
                "pin": "9736",
                "name": "김정진",
                "role": "대표이사"
            },
            "박경범": {
                "pin": "5678", 
                "name": "박경범",
                "role": "상무"
            },
            "이선화": {
                "pin": "0000",
                "name": "이선화",
                "role": "이사"
            },
            "신준호": {
                "pin": "3444",
                "name": "신준호", 
                "role": "과장"
            },
            "김다해": {
                "pin": "9797",
                "name": "김다해",
                "role": "대리"
            },
            "송현지": {
                "pin": "1234",
                "name": "송현지",
                "role": "사원"
            }
        };
    }

    // 🎯 이벤트 리스너 설정
    setupEventListeners() {
        console.log('🔗 이벤트 리스너 설정 시작...');
        
        // 🔐 로그인 버튼 이벤트 (누락된 부분 추가)
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 로그인 버튼 클릭됨');
                this.handleLogin();
            });
            console.log('✅ 로그인 버튼 이벤트 설정 완료');
        } else {
            console.error('❌ 로그인 버튼을 찾을 수 없습니다');
        }
        
        // 🚪 로그아웃 버튼 이벤트
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // 📝 주문 폼 제출 이벤트
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleOrderSubmit();
            });
        }
        
        // 🔄 폼 초기화 버튼
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetOrderForm();
            });
        }
        
        // 🔽 하단 네비게이션 버튼들
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screenId = btn.getAttribute('data-screen');
                if (screenId) {
                    this.switchScreen(screenId);
                }
            });
        });
        
        // 📝 엔터 키로 로그인 (사용성 개선)
        const loginPin = document.getElementById('loginPin');
        if (loginPin) {
            loginPin.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }
        
        // 📱 리사이즈 이벤트 디바운싱
        const debouncedResize = this.debounce(() => {
            this.checkResponsiveDesign();
        }, 250);
        
        window.addEventListener('resize', debouncedResize);
        
        // 🔍 검색 입력 디바운싱
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = this.debounce((e) => {
                this.filterOrders(e.target.value);
            }, 300);
            
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        console.log('✅ 모든 이벤트 리스너 설정 완료');
    }

    // 🔐 로그인 처리
    handleLogin() {
        const userSelect = document.getElementById('loginUser');
        const pinInput = document.getElementById('loginPin');
        
        // 🔍 요소 존재 확인
        if (!userSelect || !pinInput) {
            console.error('❌ 로그인 폼 요소를 찾을 수 없습니다');
            this.showNotification('로그인 폼에 문제가 있습니다. 페이지를 새로고침해주세요.', 'error');
            return;
        }
        
        const selectedUser = userSelect.value.trim();
        const enteredPin = pinInput.value.trim();
        
        console.log('🔐 로그인 시도:', { user: selectedUser, pin: '****' });
        
        // 📝 입력 검증 강화
        if (!selectedUser) {
            this.showNotification('👤 담당자를 선택해주세요', 'warning');
            userSelect.focus();
            return;
        }
        
        if (!enteredPin) {
            this.showNotification('🔑 PIN을 입력해주세요', 'warning');
            pinInput.focus();
            return;
        }
        
        if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
            this.showNotification('🔑 4자리 숫자 PIN을 입력해주세요', 'warning');
            pinInput.select();
            return;
        }
        
        // 🔍 사용자 인증
        const user = this.users[selectedUser];
        if (!user) {
            console.error('❌ 존재하지 않는 사용자:', selectedUser);
            this.showNotification('❌ 존재하지 않는 사용자입니다', 'error');
            return;
        }
        
        if (user.pin !== enteredPin) {
            console.warn('⚠️ PIN 불일치:', selectedUser);
            this.showNotification('🔑 PIN이 일치하지 않습니다', 'error');
            pinInput.select();
            return;
        }
        
        // ✅ 로그인 성공
        this.currentUser = user;
        console.log('✅ 로그인 성공:', user.name);
        
        try {
            // 🎯 메인 앱으로 전환
            this.showMainApp();
            this.showNotification(`👋 환영합니다, ${user.name}님!`, 'success');
            
            // 📝 기본 담당자 설정
            this.setDefaultManager();
            
        } catch (error) {
            console.error('❌ 메인 앱 전환 실패:', error);
            this.showNotification('앱 전환 중 오류가 발생했습니다.', 'error');
        }
    }

    // 🚪 로그아웃 처리
    handleLogout() {
        console.log('🚪 로그아웃 처리');
        
        this.currentUser = null;
        
        // 🔄 로그인 화면으로 전환
        this.showLoginScreen();
        this.showNotification('로그아웃되었습니다', 'info');
        
        // 🧹 폼 초기화
        this.resetLoginForm();
    }

    // 📱 메인 앱 표시 (수정된 버전)
    showMainApp() {
        console.log('📱 메인 앱 표시 시작...');
        
        // 🔐 로그인 화면 숨기기
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) {
            loginScreen.classList.remove('active');
            loginScreen.style.display = 'none';
            console.log('🔐 로그인 화면 숨김 완료');
        }
        
        if (mainApp) {
            mainApp.classList.add('active');
            mainApp.style.display = 'flex';
            console.log('📱 메인 앱 화면 표시 완료');
        } else {
            console.error('❌ 메인 앱 화면을 찾을 수 없습니다');
            return;
        }
        
        // 📝 사용자 정보 업데이트
        this.updateUserInfo();
        
        // 📋 주문 목록 로드
        this.loadOrderList();
        
        // 📝 폼 초기화
        this.resetOrderForm();
        
        // 🔗 연동 선택 다시 설정 (중요!)
        setTimeout(() => {
            this.setupCascadingSelects();
        }, 100);
        
        console.log('✅ 메인 앱 표시 완료');
    }

    // 🔐 로그인 화면 표시
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.add('active');
        if (mainApp) mainApp.classList.add('hidden');
        
        console.log('🔐 로그인 화면 표시 완료');
    }

    // 👤 사용자 정보 업데이트
    updateUserInfo() {
        if (!this.currentUser) return;
        
        const userNameElement = document.getElementById('currentUserName');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name;
            console.log(`👤 사용자 정보 업데이트: ${this.currentUser.name}`);
        }
    }

    // 🔄 화면 전환
    switchScreen(screenId) {
        console.log(`🔄 화면 전환: ${screenId}`);
        
        /* ✅ (수정) 모든 화면 숨기기
           기존: '.content-screen'  →  '.screen'
        */
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => screen.classList.remove('active'));

        // 네비게이션 버튼은 그대로 유지
        const allNavBtns = document.querySelectorAll('.nav-btn');
        allNavBtns.forEach(btn => btn.classList.remove('active'));

        // ✅ 대상 화면 활성화
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) targetScreen.classList.add('active');

        // ✅ 해당 네비게이션 버튼 활성화
        const targetNavBtn = document.querySelector(`[data-screen="${screenId}"]`);
        if (targetNavBtn) targetNavBtn.classList.add('active');

        // 📋 화면별 초기화
        this.initializeScreen(screenId);
    }

    // 🎯 화면별 초기화
    initializeScreen(screenId) {
        switch(screenId) {
            case 'orderFormScreen':
                console.log('📝 주문입력 화면 초기화');
                this.populateFormSelects();
                break;
                
            case 'orderListScreen':
                console.log('📋 목록보기 화면 초기화');
                this.loadOrderList();
                this.populateFilterSelects();
                break;
                
            case 'orderEditScreen':
                console.log('✏️ 주문수정 화면 초기화');
                this.loadEditableOrders();
                break;
        }
    }

    // 👥 로그인 사용자 선택 옵션 채우기 (개선된 버전)
    populateUserSelect() {
        const loginUser = document.getElementById('loginUser');
        if (!loginUser) {
            console.error('❌ 로그인 사용자 select 요소를 찾을 수 없습니다');
            return;
        }
        
        console.log('👥 사용자 선택 옵션 업데이트 시작...');
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (loginUser.children.length > 1) {
            loginUser.removeChild(loginUser.lastChild);
        }
        
        // ✅ 사용자가 있는지 확인
        if (!this.users || Object.keys(this.users).length === 0) {
            console.warn('⚠️ 사용자 데이터가 없습니다');
            
            // 기본 옵션 추가
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '사용자 데이터 없음';
            option.disabled = true;
            loginUser.appendChild(option);
            return;
        }
        
        // 👥 사용자 목록 추가
        Object.keys(this.users).forEach(userName => {
            const user = this.users[userName];
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = `${userName} (${user.role || '역할 미정'})`;
            loginUser.appendChild(option);
            
            console.log(`👤 사용자 추가: ${userName}`);
        });
        
        console.log(`✅ 사용자 선택 옵션 ${Object.keys(this.users).length}개 업데이트 완료`);
    }

    // 📝 폼 선택 옵션들 채우기
    populateFormSelects() {
        if (!this.database) {
            console.warn('⚠️ 데이터베이스가 로드되지 않았습니다');
            return;
        }
        
        console.log('📝 폼 선택 옵션 채우기 시작...');
        
        // 👤 담당자 옵션
        this.populateManagerSelect();
        
        // 🔗 연동 선택 설정 (DOM 렌더링 후 실행)
        setTimeout(() => {
            this.setupCascadingSelects();
        }, 200); // 200ms 지연으로 확실하게 DOM 준비 대기
        
        console.log('✅ 폼 선택 옵션 채우기 완료');
    }

    // 👤 담당자 선택 옵션 채우기
    populateManagerSelect() {
        const managerSelect = document.getElementById('manager');
        if (!managerSelect || !this.database || !this.database.categories) return;
        
        console.log('👤 담당자 옵션 채우기 시작...');
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (managerSelect.children.length > 1) {
            managerSelect.removeChild(managerSelect.lastChild);
        }
        
        // 👥 담당자 목록 추가
        const managers = this.database.categories.담당자 || [];
        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager;
            option.textContent = manager;
            managerSelect.appendChild(option);
        });
        
        console.log(`👤 담당자 ${managers.length}명 로드 완료:`, managers);
    }

    // 🔗 연동 선택 설정 (수정된 버전)
    setupCascadingSelects() {
        console.log('🔗 연동 선택 설정 시작...');
        
        // 👥 담당자 변경 시 판매처 업데이트
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            managerSelect.addEventListener('change', (e) => {
                console.log(`👥 담당자 변경: ${e.target.value}`);
                this.updateSellerOptions(e.target.value);
                this.clearDownstreamSelects(['seller', 'destination', 'product']);
            });
        }
        
        // 🏢 판매처 변경 시 도착지 업데이트
        const sellerSelect = document.getElementById('seller');
        if (sellerSelect) {
            sellerSelect.addEventListener('change', (e) => {
                console.log(`🏢 판매처 변경: ${e.target.value}`);
                this.updateDestinationOptions(e.target.value);
                this.clearDownstreamSelects(['destination']);
            });
            console.log('✅ 판매처 이벤트 리스너 설정 완료');
        }
        
        // 📂 분류 라디오 버튼 변경 시 품목 업데이트 (수정된 버전)
        const categoryRadios = document.querySelectorAll('input[name="category"]');
        console.log(`📂 분류 라디오 버튼 ${categoryRadios.length}개 발견`);
        
        categoryRadios.forEach((radio, index) => {
            console.log(`📂 라디오 버튼 ${index}: ${radio.value}`);
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log(`📂 분류 선택됨: ${e.target.value}`);
                    this.updateProductOptions(e.target.value);
                }
            });
        });

        // 💰 수량, 단가 입력 시 천단위 콤마 자동 삽입 및 총액 계산
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => {
                e.target.value = this.formatNumberWithCommas(e.target.value);
                this.calculateTotal();
            });
        }
        
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                e.target.value = this.formatNumberWithCommas(e.target.value);
                this.calculateTotal();
            });
        }

        // 🍯 기본값으로 설탕 품목 로드
        console.log('🍯 기본값으로 설탕 품목 로드 시작...');
        this.updateProductOptions('설탕');
        
        console.log('✅ 연동 선택 설정 완료');
    }

    // 🏢 판매처 옵션 업데이트
    updateSellerOptions(selectedManager) {
        const sellerSelect = document.getElementById('seller');
        if (!sellerSelect || !this.database || !selectedManager) return;
        
        console.log(`🏢 ${selectedManager}의 판매처 업데이트 시작...`);
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (sellerSelect.children.length > 1) {
            sellerSelect.removeChild(sellerSelect.lastChild);
        }
        
        // 📊 담당자별 판매처 가져오기
        const sellers = this.database.sellers_by_manager?.[selectedManager] || [];
        
        if (sellers.length === 0) {
            console.warn(`⚠️ ${selectedManager}의 판매처가 없습니다`);
            return;
        }
        
        // 🏢 판매처 옵션 추가
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller;
            option.textContent = seller;
            sellerSelect.appendChild(option);
        });
        
        console.log(`🏢 ${selectedManager}의 판매처 ${sellers.length}개 로드 완료`);
    }

    // 📍 도착지 옵션 업데이트 (수정된 버전)
    updateDestinationOptions(selectedSeller) {
        const destinationSelect = document.getElementById('destination');
        if (!destinationSelect || !selectedSeller) {
            console.warn('⚠️ 도착지 업데이트 조건 미충족');
            return;
        }
        
        console.log(`📍 ${selectedSeller}의 도착지 업데이트 시작...`);
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (destinationSelect.children.length > 1) {
            destinationSelect.removeChild(destinationSelect.lastChild);
        }
        
        // 📊 JSON 구조에 맞춰 도착지 데이터 찾기
        let destinations = [];
        
        // 방법 1: destinations_by_seller에서 직접 찾기
        if (this.database?.destinations_by_seller?.[selectedSeller]) {
            destinations = this.database.destinations_by_seller[selectedSeller];
            console.log(`📍 방법1 성공: ${destinations.length}개 도착지 발견`);
        }
        // 방법 2: sellers_by_destination에서 역으로 찾기
        else if (this.database?.sellers_by_destination) {
            Object.keys(this.database.sellers_by_destination).forEach(destination => {
                const sellers = this.database.sellers_by_destination[destination];
                if (sellers && sellers.includes(selectedSeller)) {
                    destinations.push(destination);
                }
            });
            console.log(`📍 방법2 성공: ${destinations.length}개 도착지 발견`);
        }
        // 방법 3: 기본 도착지 제공
        else {
            destinations = ['본사', '공장', '창고']; // 기본 도착지
            console.log(`📍 방법3 기본값: ${destinations.length}개 도착지 제공`);
        }
        
        console.log(`📍 ${selectedSeller}의 최종 도착지:`, destinations);
        
        if (destinations.length === 0) {
            // 도착지가 없을 때도 기본값 제공
            destinations = ['직접입력'];
        }
        
        // 📍 도착지 옵션 추가
        destinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination;
            option.textContent = destination;
            destinationSelect.appendChild(option);
        });
        
        // 첫 번째 도착지 자동 선택
        if (destinations.length > 0) {
            destinationSelect.selectedIndex = 1;
        }
        
        console.log(`✅ ${selectedSeller}의 도착지 ${destinations.length}개 로드 완료`);
    }

    // 📦 품목 옵션 업데이트 (완전히 수정된 버전)
    updateProductOptions(selectedCategory) {
        const productSelect = document.getElementById('product');
        if (!productSelect) {
            console.error('❌ 품목 select 요소를 찾을 수 없습니다');
            return;
        }
        
        if (!this.database) {
            console.error('❌ 데이터베이스가 로드되지 않았습니다');
            return;
        }
        
        if (!selectedCategory) {
            console.warn('⚠️ 선택된 분류가 없습니다');
            return;
        }
        
        console.log(`📦 ${selectedCategory}의 품목 업데이트 시작...`);
        console.log('📊 전체 품목 데이터:', this.database.items);
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (productSelect.children.length > 1) {
            productSelect.removeChild(productSelect.lastChild);
        }
        
        // 📊 분류별 품목 가져오기
        const products = this.database.items?.[selectedCategory];
        
        console.log(`📦 ${selectedCategory}의 품목 데이터:`, products);
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            console.warn(`⚠️ ${selectedCategory}의 품목이 없거나 배열이 아닙니다`);
            // 품목이 없을 때 안내 메시지 추가
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '품목 정보 없음';
            option.disabled = true;
            productSelect.appendChild(option);
            return;
        }
        
        // 📦 품목 옵션 추가
        products.forEach((product, index) => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productSelect.appendChild(option);
            
            if (index < 3) { // 처음 3개만 로그 출력
                console.log(`📦 품목 추가: ${product}`);
            }
        });
        
        console.log(`✅ ${selectedCategory}의 품목 ${products.length}개 로드 완료`);
        
        // 첫 번째 품목 자동 선택 (선택사항)
        if (products.length > 0) {
            productSelect.selectedIndex = 1; // 첫 번째 실제 옵션 선택
        }
    }

    // 💰 천단위 콤마 포맷팅
    formatNumberWithCommas(value) {
        // 숫자가 아닌 문자 제거
        const numericValue = value.replace(/[^0-9]/g, '');
        
        // 빈 값이면 그대로 반환
        if (!numericValue) return '';
        
        // 천단위 콤마 추가
        return parseInt(numericValue).toLocaleString();
    }

    // 💰 총액 계산
    calculateTotal() {
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        const totalDisplay = document.getElementById('totalAmount');
        
        if (!quantityInput || !priceInput || !totalDisplay) return;
        
        // 콤마 제거 후 숫자로 변환
        const quantity = parseFloat(quantityInput.value.replace(/,/g, '')) || 0;
        const price = parseFloat(priceInput.value.replace(/,/g, '')) || 0;
        const total = quantity * price;
        
        // 총액 표시 (천단위 콤마 포함)
        totalDisplay.textContent = total.toLocaleString() + '원';
        
        console.log(`💰 총액 계산: ${quantity} × ${price} = ${total.toLocaleString()}원`);
    }

    // 🧹 하위 선택 옵션들 초기화 (개선된 버전)
    clearDownstreamSelects(selectIds) {
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                console.log(`🧹 ${id} 선택 옵션 초기화`);
                // 첫 번째 옵션(기본값)만 남기고 나머지 제거
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                select.selectedIndex = 0;
            }
        });
    }

    // 📅 기본 날짜 설정
    setDefaultDate() {
        const dateInput = document.getElementById('orderDate');
        if (dateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateInput.value = formattedDate;
            console.log(`📅 기본 날짜 설정: ${formattedDate}`);
        }
    }

    // 👤 기본 담당자 설정 (로그인한 사용자)
    setDefaultManager() {
        const managerSelect = document.getElementById('manager');
        if (managerSelect && this.currentUser) {
            managerSelect.value = this.currentUser.name;
            // 판매처 옵션 업데이트
            this.updateSellerOptions(this.currentUser.name);
        }
    }

    // 📝 주문 제출 처리
    async handleOrderSubmit() {
        console.log('📝 주문 제출 처리 시작...');
        
        try {
            // ⏳ 로딩 표시
            this.showLoading();
            
            // 📋 폼 데이터 수집
            const orderData = this.collectOrderData();
            
            // ✅ 데이터 검증
            if (!this.validateOrderData(orderData)) {
                this.hideLoading();
                return;
            }
            
            // 🆔 주문 ID 생성
            orderData.id = this.generateOrderId();
            orderData.createdAt = new Date().toISOString();
            orderData.status = 'pending';
            
            // 💾 주문 저장
            this.orders.push(orderData);
            this.saveOrders();
            
            // ✅ 성공 처리
            this.hideLoading();
            this.showNotification('주문이 성공적으로 저장되었습니다!', 'success');
            this.resetOrderForm();
            
            console.log('✅ 주문 저장 완료:', orderData.id);
            
        } catch (error) {
            console.error('❌ 주문 저장 실패:', error);
            this.hideLoading();
            this.showNotification('주문 저장에 실패했습니다', 'error');
        }
    }

    // 📋 주문 데이터 수집
    collectOrderData() {
        const formData = {
            manager: document.getElementById('manager').value,
            seller: document.getElementById('seller').value,
            destination: document.getElementById('destination').value,
            category: document.getElementById('category').value,
            product: document.getElementById('product').value,
            quantity: document.getElementById('quantity').value,
            price: document.getElementById('price').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            deliveryTime: document.getElementById('deliveryTime').value
        };
        
        // 💰 총액 계산
        const quantity = parseFloat(formData.quantity.replace(/,/g, '')) || 0;
        const price = parseFloat(formData.price.replace(/,/g, '')) || 0;
        formData.totalAmount = quantity * price;
        
        console.log('📋 주문 데이터 수집 완료:', formData);
        return formData;
    }

    // ✅ 주문 데이터 검증
    validateOrderData(data) {
        const requiredFields = [
            { field: 'manager', name: '담당자' },
            { field: 'seller', name: '판매처' },
            { field: 'destination', name: '도착지' },
            { field: 'category', name: '분류' },
            { field: 'product', name: '품목' },
            { field: 'quantity', name: '수량' },
            { field: 'price', name: '단가' },
            { field: 'deliveryDate', name: '도착일' },
            { field: 'deliveryTime', name: '도착시간' }
        ];
        
        for (const { field, name } of requiredFields) {
            if (!data[field] || data[field].toString().trim() === '') {
                this.showNotification(`${name}을(를) 입력해주세요`, 'warning');
                document.getElementById(field)?.focus();
                return false;
            }
        }
        
        // 📊 숫자 검증
        const quantity = parseFloat(data.quantity.replace(/,/g, ''));
        const price = parseFloat(data.price.replace(/,/g, ''));
        
        if (isNaN(quantity) || quantity <= 0) {
            this.showNotification('올바른 수량을 입력해주세요', 'warning');
            document.getElementById('quantity')?.focus();
            return false;
        }
        
        if (isNaN(price) || price <= 0) {
            this.showNotification('올바른 단가를 입력해주세요', 'warning');
            document.getElementById('price')?.focus();
            return false;
        }
        
        console.log('✅ 주문 데이터 검증 통과');
        return true;
    }

    // 🆔 주문 ID 생성
    generateOrderId() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
        
        return `ORD-${dateStr}-${timeStr}-${randomStr}`;
    }

    // 💾 주문 데이터 저장
    saveOrders() {
        try {
            localStorage.setItem('orders', JSON.stringify(this.orders));
            console.log(`💾 ${this.orders.length}개 주문 저장 완료`);
        } catch (error) {
            console.error('❌ 주문 저장 실패:', error);
            throw new Error('주문 데이터 저장에 실패했습니다');
        }
    }

    // 📝 주문 폼 초기화
    resetOrderForm() {
        console.log('📝 주문 폼 초기화 시작...');
        
        // 📅 오늘 날짜 설정
        this.setDefaultDate();
        
        // 🧹 모든 입력 필드 초기화
        const inputs = ['quantity', 'price', 'notes'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // 💰 총액 초기화
        const totalAmount = document.getElementById('totalAmount');
        if (totalAmount) {
            totalAmount.textContent = '0원';
        }
        
        // 📂 설탕 기본 선택
        const sugarRadio = document.getElementById('categorySugar');
        if (sugarRadio) {
            sugarRadio.checked = true;
        }
        
        console.log('✅ 주문 폼 초기화 완료');
    }

    // 🔄 로그인 폼 초기화
    resetLoginForm() {
        const loginUser = document.getElementById('loginUser');
        const loginPin = document.getElementById('loginPin');
        
        if (loginUser) loginUser.selectedIndex = 0;
        if (loginPin) loginPin.value = '';
    }

    // 📋 주문 목록 로드
    loadOrderList() {
        console.log('📋 주문 목록 로드 시작...');
        
        const orderList = document.getElementById('orderList');
        if (!orderList) {
            console.error('❌ 주문 목록 요소를 찾을 수 없습니다');
            return;
        }
        
        // 🧹 기존 목록 초기화
        orderList.innerHTML = '';
        
        if (this.orders.length === 0) {
            orderList.innerHTML = `
                <div class="empty-state">
                    <p>📝 등록된 주문이 없습니다</p>
                    <p>새 주문을 등록해보세요!</p>
                </div>
            `;
        } else {
            // 📋 주문 목록 표시
            this.orders.forEach(order => {
                const orderElement = this.createOrderElement(order);
                orderList.appendChild(orderElement);
            });
        }
        
        console.log(`📋 주문 목록 ${this.orders.length}개 로드 완료`);
    }

    // 📋 주문 요소 생성
    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <div class="order-header">
                <span class="order-number">${order.주문번호}</span>
                <span class="order-date">${order.날짜}</span>
            </div>
            <div class="order-details">
                <p><strong>담당자:</strong> ${order.담당자}</p>
                <p><strong>판매처:</strong> ${order.판매처}</p>
                <p><strong>품목:</strong> ${order.품목}</p>
                <p><strong>총액:</strong> ${order.총액}</p>
            </div>
            <div class="order-actions">
                <button onclick="editOrder('${order.주문번호}')" class="btn-edit">수정</button>
                <button onclick="deleteOrder('${order.주문번호}')" class="btn-delete">삭제</button>
            </div>
        `;
        return orderDiv;
    }

    // 📊 필터 선택 옵션 채우기
    populateFilterSelects() {
        const filterManager = document.getElementById('filterManager');
        if (!filterManager) return;
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (filterManager.children.length > 1) {
            filterManager.removeChild(filterManager.lastChild);
        }
        
        // 👥 담당자 목록 추가
        Object.keys(this.users).forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = userName;
            filterManager.appendChild(option);
        });
    }

    // 🔍 주문 필터링
    filterOrders() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const filterManager = document.getElementById('filterManager')?.value || '';
        const filterDate = document.getElementById('filterDate')?.value || '';
        const showPastOrders = document.getElementById('showPastOrders')?.checked || false;
        
        console.log('🔍 주문 필터링:', { searchTerm, filterManager, filterDate, showPastOrders });
        
        const container = document.getElementById('orderListContainer');
        if (!container) return;
        
        const orderItems = container.querySelectorAll('.order-item');
        
        orderItems.forEach(item => {
            const orderId = item.dataset.orderId;
            const order = this.orders.find(o => o.id === orderId);
            
            if (!order) {
                item.style.display = 'none';
                return;
            }
            
            let shouldShow = true;
            
            // 🔍 검색어 필터
            if (searchTerm) {
                const searchableText = `
                    ${order.id} ${order.manager} ${order.seller} 
                    ${order.destination} ${order.product}
                `.toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    shouldShow = false;
                }
            }
            
            // 👤 담당자 필터
            if (filterManager && order.manager !== filterManager) {
                shouldShow = false;
            }
            
            // 📅 날짜 필터
            if (filterDate && order.deliveryDate !== filterDate) {
                shouldShow = false;
            }
            
            // ⏰ 과거 주문 필터
            if (!showPastOrders) {
                const deliveryDate = new Date(order.deliveryDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (deliveryDate < today) {
                    shouldShow = false;
                }
            }
            
            item.style.display = shouldShow ? 'block' : 'none';
        });
    }

    // ✏️ 주문 수정
    editOrder(orderId) {
        console.log(`✏️ 주문 수정: ${orderId}`);
        
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            this.showNotification('주문을 찾을 수 없습니다', 'error');
            return;
        }
        
        // 📝 주문 입력 화면으로 전환
        this.switchScreen('orderFormScreen');
        
        // 📋 폼에 기존 데이터 채우기
        this.populateFormWithOrder(order);
        
        // 🏷️ 수정 모드 표시
        this.setEditMode(orderId);
    }

    // 📋 폼에 주문 데이터 채우기
    populateFormWithOrder(order) {
        document.getElementById('manager').value = order.manager;
        document.getElementById('seller').value = order.seller;
        document.getElementById('destination').value = order.destination;
        document.getElementById('category').value = order.category;
        document.getElementById('product').value = order.product;
        document.getElementById('quantity').value = order.quantity;
        document.getElementById('price').value = order.price;
        document.getElementById('deliveryDate').value = order.deliveryDate;
        document.getElementById('deliveryTime').value = order.deliveryTime;
        
        // 🔗 연동 선택 업데이트
        this.updateSellerOptions(order.manager);
        this.updateDestinationOptions(order.seller);
        this.updateProductOptions(order.category);
        
        // 💰 총액 계산
        this.calculateTotal();
    }

    // 🏷️ 수정 모드 설정
    setEditMode(orderId) {
        const form = document.getElementById('orderForm');
        if (form) {
            form.dataset.editMode = 'true';
            form.dataset.editOrderId = orderId;
        }
        
        // 🔘 버튼 텍스트 변경
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> 수정 저장';
        }
    }

    // 🗑️ 주문 삭제
    deleteOrder(orderId) {
        console.log(`🗑️ 주문 삭제: ${orderId}`);
        
        if (!confirm('정말로 이 주문을 삭제하시겠습니까?')) {
            return;
        }
        
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            this.showNotification('주문을 찾을 수 없습니다', 'error');
            return;
        }
        
        // 🗑️ 주문 삭제
        this.orders.splice(orderIndex, 1);
        this.saveOrders();
        
        // 🔄 목록 새로고침
        this.loadOrderList();
        
        this.showNotification('주문이 삭제되었습니다', 'success');
    }

    // ✏️ 수정 가능한 주문 목록 로드
    loadEditableOrders() {
        console.log('✏️ 수정 가능한 주문 목록 로드...');
        
        const container = document.getElementById('editOrdersList');
        if (!container) return;
        
        // 🧹 기존 목록 제거
        container.innerHTML = '';
        
        // 📅 오늘 이후 배송 예정인 주문만 필터링
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const editableOrders = this.orders.filter(order => {
            const deliveryDate = new Date(order.deliveryDate);
            return deliveryDate >= today;
        });
        
        if (editableOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-edit"></i>
                    <p>수정 가능한 주문이 없습니다</p>
                    <small>오늘 이후 배송 예정인 주문만 수정할 수 있습니다</small>
                </div>
            `;
            return;
        }
        
        // 📅 배송일 기준으로 정렬
        editableOrders.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
        
        editableOrders.forEach(order => {
            const orderElement = this.createEditableOrderElement(order);
            container.appendChild(orderElement);
        });
        
        console.log(`✏️ ${editableOrders.length}개 수정 가능한 주문 표시`);
    }

    // ✏️ 수정 가능한 주문 요소 생성
    createEditableOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item editable';
        
        const deliveryDateTime = `${order.deliveryDate} ${order.deliveryTime}`;
        
        orderDiv.innerHTML = `
            <div class="order-header">
                <span class="order-id">${order.id}</span>
                <span class="order-date">🚚 ${deliveryDateTime}</span>
            </div>
            
            <div class="order-summary">
                <div><strong>${order.manager}</strong> → <strong>${order.seller}</strong></div>
                <div>${order.product} (${parseFloat(order.quantity).toLocaleString('ko-KR')}KG)</div>
                <div class="total-amount">${order.totalAmount.toLocaleString('ko-KR')}원</div>
            </div>
            
            <div class="order-actions">
                <button class="btn btn-primary" onclick="app.editOrder('${order.id}')">
                    <i class="fas fa-edit"></i> 수정하기
                </button>
            </div>
        `;
        
        return orderDiv;
    }

    // 📢 알림 표시
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;
        
        // 🎨 타입별 스타일 설정
        notification.className = `notification ${type}`;
        notificationText.textContent = message;
        
        // 📢 알림 표시
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // ⏰ 자동 숨김 (5초 후)
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
        
        console.log(`📢 알림 표시 [${type}]: ${message}`);
    }

    // 📢 알림 숨김
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }
    }

    // ⏳ 로딩 표시
    showLoading() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.remove('hidden');
        }
    }

    // ⏳ 로딩 숨김
    hideLoading() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
    }

    // 🔄 디바운스 함수 (검색 최적화)
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // 📂 현재 선택된 분류 가져오기 (디버깅 강화)
    getSelectedCategory() {
        const selectedRadio = document.querySelector('input[name="category"]:checked');
        const category = selectedRadio ? selectedRadio.value : '설탕';
        console.log(`📂 현재 선택된 분류: ${category}`);
        return category;
    }

    // 📝 주문 저장 시 분류 값 가져오기 수정
    async saveOrder() {
        try {
            this.showLoading();
            
            // 📝 폼 데이터 수집
            const formData = {
                주문번호: this.generateOrderId(),
                날짜: document.getElementById('orderDate').value,
                담당자: document.getElementById('manager').value,
                판매처: document.getElementById('seller').value,
                도착지: document.getElementById('destination').value,
                분류: this.getSelectedCategory(), // 🔄 라디오 버튼에서 값 가져오기
                품목: document.getElementById('product').value,
                수량: document.getElementById('quantity').value,
                단가: document.getElementById('price').value,
                총액: document.getElementById('totalAmount').textContent,
                비고: document.getElementById('notes').value || '',
                등록시간: new Date().toISOString()
            };

            // ... 나머지 저장 로직 ...
            
        } catch (error) {
            console.error('❌ 주문 저장 실패:', error);
            this.showNotification('주문 저장에 실패했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 📱 반응형 디자인 체크
    checkResponsiveDesign() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        const isDesktop = window.innerWidth > 1024;
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        console.log(`📱 디바이스 정보: ${
            isMobile ? '모바일' : isTablet ? '태블릿' : '데스크톱'
        }, 터치: ${isTouch ? '지원' : '미지원'}`);
        
        // 🎯 디바이스 타입별 CSS 클래스 추가
        const body = document.body;
        body.classList.remove('mobile-device', 'tablet-device', 'desktop-device', 'touch-device');
        
        if (isMobile) {
            body.classList.add('mobile-device');
        } else if (isTablet) {
            body.classList.add('tablet-device');
        } else {
            body.classList.add('desktop-device');
        }
        
        if (isTouch) {
            body.classList.add('touch-device');
        }
        
        // 📏 CSS 변수로 디바이스 정보 전달
        document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--is-mobile', isMobile ? '1' : '0');
        document.documentElement.style.setProperty('--is-tablet', isTablet ? '1' : '0');
        document.documentElement.style.setProperty('--is-desktop', isDesktop ? '1' : '0');
        document.documentElement.style.setProperty('--is-touch', isTouch ? '1' : '0');
        
        // 📱 모바일에서 추가 최적화
        if (isMobile) {
            this.optimizeForMobile();
        }
        
        // 🍎 iOS Safari 전용 처리
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            this.handleIOSViewport();
        }
        
        // 🤖 안드로이드 전용 처리  
        if (/Android/.test(navigator.userAgent)) {
            this.handleAndroidViewport();
        }
    }

    // 🍎 iOS Safari 뷰포트 처리 (개선)
    handleIOSViewport() {
        console.log('🍎 iOS Safari 최적화 적용...');
        
        const setViewportHeight = () => {
            // 📏 실제 뷰포트 높이 계산
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // 📱 안전 영역 계산
            const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
            const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
            
            document.documentElement.style.setProperty('--safe-area-top', `${safeAreaTop}px`);
            document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`);
        };
        
        setViewportHeight();
        
        // 📱 방향 전환 및 주소창 숨김/표시 대응
        window.addEventListener('resize', () => {
            setTimeout(setViewportHeight, 100);
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 500);
        });
        
        // 📱 iOS 키보드 처리
        const handleIOSKeyboard = () => {
            const focusableElements = 'input, select, textarea';
            
            document.addEventListener('focusin', (e) => {
                if (e.target.matches(focusableElements)) {
                    setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            });
        };
        
        handleIOSKeyboard();
    }

    // 🤖 안드로이드 전용 뷰포트 처리
    handleAndroidViewport() {
        console.log('🤖 안드로이드 최적화 적용...');
        
        // 🤖 안드로이드 키보드 처리
        const originalViewportHeight = window.innerHeight;
        
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = originalViewportHeight - currentHeight;
            
            // 키보드가 올라온 경우 (높이가 150px 이상 줄어듦)
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                document.documentElement.style.setProperty('--keyboard-height', `${heightDifference}px`);
            } else {
                document.body.classList.remove('keyboard-open');
                document.documentElement.style.setProperty('--keyboard-height', '0px');
            }
        };
        
        window.addEventListener('resize', handleResize);
    }

    // 🍎 iOS Safari 뷰포트 처리 (개선)
    handleIOSViewport() {
        console.log('🍎 iOS Safari 최적화 적용...');
        
        const setViewportHeight = () => {
            // 📏 실제 뷰포트 높이 계산
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // 📱 안전 영역 계산
            const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
            const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
            
            document.documentElement.style.setProperty('--safe-area-top', `${safeAreaTop}px`);
            document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`);
        };
        
        setViewportHeight();
        
        // 📱 방향 전환 및 주소창 숨김/표시 대응
        window.addEventListener('resize', () => {
            setTimeout(setViewportHeight, 100);
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 500);
        });
        
        // 📱 iOS 키보드 처리
        const handleIOSKeyboard = () => {
            const focusableElements = 'input, select, textarea';
            
            document.addEventListener('focusin', (e) => {
                if (e.target.matches(focusableElements)) {
                    setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            });
        };
        
        handleIOSKeyboard();
    }

    // 📱 모바일 키보드 처리
    handleMobileKeyboard() {
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                }, 300);
            });
        });
    }

    // ✅ 모바일 최적화 함수
    optimizeForMobile() {
        console.log('📱 모바일 최적화 적용...');
        
        // 📱 터치 스크롤 개선
        document.body.style.webkitOverflowScrolling = 'touch';
        
        // 📱 확대/축소 방지
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        
        // 📱 더블탭 확대 방지
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 📱 키보드 올라올 때 뷰포트 조정
        this.handleMobileKeyboard();
    }
}

// 🚀 앱 초기화 및 전역 변수 설정
let app;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM 로드 완료 - 앱 초기화 시작');
    app = new OrderSystemApp();
});

// 🔧 전역 함수들 (HTML에서 호출용)
window.editOrder = (orderId) => app?.editOrder(orderId);
window.deleteOrder = (orderId) => app?.deleteOrder(orderId);

console.log('✅ 티알코리아 주문시스템 V2.0 스크립트 로드 완료');