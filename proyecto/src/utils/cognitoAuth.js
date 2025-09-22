/**
 * @param {Object} event - Event de Lambda con autorización de API Gateway
 * @returns {Object} - Información del usuario
 */
const getUserFromCognito = (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    
    if (!claims) {
      throw new Error('No se encontraron claims de autenticación');
    }

    return {
      id: claims.sub,
      email: claims.email,
      cognitoUsername: claims['cognito:username'],
      emailVerified: claims.email_verified === 'true',
      rol: claims['custom:role'] || 'usuario',
      nombre: claims.name || '',
      apellido: claims.family_name || '',
      tokenUse: claims.token_use,
      audience: claims.aud,
      issuer: claims.iss,
      exp: claims.exp,
      iat: claims.iat
    };
  } catch (error) {
    console.error('Error extrayendo usuario de Cognito:', error);
    throw error;
  }
};

/**
 * @param {Object} user - Usuario de Cognito
 * @param {string|Array} requiredRole - Rol(es) requerido(s)
 * @returns {boolean} - Si el usuario tiene autorización
 */
const hasRole = (user, requiredRole) => {
  if (!user.rol) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.rol);
  }
  
  return user.rol === requiredRole;
};

/**
 * @param {Object} user - Usuario de Cognito
 * @returns {boolean}
 */
const isAdmin = (user) => {
  return user.rol === 'admin';
};

/**
 * @param {Object} user - Usuario de Cognito
 * @returns {boolean}
 */
const isResponsable = (user) => {
  return user.rol === 'responsable';
};

/**
 * @param {string|Array} requiredRoles - Roles requeridos
 * @returns {Function} - Función middleware
 */
const requireRole = (requiredRoles) => {
  return (handler) => {
    return async (event) => {
      try {
        const user = getUserFromCognito(event);
        
        if (!hasRole(user, requiredRoles)) {
          return {
            statusCode: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              ok: false,
              error: 'No tienes permisos para realizar esta acción'
            })
          };
        }
        
        event.cognitoUser = user;
        
        return await handler(event);
      } catch (error) {
        console.error('Error en middleware de autorización:', error);
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            ok: false,
            error: 'Token de autenticación inválido'
          })
        };
      }
    };
  };
};

module.exports = {
  getUserFromCognito,
  hasRole,
  isAdmin,
  isResponsable,
  requireRole
};
