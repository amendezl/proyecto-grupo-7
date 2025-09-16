// Centro de notificaciones
// Sistema de Gestión de Espacios - VesperDevs

'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  Filter,
  Search,
  ChevronDown
} from 'lucide-react';
import { NotificationData } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  notifications: NotificationData[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemove,
  onClearAll,
  unreadCount,
  isOpen,
  onToggle
}: NotificationCenterProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Filtrar notificaciones
  const filteredNotifications = notifications.filter(notification => {
    // Filtro por estado leído/no leído
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;

    // Filtro por tipo
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    // Filtro por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getTypeIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getTypeColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('notifications.justNow');
    if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
    if (hours < 24) return t('notifications.hoursAgo', { count: hours });
    if (days < 7) return t('notifications.daysAgo', { count: days });
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Overlay para móvil */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
        onClick={onToggle}
      />

      {/* Panel de notificaciones */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl lg:absolute lg:right-0 lg:top-12 lg:h-auto lg:max-h-96 lg:rounded-lg lg:border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label={t('notifications.settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label={t('notifications.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Configuración rápida */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {t('notifications.markAllRead')}
                </span>
                <button
                  onClick={onMarkAllAsRead}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  disabled={unreadCount === 0}
                  aria-label={t('notifications.markAllRead')}
                  title={t('notifications.markAllRead')}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {t('notifications.clearAll')}
                </span>
                <button
                  onClick={onClearAll}
                  className="text-red-600 hover:text-red-500 text-sm font-medium"
                  disabled={notifications.length === 0}
                  aria-label={t('notifications.clearAll')}
                  title={t('notifications.clearAll')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('notifications.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={t('notifications.filters.statusLabel')}
              title={t('notifications.filters.statusLabel')}
            >
              <option value="all">{t('notifications.filters.all')}</option>
              <option value="unread">{t('notifications.filters.unread')}</option>
              <option value="read">{t('notifications.filters.read')}</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={t('notifications.filters.typeLabel')}
              title={t('notifications.filters.typeLabel')}
            >
              <option value="all">{t('notifications.types.all')}</option>
              <option value="info">{t('notifications.types.info')}</option>
              <option value="success">{t('notifications.types.success')}</option>
              <option value="warning">{t('notifications.types.warning')}</option>
              <option value="error">{t('notifications.types.error')}</option>
            </select>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                {searchTerm || filter !== 'all' || typeFilter !== 'all'
                  ? t('notifications.noFilterResults')
                  : t('notifications.noNotifications')
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Indicador de tipo */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                      ${getTypeColor(notification.type)}
                    `}>
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        
                        {/* Indicador de no leído */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.timestamp)}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-500 text-xs font-medium"
                              aria-label={t('notifications.markRead')}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemove(notification.id)}
                            className="text-red-600 hover:text-red-500 text-xs font-medium"
                            aria-label={t('notifications.remove')}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Acción opcional */}
                      {notification.action && (
                        <button
                          onClick={notification.action.onClick}
                          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}