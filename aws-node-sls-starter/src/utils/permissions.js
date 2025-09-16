/**
 * Repositorio de Permisos - Sistema de Gestión de Espacios
 * 
 * Define todos los permisos disponibles en el sistema y gestiona
 * la asignación de roles siguiendo el principio de mínimo privilegio
 */

/**
 * REPOSITORIO DE PERMISOS DISPONIBLES
 * Cada permiso representa una acción específica en el sistema
 */
const PERMISSIONS = {
  // === PERMISOS DE ESPACIOS ===
  ESPACIOS_READ: 'espacios:read',
  ESPACIOS_CREATE: 'espacios:create',
  ESPACIOS_UPDATE: 'espacios:update',
  ESPACIOS_DELETE: 'espacios:delete',
  ESPACIOS_STATS: 'espacios:stats',
  
  // === PERMISOS DE RESERVAS ===
  RESERVAS_READ: 'reservas:read',
  RESERVAS_CREATE: 'reservas:create',
  RESERVAS_UPDATE: 'reservas:update',
  RESERVAS_DELETE: 'reservas:delete',
  RESERVAS_CANCEL: 'reservas:cancel',
  RESERVAS_STATS: 'reservas:stats',
  RESERVAS_READ_ALL: 'reservas:read_all', // Ver todas las reservas
  
  // === PERMISOS DE USUARIOS ===
  USUARIOS_READ: 'usuarios:read',
  USUARIOS_CREATE: 'usuarios:create',
  USUARIOS_UPDATE: 'usuarios:update',
  USUARIOS_DELETE: 'usuarios:delete',
  USUARIOS_TOGGLE_STATUS: 'usuarios:toggle_status',
  USUARIOS_CHANGE_PASSWORD: 'usuarios:change_password',
  USUARIOS_READ_PROFILE: 'usuarios:read_profile',
  USUARIOS_UPDATE_PROFILE: 'usuarios:update_profile',
  
  // === PERMISOS DE RECURSOS ===
  RECURSOS_READ: 'recursos:read',
  RECURSOS_CREATE: 'recursos:create',
  RECURSOS_UPDATE: 'recursos:update',
  RECURSOS_DELETE: 'recursos:delete',
  RECURSOS_TOGGLE_AVAILABILITY: 'recursos:toggle_availability',
  RECURSOS_STATS: 'recursos:stats',
  
  // === PERMISOS DE RESPONSABLES ===
  RESPONSABLES_READ: 'responsables:read',
  RESPONSABLES_CREATE: 'responsables:create',
  RESPONSABLES_UPDATE: 'responsables:update',
  RESPONSABLES_DELETE: 'responsables:delete',
  RESPONSABLES_ASSIGN_SPACE: 'responsables:assign_space',
  RESPONSABLES_STATS: 'responsables:stats',
  
  // === PERMISOS DE ZONAS ===
  ZONAS_READ: 'zonas:read',
  ZONAS_CREATE: 'zonas:create',
  ZONAS_UPDATE: 'zonas:update',
  ZONAS_DELETE: 'zonas:delete',
  ZONAS_TOGGLE_STATUS: 'zonas:toggle_status',
  ZONAS_STATS: 'zonas:stats',
  
  // === PERMISOS DE DASHBOARD Y REPORTES ===
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_STATS_DETAILED: 'dashboard:stats_detailed',
  
  // === PERMISOS DE NOTIFICACIONES ===
  NOTIFICATIONS_SEND_SPACE: 'notifications:send_space',
  NOTIFICATIONS_SEND_SYSTEM: 'notifications:send_system',
  NOTIFICATIONS_SEND_ADMIN: 'notifications:send_admin',
  NOTIFICATIONS_SUBSCRIBE: 'notifications:subscribe',
  
  // === PERMISOS DE SISTEMA ===
  SYSTEM_HEALTH_CHECK: 'system:health_check',
  SYSTEM_RESILIENCE_VIEW: 'system:resilience_view',
  SYSTEM_RESILIENCE_RESET: 'system:resilience_reset',
  SYSTEM_RESILIENCE_TEST: 'system:resilience_test',
  
  // === PERMISOS ADMINISTRATIVOS ===
  ADMIN_FULL_ACCESS: 'admin:full_access',
  ADMIN_USER_MANAGEMENT: 'admin:user_management',
  ADMIN_SYSTEM_CONFIG: 'admin:system_config'
};

