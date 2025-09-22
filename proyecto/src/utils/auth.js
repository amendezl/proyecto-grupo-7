const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { unauthorized } = require('./responses');
const { hasPermission, requirePermissions, PERMISSIONS } = require('./permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const generateToken = (payload, expiresIn = '4m') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido');
    }
};

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

const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

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

const extractQueryParams = (event) => {
    return event.queryStringParameters || {};
};

const extractPathParams = (event) => {
    return event.pathParameters || {};
};

const parseBody = (event) => {
    try {
        return event.body ? JSON.parse(event.body) : {};
    } catch (error) {
        throw new Error('JSON inválido en el body de la petición');
    }
};

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

const withAuth = (handler, requiredRoles = []) => {
    return withErrorHandling(async (event, context) => {
        const user = authenticateToken(event);
        
        if (requiredRoles.length > 0) {
            requireRole(requiredRoles)(user);
        }
        
        event.user = user;
        
        return await handler(event, context);
    });
};

const withPermissions = (handler, requiredPermissions = []) => {
    return withErrorHandling(async (event, context) => {
        const user = authenticateToken(event);
        
        if (requiredPermissions.length > 0) {
            requireMinimumPermissions(requiredPermissions)(user);
        }
        
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
