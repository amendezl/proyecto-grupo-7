// Hook para manejo de notificaciones
// Sistema de Gestión de Espacios - VesperDevs

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationConfig {
  enablePush: boolean;
  enableToast: boolean;
  enableSound: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoClose: boolean;
  autoCloseDelay: number; // ms
}

const DEFAULT_CONFIG: NotificationConfig = {
  enablePush: true,
  enableToast: true,
  enableSound: true,
  position: 'top-right',
  autoClose: true,
  autoCloseDelay: 5000,
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Verificar soporte para notificaciones
  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Solicitar permisos para notificaciones
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return false;
    }
  }, [isSupported]);

  // Registrar Service Worker para notificaciones push
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers no son soportados');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/notifications-sw.js');
      console.log('Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('Error al registrar Service Worker:', error);
      return null;
    }
  }, []);

  // Reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    if (!config.enableSound) return;
    
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallar silenciosamente si no se puede reproducir el sonido
      });
    } catch (error) {
      // Ignorar errores de audio
    }
  }, [config.enableSound]);

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Reproducir sonido
    playNotificationSound();

    // Mostrar notificación del navegador si está habilitada
    if (config.enablePush && permission === 'granted') {
      showBrowserNotification(newNotification);
    }

    // Auto-cerrar si está configurado
    if (config.autoClose) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, config.autoCloseDelay);
    }

    return newNotification.id;
  }, [config, permission, playNotificationSound]);

  // Mostrar notificación del navegador
  const showBrowserNotification = useCallback((notification: NotificationData) => {
    if (permission !== 'granted') return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type === 'error',
    });

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
      if (notification.action) {
        notification.action.onClick();
      }
    };

    // Auto-cerrar después de un tiempo
    setTimeout(() => {
      browserNotification.close();
    }, config.autoCloseDelay);
  }, [permission, config.autoCloseDelay]);

  // Remover notificación
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Limpiar todas las notificaciones
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Métodos de conveniencia para diferentes tipos
  const showSuccess = useCallback((title: string, message: string, action?: NotificationData['action']) => {
    return addNotification({ title, message, type: 'success', action });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, action?: NotificationData['action']) => {
    return addNotification({ title, message, type: 'error', action });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, action?: NotificationData['action']) => {
    return addNotification({ title, message, type: 'warning', action });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, action?: NotificationData['action']) => {
    return addNotification({ title, message, type: 'info', action });
  }, [addNotification]);

  // Actualizar configuración
  const updateConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // Guardar en localStorage
    localStorage.setItem('notification-config', JSON.stringify({ ...config, ...newConfig }));
  }, [config]);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notification-config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.error('Error al cargar configuración de notificaciones:', error);
    }
  }, []);

  // Estadísticas
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    byType: {
      info: notifications.filter(n => n.type === 'info').length,
      success: notifications.filter(n => n.type === 'success').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      error: notifications.filter(n => n.type === 'error').length,
    }
  };

  return {
    // Estado
    notifications,
    config,
    permission,
    isSupported,
    stats,

    // Acciones principales
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,

    // Métodos de conveniencia
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Configuración
    updateConfig,
    requestPermission,
    registerServiceWorker,
  };
}