/**
 * DEFINICIÓN DE ROLES CON PRINCIPIO DE MÍNIMO PRIVILEGIO
 * Cada rol tiene solo los permisos necesarios para sus funciones
 */
const ROLE_PERMISSIONS = {
  /**
   * USUARIO - Rol básico con permisos mínimos
   * Puede: Ver espacios, crear/gestionar sus propias reservas, ver su perfil
   */
  usuario: [
    PERMISSIONS.ESPACIOS_READ,
    PERMISSIONS.RESERVAS_READ, // Solo sus propias reservas
    PERMISSIONS.RESERVAS_CREATE,
    PERMISSIONS.RESERVAS_UPDATE, // Solo sus propias reservas
    PERMISSIONS.RESERVAS_CANCEL, // Solo sus propias reservas
    PERMISSIONS.USUARIOS_READ_PROFILE,
    PERMISSIONS.USUARIOS_UPDATE_PROFILE,
    PERMISSIONS.USUARIOS_CHANGE_PASSWORD,
    PERMISSIONS.RECURSOS_READ,
    PERMISSIONS.ZONAS_READ,
    PERMISSIONS.NOTIFICATIONS_SUBSCRIBE
  ],
  
  /**
   * RESPONSABLE - Gestión de espacios asignados
   * Puede: Gestionar espacios asignados, ver todas las reservas de sus espacios
   */
  responsable: [
    // Permisos de usuario base
    ...ROLE_PERMISSIONS.usuario || [],
    
    // Permisos adicionales para responsables
    PERMISSIONS.ESPACIOS_UPDATE, // Solo espacios asignados
    PERMISSIONS.ESPACIOS_STATS,
    PERMISSIONS.RESERVAS_READ_ALL, // Todas las reservas de sus espacios
    PERMISSIONS.RESERVAS_STATS,
    PERMISSIONS.RECURSOS_UPDATE, // Recursos de sus espacios
    PERMISSIONS.RECURSOS_TOGGLE_AVAILABILITY,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND_SPACE
  ],
  
  /**
   * ADMIN - Control total del sistema
   * Puede: Acceso completo a todas las funcionalidades
   */
  admin: [
    // Todos los permisos de espacios
    PERMISSIONS.ESPACIOS_READ,
    PERMISSIONS.ESPACIOS_CREATE,
    PERMISSIONS.ESPACIOS_UPDATE,
    PERMISSIONS.ESPACIOS_DELETE,
    PERMISSIONS.ESPACIOS_STATS,
    
    // Todos los permisos de reservas
    PERMISSIONS.RESERVAS_READ,
    PERMISSIONS.RESERVAS_CREATE,
    PERMISSIONS.RESERVAS_UPDATE,
    PERMISSIONS.RESERVAS_DELETE,
    PERMISSIONS.RESERVAS_CANCEL,
    PERMISSIONS.RESERVAS_STATS,
    PERMISSIONS.RESERVAS_READ_ALL,
    
    // Todos los permisos de usuarios
    PERMISSIONS.USUARIOS_READ,
    PERMISSIONS.USUARIOS_CREATE,
    PERMISSIONS.USUARIOS_UPDATE,
    PERMISSIONS.USUARIOS_DELETE,
    PERMISSIONS.USUARIOS_TOGGLE_STATUS,
    PERMISSIONS.USUARIOS_CHANGE_PASSWORD,
    PERMISSIONS.USUARIOS_READ_PROFILE,
    PERMISSIONS.USUARIOS_UPDATE_PROFILE,
    
    // Todos los permisos de recursos
    PERMISSIONS.RECURSOS_READ,
    PERMISSIONS.RECURSOS_CREATE,
    PERMISSIONS.RECURSOS_UPDATE,
    PERMISSIONS.RECURSOS_DELETE,
    PERMISSIONS.RECURSOS_TOGGLE_AVAILABILITY,
    PERMISSIONS.RECURSOS_STATS,
    
    // Todos los permisos de responsables
    PERMISSIONS.RESPONSABLES_READ,
    PERMISSIONS.RESPONSABLES_CREATE,
    PERMISSIONS.RESPONSABLES_UPDATE,
    PERMISSIONS.RESPONSABLES_DELETE,
    PERMISSIONS.RESPONSABLES_ASSIGN_SPACE,
    PERMISSIONS.RESPONSABLES_STATS,
    
    // Todos los permisos de zonas
    PERMISSIONS.ZONAS_READ,
    PERMISSIONS.ZONAS_CREATE,
    PERMISSIONS.ZONAS_UPDATE,
    PERMISSIONS.ZONAS_DELETE,
    PERMISSIONS.ZONAS_TOGGLE_STATUS,
    PERMISSIONS.ZONAS_STATS,
    
    // Permisos de dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_STATS_DETAILED,
    
    // Permisos de notificaciones
    PERMISSIONS.NOTIFICATIONS_SEND_SPACE,
    PERMISSIONS.NOTIFICATIONS_SEND_SYSTEM,
    PERMISSIONS.NOTIFICATIONS_SEND_ADMIN,
    PERMISSIONS.NOTIFICATIONS_SUBSCRIBE,
    
    // Permisos de sistema
    PERMISSIONS.SYSTEM_HEALTH_CHECK,
    PERMISSIONS.SYSTEM_RESILIENCE_VIEW,
    PERMISSIONS.SYSTEM_RESILIENCE_RESET,
    PERMISSIONS.SYSTEM_RESILIENCE_TEST,
    
    // Permisos administrativos
    PERMISSIONS.ADMIN_FULL_ACCESS,
    PERMISSIONS.ADMIN_USER_MANAGEMENT,
    PERMISSIONS.ADMIN_SYSTEM_CONFIG
  ]
};

