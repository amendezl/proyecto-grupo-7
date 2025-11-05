'use client';

import { createContext, useContext } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { ToastContainer } from '@/components/ToastNotifications';

const NotificationsContext = createContext<ReturnType<typeof useNotifications> | null>(null);

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const notificationsApi = useNotifications();

  return (
    <NotificationsContext.Provider value={notificationsApi}>
      {children}
      <ToastContainer
        notifications={notificationsApi.notifications}
        config={notificationsApi.config}
        onClose={notificationsApi.removeNotification}
      />
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return ctx;
}
