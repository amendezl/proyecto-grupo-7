const bcrypt = require('bcryptjs');
const { unauthorized } = require('../../shared/utils/responses');
const { hasPermission, requirePermissions, PERMISSIONS } = require('./permissions');

const getClaimsFromRequestContext = (event) => {
    const jwtCtx = event && event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.jwt;
    return jwtCtx && (jwtCtx.claims || jwtCtx.scopes) ? jwtCtx.claims || {} : null;
};

const claimsToUser = (claims) => {
    if (!claims) return null;

    const role = claims['custom:role'] || (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'][0] : claims['cognito:groups']);
    return {
        id: claims.sub,
        email: claims.email,
        nombre: claims.name || claims.given_name,
        apellido: claims.family_name,
        rol: role || 'usuario',
        claims
    };
};

const authenticateFromClaims = (event) => {
    const claims = getClaimsFromRequestContext(event);
    if (!claims) {
        throw new Error('JWT Authorizer claims required - ensure API Gateway JWT authorizer is properly configured');
    }
    
    if (!claims.sub) {
        throw new Error('Invalid JWT claims: missing subject (sub)');
    }
    
    if (!claims.iss || !claims.iss.includes('cognito-idp')) {
        throw new Error('Invalid JWT claims: invalid issuer');
    }
    
    return claimsToUser(claims);
};

const authenticateToken = async (event) => {
    return authenticateFromClaims(event);
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

const { logger } = require('../monitoring/logger');

const withErrorHandling = (handler) => {
    return async (event, context) => {
        const startTime = Date.now();
        const operationId = `${context?.functionName || 'unknown'}-${Date.now()}`;
        const functionName = context?.functionName || 'unknown';
        
        try {
            logger.operationStart(functionName, { 
                operationId,
                httpMethod: event.httpMethod,
                path: event.path,
                userAgent: event.headers?.['User-Agent']
            });
            
            const result = await handler(event, context);
            
            if (result && typeof result === 'object') {
                const executionTime = Date.now() - startTime;
                
                if (result.statusCode !== undefined) {
                    const body = result.body ? JSON.parse(result.body) : {};
                    if (!body.status && result.statusCode >= 200 && result.statusCode < 300) {
                        body.status = 'SUCCESS';
                        body.executionTime = executionTime;
                        body.operationId = operationId;
                        result.body = JSON.stringify(body);
                    }
                }
                
                logger.operationEnd(functionName, executionTime, {
                    operationId,
                    statusCode: result.statusCode
                });
            }
            
            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.error('Handler execution failed', {
                operationId,
                functionName,
                executionTime,
                errorMessage: error.message,
                errorType: error.constructor.name
            });
            
            const errorResponse = {
                status: 'FAILED',
                executionTime,
                operationId,
                error: 'Error interno del servidor'
            };
            
            if (error.message.includes('autenticación') || error.message.includes('Token')) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({
                        ...errorResponse,
                        error: error.message,
                        type: 'AUTHENTICATION_ERROR'
                    })
                };
            }
            
            if (error.message.includes('Permisos')) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        ...errorResponse,
                        error: error.message,
                        type: 'AUTHORIZATION_ERROR'
                    })
                };
            }
            
            if (process.env.NODE_ENV === 'development') {
                errorResponse.details = error.message;
                errorResponse.stack = error.stack;
            }
            
            return {
                statusCode: 500,
                body: JSON.stringify({
                    ...errorResponse,
                    type: 'INTERNAL_ERROR'
                })
            };
        }
    };
};

const withSecureAuth = (handler, requiredRoles = []) => {
    return withErrorHandling(async (event, context) => {
        const user = authenticateFromClaims(event);
        
        if (requiredRoles.length > 0) {
            requireRole(requiredRoles)(user);
        }
        
        event.user = user;
        
        return await handler(event, context);
    });
};

const withPermissions = (handler, requiredPermissions = []) => {
    return withErrorHandling(async (event, context) => {
        const user = await authenticateToken(event);
        
        if (requiredPermissions.length > 0) {
            requireMinimumPermissions(requiredPermissions)(user);
        }
        
        event.user = user;
        
        return await handler(event, context);
    });
};

module.exports = {
    authenticateToken,
    authenticateFromClaims,
    getClaimsFromRequestContext,
    claimsToUser,
    hashPassword,
    verifyPassword,
    requireRole,
    requireMinimumPermissions,
    extractQueryParams,
    extractPathParams,
    parseBody,
    withErrorHandling,
    withSecureAuth,
    withPermissions
};
