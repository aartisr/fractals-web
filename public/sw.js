/* Dependency-free PWA worker: network-first HTML, cache-first local assets. */
const VERSION = '2026-08-16-1'
const SHELL_CACHE = `nexus-shell-${VERSION}`
const RUNTIME_CACHE = `nexus-runtime-${VERSION}`
const MODEL_CACHE = `nexus-models-${VERSION}`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/pwa-icon-192.png', '/pwa-icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('nexus-') && ![SHELL_CACHE, RUNTIME_CACHE, MODEL_CACHE].includes(key))
    .map((key) => caches.delete(key)))))
  self.clients.claim()
})
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}
const networkFirstNavigation = async (request) => {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put('/index.html', response.clone())
    return response
  } catch {
    return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') return event.respondWith(networkFirstNavigation(request))
  if (url.pathname.startsWith('/models/') || url.pathname.startsWith('/vendor/ort/')) return event.respondWith(cacheFirst(request, MODEL_CACHE))
  if (/\.(?:js|css|woff2?|png|jpe?g|webp|svg|wasm)$/i.test(url.pathname)) event.respondWith(cacheFirst(request, RUNTIME_CACHE))
})
