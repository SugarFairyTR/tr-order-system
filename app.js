// 앱 초기화 및 전역 변수
class OrderApp {
    constructor() {
        this.database = null;
        this.orders = [];
        this.currentEditId = null;
        this.apiBaseUrl = './api'; // API 기본 URL
        this.init();
    }

    async init() {
        await this.loadDatabase();
        this.setupEventListeners();
        this.populateSelects();
        await this.loadOrders(); // API에서 주문 로드
        this.updateUI();
        
        // 오늘 날짜를 기본값으로 설정
        document.getElementById('deliveryDate').value = new Date().toISOString().split('T')[0];
        
        // PWA 설치 처리
        this.setupPWA();
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
            
            // database_optimized.json 파일 로딩 시도
            let response;
            try {
                response = await fetch('./database_optimized.json');
            } catch (error) {
                // 로컬 파일이 없으면 fallback 데이터 사용
                response = await fetch('./database_converted.json');
            }
            
            if (!response.ok) {
                throw new Error('데이터베이스 파일을 찾을 수 없습니다.');
            }
            
            this.database = await response.json();
            this.showNotification('데이터베이스를 성공적으로 로드했습니다.', 'success');
        } catch (error) {
            console.error('Database loading error:', error);
            this.showNotification('데이터베이스 로딩에 실패했습니다. 기본 데이터를 사용합니다.', 'error');
            this.database = this.getDefaultDatabase();
        } finally {
            this.showLoading(false);
        }
    }

    // 기본 데이터베이스 (fallback)
    getDefaultDatabase() {
        return {
            categories: {
                담당자: ["김정진", "박경범", "이선화", "신준호"],
                분류: ["설탕", "식품첨가물"]
            },
            items: {
                설탕: ["KBS_25KG", "MITRPHOL_25KG", "MSM_25KG"],
                식품첨가물: ["MSG_25KG", "DEXTROSE_20KG", "ERYTHRITOL_25KG"]
            },
            sellers_by_manager: {
                김정진: ["(주)동일에프앤디", "(주)정진식품"],
                박경범: ["(주) 마켓랩", "(주)다감"],
                이선화: ["(주) 빅솔반월공장", "(주) 이디야"],
                신준호: ["(주) 산호인터내셔널", "(주) 아름터"]
            },
            destinations_by_seller: {}
        };
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 네비게이션
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchScreen(btn.dataset.screen));
        });

        // 설정 버튼
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.switchScreen('settings');
        });

        // 주문 입력 폼
        document.getElementById('manager').addEventListener('change', () => this.updateSellers());
        document.getElementById('seller').addEventListener('change', () => this.updateDestinations());
        document.getElementById('category').addEventListener('change', () => this.updateProducts());
        document.getElementById('quantity').addEventListener('input', () => this.calculateTotal());
        document.getElementById('price').addEventListener('input', (e) => {
            this.formatPrice(e);
            this.calculateTotal();
        });

        // 버튼 이벤트
        document.getElementById('saveOrderBtn').addEventListener('click', () => this.saveOrder());
        document.getElementById('resetFormBtn').addEventListener('click', () => this.resetForm());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());

        // 필터 이벤트
        document.getElementById('filterManager').addEventListener('change', () => this.filterOrders());
        document.getElementById('filterDate').addEventListener('change', () => this.filterOrders());
        
        // 과거 주문 표시 체크박스 (나중에 추가되므로 이벤트 위임 사용)
        document.addEventListener('change', (e) => {
            if (e.target.id === 'showPastOrders') {
                this.filterOrders();
            }
        });

        // 알림 닫기
        document.getElementById('closeNotification').addEventListener('click', () => {
            document.getElementById('notification').classList.remove('show');
        });

        // 설정
        document.getElementById('defaultManager').addEventListener('change', (e) => {
            localStorage.setItem('defaultManager', e.target.value);
        });
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
        document.getElementById(screenName).classList.add('active');

        // 해당 네비게이션 버튼 활성화
        const navBtn = document.querySelector(`[data-screen="${screenName}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
        }

        // 화면별 특별 처리
        if (screenName === 'orderList') {
            this.displayOrders();
        } else if (screenName === 'orderEdit') {
            this.displayEditOrders();
        } else if (screenName === 'settings') {
            this.updateSettings();
        }
    }

    // 셀렉트 박스 초기화
    populateSelects() {
        // 담당자 목록
        const managerSelects = ['manager', 'filterManager', 'defaultManager'];
        managerSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select && this.database.categories.담당자) {
                select.innerHTML = selectId === 'filterManager' || selectId === 'defaultManager' 
                    ? '<option value="">전체</option>' 
                    : '<option value="">담당자 선택</option>';
                    
                this.database.categories.담당자.forEach(manager => {
                    const option = document.createElement('option');
                    option.value = manager;
                    option.textContent = manager;
                    select.appendChild(option);
                });
            }
        });

        // 분류 목록
        const categorySelect = document.getElementById('category');
        if (categorySelect && this.database.categories.분류) {
            this.database.categories.분류.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }

        // 기본 담당자 설정 로딩
        const defaultManager = localStorage.getItem('defaultManager');
        if (defaultManager) {
            document.getElementById('defaultManager').value = defaultManager;
            document.getElementById('manager').value = defaultManager;
            this.updateSellers();
        }
    }

    // 판매처 업데이트
    updateSellers() {
        const manager = document.getElementById('manager').value;
        const sellerSelect = document.getElementById('seller');
        
        sellerSelect.innerHTML = '<option value="">판매처 선택</option>';
        
        if (manager && this.database.sellers_by_manager && this.database.sellers_by_manager[manager]) {
            this.database.sellers_by_manager[manager].forEach(seller => {
                const option = document.createElement('option');
                option.value = seller;
                option.textContent = seller;
                sellerSelect.appendChild(option);
            });
        }
        
        // 도착지 초기화
        document.getElementById('destination').innerHTML = '<option value="">도착지 선택</option>';
    }

    // 도착지 업데이트
    updateDestinations() {
        const seller = document.getElementById('seller').value;
        const destinationSelect = document.getElementById('destination');
        
        destinationSelect.innerHTML = '<option value="">도착지 선택</option>';
        
        if (seller && this.database.destinations_by_seller && this.database.destinations_by_seller[seller]) {
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
        
        productSelect.innerHTML = '<option value="">품목 선택</option>';
        
        if (category && this.database.items && this.database.items[category]) {
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

    // 주문 저장 (API 사용)
    async saveOrder() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            this.showLoading(true);

            if (this.currentEditId) {
                // 주문 수정
                await this.apiCall(`/orders/${this.currentEditId}`, 'PUT', formData);
                this.showNotification('주문이 성공적으로 수정되었습니다.', 'success');
                this.currentEditId = null;
            } else {
                // 신규 주문 추가
                await this.apiCall('/orders', 'POST', formData);
                this.showNotification('주문이 성공적으로 저장되었습니다. (MOBILE_LOG.json)', 'success');
            }

            await this.loadOrders(); // 서버에서 최신 데이터 다시 로드
            this.resetForm();
            this.updateUI();

        } catch (error) {
            this.showNotification(`저장 실패: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
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
            total: parseInt(document.getElementById('quantity').value || 0) * 
                   parseInt(document.getElementById('price').value.replace(/[^\d]/g, '') || 0)
        };
    }

    // 폼 유효성 검사
    validateForm(data) {
        const required = ['manager', 'seller', 'destination', 'category', 'product', 'quantity', 'price', 'deliveryDate'];
        
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

        return true;
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
            deliveryDate: '도착일'
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
        document.getElementById('totalAmount').textContent = '0원';
        
        if (localStorage.getItem('defaultManager')) {
            this.updateSellers();
        }
        
        this.currentEditId = null;
    }

    // 주문 목록 표시
    displayOrders() {
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
        let filtered = [...this.orders];
        
        const dateFilter = document.getElementById('filterDate').value;
        const showPastOrders = document.getElementById('showPastOrders')?.checked || false;
        
        // 기본적으로 당일~미래 주문만 표시 (과거 주문 숨김)
        if (!dateFilter && !showPastOrders) {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(order => order.deliveryDate >= today);
        }
        
        const managerFilter = document.getElementById('filterManager').value;
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
        
        div.innerHTML = `
            <div class="order-header">
                <span class="order-id">#${order.id.substr(-6)}</span>
                <span class="order-date">${this.formatDateRelative(order.deliveryDate)}</span>
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
                        futureOrders.map(order => 
                            `<option value="${order.id}">#${order.id.substr(-6)} - ${order.seller} (${this.formatDateRelative(order.deliveryDate)})</option>`
                        ).join('') +
                        '</optgroup>'
                        : ''
                    }
                    ${pastOrders.length > 0 ? 
                        `<optgroup label="📋 과거 주문 (${pastOrders.length}건)">` +
                        pastOrders.map(order => 
                            `<option value="${order.id}">#${order.id.substr(-6)} - ${order.seller} (${this.formatDateRelative(order.deliveryDate)})</option>`
                        ).join('') +
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
                    this.calculateTotal();
                }, 100);
            }, 100);
        }, 100);

        // 주문 입력 화면으로 이동
        this.switchScreen('orderForm');
        this.showNotification('주문을 불러왔습니다. 수정 후 저장해주세요.', 'success');
    }

    // 주문 삭제 (API 사용)
    async deleteOrder(orderId) {
        if (confirm('정말로 이 주문을 삭제하시겠습니까?')) {
            try {
                this.showLoading(true);
                await this.apiCall(`/orders/${orderId}`, 'DELETE');
                await this.loadOrders(); // 서버에서 최신 데이터 다시 로드
                this.updateUI();
                this.displayEditOrders();
                this.showNotification('주문이 삭제되었습니다. (MOBILE_LOG.json)', 'success');
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

    // 설정 업데이트
    updateSettings() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        document.getElementById('orderCount').textContent = this.orders.length;
        
        const defaultManager = localStorage.getItem('defaultManager');
        if (defaultManager) {
            document.getElementById('defaultManager').value = defaultManager;
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

    // 모든 데이터 삭제 (API는 제공하지 않음 - 보안상 이유)
    clearAllData() {
        this.showNotification('보안상의 이유로 서버 데이터 일괄 삭제는 지원하지 않습니다.\n개별 주문 삭제를 이용해주세요.', 'warning');
    }

    // 서버에서 주문 로드 (API 사용)
    async loadOrders() {
        try {
            const result = await this.apiCall('/orders', 'GET');
            this.orders = result.orders || [];
        } catch (error) {
            console.error('주문 로드 실패:', error);
            this.showNotification('서버에서 주문 목록을 불러오는데 실패했습니다.', 'error');
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
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new OrderApp();
});

// 가격 입력 시 천단위 콤마 자동 추가 함수
function addCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 숫자만 입력 허용
function onlyNumbers(event) {
    if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(event.key)) {
        event.preventDefault();
    }
} 