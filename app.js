// 🚀 티알코리아 주문시스템 V3.0.0 - 완전히 새로운 시작
// 📅 2025년 1월 - 모든 문제 해결

class TROrderSystem {
    constructor() {
        this.currentUser = null;
        this.orders = [];
        this.database = null;
        this.users = {};
        this.isFirebaseEnabled = false;
        this.firebaseDb = null;
        this.editingOrderId = null;
        this.viewMode = 'upcoming'; // 'upcoming', 'all', 'my', 'my-all'
        
        console.log('🚀 티알코리아 주문시스템 V3.0.0 초기화...');
    }

    // 🎯 시스템 초기화
    async init() {
        try {
            console.log('1️⃣ 시스템 초기화 시작...');
            
            // 1. 자동 로그인 확인
            if (this.checkAutoLogin()) {
                console.log('🔐 자동 로그인 성공');
                return;
            }
            
            // 2. 사용자 설정 로드
            await this.loadUserConfig();
            
            // 3. 데이터베이스 로드
            await this.loadDatabase();
            
            // 4. Firebase 초기화 (선택사항)
            await this.initFirebase();
            
            // 5. 로컬 주문 데이터 로드
            this.loadOrdersFromLocal();
            
            // 6. UI 설정
            this.setupEventListeners();
            this.populateUserSelect();
            this.populateFormSelects();
            
            console.log('✅ 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 시스템 초기화 실패:', error);
            this.showNotification('시스템 초기화에 실패했습니다.', 'error');
        } finally {
            // 7. 로그인 화면 표시 (자동 로그인이 안된 경우만)
            if (!this.currentUser) {
                this.showLoginScreen();
            }
            this.showLoadingSpinner(false);
        }
    }

    // 🔐 자동 로그인 확인
    checkAutoLogin() {
        try {
            const savedUser = localStorage.getItem('tr_current_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log('🔐 자동 로그인:', this.currentUser.name);
                
                // 필요한 초기화 작업들
                this.loadUserConfig().then(() => {
                    this.loadDatabase().then(() => {
                        this.initFirebase();
                        this.loadOrdersFromLocal();
                        this.setupEventListeners();
                        this.populateFormSelects();
                        this.showMainApp();
                    });
                });
                
                return true;
            }
        } catch (error) {
            console.error('❌ 자동 로그인 실패:', error);
            localStorage.removeItem('tr_current_user');
        }
        return false;
    }

    // 👥 사용자 설정 로드
    async loadUserConfig() {
        try {
            console.log('2️⃣ 사용자 설정 로드 중...');
            const response = await fetch('./user_config.json');
            if (!response.ok) throw new Error('사용자 설정 파일을 찾을 수 없습니다.');
            
            const config = await response.json();
            this.users = config.users;
            
            console.log('✅ 사용자 설정 로드 완료:', Object.keys(this.users).length + '명');
            
        } catch (error) {
            console.error('❌ 사용자 설정 로드 실패:', error);
            // 기본 사용자 설정
            this.users = {
                "김정진": { pin: "9736", name: "김정진", role: "대표이사" },
                "박경범": { pin: "5678", name: "박경범", role: "상무" },
                "이선화": { pin: "0000", name: "이선화", role: "이사" },
                "신준호": { pin: "3444", name: "신준호", role: "과장" },
                "김다해": { pin: "9797", name: "김다해", role: "대리" },
                "송현지": { pin: "1234", name: "송현지", role: "사원" }
            };
            console.log('📝 기본 사용자 설정 사용');
        }
    }

    // 🗄️ 데이터베이스 로드
    async loadDatabase() {
        try {
            console.log('3️⃣ 데이터베이스 로드 중...');
            const response = await fetch('./database_converted.json');
            if (!response.ok) throw new Error('데이터베이스 파일을 찾을 수 없습니다.');
            
            const data = await response.json();
            this.database = data[0]; // 첫 번째 객체 사용
            
            console.log('✅ 데이터베이스 로드 완료');
            
        } catch (error) {
            console.error('❌ 데이터베이스 로드 실패:', error);
            // 기본 데이터베이스 설정
            this.database = {
                분류: ["설탕", "식품첨가물"],
                담당자별_거래처: {
                    "김정진": ["(주)동일에프앤디", "(주)에스피씨지에프에스"],
                    "박경범": ["(주) 마켓랩", "(주) 서강에프앤디"],
                    "이선화": ["(주) 빅솔반월공장", "(주) 이디야"],
                    "신준호": ["(주) 산호인터내셔널", "(주) 아름터"]
                },
                도착지_정보: {},
                설탕: ["KBS_25KG", "MITRPHOL_25KG"],
                식품첨가물: ["MSG_25KG", "DEXTROSE_20KG"]
            };
            console.log('📝 기본 데이터베이스 사용');
        }
    }

