// 大博记账 - Service Worker (离线缓存)
const CACHE_NAME = 'dabo-accounting-v3'

// 需要预缓存的文件（构建时自动更新）
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
]

// 安装：预缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  // 立即激活，不等待旧 SW
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

// 请求拦截：缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过 chrome-extension 和非 GET 请求
  if (event.request.method !== 'GET') return
  if (event.request.url.startsWith('chrome-extension://')) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // 不缓存 API 请求和非同源请求
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response
          }

          // 克隆响应并缓存
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // 网络失败时返回离线页面（对于导航请求）
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('离线状态，请连接网络后重试', { status: 503 })
        })
    })
  )
})
