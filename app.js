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
        
        console.log('🚀 티알코리아 주문시스템 V3.0.0 초기화...');
    }

    // 🎯 시스템 초기화
    async init() {
        try {
            console.log('1️⃣ 시스템 초기화 시작...');
            
            // 1. 사용자 설정 로드
            await this.loadUserConfig();
            
            // 2. 데이터베이스 로드
            await this.loadDatabase();
            
            // 3. Firebase 초기화 (선택사항)
            await this.initFirebase();
            
            // 4. 로컬 주문 데이터 로드
            this.loadOrdersFromLocal();
            
            // 5. UI 설정
            this.setupEventListeners();
            this.populateUserSelect();
            this.populateFormSelects();
            
            // 6. 로그인 화면 표시
            this.showLoginScreen();
            
            console.log('✅ 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 시스템 초기화 실패:', error);
            this.showNotification('시스템 초기화에 실패했습니다.', 'error');
            // 오류가 발생해도 로그인 화면은 표시
            this.showLoginScreen();
        } finally {
            this.showLoadingSpinner(false);
        }
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
            } else {
                spinner.classList.add('hidden');
            }
            console.log(`⏳ 로딩 스피너: ${show ? '표시' : '숨김'}`);
        }
    }

    // 🏠 로그인 화면 표시
    showLoginScreen() {
        console.log('6️⃣ 로그인 화면 표시 중...');
        
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen && mainApp) {
            loginScreen.classList.remove('hidden');
            mainApp.classList.add('hidden');
            
            // 로그인 폼 초기화
            const loginUser = document.getElementById('loginUser');
            const loginPin = document.getElementById('loginPin');
            
            if (loginUser) loginUser.value = '';
            if (loginPin) loginPin.value = '';
            
            console.log('✅ 로그인 화면 표시 완료');
        } else {
            console.error('❌ 로그인 화면 요소를 찾을 수 없습니다');
        }
    }

    // 📱 메인 앱 화면 표시
    showMainApp() {
        console.log('📱 메인 앱 화면 표시 중...');
        
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen && mainApp) {
            loginScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
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
        
        // 수량, 단가 입력 시 총액 계산
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        
        if (quantityInput) {
            quantityInput.addEventListener('input', () => this.calculateTotal());
        }
        
        if (priceInput) {
            priceInput.addEventListener('input', () => this.calculateTotal());
        }
        
        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // 👤 로그인 사용자 선택 옵션
    populateUserSelect() {
        console.log('👤 사용자 선택 옵션 설정 중...');
        
        const loginUser = document.getElementById('loginUser');
        if (!loginUser) {
            console.error('❌ 로그인 사용자 선택 요소를 찾을 수 없습니다');
            return;
        }
        
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
        console.log('📝 폼 선택 옵션 설정 중...');
        
        if (!this.database) {
            console.warn('⚠️ 데이터베이스가 없어 폼 옵션을 설정할 수 없습니다');
            return;
        }
        
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

    // 🔐 로그인 처리
    handleLogin() {
        console.log('🔐 로그인 처리 시작...');
        
        const selectedUser = document.getElementById('loginUser').value;
        const enteredPin = document.getElementById('loginPin').value;
        
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
            this.showNotification('PIN 번호가 일치하지 않습니다.', 'error');
            return;
        }
        
        // 로그인 성공
        this.currentUser = user;
        this.showMainApp();
        this.showNotification(`환영합니다, ${user.name}님!`, 'success');
        
        console.log(`✅ ${user.name} 로그인 성공`);
    }

    // 🔓 로그아웃 처리
    handleLogout() {
        this.currentUser = null;
        this.resetForm();
        this.showLoginScreen();
        this.showNotification('로그아웃되었습니다.', 'info');
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
            
            // 주문 ID 생성
            orderData.id = this.generateOrderId();
            orderData.주문일시 = new Date().toISOString();
            orderData.상태 = '대기';
            
            // 로컬 저장
            this.orders.unshift(orderData);
            this.saveOrdersToLocal();
            
            // Firebase 저장 (가능한 경우)
            if (this.isFirebaseEnabled) {
                await this.saveToFirebase(orderData);
            }
            
            // 성공 알림
            this.showNotification('주문이 성공적으로 저장되었습니다!', 'success');
            
            // 폼 초기화
            this.resetForm();
            
            console.log('✅ 주문 저장 완료:', orderData.id);
            
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
        
        if (this.orders.length === 0) {
            container.innerHTML = '<div class="no-orders">등록된 주문이 없습니다.</div>';
            return;
        }
        
        // 최신순으로 정렬
        const sortedOrders = [...this.orders].sort((a, b) => 
            new Date(b.주문일시) - new Date(a.주문일시)
        );
        
        container.innerHTML = sortedOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">${order.id}</span>
                    <span class="order-date">${new Date(order.주문일시).toLocaleDateString('ko-KR')}</span>
                </div>
                <div class="order-content">
                    <div><strong>담당자:</strong> ${order.담당자}</div>
                    <div><strong>판매처:</strong> ${order.판매처}</div>
                    <div><strong>품목:</strong> ${order.품목}</div>
                    <div><strong>수량:</strong> ${this.formatNumber(order.수량)}kg</div>
                    <div><strong>총액:</strong> ${order.총금액}</div>
                </div>
            </div>
        `).join('');
    }

    // 🧹 폼 초기화
    resetForm() {
        const form = document.querySelector('#orderForm form');
        if (form) {
            form.reset();
        }
        
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
        return parseInt(str.replace(/,/g, '')) || 0;
    }

    // 🔢 숫자 포맷팅 (콤마 추가)
    formatNumber(num) {
        return num.toLocaleString('ko-KR');
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
        }
        
        // 기본 로그인 화면 표시
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
        }
    }
}); 