/**
 * Verifica si un usuario tiene un permiso específico
 * @param {Object} user - Usuario con rol
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
const hasPermission = (user, permission) => {
  if (!user || !user.rol) {
    return false;
  }
  
  const userRoles = Array.isArray(user.rol) ? user.rol : [user.rol];
  
  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    if (rolePermissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Verifica si un usuario tiene alguno de los permisos especificados
 * @param {Object} user - Usuario con rol
 * @param {Array<string>} permissions - Lista de permisos
 * @returns {boolean}
 */
const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Verifica si un usuario tiene todos los permisos especificados
 * @param {Object} user - Usuario con rol
 * @param {Array<string>} permissions - Lista de permisos
 * @returns {boolean}
 */
const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Obtiene todos los permisos de un usuario basado en sus roles
 * @param {Object} user - Usuario con rol
 * @returns {Array<string>}
 */
const getUserPermissions = (user) => {
  if (!user || !user.rol) {
    return [];
  }
  
  const userRoles = Array.isArray(user.rol) ? user.rol : [user.rol];
  const allPermissions = new Set();
  
  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    rolePermissions.forEach(permission => allPermissions.add(permission));
  }
  
  return Array.from(allPermissions);
};

/**
 * Middleware para verificar permisos específicos
 * @param {string|Array<string>} requiredPermissions - Permisos requeridos
 * @returns {Function}
 */
const requirePermissions = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (user) => {
    if (!hasAnyPermission(user, permissions)) {
      throw new Error(`Acceso denegado. Permisos requeridos: ${permissions.join(', ')}`);
    }
  };
};

/**
 * Verifica si un usuario puede acceder a un recurso específico
 * Implementa lógica adicional para recursos propios vs. todos los recursos
 */
const canAccessResource = (user, permission, resourceOwnerId = null) => {
  // Verificar permiso básico
  if (!hasPermission(user, permission)) {
    return false;
  }
  
  // Si es un recurso específico de usuario, verificar ownership
  if (resourceOwnerId && user.id !== resourceOwnerId) {
    // Solo admins pueden acceder a recursos de otros usuarios
    return hasPermission(user, PERMISSIONS.ADMIN_FULL_ACCESS);
  }
  
  return true;
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  requirePermissions,
  canAccessResource
};