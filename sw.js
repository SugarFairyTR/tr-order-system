// 🔧 티알코리아 주문시스템 V2.0 Service Worker
const CACHE_NAME = 'tr-order-system-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css', 
  './app.js',
  './manifest.json',
  './user_config.json',
  './database_optimized.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 📦 설치 이벤트
self.addEventListener('install', event => {
  console.log('🔧 Service Worker V2.0 설치 중...');
  self.skipWaiting(); // 즉시 활성화
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 캐시 업데이트 중...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 🔄 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker V2.0 활성화 중...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 🌐 네트워크 요청 처리
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 발견되면 반환
        if (response) {
          return response;
        }
        
        // 네트워크에서 가져오기
        return fetch(event.request);
      }
    )
  );
});

console.log('✅ Service Worker V2.0 로드 완료');