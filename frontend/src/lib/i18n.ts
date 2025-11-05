import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
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
          read: 'Leídas',
          statusLabel: 'Filtrar por estado',
          typeLabel: 'Filtrar por tipo'
        },
        types: {
          all: 'Todos los tipos',
          info: 'Información',
          success: 'Éxito',
          warning: 'Advertencia',
          error: 'Error'
        }
      },
      usuariosModule: {
        created: {
          title: 'Usuario creado',
          message: '{{name}} se ha registrado correctamente.'
        },
        updated: {
          title: 'Usuario actualizado',
          message: '{{name}} se actualizó correctamente.'
        },
        stateChanged: {
          title: 'Estado actualizado',
          message: '{{name}} ahora está {{status}}.'
        },
        stateError: {
          title: 'No se pudo actualizar el estado',
          message: 'Intenta nuevamente en unos segundos.'
        },
        saveError: {
          title: 'No se pudo guardar el usuario',
          message: 'Por favor intenta nuevamente en unos segundos.'
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
          read: 'Lidas',
          statusLabel: 'Filtrar por status',
          typeLabel: 'Filtrar por tipo'
        },
        types: {
          all: 'Todos os tipos',
          info: 'Informação',
          success: 'Sucesso',
          warning: 'Aviso',
          error: 'Erro'
        }
      },
      usuariosModule: {
        created: {
          title: 'Usuário criado',
          message: '{{name}} foi registrado com sucesso.'
        },
        updated: {
          title: 'Usuário atualizado',
          message: '{{name}} foi atualizado com sucesso.'
        },
        stateChanged: {
          title: 'Status atualizado',
          message: '{{name}} agora está {{status}}.'
        },
        stateError: {
          title: 'Não foi possível atualizar o status',
          message: 'Tente novamente em alguns segundos.'
        },
        saveError: {
          title: 'Não foi possível salvar o usuário',
          message: 'Por favor, tente novamente em alguns segundos.'
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