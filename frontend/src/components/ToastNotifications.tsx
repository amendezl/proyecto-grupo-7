// Componente Toast para notificaciones
// Sistema de Gestión de Espacios - VesperDevs

'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationData, NotificationConfig } from '@/hooks/useNotifications';

interface ToastNotificationProps {
  notification: NotificationData;
  config: NotificationConfig;
  onClose: (id: string) => void;
  onAction?: () => void;
}

export function ToastNotification({ 
  notification, 
  config, 
  onClose, 
  onAction 
}: ToastNotificationProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cerrar
  useEffect(() => {
    if (!config.autoClose) return;

    const timer = setTimeout(() => {
      handleClose();
    }, config.autoCloseDelay);

    return () => clearTimeout(timer);
  }, [config.autoClose, config.autoCloseDelay]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const handleAction = () => {
    if (notification.action) {
      notification.action.onClick();
    }
    if (onAction) {
      onAction();
    }
    handleClose();
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundClass = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full transition-all duration-300 transform
        ${positionClasses[config.position]}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 
          config.position.includes('right') ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'}
      `}
    >
      <div className={`
        rounded-lg border shadow-lg p-4 ${getBackgroundClass()}
      `}>
        <div className="flex items-start space-x-3">
          {/* Icono */}
          <div className="flex-shrink-0 pt-0.5">
            {getIcon()}
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-700 mt-1">
              {notification.message}
            </p>
            
            {/* Timestamp */}
            <p className="text-xs text-gray-500 mt-2">
              {notification.timestamp.toLocaleTimeString()}
            </p>

            {/* Acción opcional */}
            {notification.action && (
              <button
                onClick={handleAction}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                {notification.action.label}
              </button>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            aria-label={t('notifications.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de progreso para auto-cerrar */}
        {config.autoClose && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gray-400 h-1 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${config.autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

interface ToastContainerProps {
  notifications: NotificationData[];
  config: NotificationConfig;
  onClose: (id: string) => void;
}

export function ToastContainer({ notifications, config, onClose }: ToastContainerProps) {
  if (!config.enableToast) return null;

  // Mostrar solo las últimas 5 notificaciones
  const visibleNotifications = notifications.slice(0, 5);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            zIndex: 50 - index, // Las más recientes encima
          }}
        >
          <ToastNotification
            notification={notification}
            config={config}
            onClose={onClose}
          />
        </div>
      ))}
    </div>
  );
}