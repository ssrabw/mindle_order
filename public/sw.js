// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭/창이 있다면 포커스 처리
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // 열린 창이 없으면 메인 페이지 새로 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
