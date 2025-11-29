// Header - Sistema de Gestión de Espacios
// Navegación principal y accesos rápidos

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Bell, Search, Settings, User, AlertTriangle, LogOut } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import { useNotificationsContext } from '@/context/NotificationsContext';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  urgentMode?: boolean;
}

export default function Header({ urgentMode = false }: HeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    stats,
  } = useNotificationsContext();

  const unreadCount = stats.unread;
  const headerRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout(() => {
      router.push('/auth/login');
    });
  };

  const toggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  const closeNotifications = useCallback(() => {
    setShowNotifications(false);
    markAllAsRead();
  }, [markAllAsRead]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        markAllAsRead();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setShowNotifications(false);
        markAllAsRead();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (showNotifications) {
        markAllAsRead();
      }
    };
  }, [showNotifications, markAllAsRead]);

  return (
    <header 
      ref={headerRef}
      className={`
        fixed top-0 left-0 right-0 z-50 h-16
        ${urgentMode 
          ? 'bg-red-600 text-white shadow-lg' 
          : 'bg-white border-b border-gray-200 shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo y título del sistema */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${urgentMode ? 'bg-white/20' : 'bg-blue-600'}
            `}>
              <span className={`
                text-sm font-bold
                ${urgentMode ? 'text-white' : 'text-white'}
              `}>
                SM
              </span>
            </div>
            <div>
              <h1 className={`
                text-lg font-semibold
                ${urgentMode ? 'text-white' : 'text-gray-900'}
              `}>
                {t('nav.system')}
              </h1>
              {urgentMode && (
                <p className="text-xs text-red-100">{t('nav.urgentMode')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Área central - Búsqueda rápida */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className={`
              absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4
              ${urgentMode ? 'text-white/70' : 'text-gray-400'}
            `} />
            <input
              type="text"
              aria-label="Búsqueda rápida en el sistema"
              placeholder={t('nav.searchPlaceholder')}
              className={`
                w-full pl-10 pr-4 py-2 rounded-lg border text-sm
                ${urgentMode 
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/70' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
          </div>
        </div>

        {/* Controles del usuario */}
        <div className="flex items-center space-x-3">
          {/* Selector de idioma */}
          <LanguageSelector variant="compact" />

          {/* Botón de urgencia */}
          {!urgentMode && (
            <button 
              aria-label="Activar modo urgente"
              title="Activar modo urgente"
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
          )}

          {/* Notificaciones */}
          <div className="relative">
            <button
              aria-label="Ver notificaciones"
              title="Ver notificaciones"
              onClick={toggleNotifications}
              className={`
                p-2 rounded-lg transition-colors relative
                ${urgentMode 
                  ? 'text-white hover:bg-white/10' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
            </button>
          </div>

          {/* Configuración */}
          <button 
            aria-label="Configuración del sistema"
            title="Configuración del sistema"
            className={`
              p-2 rounded-lg transition-colors
              ${urgentMode 
                ? 'text-white hover:bg-white/10' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Menú de usuario */}
          <div className="relative">
            <button
              aria-label="Menú de usuario"
              title="Menú de usuario"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                flex items-center space-x-2 p-2 rounded-lg transition-colors
                ${urgentMode 
                  ? 'text-white hover:bg-white/10' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Admin</span>
            </button>

            {/* Dropdown de usuario */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border">
                <div className="p-2">
                  <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{t('nav.profile')}</span>
                  </button>
                  <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">{t('nav.settings')}</span>
                  </button>
                  <hr className="my-1" />
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{t('nav.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <NotificationCenter
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRemove={removeNotification}
        onClearAll={clearAll}
        unreadCount={unreadCount}
        isOpen={showNotifications}
        onToggle={closeNotifications}
      />
    </header>
  );
}