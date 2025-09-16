// Configuración de la API backend
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/dev',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Endpoints del sistema
export const ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/login',
    REFRESH: '/refresh', 
    LOGOUT: '/logout',
    REGISTER: '/register',
    ME: '/me',
  },
  
  // Dashboard
  DASHBOARD: {
    MAIN: '/dashboard',
    MOBILE: '/mobile/dashboard',
    VERTICAL: '/vertical/dashboard',
    HORIZONTAL: '/horizontal/dashboard',
    STATS: '/estadisticas-detalladas',
  },
  
  // Gestión de entidades
  ESPACIOS: {
    LIST: '/espacios',
    GET: (id: string) => `/espacios/${id}`,
    CREATE: '/espacios',
    UPDATE: (id: string) => `/espacios/${id}`,
    DELETE: (id: string) => `/espacios/${id}`,
  },
  
  RESERVAS: {
    LIST: '/reservas',
    GET: (id: string) => `/reservas/${id}`,
    CREATE: '/reservas',
    UPDATE: (id: string) => `/reservas/${id}`,
    DELETE: (id: string) => `/reservas/${id}`,
    MY_RESERVAS: '/mis-reservas',
  },
  
  USUARIOS: {
    LIST: '/usuarios',
    GET: (id: string) => `/usuarios/${id}`,
    CREATE: '/usuarios',
    UPDATE: (id: string) => `/usuarios/${id}`,
    DELETE: (id: string) => `/usuarios/${id}`,
  },
  
  RESPONSABLES: {
    LIST: '/responsables',
    GET: (id: string) => `/responsables/${id}`,
    CREATE: '/responsables',
    UPDATE: (id: string) => `/responsables/${id}`,
    DELETE: (id: string) => `/responsables/${id}`,
  },
  
  ZONAS: {
    LIST: '/zonas',
    GET: (id: string) => `/zonas/${id}`,
    CREATE: '/zonas',
    UPDATE: (id: string) => `/zonas/${id}`,
    DELETE: (id: string) => `/zonas/${id}`,
  },
  
  // Personalización
  PERSONALIZATION: {
    GLOBAL_CONFIG: '/client-global-config',
    USER_CONFIG: '/user-specific-config', 
    COMPLETE_CONFIG: '/complete-user-config',
    INDUSTRY_CONFIG: '/industry-config',
    EXPORT_CONFIG: '/export-client-config',
    LOAD_EXTERNAL: '/load-external-config',
    CLEAR_CACHE: '/clear-configuration-cache',
  },
  
  // Notificaciones SNS
  NOTIFICATIONS: {
    SEND_SPACE: '/send-space-notification',
    SEND_SYSTEM: '/send-system-alert',
    SEND_ADMIN: '/send-admin-notification',
  },
  
  // Health Check y Resiliencia
  HEALTH: {
    RESILIENCE: '/resilience-health',
    COMPLETE: '/complete-resilience-health',
    BULKHEAD: '/bulkhead-status',
    RESET: '/reset-resilience-metrics',
    TEST: '/test-resilience-patterns',
    CONFIG: '/resilience-configuration',
  },
} as const;

// Tipos de dispositivos para optimización
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet', 
  DESKTOP: 'desktop',
} as const;

// Configuración responsive
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;