// 大博记账 - Service Worker (PWA 离线支持)
const CACHE_NAME = 'dabo-accounting-v4'

// 安装：预缓存所有静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 缓存主页和 manifest
      await cache.addAll(['/', '/manifest.json'])
    })
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 请求拦截：缓存优先 + 网络更新
self.addEventListener('fetch', (event) => {
  // 跳过 chrome-extension 和非 GET 请求
  if (event.request.method !== 'GET') return
  if (event.request.url.startsWith('chrome-extension://')) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 后台更新缓存（Stale-While-Revalidate）
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        }).catch(() => null)

        return cachedResponse
      }

      // 无缓存，走网络
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // 离线且无缓存：返回首页（SPA 路由支持）
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('离线状态', { status: 503 })
        })
    })
  )
})
