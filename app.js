// 🚀 티알코리아 주문시스템 V3.0 - 처음부터 새로 작성
// 📅 2025년 1월 - 완전히 새로운 접근

class TROrderSystem {
    constructor() {
        // 🔧 핵심 데이터
        this.currentUser = null;
        this.orders = [];
        this.database = null;
        this.users = {};
        
        // 🔥 Firebase 설정
        this.firebaseConfig = null;
        this.firebaseApp = null;
        this.firebaseDb = null;
        this.isFirebaseEnabled = false;
        
        console.log('🚀 티알코리아 주문시스템 V3.0 초기화...');
    }

    // 🚀 시스템 초기화 (순서대로 실행)
    async init() {
        try {
            console.log('1️⃣ 사용자 설정 로드 중...');
            await this.loadUsers();
            
            console.log('2️⃣ 제품 데이터베이스 로드 중...');
            await this.loadDatabase();
            
            console.log('3️⃣ Firebase 초기화 중...');
            await this.initFirebase();
            
            console.log('4️⃣ 이벤트 리스너 설정 중...');
            this.setupEventListeners();
            
            console.log('5️⃣ 로컬 주문 데이터 로드 중...');
            await this.loadOrders();
            
            console.log('✅ 시스템 초기화 완료!');
            this.showLoginScreen();
            
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
        }
    }

    // 👥 사용자 설정 로드
    async loadUsers() {
        try {
            const response = await fetch('./user_config.json');
            if (!response.ok) throw new Error('사용자 설정 파일을 찾을 수 없습니다.');
            
            const config = await response.json();
            this.users = config.users || {};
            
            console.log(`✅ 사용자 ${Object.keys(this.users).length}명 로드 완료`);
            this.populateUserSelect();
            
        } catch (error) {
            console.error('❌ 사용자 설정 로드 실패:', error);
            // 기본 사용자로 대체
            this.users = {
                "김정진": { "pin": "9736", "name": "김정진", "role": "대표이사" },
                "박경범": { "pin": "5678", "name": "박경범", "role": "상무" }
            };
            this.populateUserSelect();
        }
    }

    // 🗄️ 제품 데이터베이스 로드
    async loadDatabase() {
        try {
            const response = await fetch('./database_optimized.json');
            if (!response.ok) throw new Error('데이터베이스 파일을 찾을 수 없습니다.');
            
            this.database = await response.json();
            console.log('✅ 제품 데이터베이스 로드 완료');
            
            this.populateFormSelects();
            
        } catch (error) {
            console.error('❌ 데이터베이스 로드 실패:', error);
            this.showError('제품 데이터베이스 로드에 실패했습니다.');
        }
    }

