const DynamoDBManager = require('../../infrastructure/database/DynamoDBManager');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { withPermissions, extractQueryParams, extractPathParams, parseBody } = require('../../core/auth/auth');
const { PERMISSIONS } = require('../../core/auth/permissions');
const { success, badRequest, notFound, created } = require('../../shared/utils/responses');
const { notifySpaceCreated, notifySpaceUpdated, notifySpaceDeleted } = require('../../infrastructure/messaging/snsNotifications');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateForDynamoDB, validateBusinessRules } = require('../../core/validation/validator');

const db = new DynamoDBManager();

const getEspacios = withPermissions(async (event) => {
    const queryParams = extractQueryParams(event);
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const filters = {};
                if (queryParams.tipo) filters.tipo = queryParams.tipo;
                if (queryParams.estado) filters.estado = queryParams.estado;
                if (queryParams.zona_id) filters.zona_id = queryParams.zona_id;
                
                const espacios = await db.getEspacios(filters);
                
                return {
                    espacios,
                    total: espacios.length,
                    filtros_aplicados: Object.keys(filters).length > 0 ? filters : null
                };
            },
            {
                operation: 'getEspacios',
                priority: 'standard',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(result);
        
    } catch (error) {
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        espacios: [],
                        total: 0,
                        warning: 'Datos de espacios no disponibles temporalmente'
                    }
                })
            };
        }
        
        logger.error('[GET_ESPACIOS] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.ESPACIOS_READ]);

const getEspacio = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const espacio = await resilienceManager.executeDatabase(
            async () => {
                const resultado = await db.getEspacioById(id);
                if (!resultado) {
                    throw new Error('Espacio no encontrado');
                }
                return resultado;
            },
            {
                operation: 'getEspacio',
                priority: 'standard',
                espacioId: id,
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(espacio);
        
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound('Espacio no encontrado');
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        logger.error('[GET_ESPACIO] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.ESPACIOS_READ]);

const createEspacio = withPermissions(async (event) => {
    try {
        const espacioData = parseBody(event);
        
        const validatedData = validateForDynamoDB('espacio', espacioData);
        
        const businessRulesResult = validateBusinessRules('espacio', validatedData);
        if (!businessRulesResult.valid) {
            logger.warn('Space creation business rules failed', {
                errors: businessRulesResult.errors,
                requestId: event.requestContext?.requestId
            });
            return badRequest('Business rules validation failed', businessRulesResult.errors);
        }
        
        const { nombre, tipo, capacidad, ubicacion, zona_id } = validatedData;
        const esCritico = tipo.toLowerCase().includes('emergencia') ||
                         tipo.toLowerCase().includes('quirófano') ||
                         tipo.toLowerCase().includes('uci') ||
                         tipo.toLowerCase().includes('urgencia') ||
                         nombre.toLowerCase().includes('emergencia');
        
        const nuevoEspacio = await resilienceManager.executeWithFullResilience(
            async () => {
                if (zona_id) {
                    const espaciosExistentes = await db.getEspacios({ zona_id });
                    const nombreDuplicado = espaciosExistentes.some(e => 
                        e.nombre.toLowerCase() === nombre.toLowerCase()
                    );
                    
                    if (nombreDuplicado) {
                        throw new Error('Ya existe un espacio con ese nombre en la zona');
                    }
                }
                
                return await db.createEspacio({
                    ...validatedData,
                    capacidad: parseInt(validatedData.capacidad),
                    prioridad: esCritico ? 'critico' : 'normal'
                });
            },
            esCritico ? 'CRITICAL_BUSINESS' : 'DATABASE_OPERATIONS',
            {
                operation: 'createEspacio',
                espacioTipo: tipo,
                esCritico
            }
        );
        
        if (esCritico) {
            console.log(`[CRITICAL_SPACE] Espacio crítico creado: ${nuevoEspacio.id} - ${nombre} (${tipo})`);
        }
        
        const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'system';
        notifySpaceCreated(nuevoEspacio, userId).catch(error => {
            logger.error('Failed to send space creation notification:', { errorMessage: error.message, errorType: error.constructor.name });
        });
        
        logger.info('Space created successfully', {
            espacioId: nuevoEspacio.id,
            espacioTipo: tipo,
            esCritico,
            requestId: event.requestContext?.requestId
        });
        
        return created(nuevoEspacio);
        
    } catch (validationError) {
        if (validationError.code === 'VALIDATION_ERROR') {
            logger.warn('Space creation validation failed', {
                errors: validationError.validationErrors,
                requestId: event.requestContext?.requestId
            });
            return badRequest('Datos de espacio inválidos', validationError.validationErrors);
        }
        
        logger.error('Space creation error', { 
            errorMessage: validationError.message, 
            errorType: validationError.constructor.name,
            requestId: event.requestContext?.requestId
        });
        
        if (validationError.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado',
                    suggestion: 'Intente crear el espacio nuevamente en unos momentos'
                })
            };
        }
        
        if (validationError.name === 'RetryExhaustedError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios no responde',
                    fallback: 'Contacte administración para creación manual del espacio'
                })
            };
        }
        
        return badRequest(error.message);
    }
}, [PERMISSIONS.ESPACIOS_CREATE]);

