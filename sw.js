// Service worker B.E.S.T. Terrain Punch : installation PWA, notifications et push.
const CACHE = 'best-punch-v1'
const PRECACHE = ['/icons/icon.png', '/logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

// Réseau d'abord pour les pages; jamais de cache pour les appels Supabase.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.mode !== 'navigate') return
  event.respondWith(
    fetch(req).catch(
      () =>
        new Response(
          '<html lang="fr"><body style="background:#151515;color:#fff;font-family:sans-serif;padding:2rem"><h1>Hors ligne</h1><p>Connexion Internet requise pour enregistrer un punch.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
    ),
  )
})

// Prêt pour de futurs rappels envoyés par le serveur (Web Push).
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'B.E.S.T. Terrain Punch', {
      body: data.body || 'N’oubliez pas votre punch.',
      icon: '/icons/icon.png',
      badge: '/icons/icon.png',
      tag: data.tag,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if ('focus' in f) return f.focus()
      }
      return self.clients.openWindow('/punch')
    }),
  )
})
