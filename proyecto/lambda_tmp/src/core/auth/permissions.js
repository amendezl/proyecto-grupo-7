const PERMISSIONS = {

  ESPACIOS_READ: 'espacios:read',
  ESPACIOS_CREATE: 'espacios:create',
  ESPACIOS_UPDATE: 'espacios:update',
  ESPACIOS_DELETE: 'espacios:delete',
  ESPACIOS_STATS: 'espacios:stats',
  
  RESERVAS_READ: 'reservas:read',
  RESERVAS_CREATE: 'reservas:create',
  RESERVAS_UPDATE: 'reservas:update',
  RESERVAS_DELETE: 'reservas:delete',
  RESERVAS_CANCEL: 'reservas:cancel',
  RESERVAS_STATS: 'reservas:stats',
  RESERVAS_READ_ALL: 'reservas:read_all',
  
  USUARIOS_READ: 'usuarios:read',
  USUARIOS_CREATE: 'usuarios:create',
  USUARIOS_UPDATE: 'usuarios:update',
  USUARIOS_DELETE: 'usuarios:delete',
  USUARIOS_TOGGLE_STATUS: 'usuarios:toggle_status',
  USUARIOS_CHANGE_PASSWORD: 'usuarios:change_password',
  USUARIOS_READ_PROFILE: 'usuarios:read_profile',
  USUARIOS_UPDATE_PROFILE: 'usuarios:update_profile',
  
  RESPONSABLES_READ: 'responsables:read',
  RESPONSABLES_CREATE: 'responsables:create',
  RESPONSABLES_UPDATE: 'responsables:update',
  RESPONSABLES_DELETE: 'responsables:delete',
  RESPONSABLES_ASSIGN_SPACE: 'responsables:assign_space',
  RESPONSABLES_STATS: 'responsables:stats',
  
  ZONAS_READ: 'zonas:read',
  ZONAS_CREATE: 'zonas:create',
  ZONAS_UPDATE: 'zonas:update',
  ZONAS_DELETE: 'zonas:delete',
  ZONAS_TOGGLE_STATUS: 'zonas:toggle_status',
  ZONAS_STATS: 'zonas:stats',
  
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_STATS_DETAILED: 'dashboard:stats_detailed',
  
  NOTIFICATIONS_SEND_SPACE: 'notifications:send_space',
  NOTIFICATIONS_SEND_SYSTEM: 'notifications:send_system',
  NOTIFICATIONS_SEND_ADMIN: 'notifications:send_admin',
  NOTIFICATIONS_SUBSCRIBE: 'notifications:subscribe',
  
  SYSTEM_HEALTH_CHECK: 'system:health_check',
  SYSTEM_RESILIENCE_VIEW: 'system:resilience_view',
  SYSTEM_RESILIENCE_RESET: 'system:resilience_reset',
  
  ADMIN_FULL_ACCESS: 'admin:full_access',
  ADMIN_USER_MANAGEMENT: 'admin:user_management',
  ADMIN_SYSTEM_CONFIG: 'admin:system_config'
};

// Define role permission lists in order to avoid self-references during initialization
const usuarioPermissions = [
  PERMISSIONS.ESPACIOS_READ,
  PERMISSIONS.RESERVAS_READ,
  PERMISSIONS.RESERVAS_CREATE,
  PERMISSIONS.RESERVAS_UPDATE,
  PERMISSIONS.RESERVAS_CANCEL,
  PERMISSIONS.USUARIOS_READ_PROFILE,
  PERMISSIONS.USUARIOS_UPDATE_PROFILE,
  PERMISSIONS.USUARIOS_CHANGE_PASSWORD,
  PERMISSIONS.ZONAS_READ,
  PERMISSIONS.NOTIFICATIONS_SUBSCRIBE
];

