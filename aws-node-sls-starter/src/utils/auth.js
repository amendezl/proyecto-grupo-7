const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { unauthorized } = require('./responses');
const { hasPermission, requirePermissions, PERMISSIONS } = require('./permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Genera un token JWT con validez inferior a 5 minutos
 */
const generateToken = (payload, expiresIn = '4m') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verifica un token JWT
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido');
    }
};

/**
 * Extrae el token del header Authorization
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) {
        return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
};

/**
 * Middleware de autenticación para Lambda
 */
const authenticateToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
        throw new Error('Token de autenticación requerido');
    }
    
    try {
        const decoded = verifyToken(token);
        return decoded;
    } catch (error) {
        throw new Error('Token de autenticación inválido');
    }
};

/**
 * Hash de contraseña
 */
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Verificar contraseña
 */
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Middleware para verificar roles (DEPRECATED - Usar requirePermissions)
 */
const requireRole = (requiredRoles) => {
    return (user) => {
        if (!user || !user.rol) {
            throw new Error('Usuario no autenticado');
        }
        
        const userRoles = Array.isArray(user.rol) ? user.rol : [user.rol];
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
            throw new Error('Permisos insuficientes');
        }
        
        return true;
    };
};

/**
 * Middleware para verificar permisos específicos (NUEVO - Principio de mínimo privilegio)
 */
const requireMinimumPermissions = (requiredPermissions) => {
    return (user) => {
        if (!user || !user.rol) {
            throw new Error('Usuario no autenticado');
        }
        
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        
        for (const permission of permissions) {
            if (!hasPermission(user, permission)) {
                throw new Error(`Permiso insuficiente: ${permission}`);
            }
        }
        
        return true;
    };
};

/**
 * Extrae parámetros de la query string
 */
const extractQueryParams = (event) => {
    return event.queryStringParameters || {};
};

/**
 * Extrae parámetros de la ruta
 */
const extractPathParams = (event) => {
    return event.pathParameters || {};
};

/**
 * Parsea el body del request
 */
const parseBody = (event) => {
    try {
        return event.body ? JSON.parse(event.body) : {};
    } catch (error) {
        throw new Error('JSON inválido en el body de la petición');
    }
};

/**
 * Wrapper para handlers con manejo de errores automático
 */
const withErrorHandling = (handler) => {
    return async (event, context) => {
        try {
            return await handler(event, context);
        } catch (error) {
            console.error('Error en handler:', error);
            
            if (error.message.includes('autenticación') || error.message.includes('Token')) {
                return unauthorized(error.message);
            }
            
            if (error.message.includes('Permisos')) {
                return { statusCode: 403, body: JSON.stringify({ error: error.message }) };
            }
            
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Error interno del servidor',
                    message: process.env.NODE_ENV === 'development' ? error.message : undefined
                })
            };
        }
    };
};

/**
 * Wrapper para handlers que requieren autenticación con roles (DEPRECATED)
 */
const withAuth = (handler, requiredRoles = []) => {
    return withErrorHandling(async (event, context) => {
        const user = authenticateToken(event);
        
        if (requiredRoles.length > 0) {
            requireRole(requiredRoles)(user);
        }
        
        // Agregar usuario al evento para uso en el handler
        event.user = user;
        
        return await handler(event, context);
    });
};

/**
 * Wrapper para handlers que requieren permisos específicos (NUEVO)
 * Implementa el principio de mínimo privilegio
 */
const withPermissions = (handler, requiredPermissions = []) => {
    return withErrorHandling(async (event, context) => {
        const user = authenticateToken(event);
        
        if (requiredPermissions.length > 0) {
            requireMinimumPermissions(requiredPermissions)(user);
        }
        
        // Agregar usuario al evento para uso en el handler
        event.user = user;
        
        return await handler(event, context);
    });
};

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeader,
    authenticateToken,
    hashPassword,
    verifyPassword,
    requireRole,
    requireMinimumPermissions,
    extractQueryParams,
    extractPathParams,
    parseBody,
    withErrorHandling,
    withAuth,
    withPermissions
};
