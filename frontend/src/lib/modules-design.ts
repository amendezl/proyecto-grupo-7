// Definición de Módulos - Sistema de Gestión de Espacios
// Arquitectura modular para gestión empresarial

export const modulesConfig = {
  // 🏢 MÓDULO DE ESPACIOS
  espacios: {
    name: 'Gestión de Espacios',
    description: 'Administración completa de espacios disponibles',
    icon: 'MapPin',
    color: 'blue',
    route: '/espacios',
    permissions: ['view_espacios', 'manage_espacios'],
    
    submodules: {
      lista: {
        name: 'Lista de Espacios',
        description: 'Ver todos los espacios disponibles',
        route: '/espacios/lista',
        permissions: ['view_espacios']
      },
      mapa: {
        name: 'Mapa de Espacios',
        description: 'Vista geográfica de ubicaciones',
        route: '/espacios/mapa',
        permissions: ['view_espacios']
      },
      configuracion: {
        name: 'Configurar Espacios',
        description: 'Crear y editar espacios',
        route: '/espacios/configuracion',
        permissions: ['manage_espacios']
      }
    }
  },

  // 📅 MÓDULO DE RESERVAS
  reservas: {
    name: 'Gestión de Reservas',
    description: 'Control de reservas y ocupación',
    icon: 'Calendar',
    color: 'green',
    route: '/reservas',
    permissions: ['view_reservas', 'manage_reservas'],
    
    submodules: {
      calendario: {
        name: 'Calendario',
        description: 'Vista de calendario de reservas',
        route: '/reservas/calendario',
        permissions: ['view_reservas']
      },
      crear: {
        name: 'Nueva Reserva',
        description: 'Crear nuevas reservas',
        route: '/reservas/crear',
        permissions: ['create_reservas']
      },
      historial: {
        name: 'Historial',
        description: 'Historial de reservas',
        route: '/reservas/historial',
        permissions: ['view_reservas']
      }
    }
  },

  // 🏗️ MÓDULO DE ZONAS
  zonas: {
    name: 'Gestión de Zonas',
    description: 'Organización por zonas y sectores',
    icon: 'Building2',
    color: 'purple',
    route: '/zonas',
    permissions: ['view_zonas', 'manage_zonas'],
    
    submodules: {
      vista: {
        name: 'Vista de Zonas',
        description: 'Explorar zonas disponibles',
        route: '/zonas/vista',
        permissions: ['view_zonas']
      },
      configuracion: {
        name: 'Configurar Zonas',
        description: 'Administrar zonas y sectores',
        route: '/zonas/configuracion',
        permissions: ['manage_zonas']
      }
    }
  },

  // 👥 MÓDULO DE USUARIOS
  usuarios: {
    name: 'Gestión de Usuarios',
    description: 'Administración de usuarios del sistema',
    icon: 'Users',
    color: 'orange',
    route: '/usuarios',
    permissions: ['view_usuarios', 'manage_usuarios'],
    
    submodules: {
      lista: {
        name: 'Lista de Usuarios',
        description: 'Ver todos los usuarios',
        route: '/usuarios/lista',
        permissions: ['view_usuarios']
      },
      roles: {
        name: 'Roles y Permisos',
        description: 'Gestionar roles del sistema',
        route: '/usuarios/roles',
        permissions: ['manage_roles']
      },
      actividad: {
        name: 'Actividad',
        description: 'Registro de actividad de usuarios',
        route: '/usuarios/actividad',
        permissions: ['view_logs']
      }
    }
  },

  // 📊 MÓDULO DE REPORTES
  reportes: {
    name: 'Reportes y Analytics',
    description: 'Análisis y reportes del sistema',
    icon: 'BarChart3',
    color: 'indigo',
    route: '/reportes',
    permissions: ['view_reportes'],
    
    submodules: {
      ocupacion: {
        name: 'Ocupación',
        description: 'Reportes de ocupación de espacios',
        route: '/reportes/ocupacion',
        permissions: ['view_reportes']
      },
      usuarios: {
        name: 'Uso por Usuario',
        description: 'Análisis de uso por usuario',
        route: '/reportes/usuarios',
        permissions: ['view_reportes']
      },
      tendencias: {
        name: 'Tendencias',
        description: 'Análisis de tendencias de uso',
        route: '/reportes/tendencias',
        permissions: ['view_reportes']
      }
    }
  },

  // ⚙️ MÓDULO DE CONFIGURACIÓN
  configuracion: {
    name: 'Configuración',
    description: 'Configuración general del sistema',
    icon: 'Settings',
    color: 'gray',
    route: '/configuracion',
    permissions: ['admin'],
    
    submodules: {
      general: {
        name: 'General',
        description: 'Configuración general',
        route: '/configuracion/general',
        permissions: ['admin']
      },
      integraciones: {
        name: 'Integraciones',
        description: 'APIs y servicios externos',
        route: '/configuracion/integraciones',
        permissions: ['admin']
      },
      respaldos: {
        name: 'Respaldos',
        description: 'Gestión de copias de seguridad',
        route: '/configuracion/respaldos',
        permissions: ['admin']
      }
    }
  }
};

// Configuración de workflows
export const workflowConfig = {
  reservaEspacio: {
    name: 'Reservar Espacio',
    steps: [
      'Seleccionar espacio disponible',
      'Configurar fecha y hora',
      'Confirmar reserva',
      'Notificación de confirmación'
    ],
    urgentSteps: [
      'Verificar disponibilidad inmediata',
      'Reserva express',
      'Notificación urgente'
    ]
  },
  
  liberarEspacio: {
    name: 'Liberar Espacio',
    steps: [
      'Confirmar finalización de uso',
      'Registrar estado del espacio',
      'Actualizar disponibilidad',
      'Notificar liberación'
    ]
  },
  
  mantenimientoEspacio: {
    name: 'Mantenimiento de Espacio',
    steps: [
      'Programar mantenimiento',
      'Bloquear espacio',
      'Ejecutar mantenimiento',
      'Liberar espacio post-mantenimiento'
    ]
  }
};