    // 🔥 Firebase 초기화
    async initFirebase() {
        try {
            const response = await fetch('./firebase-config.json');
            if (!response.ok) {
                console.log('ℹ️ Firebase 설정 파일이 없습니다. 로컬 모드로 실행됩니다.');
                return;
            }
            
            this.firebaseConfig = await response.json();
            
            // Firebase 초기화
            if (typeof firebase !== 'undefined') {
                this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
                this.firebaseDb = firebase.database();
                this.isFirebaseEnabled = true;
                
                console.log('🔥 Firebase 연결 성공!');
                
                // 실시간 동기화 설정
                this.setupFirebaseSync();
                
            } else {
                console.warn('⚠️ Firebase SDK가 로드되지 않았습니다.');
            }
            
        } catch (error) {
            console.error('❌ Firebase 초기화 실패:', error);
            console.log('📱 로컬 모드로 계속 진행합니다.');
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
        
        // 분류 옵션 (설탕, 밀가루, 등)
        const categorySelect = document.getElementById('category');
        if (categorySelect && this.database.products_by_category) {
            categorySelect.innerHTML = '<option value="">분류 선택</option>';
            Object.keys(this.database.products_by_category).forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        console.log('✅ 폼 선택 옵션 설정 완료');
    }

    // 👤 로그인 사용자 선택 옵션
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
    }

    // 🎯 이벤트 리스너 설정
    setupEventListeners() {
        // 로그인 버튼
        document.getElementById('loginBtn')?.addEventListener('click', () => this.handleLogin());
        
        // 로그아웃 버튼
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        
        // 주문 저장 버튼
        document.getElementById('saveOrderBtn')?.addEventListener('click', () => this.saveOrder());
        
        // 폼 초기화 버튼
        document.getElementById('resetFormBtn')?.addEventListener('click', () => this.resetForm());
        
        // 하단 네비게이션
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.showScreen(screen);
            });
        });
        
        // 담당자 변경 시 판매처 업데이트
        document.getElementById('manager')?.addEventListener('change', (e) => {
            this.updateSellerOptions(e.target.value);
        });
        
        // 판매처 변경 시 도착지 업데이트
        document.getElementById('seller')?.addEventListener('change', (e) => {
            this.updateDestinationOptions(e.target.value);
        });
        
        // 분류 변경 시 품목 업데이트
        document.getElementById('category')?.addEventListener('change', (e) => {
            this.updateProductOptions(e.target.value);
        });
        
        // 수량, 단가 입력 시 총액 계산
        document.getElementById('quantity')?.addEventListener('input', () => this.calculateTotal());
        document.getElementById('price')?.addEventListener('input', () => this.calculateTotal());
        
        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // 🔐 로그인 처리
    handleLogin() {
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

    // 🏠 로그인 화면 표시
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        
        // 로그인 폼 초기화
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPin').value = '';
    }

    // 📱 메인 앱 화면 표시
    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // 사용자 정보 표시
        const userDisplay = document.getElementById('currentUserName');
        if (userDisplay && this.currentUser) {
            userDisplay.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
        }
        
        // 기본적으로 주문 입력 화면 표시
        this.showScreen('orderForm');
        
        // 폼에 기본값 설정
        this.setDefaultFormValues();
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
        
        const sellers = this.database.sellers_by_manager?.[selectedManager] || [];
        
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
        
        const products = this.database.products_by_category?.[selectedCategory] || [];
        
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
        const orderData = this.getFormData();
        
        if (!this.validateOrderData(orderData)) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const order = {
                id: this.generateOrderId(),
                ...orderData,
                주문자: this.currentUser.name,
                주문일시: new Date().toISOString(),
                총금액: this.formatNumber(orderData.수량 * orderData.단가) + '원'
            };
            
            // 로컬에 저장
            this.orders.push(order);
            this.saveOrdersToLocal();
            
            // Firebase에 저장 (가능한 경우)
            let firebaseSaved = false;
            if (this.isFirebaseEnabled) {
                firebaseSaved = await this.saveToFirebase(order);
            }
            
            // 성공 메시지
            if (firebaseSaved) {
                this.showNotification('✅ 주문이 클라우드에 저장되었습니다!\n모든 팀원이 실시간으로 확인할 수 있습니다.', 'success');
            } else {
                this.showNotification('💾 주문이 로컬에 저장되었습니다.', 'success');
            }
            
            this.resetForm();
            this.showScreen('orderList');
            
        } catch (error) {
            console.error('❌ 주문 저장 실패:', error);
            this.showNotification('주문 저장에 실패했습니다.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 📋 폼 데이터 수집
    getFormData() {
        return {
            담당자: document.getElementById('manager')?.value || '',
            판매처: document.getElementById('seller')?.value || '',
            도착지: document.getElementById('destination')?.value || '',
            분류: document.getElementById('category')?.value || '',
            품목: document.getElementById('product')?.value || '',
            수량: this.parseNumber(document.getElementById('quantity')?.value || '0'),
            단가: this.parseNumber(document.getElementById('price')?.value || '0'),
            도착일: document.getElementById('deliveryDate')?.value || '',
            도착시간: document.getElementById('deliveryTime')?.value || ''
        };
    }

    // ✅ 주문 데이터 검증
    validateOrderData(data) {
        const required = ['담당자', '판매처', '도착지', '분류', '품목', '도착일', '도착시간'];
        
        for (const field of required) {
            if (!data[field]) {
                this.showNotification(`${field}을(를) 입력해주세요.`, 'warning');
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

    // 🔥 Firebase에 저장
    async saveToFirebase(order) {
        if (!this.isFirebaseEnabled) return false;
        
        try {
            await this.firebaseDb.ref(`orders/${order.id}`).set({
                ...order,
                저장시간: firebase.database.ServerValue.TIMESTAMP,
                저장자: this.currentUser.name
            });
            
            console.log('🔥 Firebase 저장 성공:', order.id);
            return true;
            
        } catch (error) {
            console.error('🔥 Firebase 저장 실패:', error);
            return false;
        }
    }

    // 💾 로컬 저장
    saveOrdersToLocal() {
        try {
            localStorage.setItem('tr_orders', JSON.stringify(this.orders));
            console.log('💾 로컬 저장 완료');
        } catch (error) {
            console.error('💾 로컬 저장 실패:', error);
        }
    }

    // 📖 주문 데이터 로드
    async loadOrders() {
        try {
            const savedOrders = localStorage.getItem('tr_orders');
            if (savedOrders) {
                this.orders = JSON.parse(savedOrders);
                console.log(`📖 로컬에서 ${this.orders.length}개 주문 로드`);
            }
        } catch (error) {
            console.error('📖 주문 로드 실패:', error);
            this.orders = [];
        }
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

    // ⏳ 로딩 표시
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    }

    // 📢 알림 메시지 표시
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        if (!notification || !text) return;
        
        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        // 3초 후 자동 숨김
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
        
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    // ❌ 에러 표시
    showError(message) {
        this.showNotification(message, 'error');
    }
}

// 🚀 앱 시작
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 티알코리아 주문시스템 V3.0 시작...');
    
    // 전역 앱 인스턴스 생성
    window.trOrderApp = new TROrderSystem();
    
    // 초기화
    await window.trOrderApp.init();
    
    console.log('✅ 시스템 준비 완료!');
}); 