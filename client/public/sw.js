// Service Worker - 吉他點歌系統 PWA
// 版本號用於緩存更新
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `guitar-song-${CACHE_VERSION}`;

// 需要預緩存的核心資源
const PRECACHE_ASSETS = [
    '/song/',
    '/song/index.html',
    '/song/favicon.ico',
    '/song/playground.png',
    '/song/manifest.json',
];

// 不需要緩存的請求模式
const EXCLUDE_PATTERNS = [
    /firestore\.googleapis\.com/,  // Firestore API（使用其內建離線支援）
    /firebaseinstallations\.googleapis\.com/,
    /identitytoolkit\.googleapis\.com/,  // Firebase Auth
    /securetoken\.googleapis\.com/,
    /@vite/,  // Vite 開發模式
    /\.hot-update\./,  // HMR 更新
    /sockjs-node/,  // 開發伺服器 WebSocket
];

// 安裝事件 - 預緩存核心資源
self.addEventListener('install', (event) => {
    console.log('[SW] 安裝中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] 預緩存核心資源');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] 安裝完成');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] 預緩存失敗:', error);
            })
    );
});

// 啟動事件 - 清理舊版本緩存
self.addEventListener('activate', (event) => {
    console.log('[SW] 啟動中...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('guitar-song-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] 刪除舊緩存:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] 啟動完成');
                return self.clients.claim();
            })
    );
});

// 請求攔截 - 緩存策略
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳過不需要緩存的請求
    if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(request.url))) {
        return;
    }

    // 只處理 GET 請求
    if (request.method !== 'GET') {
        return;
    }

    // 只處理 http/https 請求
    if (!request.url.startsWith('http')) {
        return;
    }

    // HTML 頁面 - Network First
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 靜態資源 (JS, CSS, 圖片) - Cache First
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 其他請求 - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// 判斷是否為靜態資源
function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// 策略 1: Network First（優先網路）
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] 網路請求失敗，嘗試緩存:', request.url);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // 返回離線頁面或基本 HTML
        return caches.match('/song/index.html');
    }
}

// 策略 2: Cache First（優先緩存）
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] 資源載入失敗:', request.url);
        throw error;
    }
}

// 策略 3: Stale While Revalidate（先返回緩存，同時更新）
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // 在背景更新緩存
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[SW] 背景更新失敗:', request.url, error);
        });

    // 如果有緩存，先返回緩存
    if (cachedResponse) {
        return cachedResponse;
    }

    // 否則等待網路響應
    return fetchPromise;
}

// 監聽來自主線程的消息
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker 腳本已載入');