const updateEspacio = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const espacioActualizado = await resilienceManager.executeDatabase(
            async () => {
                const espacioExistente = await db.getEspacioById(id);
                if (!espacioExistente) {
                    throw new Error('Espacio no encontrado');
                }
                
                const esCritico = espacioExistente.tipo?.toLowerCase().includes('emergencia') ||
                                 espacioExistente.tipo?.toLowerCase().includes('quirófano') ||
                                 espacioExistente.tipo?.toLowerCase().includes('uci') ||
                                 updateData.tipo?.toLowerCase().includes('emergencia');
                
                if (esCritico && updateData.estado === 'mantenimiento') {
                    logger.warn('[CRITICAL_MAINTENANCE] Espacio crítico ${id} entrando en mantenimiento');
                }
                
                return await db.updateEspacio(id, updateData);
            },
            {
                operation: 'updateEspacio',
                priority: 'standard',
                espacioId: id
            }
        );
        
        const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'system';
        notifySpaceUpdated(espacioActualizado, userId, updateData).catch(error => {
            logger.error('Failed to send space update notification:', { errorMessage: error.message, errorType: error.constructor.name });
        });
        
        return success(espacioActualizado);
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        logger.error('[UPDATE_ESPACIO] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.ESPACIOS_UPDATE]);

const deleteEspacio = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const espacioExistente = await db.getEspacioById(id);
                if (!espacioExistente) {
                    throw new Error('Espacio no encontrado');
                }
                
                const esCritico = espacioExistente.tipo?.toLowerCase().includes('emergencia') ||
                                 espacioExistente.tipo?.toLowerCase().includes('quirófano') ||
                                 espacioExistente.tipo?.toLowerCase().includes('uci');
                
                if (esCritico) {
                    logger.warn('[CRITICAL_DELETION] Eliminando espacio crítico ${id} - ${espacioExistente.nombre}');
                }
                
                const reservasActivas = await db.getReservas({ 
                    espacio_id: id, 
                    estado: 'confirmada' 
                });
                
                if (reservasActivas.length > 0) {
                    throw new Error('No se puede eliminar un espacio con reservas activas');
                }
                
                await db.deleteEspacio(id);
                
                const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'system';
                notifySpaceDeleted(id, espacioExistente.nombre, userId).catch(error => {
                    logger.error('Failed to send space deletion notification:', { errorMessage: error.message, errorType: error.constructor.name });
                });
                
                return { message: 'Espacio eliminado correctamente', id };
            },
            {
                operation: 'deleteEspacio',
                priority: 'standard',
                espacioId: id
            }
        );
        
        return success(result);
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        
        if (error.message.includes('reservas activas')) {
            return badRequest(error.message);
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        logger.error('[DELETE_ESPACIO] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.ESPACIOS_DELETE]);

const getEstadisticasEspacios = withPermissions(async (event) => {
    try {
        const stats = await resilienceManager.executeDatabase(
            async () => {
                const espacios = await db.getEspacios();
                
                const estadisticas = {
                    total: espacios.length,
                    disponibles: espacios.filter(e => e.estado === 'disponible').length,
                    ocupados: espacios.filter(e => e.estado === 'ocupado').length,
                    mantenimiento: espacios.filter(e => e.estado === 'mantenimiento').length,
                    criticos: espacios.filter(e => {
                        const tipo = e.tipo?.toLowerCase() || '';
                        return tipo.includes('emergencia') || 
                               tipo.includes('quirófano') || 
                               tipo.includes('uci') ||
                               e.prioridad === 'critico';
                    }).length,
                    porTipo: {},
                    capacidadTotal: espacios.reduce((total, e) => total + (e.capacidad || 0), 0)
                };
                
                espacios.forEach(espacio => {
                    if (!stats.porTipo[espacio.tipo]) {
                        stats.porTipo[espacio.tipo] = 0;
                    }
                    stats.porTipo[espacio.tipo]++;
                });
                
                return estadisticas;
            },
            {
                operation: 'getEstadisticasEspacios',
                priority: 'low',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(stats);
        
    } catch (error) {
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        total: 0,
                        disponibles: 0,
                        ocupados: 0,
                        mantenimiento: 0,
                        criticos: 0,
                        porTipo: {},
                        capacidadTotal: 0,
                        warning: 'Estadísticas de espacios no disponibles temporalmente'
                    }
                })
            };
        }
        
        logger.error('[GET_ESTADISTICAS_ESPACIOS] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.ESPACIOS_STATS]);

module.exports = {
    getEspacios,
    getEspacio,
    createEspacio,
    updateEspacio,
    deleteEspacio,
    getEstadisticasEspacios
};
