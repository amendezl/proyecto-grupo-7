// Service Worker para notificaciones push personalizadas
// Sistema de Gestión de Espacios - VesperDevs

const CACHE_NAME = 'espacios-notifications-v1';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('SW Notifications: Instalando...');
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW Notifications: Activando...');
  event.waitUntil(self.clients.claim());
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('SW Notifications: Push recibido');
  
  let notificationData = {
    title: 'Sistema de Espacios',
    body: 'Nueva notificación',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      timestamp: Date.now(),
      url: '/'
    }
  };

  // Parsear datos del push si están disponibles
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('SW Notifications: Error parseando datos del push:', error);
    }
  }

  // Configurar opciones de la notificación
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      {
        action: 'view',
        title: 'Ver detalles'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('SW Notifications: Click en notificación');
  
  event.notification.close();

  const clickAction = event.action;
  const notificationData = event.notification.data || {};

  if (clickAction === 'view' || !clickAction) {
    // Abrir o enfocar la aplicación
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Si hay una ventana abierta, enfocarla
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes(self.location.origin)) {
              return client.focus();
            }
          }
          
          // Si no hay ventana abierta, abrir una nueva
          return clients.openWindow(notificationData.url || '/');
        })
    );
  } else if (clickAction === 'dismiss') {
    // Solo cerrar la notificación (ya cerrada arriba)
    console.log('SW Notifications: Notificación descartada');
  }
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('SW Notifications: Notificación cerrada');
  
  // Opcional: enviar analytics o limpiar datos
  const notificationData = event.notification.data || {};
  
  // Aquí se podría enviar información sobre la notificación cerrada
  // fetch('/api/notifications/closed', {
  //   method: 'POST',
  //   body: JSON.stringify(notificationData)
  // });
});

// Manejo de mensajes desde el cliente
self.addEventListener('message', (event) => {
  console.log('SW Notifications: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({
          type: 'VERSION',
          version: CACHE_NAME
        });
        break;
        
      case 'CLEAR_NOTIFICATIONS':
        // Limpiar todas las notificaciones
        self.registration.getNotifications()
          .then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        break;
        
      default:
        console.log('SW Notifications: Tipo de mensaje no reconocido:', event.data.type);
    }
  }
});

// Manejo de errores
self.addEventListener('error', (event) => {
  console.error('SW Notifications: Error:', event.error);
});

// Manejo de errores no capturados
self.addEventListener('unhandledrejection', (event) => {
  console.error('SW Notifications: Promise rechazado:', event.reason);
});