import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Recursos de traducción
const resources = {
  es: {
    translation: {
      // Navegación
      nav: {
        dashboard: 'Dashboard',
        reservas: 'Reservas',
        espacios: 'Espacios',
        zonas: 'Zonas',
        usuarios: 'Usuarios',
        responsables: 'Responsables',
        reportes: 'Reportes',
        configuracion: 'Configuración',
        perfil: 'Perfil'
      },
      // Configuración
      config: {
        title: 'Configuración',
        subtitle: 'Personaliza la aplicación según tus preferencias',
        save: 'Guardar',
        saved: 'Guardado',
        reset: 'Restablecer',
        savedSuccess: 'Configuración guardada exitosamente',
        general: {
          title: 'Configuración General',
          theme: 'Tema de la aplicación',
          themeLight: 'Claro',
          themeDark: 'Oscuro',
          themeAuto: 'Automático',
          language: 'Idioma',
          notifications: 'Habilitar notificaciones',
          sounds: 'Sonidos de la aplicación',
          autoSave: 'Guardado automático',
          sessionTime: 'Tiempo de sesión (minutos)'
        },
        notifications: {
          title: 'Configuración de Notificaciones',
          types: 'Tipos de notificaciones',
          reservations: 'Nuevas reservas y modificaciones',
          statusChanges: 'Cambios de estado de espacios',
          maintenance: 'Alertas de mantenimiento',
          channels: 'Canales de notificación',
          email: 'Correo electrónico',
          push: 'Notificaciones push',
          frequency: 'Frecuencia de notificaciones',
          immediate: 'Inmediata',
          grouped: 'Agrupada (cada hora)',
          daily: 'Resumen diario'
        },
        system: {
          title: 'Configuración del Sistema',
          dateFormat: 'Formato de fecha',
          timeFormat: 'Formato de hora',
          timezone: 'Zona horaria',
          advanced: 'Configuraciones avanzadas',
          auditLogs: 'Registros de auditoría',
          autoBackup: 'Backup automático',
          autoCleanup: 'Limpieza automática de logs (días)'
        },
        security: {
          title: 'Configuración de Seguridad',
          changePassword: 'Cambiar contraseña',
          currentPassword: 'Contraseña actual',
          newPassword: 'Nueva contraseña',
          confirmPassword: 'Confirmar nueva contraseña',
          twoFactor: 'Autenticación de dos factores',
          twoFactorDesc: 'Añade una capa adicional de seguridad a tu cuenta',
          setup2FA: 'Configurar 2FA',
          activeSessions: 'Sesiones activas',
          currentSession: 'Sesión actual',
          closeAllSessions: 'Cerrar todas las sesiones',
          recommended: 'Recomendado',
          active: 'Activa'
        }
      },
      // Notificaciones
      notifications: {
        title: 'Notificaciones',
        close: 'Cerrar',
        markRead: 'Marcar como leída',
        markAllRead: 'Marcar todas como leídas',
        clearAll: 'Limpiar todas',
        remove: 'Eliminar',
        search: 'Buscar notificaciones...',
        settings: 'Configuración',
        noNotifications: 'No hay notificaciones',
        noFilterResults: 'No se encontraron notificaciones',
        justNow: 'Ahora mismo',
        minutesAgo: 'hace {{count}} minuto',
        minutesAgo_plural: 'hace {{count}} minutos',
        hoursAgo: 'hace {{count}} hora',
        hoursAgo_plural: 'hace {{count}} horas',
        daysAgo: 'hace {{count}} día',
        daysAgo_plural: 'hace {{count}} días',
        filters: {
          all: 'Todas',
          unread: 'No leídas',
          read: 'Leídas'
        },
        types: {
          all: 'Todos los tipos',
          info: 'Información',
          success: 'Éxito',
          warning: 'Advertencia',
          error: 'Error'
        }
      },
      // Dashboard
      dashboard: {
        title: 'Dashboard',
        welcome: 'Bienvenido',
        overview: 'Resumen del Sistema',
        totalSpaces: 'Espacios Totales',
        availableSpaces: 'Espacios Disponibles',
        occupiedSpaces: 'Espacios Ocupados',
        maintenanceSpaces: 'En Mantenimiento',
        totalReservations: 'Reservas Totales',
        activeUsers: 'Usuarios Activos',
        lastUpdate: 'Última actualización'
      },
      // Común
      common: {
        search: 'Buscar',
        filter: 'Filtrar',
        add: 'Agregar',
        edit: 'Editar',
        delete: 'Eliminar',
        save: 'Guardar',
        cancel: 'Cancelar',
        loading: 'Cargando...',
        noResults: 'No se encontraron resultados',
        actions: 'Acciones',
        status: 'Estado',
        active: 'Activo',
        inactive: 'Inactivo',
        available: 'Disponible',
        occupied: 'Ocupado',
        maintenance: 'Mantenimiento',
        reserved: 'Reservado'
      },
      // Estados
      status: {
        available: 'Disponible',
        occupied: 'Ocupado',
        maintenance: 'Mantenimiento',
        reserved: 'Reservado',
        active: 'Activo',
        inactive: 'Inactivo'
      }
    }
  },
  en: {
    translation: {
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        reservas: 'Reservations',
        espacios: 'Spaces',
        zonas: 'Zones',
        usuarios: 'Users',
        responsables: 'Managers',
        reportes: 'Reports',
        configuracion: 'Settings',
        perfil: 'Profile'
      },
      // Configuration
      config: {
        title: 'Settings',
        subtitle: 'Customize the application according to your preferences',
        save: 'Save',
        saved: 'Saved',
        reset: 'Reset',
        savedSuccess: 'Settings saved successfully',
        general: {
          title: 'General Settings',
          theme: 'Application theme',
          themeLight: 'Light',
          themeDark: 'Dark',
          themeAuto: 'Automatic',
          language: 'Language',
          notifications: 'Enable notifications',
          sounds: 'Application sounds',
          autoSave: 'Auto save',
          sessionTime: 'Session time (minutes)'
        },
        notifications: {
          title: 'Notification Settings',
          types: 'Notification types',
          reservations: 'New reservations and modifications',
          statusChanges: 'Space status changes',
          maintenance: 'Maintenance alerts',
          channels: 'Notification channels',
          email: 'Email',
          push: 'Push notifications',
          frequency: 'Notification frequency',
          immediate: 'Immediate',
          grouped: 'Grouped (hourly)',
          daily: 'Daily summary'
        },
        system: {
          title: 'System Settings',
          dateFormat: 'Date format',
          timeFormat: 'Time format',
          timezone: 'Time zone',
          advanced: 'Advanced settings',
          auditLogs: 'Audit logs',
          autoBackup: 'Automatic backup',
          autoCleanup: 'Automatic log cleanup (days)'
        },
        security: {
          title: 'Security Settings',
          changePassword: 'Change password',
          currentPassword: 'Current password',
          newPassword: 'New password',
          confirmPassword: 'Confirm new password',
          twoFactor: 'Two-factor authentication',
          twoFactorDesc: 'Add an additional layer of security to your account',
          setup2FA: 'Setup 2FA',
          activeSessions: 'Active sessions',
          currentSession: 'Current session',
          closeAllSessions: 'Close all sessions',
          recommended: 'Recommended',
          active: 'Active'
        }
      },
      // Notifications
      notifications: {
        title: 'Notifications',
        close: 'Close',
        markRead: 'Mark as read',
        markAllRead: 'Mark all as read',
        clearAll: 'Clear all',
        remove: 'Remove',
        search: 'Search notifications...',
        settings: 'Settings',
        noNotifications: 'No notifications',
        noFilterResults: 'No notifications found',
        justNow: 'Just now',
        minutesAgo: '{{count}} minute ago',
        minutesAgo_plural: '{{count}} minutes ago',
        hoursAgo: '{{count}} hour ago',
        hoursAgo_plural: '{{count}} hours ago',
        daysAgo: '{{count}} day ago',
        daysAgo_plural: '{{count}} days ago',
        filters: {
          all: 'All',
          unread: 'Unread',
          read: 'Read'
        },
        types: {
          all: 'All types',
          info: 'Information',
          success: 'Success',
          warning: 'Warning',
          error: 'Error'
        }
      },
      // Dashboard
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome',
        overview: 'System Overview',
        totalSpaces: 'Total Spaces',
        availableSpaces: 'Available Spaces',
        occupiedSpaces: 'Occupied Spaces',
        maintenanceSpaces: 'Under Maintenance',
        totalReservations: 'Total Reservations',
        activeUsers: 'Active Users',
        lastUpdate: 'Last update'
      },
      // Common
      common: {
        search: 'Search',
        filter: 'Filter',
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        loading: 'Loading...',
        noResults: 'No results found',
        actions: 'Actions',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        available: 'Available',
        occupied: 'Occupied',
        maintenance: 'Maintenance',
        reserved: 'Reserved'
      },
      // Status
      status: {
        available: 'Available',
        occupied: 'Occupied',
        maintenance: 'Maintenance',
        reserved: 'Reserved',
        active: 'Active',
        inactive: 'Inactive'
      }
    }
  },
  pt: {
    translation: {
      // Navegação
      nav: {
        dashboard: 'Dashboard',
        reservas: 'Reservas',
        espacios: 'Espaços',
        zonas: 'Zonas',
        usuarios: 'Usuários',
        responsables: 'Responsáveis',
        reportes: 'Relatórios',
        configuracion: 'Configurações',
        perfil: 'Perfil'
      },
      // Configuração
      config: {
        title: 'Configurações',
        subtitle: 'Personalize a aplicação de acordo com suas preferências',
        save: 'Salvar',
        saved: 'Salvo',
        reset: 'Redefinir',
        savedSuccess: 'Configurações salvas com sucesso',
        general: {
          title: 'Configurações Gerais',
          theme: 'Tema da aplicação',
          themeLight: 'Claro',
          themeDark: 'Escuro',
          themeAuto: 'Automático',
          language: 'Idioma',
          notifications: 'Habilitar notificações',
          sounds: 'Sons da aplicação',
          autoSave: 'Salvamento automático',
          sessionTime: 'Tempo de sessão (minutos)'
        },
        notifications: {
          title: 'Configurações de Notificação',
          types: 'Tipos de notificação',
          reservations: 'Novas reservas e modificações',
          statusChanges: 'Mudanças de status dos espaços',
          maintenance: 'Alertas de manutenção',
          channels: 'Canais de notificação',
          email: 'Email',
          push: 'Notificações push',
          frequency: 'Frequência de notificações',
          immediate: 'Imediata',
          grouped: 'Agrupada (de hora em hora)',
          daily: 'Resumo diário'
        },
        system: {
          title: 'Configurações do Sistema',
          dateFormat: 'Formato de data',
          timeFormat: 'Formato de hora',
          timezone: 'Fuso horário',
          advanced: 'Configurações avançadas',
          auditLogs: 'Logs de auditoria',
          autoBackup: 'Backup automático',
          autoCleanup: 'Limpeza automática de logs (dias)'
        },
        security: {
          title: 'Configurações de Segurança',
          changePassword: 'Alterar senha',
          currentPassword: 'Senha atual',
          newPassword: 'Nova senha',
          confirmPassword: 'Confirmar nova senha',
          twoFactor: 'Autenticação de dois fatores',
          twoFactorDesc: 'Adicione uma camada adicional de segurança à sua conta',
          setup2FA: 'Configurar 2FA',
          activeSessions: 'Sessões ativas',
          currentSession: 'Sessão atual',
          closeAllSessions: 'Fechar todas as sessões',
          recommended: 'Recomendado',
          active: 'Ativa'
        }
      },
      // Notificações
      notifications: {
        title: 'Notificações',
        close: 'Fechar',
        markRead: 'Marcar como lida',
        markAllRead: 'Marcar todas como lidas',
        clearAll: 'Limpar todas',
        remove: 'Remover',
        search: 'Buscar notificações...',
        settings: 'Configurações',
        noNotifications: 'Não há notificações',
        noFilterResults: 'Nenhuma notificação encontrada',
        justNow: 'Agora mesmo',
        minutesAgo: 'há {{count}} minuto',
        minutesAgo_plural: 'há {{count}} minutos',
        hoursAgo: 'há {{count}} hora',
        hoursAgo_plural: 'há {{count}} horas',
        daysAgo: 'há {{count}} dia',
        daysAgo_plural: 'há {{count}} dias',
        filters: {
          all: 'Todas',
          unread: 'Não lidas',
          read: 'Lidas'
        },
        types: {
          all: 'Todos os tipos',
          info: 'Informação',
          success: 'Sucesso',
          warning: 'Aviso',
          error: 'Erro'
        }
      },
      // Dashboard
      dashboard: {
        title: 'Dashboard',
        welcome: 'Bem-vindo',
        overview: 'Visão Geral do Sistema',
        totalSpaces: 'Espaços Totais',
        availableSpaces: 'Espaços Disponíveis',
        occupiedSpaces: 'Espaços Ocupados',
        maintenanceSpaces: 'Em Manutenção',
        totalReservations: 'Reservas Totais',
        activeUsers: 'Usuários Ativos',
        lastUpdate: 'Última atualização'
      },
      // Comum
      common: {
        search: 'Buscar',
        filter: 'Filtrar',
        add: 'Adicionar',
        edit: 'Editar',
        delete: 'Excluir',
        save: 'Salvar',
        cancel: 'Cancelar',
        loading: 'Carregando...',
        noResults: 'Nenhum resultado encontrado',
        actions: 'Ações',
        status: 'Status',
        active: 'Ativo',
        inactive: 'Inativo',
        available: 'Disponível',
        occupied: 'Ocupado',
        maintenance: 'Manutenção',
        reserved: 'Reservado'
      },
      // Status
      status: {
        available: 'Disponível',
        occupied: 'Ocupado',
        maintenance: 'Manutenção',
        reserved: 'Reservado',
        active: 'Ativo',
        inactive: 'Inativo'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    }
  });

export default i18n;