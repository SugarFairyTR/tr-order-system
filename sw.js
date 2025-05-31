// 🔧 티알코리아 주문시스템 V3.0 Service Worker

const CACHE_NAME = 'tr-order-system-v3.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './user_config.json',
  './database_optimized.json',
  './firebase-config.json',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

// 📦 설치 이벤트
self.addEventListener('install', event => {
  console.log('🔧 Service Worker V3.0 설치 중...');
  self.skipWaiting(); // 즉시 활성화
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 캐시 업데이트 중...');
        return cache.addAll(urlsToCache).catch(error => {
          console.warn('⚠️ 일부 리소스 캐싱 실패:', error);
          // 필수 파일만 캐싱
          return cache.addAll([
            './',
            './index.html',
            './styles.css',
            './app.js'
          ]);
        });
      })
  );
});

// ✅ 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('✅ Service Worker V3.0 활성화');
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 삭제
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트 제어
      self.clients.claim()
    ])
  );
});

// 🌐 네트워크 요청 처리
self.addEventListener('fetch', event => {
  // POST 요청은 캐시하지 않음
  if (event.request.method !== 'GET') {
    return;
  }

  // 지원하지 않는 프로토콜 필터링
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 반환
        if (response) {
          console.log('📦 캐시에서 제공:', event.request.url);
          return response;
        }

        // 네트워크에서 가져오기
        return fetch(event.request)
          .then(response => {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복사하여 캐시에 저장
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache).catch(error => {
                  console.warn('⚠️ 캐시 저장 실패:', error);
                });
              });

            return response;
          })
          .catch(error => {
            console.error('🌐 네트워크 요청 실패:', error);
            
            // 오프라인 시 기본 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // 기타 오프라인 응답
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
      })
  );
});

// 🔄 백그라운드 동기화
self.addEventListener('sync', event => {
  console.log('🔄 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  }
});

// 📱 푸시 알림
self.addEventListener('push', event => {
  console.log('📱 푸시 알림 수신:', event);
  
  let notificationData = {
    title: '티알코리아 주문시스템',
    body: '새로운 알림이 있습니다.',
    icon: './logo.png',
    badge: './logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '확인',
        icon: './logo.png'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 🔔 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  console.log('🔔 알림 클릭:', event);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// 💬 메시지 처리
self.addEventListener('message', event => {
  console.log('💬 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 🔄 주문 동기화 함수
async function syncOrders() {
  try {
    console.log('🔄 주문 동기화 시작...');
    
    // IndexedDB나 localStorage에서 대기 중인 주문 확인
    const pendingOrders = await getPendingOrders();
    
    if (pendingOrders.length > 0) {
      // Firebase로 동기화 시도
      for (const order of pendingOrders) {
        await syncOrderToFirebase(order);
      }
      
      console.log(`✅ ${pendingOrders.length}개 주문 동기화 완료`);
    }
    
  } catch (error) {
    console.error('❌ 주문 동기화 실패:', error);
  }
}

// 📋 대기 중인 주문 가져오기
async function getPendingOrders() {
  // localStorage에서 동기화 대기 중인 주문들 확인
  try {
    const pending = localStorage.getItem('pending_orders');
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('대기 중인 주문 로드 실패:', error);
    return [];
  }
}

// 🔥 Firebase로 주문 동기화
async function syncOrderToFirebase(order) {
  // 실제 Firebase 동기화 로직은 메인 앱에서 처리
  // 여기서는 동기화 요청만 전송
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_ORDER',
      order: order
    });
  });
}

console.log('🔧 티알코리아 주문시스템 V3.0 Service Worker 로드 완료'); 