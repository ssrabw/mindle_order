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

// 백그라운드 웹 푸시 리스너 추가
self.addEventListener('push', (event) => {
  let data = { title: '민들레 도매', body: '새로운 알림이 있습니다.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '민들레 도매', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.data || {},
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