const responsablePermissions = [
  ...usuarioPermissions,
  PERMISSIONS.ESPACIOS_UPDATE,
  PERMISSIONS.ESPACIOS_STATS,
  PERMISSIONS.RESERVAS_READ_ALL,
  PERMISSIONS.RESERVAS_STATS,
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.NOTIFICATIONS_SEND_SPACE
];

const adminPermissions = [

    PERMISSIONS.ESPACIOS_READ,
    PERMISSIONS.ESPACIOS_CREATE,
    PERMISSIONS.ESPACIOS_UPDATE,
    PERMISSIONS.ESPACIOS_DELETE,
    PERMISSIONS.ESPACIOS_STATS,
    
    PERMISSIONS.RESERVAS_READ,
    PERMISSIONS.RESERVAS_CREATE,
    PERMISSIONS.RESERVAS_UPDATE,
    PERMISSIONS.RESERVAS_DELETE,
    PERMISSIONS.RESERVAS_CANCEL,
    PERMISSIONS.RESERVAS_STATS,
    PERMISSIONS.RESERVAS_READ_ALL,
    
    PERMISSIONS.USUARIOS_READ,
    PERMISSIONS.USUARIOS_CREATE,
    PERMISSIONS.USUARIOS_UPDATE,
    PERMISSIONS.USUARIOS_DELETE,
    PERMISSIONS.USUARIOS_TOGGLE_STATUS,
    PERMISSIONS.USUARIOS_CHANGE_PASSWORD,
    PERMISSIONS.USUARIOS_READ_PROFILE,
    PERMISSIONS.USUARIOS_UPDATE_PROFILE,
    
    PERMISSIONS.RESPONSABLES_READ,
    PERMISSIONS.RESPONSABLES_CREATE,
    PERMISSIONS.RESPONSABLES_UPDATE,
    PERMISSIONS.RESPONSABLES_DELETE,
    PERMISSIONS.RESPONSABLES_ASSIGN_SPACE,
    PERMISSIONS.RESPONSABLES_STATS,
    
    PERMISSIONS.ZONAS_READ,
    PERMISSIONS.ZONAS_CREATE,
    PERMISSIONS.ZONAS_UPDATE,
    PERMISSIONS.ZONAS_DELETE,
    PERMISSIONS.ZONAS_TOGGLE_STATUS,
    PERMISSIONS.ZONAS_STATS,
    
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_STATS_DETAILED,
    
    PERMISSIONS.NOTIFICATIONS_SEND_SPACE,
    PERMISSIONS.NOTIFICATIONS_SEND_SYSTEM,
    PERMISSIONS.NOTIFICATIONS_SEND_ADMIN,
    PERMISSIONS.NOTIFICATIONS_SUBSCRIBE,
    
    PERMISSIONS.SYSTEM_HEALTH_CHECK,
    PERMISSIONS.SYSTEM_RESILIENCE_VIEW,
    PERMISSIONS.SYSTEM_RESILIENCE_RESET,
    PERMISSIONS.SYSTEM_RESILIENCE_TEST,
    
    PERMISSIONS.ADMIN_FULL_ACCESS,
    PERMISSIONS.ADMIN_USER_MANAGEMENT,
    PERMISSIONS.ADMIN_SYSTEM_CONFIG
];

const ROLE_PERMISSIONS = {
  usuario: usuarioPermissions,
  responsable: responsablePermissions,
  admin: adminPermissions
};

/**
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
 * @param {Object} user - Usuario con rol
 * @param {Array<string>} permissions - Lista de permisos
 * @returns {boolean}
 */
const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * @param {Object} user - Usuario con rol
 * @param {Array<string>} permissions - Lista de permisos
 * @returns {boolean}
 */
const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
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
 * @param {string|Array<string>} requiredPermissions
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

const canAccessResource = (user, permission, resourceOwnerId = null) => {
  if (!hasPermission(user, permission)) {
    return false;
  }
  
  if (resourceOwnerId && user.id !== resourceOwnerId) {
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