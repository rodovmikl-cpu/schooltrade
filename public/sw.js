// Service Worker for School News push notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📰 חדשות בית הספר';
  const faviconUrl = new URL('favicon.png', self.registration.scope).href;
  const options = {
    body: data.body || 'יש הודעה חדשה בחדשות בית הספר',
    icon: faviconUrl,
    badge: faviconUrl,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'he',
    tag: 'school-news',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.registration.scope);
    })
  );
});
