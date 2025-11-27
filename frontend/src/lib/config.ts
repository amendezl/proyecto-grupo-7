// Configuración de la API backend para producción
// Using direct API Gateway URL - CloudFront doesn't work with HTTP API
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://mui3vsx73f.execute-api.us-east-1.amazonaws.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Version': '1.0',
  },
};

// Endpoints del sistema para producción
export const ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh', 
    LOGOUT: '/api/auth/logout',
    // NOTE: register endpoint uses the /api prefix so CloudFront doesn't
    // route frontend pages under /auth/* to the API origin.
    REGISTER: '/api/auth/register',
    ME: '/api/me',
  },
  
  // Dashboard
  DASHBOARD: {
    MAIN: '/api/dashboard',
    MOBILE: '/api/mobile/dashboard',
    VERTICAL: '/api/vertical/dashboard',
    HORIZONTAL: '/api/horizontal/dashboard',
    STATS: '/api/dashboard/estadisticas',
  },
  
  // Gestión de entidades
  ESPACIOS: {
    LIST: '/api/espacios',
    GET: (id: string) => `/api/espacios/${id}`,
    CREATE: '/api/espacios',
    UPDATE: (id: string) => `/api/espacios/${id}`,
    DELETE: (id: string) => `/api/espacios/${id}`,
    STATS: '/api/espacios/estadisticas',
  },
  
  RESERVAS: {
    LIST: '/api/reservas',
    GET: (id: string) => `/api/reservas/${id}`,
    CREATE: '/api/reservas',
    UPDATE: (id: string) => `/api/reservas/${id}`,
    DELETE: (id: string) => `/api/reservas/${id}`,
    CANCEL: (id: string) => `/api/reservas/${id}/cancel`,
    STATS: '/api/reservas/estadisticas',
  },
  
  USUARIOS: {
    LIST: '/api/usuarios',
    GET: (id: string) => `/api/usuarios/${id}`,
    CREATE: '/api/usuarios',
    UPDATE: (id: string) => `/api/usuarios/${id}`,
    DELETE: (id: string) => `/api/usuarios/${id}`,
    TOGGLE: (id: string) => `/api/usuarios/${id}/toggle`,
    PROFILE: '/api/usuarios/perfil',
    CHANGE_PASSWORD: '/api/usuarios/cambiar-password',
  },
  
  RESPONSABLES: {
    LIST: '/api/responsables',
    GET: (id: string) => `/api/responsables/${id}`,
    CREATE: '/api/responsables',
    UPDATE: (id: string) => `/api/responsables/${id}`,
    DELETE: (id: string) => `/api/responsables/${id}`,
    TOGGLE: (id: string) => `/api/responsables/${id}/toggle`,
    BY_AREA: (area: string) => `/api/responsables/area/${area}`,
    ASSIGNED_SPACES: (id: string) => `/api/responsables/${id}/espacios`,
    ASSIGN_SPACE: (id: string) => `/api/responsables/${id}/asignar-espacio`,
    STATS: '/api/responsables/estadisticas',
  },
  
  ZONAS: {
    LIST: '/api/zonas',
    GET: (id: string) => `/api/zonas/${id}`,
    CREATE: '/api/zonas',
    UPDATE: (id: string) => `/api/zonas/${id}`,
    DELETE: (id: string) => `/api/zonas/${id}`,
    TOGGLE: (id: string) => `/api/zonas/${id}/toggle`,
    BY_FLOOR: (floor: number) => `/api/zonas/piso/${floor}`,
    SPACES: (id: string) => `/api/zonas/${id}/espacios`,
    STATS: '/api/zonas/estadisticas',
    FLOORS: '/api/pisos-disponibles',
    BUILDINGS: '/api/edificios-disponibles',
  },
  
  // Personalización SaaS
  PERSONALIZATION: {
    GLOBAL_CONFIG: (clientId: string) => `/api/personalization/client/${clientId}/global`,
    USER_CONFIG: (clientId: string, userId: string) => `/api/personalization/client/${clientId}/user/${userId}`,
    COMPLETE_CONFIG: (clientId: string, userId: string) => `/api/personalization/client/${clientId}/user/${userId}/complete`,
    INDUSTRY_CONFIG: (industry: string) => `/api/personalization/industries/${industry}/config`,
    EXPORT_CONFIG: (clientId: string) => `/api/personalization/client/${clientId}/export`,
    LOAD_EXTERNAL: (clientId: string) => `/api/personalization/client/${clientId}/load-external`,
    CLEAR_CACHE: '/api/personalization/cache/clear',
  },
  
  // Notificaciones SNS
  NOTIFICATIONS: {
    SEND_SPACE: '/api/notifications/space',
    SEND_SYSTEM: '/api/notifications/system',
    SEND_ADMIN: '/api/notifications/admin',
    SUBSCRIBE: '/api/notifications/subscribe',
    LIST_SUBSCRIPTIONS: '/api/notifications/subscriptions',
  },
  
  // Health Check y Resiliencia
  HEALTH: {
    RESILIENCE: '/api/health/resilience',
    COMPLETE: '/api/health/complete-resilience',
    BULKHEAD: '/api/health/bulkhead-status',
    RESET: '/api/health/reset-resilience-metrics',
    CONFIG: '/api/health/resilience-configuration',
  },
  
  // WebSocket para producción
  WEBSOCKET: {
    ENDPOINT: process.env.NEXT_PUBLIC_WS_URL,
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