    // 🔥 Firebase 초기화
    async initFirebase() {
        try {
            console.log('4️⃣ Firebase 초기화 중...');
            const response = await fetch('./firebase-config.json');
            if (!response.ok) {
                console.log('📝 Firebase 설정 없음, 로컬 모드로 실행');
                return;
            }
            
            const config = await response.json();
            
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(config);
                this.firebaseDb = firebase.database();
                this.isFirebaseEnabled = true;
                this.setupFirebaseSync();
                
                console.log('🔥 Firebase 초기화 완료');
            } else {
                console.log('📝 Firebase SDK 없음, 로컬 모드로 실행');
            }
            
        } catch (error) {
            console.warn('⚠️ Firebase 초기화 실패, 로컬 모드로 계속:', error);
        }
    }

    // 💾 로컬 주문 데이터 로드
    loadOrdersFromLocal() {
        try {
            console.log('5️⃣ 로컬 주문 데이터 로드 중...');
            const saved = localStorage.getItem('tr_orders');
            if (saved) {
                this.orders = JSON.parse(saved);
                console.log(`📋 로컬 주문 ${this.orders.length}개 로드 완료`);
            } else {
                console.log('📋 저장된 주문 없음');
            }
        } catch (error) {
            console.error('❌ 로컬 주문 로드 실패:', error);
            this.orders = [];
        }
    }

    // 💾 로컬 주문 데이터 저장
    saveOrdersToLocal() {
        try {
            localStorage.setItem('tr_orders', JSON.stringify(this.orders));
            console.log('💾 로컬 저장 완료');
        } catch (error) {
            console.error('❌ 로컬 저장 실패:', error);
        }
    }

    // 📢 알림 표시
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        if (!notification || !text) {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
            return;
        }
        
        text.textContent = message;
        notification.className = `notification ${type} show`;
        
        // 3초 후 자동 숨김
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
        
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    // ⏳ 로딩 스피너 표시/숨김
    showLoadingSpinner(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            if (show) {
                spinner.classList.remove('hidden');
                spinner.style.display = 'flex';
            } else {
                spinner.classList.add('hidden');
                spinner.style.display = 'none';
            }
            console.log(`⏳ 로딩 스피너: ${show ? '표시' : '숨김'}`);
        } else {
            console.error('❌ 로딩 스피너 요소를 찾을 수 없습니다');
        }
    }

    // 🏠 로그인 화면 표시
    showLoginScreen() {
        console.log('6️⃣ 로그인 화면 표시 중...');
        
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen && mainApp) {
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'flex';
            mainApp.classList.add('hidden');
            mainApp.style.display = 'none';
            
            // 로그인 폼 초기화
            const loginUser = document.getElementById('loginUser');
            const loginPin = document.getElementById('loginPin');
            
            if (loginUser) loginUser.value = '';
            if (loginPin) loginPin.value = '';
            
            console.log('✅ 로그인 화면 표시 완료');
        } else {
            console.error('❌ 로그인 화면 요소를 찾을 수 없습니다');
            console.log('loginScreen:', loginScreen);
            console.log('mainApp:', mainApp);
        }
    }

    // 📱 메인 앱 화면 표시
    showMainApp() {
        console.log('📱 메인 앱 화면 표시 중...');
        
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen && mainApp) {
            loginScreen.classList.add('hidden');
            loginScreen.style.display = 'none';
            mainApp.classList.remove('hidden');
            mainApp.style.display = 'flex';
            
            // 사용자 정보 표시
            const userDisplay = document.getElementById('currentUserName');
            if (userDisplay && this.currentUser) {
                userDisplay.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
            }
            
            // 기본적으로 주문 입력 화면 표시
            this.showScreen('orderForm');
            
            // 폼에 기본값 설정
            this.setDefaultFormValues();
            
            console.log('✅ 메인 앱 화면 표시 완료');
        }
    }

    // 🎯 이벤트 리스너 설정
    setupEventListeners() {
        console.log('🎯 이벤트 리스너 설정 중...');
        
        // 로그인 버튼
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
            console.log('✅ 로그인 버튼 이벤트 설정');
        } else {
            console.error('❌ 로그인 버튼을 찾을 수 없습니다');
        }
        
        // 로그아웃 버튼
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // 주문 저장 버튼
        const saveOrderBtn = document.getElementById('saveOrderBtn');
        if (saveOrderBtn) {
            saveOrderBtn.addEventListener('click', () => this.saveOrder());
        }
        
        // 폼 초기화 버튼
        const resetFormBtn = document.getElementById('resetFormBtn');
        if (resetFormBtn) {
            resetFormBtn.addEventListener('click', () => this.resetForm());
        }
        
        // 하단 네비게이션
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.showScreen(screen);
            });
        });
        
        // 주문 목록 필터 버튼들
        const upcomingBtn = document.getElementById('upcomingOrdersBtn');
        const allOrdersBtn = document.getElementById('allOrdersBtn');
        const myOrdersBtn = document.getElementById('myOrdersBtn');
        const editSelectedBtn = document.getElementById('editSelectedBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        if (upcomingBtn) {
            upcomingBtn.addEventListener('click', () => this.setViewMode('upcoming'));
        }
        if (allOrdersBtn) {
            allOrdersBtn.addEventListener('click', () => this.setViewMode('all'));
        }
        if (myOrdersBtn) {
            myOrdersBtn.addEventListener('click', () => this.setViewMode('my'));
        }
        if (editSelectedBtn) {
            editSelectedBtn.addEventListener('click', () => this.editSelectedOrder());
        }
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedOrders());
        }
        
        // 담당자 변경 시 판매처 업데이트
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            managerSelect.addEventListener('change', (e) => {
                this.updateSellerOptions(e.target.value);
            });
        }
        
        // 판매처 변경 시 도착지 업데이트
        const sellerSelect = document.getElementById('seller');
        if (sellerSelect) {
            sellerSelect.addEventListener('change', (e) => {
                this.updateDestinationOptions(e.target.value);
            });
        }
        
        // 분류 변경 시 품목 업데이트
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.updateProductOptions(e.target.value);
            });
        }
        
        // 수량, 단가 입력 시 총액 계산 및 숫자 포맷팅
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => {
                this.formatNumberInput(e.target);
                this.calculateTotal();
            });
        }
        
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                this.formatNumberInput(e.target);
                this.calculateTotal();
            });
        }
        
        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // 🔐 로그인 처리
    handleLogin() {
        console.log('🔐 로그인 시도...');
        
        const selectedUser = document.getElementById('loginUser').value;
        const enteredPin = document.getElementById('loginPin').value;
        
        console.log('선택된 사용자:', selectedUser);
        console.log('입력된 PIN:', enteredPin ? '****' : '없음');
        
        if (!selectedUser) {
            this.showNotification('담당자를 선택해주세요.', 'warning');
            return;
        }
        
        if (!enteredPin) {
            this.showNotification('PIN 번호를 입력해주세요.', 'warning');
            return;
        }
        
        const user = this.users[selectedUser];
        if (!user) {
            this.showNotification('존재하지 않는 사용자입니다.', 'error');
            return;
        }
        
        if (user.pin !== enteredPin) {
            this.showNotification('PIN 번호가 올바르지 않습니다.', 'error');
            return;
        }
        
        // 로그인 성공
        this.currentUser = user;
        
        // 자동 로그인을 위해 사용자 정보 저장
        localStorage.setItem('tr_current_user', JSON.stringify(user));
        
        console.log('✅ 로그인 성공:', user.name);
        this.showNotification(`${user.name}님, 환영합니다!`, 'success');
        
        this.showMainApp();
    }

    // 🚪 로그아웃 처리
    handleLogout() {
        console.log('🚪 로그아웃 처리...');
        
        // 사용자 정보 초기화
        this.currentUser = null;
        this.editingOrderId = null;
        
        // 자동 로그인 정보 삭제
        localStorage.removeItem('tr_current_user');
        
        this.showNotification('로그아웃되었습니다.', 'info');
        this.showLoginScreen();
        
        console.log('✅ 로그아웃 완료');
    }

    // 👤 사용자 선택 옵션 설정
    populateUserSelect() {
        const loginUser = document.getElementById('loginUser');
        if (!loginUser) return;
        
        loginUser.innerHTML = '<option value="">담당자를 선택하세요</option>';
        
        Object.keys(this.users).forEach(name => {
            const user = this.users[name];
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${user.role})`;
            loginUser.appendChild(option);
        });
        
        console.log('✅ 사용자 선택 옵션 설정 완료');
    }

    // 📝 폼 선택 옵션 설정
    populateFormSelects() {
        if (!this.database) return;
        
        // 담당자 옵션
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            managerSelect.innerHTML = '<option value="">담당자 선택</option>';
            Object.keys(this.users).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} (${this.users[name].role})`;
                managerSelect.appendChild(option);
            });
        }
        
        // 분류 옵션
        const categorySelect = document.getElementById('category');
        if (categorySelect && this.database.분류) {
            categorySelect.innerHTML = '<option value="">분류 선택</option>';
            this.database.분류.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        console.log('✅ 폼 선택 옵션 설정 완료');
    }

    // 📄 화면 전환
    showScreen(screenName) {
        // 모든 화면 숨기기
        document.querySelectorAll('.content-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 선택된 화면 표시
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // 네비게이션 버튼 활성화 상태 업데이트
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-screen="${screenName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // 화면별 추가 처리
        if (screenName === 'orderList') {
            this.updateOrderDisplay();
        }
        
        console.log(`📄 화면 전환: ${screenName}`);
    }

    // 📝 폼에 기본값 설정
    setDefaultFormValues() {
        if (this.currentUser) {
            const managerSelect = document.getElementById('manager');
            if (managerSelect) {
                managerSelect.value = this.currentUser.name;
                this.updateSellerOptions(this.currentUser.name);
            }
        }
        
        // 오늘 날짜 설정
        const today = new Date().toISOString().split('T')[0];
        const deliveryDate = document.getElementById('deliveryDate');
        if (deliveryDate) {
            deliveryDate.value = today;
        }
    }

    // 🏢 판매처 옵션 업데이트
    updateSellerOptions(selectedManager) {
        const sellerSelect = document.getElementById('seller');
        if (!sellerSelect || !this.database || !selectedManager) return;
        
        sellerSelect.innerHTML = '<option value="">판매처 선택</option>';
        
        const sellers = this.database.담당자별_거래처?.[selectedManager] || [];
        
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller;
            option.textContent = seller;
            sellerSelect.appendChild(option);
        });
        
        // 하위 선택 초기화
        this.clearSelect('destination');
        
        console.log(`🏢 ${selectedManager}의 판매처 ${sellers.length}개 업데이트`);
    }

    // 📍 도착지 옵션 업데이트
    updateDestinationOptions(selectedSeller) {
        const destinationSelect = document.getElementById('destination');
        if (!destinationSelect || !this.database || !selectedSeller) return;
        
        destinationSelect.innerHTML = '<option value="">도착지 선택</option>';
        
        const destinations = this.database.도착지_정보?.[selectedSeller] || [];
        
        destinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination;
            option.textContent = destination.split('\n')[0]; // 첫 번째 줄만 표시
            destinationSelect.appendChild(option);
        });
        
        console.log(`📍 ${selectedSeller}의 도착지 ${destinations.length}개 업데이트`);
    }

    // 📦 품목 옵션 업데이트
    updateProductOptions(selectedCategory) {
        const productSelect = document.getElementById('product');
        if (!productSelect || !this.database || !selectedCategory) return;
        
        productSelect.innerHTML = '<option value="">품목 선택</option>';
        
        const products = this.database[selectedCategory] || [];
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productSelect.appendChild(option);
        });
        
        console.log(`📦 ${selectedCategory}의 품목 ${products.length}개 업데이트`);
    }

    // 🔄 선택 박스 초기화
    clearSelect(selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">선택하세요</option>';
        }
    }

    // 🔢 숫자 입력 포맷팅
    formatNumberInput(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value) {
            value = parseInt(value).toLocaleString('ko-KR');
        }
        input.value = value;
    }

    // 💰 총액 계산
    calculateTotal() {
        const quantity = this.parseNumber(document.getElementById('quantity')?.value || '0');
        const price = this.parseNumber(document.getElementById('price')?.value || '0');
        const total = quantity * price;
        
        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            totalElement.textContent = this.formatNumber(total) + '원';
        }
    }

    // 📅 날짜 비교 함수
    isDatePast(dateString) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(dateString);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    }

    // 📋 주문 목록 보기 모드 설정
    setViewMode(mode) {
        this.viewMode = mode;
        
        // 버튼 활성화 상태 업데이트
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${mode}OrdersBtn`) || 
                          document.getElementById(`${mode === 'my' ? 'my' : mode}OrdersBtn`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.updateOrderDisplay();
        console.log(`📋 주문 목록 모드 변경: ${mode}`);
    }

    // 💾 주문 저장
    async saveOrder() {
        try {
            this.showLoadingSpinner(true);
            
            // 폼 데이터 수집
            const orderData = this.collectFormData();
            
            // 유효성 검사
            if (!this.validateOrderData(orderData)) {
                return;
            }
            
            if (this.editingOrderId) {
                // 주문 수정
                const orderIndex = this.orders.findIndex(order => order.id === this.editingOrderId);
                if (orderIndex !== -1) {
                    orderData.id = this.editingOrderId;
                    orderData.수정일시 = new Date().toISOString();
                    orderData.수정자 = this.currentUser.name;
                    this.orders[orderIndex] = orderData;
                    
                    this.showNotification('주문이 성공적으로 수정되었습니다!', 'success');
                    console.log('✅ 주문 수정 완료:', orderData.id);
                }
                this.editingOrderId = null;
            } else {
                // 새 주문 생성
                orderData.id = this.generateOrderId();
                orderData.주문일시 = new Date().toISOString();
                orderData.상태 = '대기';
                orderData.작성자 = this.currentUser.name;
                
                this.orders.unshift(orderData);
                
                this.showNotification('주문이 성공적으로 저장되었습니다!', 'success');
                console.log('✅ 주문 저장 완료:', orderData.id);
            }
            
            // 로컬 저장
            this.saveOrdersToLocal();
            
            // Firebase 저장 (가능한 경우)
            if (this.isFirebaseEnabled) {
                await this.saveToFirebase(orderData);
            }
            
            // 폼 초기화
            this.resetForm();
            
            // 주문 목록 업데이트
            this.updateOrderDisplay();
            
        } catch (error) {
            console.error('❌ 주문 저장 실패:', error);
            this.showNotification('주문 저장에 실패했습니다.', 'error');
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    // 📝 폼 데이터 수집
    collectFormData() {
        return {
            담당자: document.getElementById('manager')?.value || '',
            판매처: document.getElementById('seller')?.value || '',
            도착지: document.getElementById('destination')?.value || '',
            분류: document.getElementById('category')?.value || '',
            품목: document.getElementById('product')?.value || '',
            수량: this.parseNumber(document.getElementById('quantity')?.value || '0'),
            단가: this.parseNumber(document.getElementById('price')?.value || '0'),
            도착일: document.getElementById('deliveryDate')?.value || '',
            도착시간: document.getElementById('deliveryTime')?.value || '',
            총금액: this.formatNumber(
                this.parseNumber(document.getElementById('quantity')?.value || '0') * 
                this.parseNumber(document.getElementById('price')?.value || '0')
            ) + '원'
        };
    }

    // ✅ 주문 데이터 유효성 검사
    validateOrderData(data) {
        const required = ['담당자', '판매처', '도착지', '분류', '품목', '도착일', '도착시간'];
        
        for (const field of required) {
            if (!data[field]) {
                this.showNotification(`${field}을(를) 선택해주세요.`, 'warning');
                return false;
            }
        }
        
        if (data.수량 <= 0) {
            this.showNotification('수량을 입력해주세요.', 'warning');
            return false;
        }
        
        if (data.단가 <= 0) {
            this.showNotification('단가를 입력해주세요.', 'warning');
            return false;
        }
        
        return true;
    }

    // ✏️ 선택된 주문 수정
    editSelectedOrder() {
        const selectedCheckbox = document.querySelector('input[name="orderSelect"]:checked');
        if (!selectedCheckbox) {
            this.showNotification('수정할 주문을 선택해주세요.', 'warning');
            return;
        }
        
        const orderId = selectedCheckbox.value;
        const order = this.orders.find(o => o.id === orderId);
        
        if (!order) {
            this.showNotification('주문을 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 과거 주문은 수정 불가
        if (this.isDatePast(order.도착일)) {
            this.showNotification('과거 주문은 수정할 수 없습니다.', 'warning');
            return;
        }
        
        // 폼에 데이터 채우기
        this.editingOrderId = orderId;
        this.fillFormWithOrderData(order);
        this.showScreen('orderForm');
        
        this.showNotification('주문 수정 모드입니다.', 'info');
    }

    // 📝 주문 데이터로 폼 채우기
    fillFormWithOrderData(order) {
        document.getElementById('manager').value = order.담당자;
        this.updateSellerOptions(order.담당자);
        
        setTimeout(() => {
            document.getElementById('seller').value = order.판매처;
            this.updateDestinationOptions(order.판매처);
            
            setTimeout(() => {
                document.getElementById('destination').value = order.도착지;
            }, 100);
        }, 100);
        
        document.getElementById('category').value = order.분류;
        this.updateProductOptions(order.분류);
        
        setTimeout(() => {
            document.getElementById('product').value = order.품목;
        }, 100);
        
        document.getElementById('quantity').value = this.formatNumber(order.수량);
        document.getElementById('price').value = this.formatNumber(order.단가);
        document.getElementById('deliveryDate').value = order.도착일;
        document.getElementById('deliveryTime').value = order.도착시간;
        
        this.calculateTotal();
    }

    // 🗑️ 선택된 주문들 삭제
    deleteSelectedOrders() {
        const selectedCheckboxes = document.querySelectorAll('input[name="orderSelect"]:checked');
        if (selectedCheckboxes.length === 0) {
            this.showNotification('삭제할 주문을 선택해주세요.', 'warning');
            return;
        }
        
        if (!confirm(`선택된 ${selectedCheckboxes.length}개의 주문을 삭제하시겠습니까?`)) {
            return;
        }
        
        const orderIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        // 과거 주문 삭제 방지
        const pastOrders = orderIds.filter(id => {
            const order = this.orders.find(o => o.id === id);
            return order && this.isDatePast(order.도착일);
        });
        
        if (pastOrders.length > 0) {
            this.showNotification('과거 주문은 삭제할 수 없습니다.', 'warning');
            return;
        }
        
        // 주문 삭제
        this.orders = this.orders.filter(order => !orderIds.includes(order.id));
        this.saveOrdersToLocal();
        this.updateOrderDisplay();
        
        this.showNotification(`${orderIds.length}개의 주문이 삭제되었습니다.`, 'success');
    }

    // 🔥 Firebase 저장
    async saveToFirebase(orderData) {
        if (!this.isFirebaseEnabled) return;
        
        try {
            await this.firebaseDb.ref('orders').child(orderData.id).set(orderData);
            console.log('🔥 Firebase 저장 완료');
        } catch (error) {
            console.error('❌ Firebase 저장 실패:', error);
            // Firebase 실패해도 로컬 저장은 유지
        }
    }

    // 🔄 Firebase 실시간 동기화 설정
    setupFirebaseSync() {
        if (!this.isFirebaseEnabled) return;
        
        this.firebaseDb.ref('orders').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const firebaseOrders = Object.values(data);
                
                // 로컬 데이터와 병합 (중복 제거)
                const existingIds = this.orders.map(order => order.id);
                const newOrders = firebaseOrders.filter(order => !existingIds.includes(order.id));
                
                if (newOrders.length > 0) {
                    this.orders = [...this.orders, ...newOrders];
                    this.saveOrdersToLocal();
                    this.updateOrderDisplay();
                    console.log(`🔄 Firebase에서 ${newOrders.length}개 주문 동기화 완료`);
                }
            }
        });
    }

    // 📋 주문 목록 표시 업데이트
    updateOrderDisplay() {
        const container = document.getElementById('orderListContainer');
        if (!container) return;
        
        let filteredOrders = [...this.orders];
        
        // 보기 모드에 따른 필터링
        switch (this.viewMode) {
            case 'upcoming':
                filteredOrders = filteredOrders.filter(order => !this.isDatePast(order.도착일));
                break;
            case 'my':
                filteredOrders = filteredOrders.filter(order => 
                    order.담당자 === this.currentUser.name && !this.isDatePast(order.도착일)
                );
                break;
            case 'my-all':
                filteredOrders = filteredOrders.filter(order => order.담당자 === this.currentUser.name);
                break;
            case 'all':
            default:
                // 모든 주문 표시
                break;
        }
        
        if (filteredOrders.length === 0) {
            container.innerHTML = '<div class="no-orders">표시할 주문이 없습니다.</div>';
            return;
        }
        
        // 최신순으로 정렬
        const sortedOrders = filteredOrders.sort((a, b) => 
            new Date(b.주문일시) - new Date(a.주문일시)
        );
        
        container.innerHTML = sortedOrders.map(order => {
            const isPast = this.isDatePast(order.도착일);
            const isEditable = !isPast;
            
            return `
                <div class="order-item ${isPast ? 'past-order' : ''}">
                    <div class="order-header">
                        <div class="order-select">
                            <input type="checkbox" name="orderSelect" value="${order.id}" 
                                   ${isEditable ? '' : 'disabled'} class="order-checkbox">
                        </div>
                        <span class="order-id">${order.id}</span>
                        <span class="order-date">${new Date(order.주문일시).toLocaleDateString('ko-KR')}</span>
                        ${isPast ? '<span class="past-badge">완료</span>' : '<span class="upcoming-badge">예정</span>'}
                    </div>
                    <div class="order-content">
                        <div><strong>담당자:</strong> ${order.담당자}</div>
                        <div><strong>판매처:</strong> ${order.판매처}</div>
                        <div><strong>품목:</strong> ${order.품목}</div>
                        <div><strong>수량:</strong> ${this.formatNumber(order.수량)}kg</div>
                        <div><strong>도착일:</strong> ${order.도착일} ${order.도착시간}</div>
                        <div><strong>총액:</strong> ${order.총금액}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 체크박스 전체 선택/해제 기능
        this.setupSelectAllCheckbox();
    }

    // ☑️ 전체 선택 체크박스 설정
    setupSelectAllCheckbox() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('input[name="orderSelect"]:not(:disabled)');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                
                checkboxes.forEach(cb => {
                    cb.checked = !allChecked;
                });
            });
        }
    }

    // 🧹 폼 초기화
    resetForm() {
        const form = document.querySelector('#orderForm form');
        if (form) {
            form.reset();
        }
        
        // 편집 모드 해제
        this.editingOrderId = null;
        
        // 선택 박스들 초기화
        this.clearSelect('seller');
        this.clearSelect('destination');
        this.clearSelect('product');
        
        // 총액 초기화
        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            totalElement.textContent = '0원';
        }
        
        // 기본값 다시 설정
        this.setDefaultFormValues();
    }

    // 🆔 주문 ID 생성
    generateOrderId() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `TR${dateStr}${timeStr}${random}`;
    }

    // 🔢 숫자 파싱 (콤마 제거)
    parseNumber(str) {
        return parseInt(str.replace(/[^0-9]/g, '')) || 0;
    }

    // 🔢 숫자 포맷팅 (콤마 추가)
    formatNumber(num) {
        return num.toLocaleString('ko-KR');
    }

    // 📊 고급 기능: 통계 대시보드
    showStatistics() {
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        
        const monthlyOrders = this.orders.filter(order => {
            const orderDate = new Date(order.주문일시);
            return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear;
        });
        
        const totalAmount = monthlyOrders.reduce((sum, order) => {
            return sum + this.parseNumber(order.총금액.replace('원', ''));
        }, 0);
        
        const stats = {
            totalOrders: this.orders.length,
            monthlyOrders: monthlyOrders.length,
            totalAmount: this.formatNumber(totalAmount),
            upcomingOrders: this.orders.filter(order => !this.isDatePast(order.도착일)).length
        };
        
        console.log('📊 주문 통계:', stats);
        return stats;
    }

    // 📤 고급 기능: 데이터 내보내기
    exportData(format = 'json') {
        const data = {
            orders: this.orders,
            exportDate: new Date().toISOString(),
            exportedBy: this.currentUser.name
        };
        
        let content, filename, mimeType;
        
        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `tr_orders_${new Date().toISOString().slice(0, 10)}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            const headers = ['주문ID', '담당자', '판매처', '도착지', '분류', '품목', '수량', '단가', '총금액', '도착일', '도착시간', '주문일시'];
            const rows = this.orders.map(order => [
                order.id, order.담당자, order.판매처, order.도착지, order.분류, order.품목,
                order.수량, order.단가, order.총금액, order.도착일, order.도착시간, order.주문일시
            ]);
            
            content = [headers, ...rows].map(row => row.join(',')).join('\n');
            filename = `tr_orders_${new Date().toISOString().slice(0, 10)}.csv`;
            mimeType = 'text/csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification(`데이터가 ${format.toUpperCase()} 형식으로 내보내졌습니다.`, 'success');
    }

    // 📥 고급 기능: 데이터 가져오기
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.orders && Array.isArray(data.orders)) {
                    // 중복 제거하며 병합
                    const existingIds = this.orders.map(order => order.id);
                    const newOrders = data.orders.filter(order => !existingIds.includes(order.id));
                    
                    this.orders = [...this.orders, ...newOrders];
                    this.saveOrdersToLocal();
                    this.updateOrderDisplay();
                    
                    this.showNotification(`${newOrders.length}개의 주문이 가져와졌습니다.`, 'success');
                } else {
                    throw new Error('올바르지 않은 데이터 형식입니다.');
                }
            } catch (error) {
                console.error('❌ 데이터 가져오기 실패:', error);
                this.showNotification('데이터 가져오기에 실패했습니다.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // 🔍 고급 기능: 주문 검색
    searchOrders(query) {
        if (!query.trim()) {
            this.updateOrderDisplay();
            return;
        }
        
        const filteredOrders = this.orders.filter(order => {
            return Object.values(order).some(value => 
                String(value).toLowerCase().includes(query.toLowerCase())
            );
        });
        
        this.displaySearchResults(filteredOrders);
    }

    // 🔍 검색 결과 표시
    displaySearchResults(orders) {
        const container = document.getElementById('orderListContainer');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="no-orders">검색 결과가 없습니다.</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const isPast = this.isDatePast(order.도착일);
            const isEditable = !isPast;
            
            return `
                <div class="order-item ${isPast ? 'past-order' : ''}">
                    <div class="order-header">
                        <div class="order-select">
                            <input type="checkbox" name="orderSelect" value="${order.id}" 
                                   ${isEditable ? '' : 'disabled'} class="order-checkbox">
                        </div>
                        <span class="order-id">${order.id}</span>
                        <span class="order-date">${new Date(order.주문일시).toLocaleDateString('ko-KR')}</span>
                        ${isPast ? '<span class="past-badge">완료</span>' : '<span class="upcoming-badge">예정</span>'}
                    </div>
                    <div class="order-content">
                        <div><strong>담당자:</strong> ${order.담당자}</div>
                        <div><strong>판매처:</strong> ${order.판매처}</div>
                        <div><strong>품목:</strong> ${order.품목}</div>
                        <div><strong>수량:</strong> ${this.formatNumber(order.수량)}kg</div>
                        <div><strong>도착일:</strong> ${order.도착일} ${order.도착시간}</div>
                        <div><strong>총액:</strong> ${order.총금액}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 🚀 앱 시작
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 티알코리아 주문시스템 V3.0.0 시작...');
    
    try {
        // 전역 앱 인스턴스 생성
        window.trOrderApp = new TROrderSystem();
        
        // 초기화
        await window.trOrderApp.init();
        
        console.log('✅ 시스템 준비 완료!');
        
    } catch (error) {
        console.error('❌ 앱 시작 실패:', error);
        
        // 오류 발생 시 로딩 스피너 숨기기
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
            spinner.style.display = 'none';
        }
        
        // 기본 로그인 화면 표시
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'flex';
        }
    }
});