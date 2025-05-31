// 🚀 티알코리아 주문시스템 V2.0 - 완전 재작성
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

    // 🚀 앱 초기화
    async init() {
        console.log('🚀 티알코리아 주문시스템 V2.0 초기화 시작...');
        
        try {
            // 1️⃣ 데이터 로드
            await this.loadUserConfig();
            await this.loadDatabase();
            await this.loadOrders();
            
            // 2️⃣ 이벤트 설정
            this.setupEventListeners();
            
            // 3️⃣ UI 초기화
            this.populateUserSelect();
            this.populateFormSelects();
            this.setDefaultDate();
            
            console.log('✅ 앱 초기화 완료!');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            this.showNotification('앱 초기화에 실패했습니다', 'error');
        }
    }

    // 👥 사용자 설정 로드
    async loadUserConfig() {
        try {
            console.log('📂 사용자 설정 로드 중...');
            const response = await fetch('./user_config.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const config = await response.json();
            this.users = config.users || {};
            
            console.log('✅ 사용자 설정 로드 완료:', Object.keys(this.users));
            
        } catch (error) {
            console.error('❌ 사용자 설정 로드 실패:', error);
            this.showNotification('사용자 설정을 불러올 수 없습니다', 'error');
        }
    }

    // 🗄️ 데이터베이스 로드
    async loadDatabase() {
        try {
            console.log('📂 데이터베이스 로드 시작...');
            
            const response = await fetch('./database_optimized.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.database = await response.json();
            console.log('✅ 데이터베이스 로드 완료:', this.database);
            
            // 데이터 구조 확인
            if (this.database && this.database.sellers_by_manager) {
                console.log('👥 담당자별 판매처 데이터 확인됨');
            }
            if (this.database && this.database.destinations_by_seller) {
                console.log('📍 판매처별 도착지 데이터 확인됨');
            }
            if (this.database && this.database.categories) {
                console.log('📦 분류별 품목 데이터 확인됨');
            }
            
        } catch (error) {
            console.error('❌ 데이터베이스 로드 실패:', error);
            this.showNotification('데이터베이스 로드에 실패했습니다', 'error');
        }
    }

    // 📋 주문 데이터 로드
    async loadOrders() {
        try {
            console.log('📋 주문 데이터 로드 중...');
            
            // localStorage에서 주문 데이터 로드
            const savedOrders = localStorage.getItem('orders');
            if (savedOrders) {
                this.orders = JSON.parse(savedOrders);
                console.log(`✅ ${this.orders.length}개 주문 로드 완료`);
            } else {
                this.orders = [];
                console.log('📝 새로운 주문 목록 생성');
            }
            
        } catch (error) {
            console.error('❌ 주문 데이터 로드 실패:', error);
            this.orders = [];
        }
    }

    // 🎯 이벤트 리스너 설정
    setupEventListeners() {
        console.log('🎯 이벤트 리스너 설정 중...');
        
        // 🔐 로그인 관련
        const loginBtn = document.getElementById('loginBtn');
        const loginPin = document.getElementById('loginPin');
        
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

        // 🚪 로그아웃
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // 🔽 네비게이션 버튼들
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetScreen = e.currentTarget.dataset.screen;
                this.switchScreen(targetScreen);
            });
        });

        // 📝 주문 폼 관련
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleOrderSubmit();
            });
        }

        // 🔄 초기화 버튼
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetOrderForm());
        }

        // 🔍 검색 기능
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debounce(() => this.filterOrders(), 300);
            });
        }

        // 📊 필터 기능
        const filterManager = document.getElementById('filterManager');
        const filterDate = document.getElementById('filterDate');
        const showPastOrders = document.getElementById('showPastOrders');
        
        if (filterManager) {
            filterManager.addEventListener('change', () => this.filterOrders());
        }
        
        if (filterDate) {
            filterDate.addEventListener('change', () => this.filterOrders());
        }
        
        if (showPastOrders) {
            showPastOrders.addEventListener('change', () => this.filterOrders());
        }

        // 🔗 연동 선택 (담당자 → 판매처 → 도착지 → 분류 → 품목)
        this.setupCascadingSelects();

        // 📢 알림 닫기
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => this.hideNotification());
        }

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // 🔐 로그인 처리
    handleLogin() {
        const userSelect = document.getElementById('loginUser');
        const pinInput = document.getElementById('loginPin');
        
        const selectedUser = userSelect.value;
        const enteredPin = pinInput.value;
        
        console.log('🔐 로그인 시도:', { user: selectedUser, pin: '****' });
        
        // 🔍 입력 검증
        if (!selectedUser) {
            this.showNotification('담당자를 선택해주세요', 'warning');
            return;
        }
        
        if (!enteredPin || enteredPin.length !== 4) {
            this.showNotification('4자리 PIN을 입력해주세요', 'warning');
            return;
        }
        
        // 🔑 사용자 인증
        const user = this.users[selectedUser];
        if (!user) {
            this.showNotification('존재하지 않는 사용자입니다', 'error');
            return;
        }
        
        if (user.pin !== enteredPin) {
            this.showNotification('PIN이 일치하지 않습니다', 'error');
            return;
        }
        
        // ✅ 로그인 성공
        this.currentUser = user;
        console.log('✅ 로그인 성공:', user.name);
        
        // 🎯 메인 앱으로 전환
        this.showMainApp();
        this.showNotification(`환영합니다, ${user.name}님!`, 'success');
        
        // 📝 주문 폼에 기본 담당자 설정
        this.setDefaultManager();
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

    // 📱 메인 앱 표시
    showMainApp() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.remove('active');
        if (mainApp) mainApp.classList.remove('hidden');
        
        // 👤 사용자 정보 표시
        this.updateUserDisplay();
        
        // 📝 폼 데이터 로드
        this.populateFormSelects();
        this.loadOrderList();
        
        console.log('📱 메인 앱 표시 완료');
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
    updateUserDisplay() {
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        if (currentUserDisplay && this.currentUser) {
            currentUserDisplay.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
        }
    }

    // 🔄 화면 전환
    switchScreen(screenId) {
        console.log(`🔄 화면 전환: ${screenId}`);
        
        // 🔲 모든 화면 숨기기
        const allScreens = document.querySelectorAll('.content-screen');
        allScreens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 🔲 모든 네비게이션 버튼 비활성화
        const allNavBtns = document.querySelectorAll('.nav-btn');
        allNavBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // ✅ 대상 화면 활성화
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // ✅ 해당 네비게이션 버튼 활성화
        const targetNavBtn = document.querySelector(`[data-screen="${screenId}"]`);
        if (targetNavBtn) {
            targetNavBtn.classList.add('active');
        }
        
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

    // 👥 로그인 사용자 선택 옵션 채우기
    populateUserSelect() {
        const loginUser = document.getElementById('loginUser');
        if (!loginUser) return;
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (loginUser.children.length > 1) {
            loginUser.removeChild(loginUser.lastChild);
        }
        
        // 👥 사용자 목록 추가
        Object.keys(this.users).forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = `${userName} (${this.users[userName].role})`;
            loginUser.appendChild(option);
        });
        
        console.log('👥 로그인 사용자 옵션 업데이트 완료');
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
        
        // 🔗 연동 선택 설정
        this.setupCascadingSelects();
        
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

    // 🔗 연동 선택 설정
    setupCascadingSelects() {
        console.log('🔗 연동 선택 설정 시작...');
        
        // 👥 담당자 변경 시 판매처 업데이트
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            managerSelect.addEventListener('change', (e) => {
                console.log(`👤 담당자 선택: ${e.target.value}`);
                this.updateSellerOptions(e.target.value);
                this.clearDownstreamSelects(['seller', 'destination', 'product']);
            });
        }
        
        // 🏢 판매처 변경 시 도착지 업데이트
        const sellerSelect = document.getElementById('seller');
        if (sellerSelect) {
            sellerSelect.addEventListener('change', (e) => {
                console.log(`🏢 판매처 선택: ${e.target.value}`);
                this.updateDestinationOptions(e.target.value);
                this.clearDownstreamSelects(['destination', 'product']);
            });
        }
        
        // 📂 분류 라디오 버튼 변경 시 품목 업데이트
        const categoryRadios = document.querySelectorAll('input[name="category"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log(`📂 분류 선택: ${e.target.value}`);
                    this.updateProductOptions(e.target.value);
                    this.clearDownstreamSelects(['product']);
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

        // 🍯 기본값으로 설탕 선택 시 품목 로드
        setTimeout(() => {
            this.updateProductOptions('설탕');
        }, 100);
        
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

    // 📍 도착지 옵션 업데이트
    updateDestinationOptions(selectedSeller) {
        const destinationSelect = document.getElementById('destination');
        if (!destinationSelect || !this.database || !selectedSeller) return;
        
        console.log(`📍 ${selectedSeller}의 도착지 업데이트 시작...`);
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (destinationSelect.children.length > 1) {
            destinationSelect.removeChild(destinationSelect.lastChild);
        }
        
        // 📊 판매처별 도착지 가져오기
        const destinations = this.database.destinations_by_seller?.[selectedSeller] || [];
        
        if (destinations.length === 0) {
            console.warn(`⚠️ ${selectedSeller}의 도착지가 없습니다`);
            return;
        }
        
        // 📍 도착지 옵션 추가
        destinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination;
            option.textContent = destination;
            destinationSelect.appendChild(option);
        });
        
        console.log(`📍 ${selectedSeller}의 도착지 ${destinations.length}개 로드 완료`);
    }

    // 📦 품목 옵션 업데이트
    updateProductOptions(selectedCategory) {
        const productSelect = document.getElementById('product');
        if (!productSelect || !this.database || !selectedCategory) return;
        
        console.log(`📦 ${selectedCategory}의 품목 업데이트 시작...`);
        
        // 🧹 기존 옵션 제거 (첫 번째 제외)
        while (productSelect.children.length > 1) {
            productSelect.removeChild(productSelect.lastChild);
        }
        
        // 📊 분류별 품목 가져오기
        const products = this.database.items?.[selectedCategory] || [];
        
        if (products.length === 0) {
            console.warn(`⚠️ ${selectedCategory}의 품목이 없습니다`);
            return;
        }
        
        // 📦 품목 옵션 추가
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productSelect.appendChild(option);
        });
        
        console.log(`📦 ${selectedCategory}의 품목 ${products.length}개 로드 완료`);
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

    // 🧹 하위 선택 옵션들 초기화
    clearDownstreamSelects(selectIds) {
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                // 첫 번째 옵션(기본값)만 남기고 나머지 제거
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                select.selectedIndex = 0;
            }
        });
    }

    // 📅 기본 날짜 설정 (오늘)
    setDefaultDate() {
        const deliveryDate = document.getElementById('deliveryDate');
        if (deliveryDate) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            deliveryDate.value = formattedDate;
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

    // 🔄 주문 폼 초기화
    resetOrderForm() {
        const form = document.getElementById('orderForm');
        if (form) {
            form.reset();
        }
        
        // 📅 기본 날짜 재설정
        this.setDefaultDate();
        
        // 👤 기본 담당자 재설정
        this.setDefaultManager();
        
        // 💰 총액 초기화
        const totalAmountDiv = document.getElementById('totalAmount');
        if (totalAmountDiv) {
            totalAmountDiv.textContent = '0원';
        }
        
        console.log('🔄 주문 폼 초기화 완료');
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
        
        const container = document.getElementById('orderListContainer');
        if (!container) return;
        
        // 🧹 기존 목록 제거
        container.innerHTML = '';
        
        if (this.orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>등록된 주문이 없습니다</p>
                </div>
            `;
            return;
        }
        
        // 📅 최신 주문부터 표시
        const sortedOrders = [...this.orders].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        sortedOrders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            container.appendChild(orderElement);
        });
        
        console.log(`📋 ${sortedOrders.length}개 주문 표시 완료`);
    }

    // 📋 주문 요소 생성
    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.dataset.orderId = order.id;
        
        const createdDate = new Date(order.createdAt).toLocaleString('ko-KR');
        const deliveryDateTime = `${order.deliveryDate} ${order.deliveryTime}`;
        
        orderDiv.innerHTML = `
            <div class="order-header">
                <span class="order-id">${order.id}</span>
                <span class="order-date">${createdDate}</span>
            </div>
            
            <div class="order-details">
                <div class="order-detail">
                    <span class="order-detail-label">👤 담당자</span>
                    <span class="order-detail-value">${order.manager}</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">🏢 판매처</span>
                    <span class="order-detail-value">${order.seller}</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">📍 도착지</span>
                    <span class="order-detail-value">${order.destination}</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">📦 품목</span>
                    <span class="order-detail-value">${order.product}</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">⚖️ 수량</span>
                    <span class="order-detail-value">${parseFloat(order.quantity).toLocaleString('ko-KR')} KG</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">💰 단가</span>
                    <span class="order-detail-value">${parseFloat(order.price).toLocaleString('ko-KR')}원</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">💵 총액</span>
                    <span class="order-detail-value">${order.totalAmount.toLocaleString('ko-KR')}원</span>
                </div>
                <div class="order-detail">
                    <span class="order-detail-label">🚚 배송</span>
                    <span class="order-detail-value">${deliveryDateTime}</span>
                </div>
            </div>
            
            <div class="order-actions">
                <button class="btn btn-sm btn-secondary" onclick="app.editOrder('${order.id}')">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-sm btn-danger" onclick="app.deleteOrder('${order.id}')">
                    <i class="fas fa-trash"></i> 삭제
                </button>
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
    debounce(func, wait) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(func, wait);
    }

    // 📂 현재 선택된 분류 가져오기
    getSelectedCategory() {
        const selectedRadio = document.querySelector('input[name="category"]:checked');
        return selectedRadio ? selectedRadio.value : '설탕';
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