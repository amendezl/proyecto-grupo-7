const DynamoDBManager = require('../../infrastructure/database/DynamoDBManager');
const { withSecureAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../../core/auth/auth');
const { success, badRequest, notFound, created, conflict } = require('../../shared/utils/responses');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateForDynamoDB, validateBusinessRules } = require('../../core/validation/validator');

const db = new DynamoDBManager();

const getReservas = withSecureAuth(async (event) => {
    const queryParams = extractQueryParams(event);
    const user = event.user;
    
    const filters = {};
    
    if (user.rol === 'usuario') {
        filters.usuario_id = user.id;
    } else {
        if (queryParams.usuario_id) filters.usuario_id = queryParams.usuario_id;
    }
    
    if (queryParams.espacio_id) filters.espacio_id = queryParams.espacio_id;
    if (queryParams.estado) filters.estado = queryParams.estado;
    
    const reservas = await db.getReservas(filters);
    
    return success({
        reservas,
        total: reservas.length
    });
});

const getReserva = withSecureAuth(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    const reserva = await db.getReservaById(id);
    
    if (!reserva) {
        return notFound('Reserva no encontrada');
    }
    
    if (user.rol === 'usuario' && reserva.usuario_id !== user.id) {
        return notFound('Reserva no encontrada');
    }
    
    return success(reserva);
});

const createReserva = withSecureAuth(async (event) => {
    const reservaData = parseBody(event);
    const user = event.user;
    
    const { espacio_id, fecha_inicio, fecha_fin, proposito, notas, prioridad } = reservaData;
    
    if (!espacio_id || !fecha_inicio || !fecha_fin || !proposito) {
        return badRequest('Espacio, fechas de inicio y fin, y propósito son requeridos');
    }
    
    const esCritica = prioridad === 'urgente' || 
                     proposito.toLowerCase().includes('urgente') ||
                     proposito.toLowerCase().includes('crítico') ||
                     prioridad === 'alta';
    
    try {
        const nuevaReserva = await (esCritica ? 
            resilienceManager.executeCritical : 
            resilienceManager.executeDatabase
        )(
            async () => {
                const inicio = new Date(fecha_inicio);
                const fin = new Date(fecha_fin);
                const ahora = new Date();
                
                if (inicio >= fin) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
                
                if (inicio < ahora) {
                    throw new Error('No se pueden crear reservas en el pasado');
                }
                
                const espacio = await db.getEspacioById(espacio_id);
                if (!espacio) {
                    throw new Error('El espacio especificado no existe');
                }
                
                if (espacio.estado !== 'disponible') {
                    throw new Error('El espacio no está disponible para reservas');
                }
                
                if (esCritica) {
                    const reservasActivas = await db.getReservas({ 
                        espacio_id, 
                        estado: 'confirmada' 
                    });
                    
                    const hayConflictoCritico = reservasActivas.some(reserva => {
                        const reservaInicio = new Date(reserva.fecha_inicio);
                        const reservaFin = new Date(reserva.fecha_fin);
                        return (inicio < reservaFin && fin > reservaInicio);
                    });
                    
                    if (hayConflictoCritico) {
                        throw new Error('CRITICAL_CONFLICT: Espacio ocupado en horario crítico');
                    }
                } else {
                    const reservasExistentes = await db.getReservas({ espacio_id });
                    const hayConflicto = reservasExistentes.some(reserva => {
                        if (reserva.estado === 'cancelada') return false;
                        
                        const reservaInicio = new Date(reserva.fecha_inicio);
                        const reservaFin = new Date(reserva.fecha_fin);
                        
                        return (inicio < reservaFin && fin > reservaInicio);
                    });
                    
                    if (hayConflicto) {
                        throw new Error('El espacio ya está reservado en ese horario');
                    }
                }
                
                const usuario_id = user.rol === 'usuario' ? user.id : (reservaData.usuario_id || user.id);
                
                const reservaToCreate = {
                    espacio_id,
                    usuario_id,
                    fecha_inicio,
                    fecha_fin,
                    proposito,
                    notas,
                    prioridad: esCritica ? 'emergencia' : (prioridad || 'normal'),
                    estado: esCritica ? 'confirmada' : 'pendiente',
                };
                
                const validatedReserva = validateForDynamoDB('reserva', reservaToCreate);
                
                return await db.createReserva(validatedReserva);
            },
            {
                operation: 'createReserva',
                priority: esCritica ? 'critical' : 'standard',
                espacioId: espacio_id,
                userId: user.id,
                esCritica,
                priorityData: esCritica ? {
                    espacio_id,
                    usuario_id: user.id,
                    proposito,
                    timestamp: new Date().toISOString()
                } : null
            }
        );
        
        if (esCritica) {
            console.log(`[CRITICAL_RESERVATION] Reserva de emergencia creada: ${nuevaReserva.id} para espacio ${espacio_id}`);
        }
        
        return created(nuevaReserva);
        
    } catch (error) {
        logger.error('[CREATE_RESERVA] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas temporalmente sobrecargado',
                    fallback: esCritica ? 'Contacte recepción para reserva de emergencia' : null,
                    retryAfter: 30
                })
            };
        }
        
        if (error.name === 'RetryExhaustedError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas no responde',
                    fallback: esCritica ? 'PROTOCOLO DE EMERGENCIA ACTIVADO - Contacte supervisión' : null
                })
            };
        }
        
        if (error.message.includes('CRITICAL_CONFLICT')) {
            return conflict('Espacio ocupado - En emergencias contacte supervisión para liberación');
        }
        
        return badRequest(error.message);
    }
});

const updateReserva = withSecureAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const reservaExistente = await db.getReservaById(id);
                if (!reservaExistente) {
                    throw new Error('Reserva no encontrada');
                }
                
                if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
                    throw new Error('Reserva no encontrada');
                }
                
                const esCritica = reservaExistente.prioridad === 'emergencia' ||
                                 updateData.prioridad === 'emergencia' ||
                                 (updateData.proposito && 
                                  updateData.proposito.toLowerCase().includes('emergencia'));
                
                let finalUpdateData = updateData;
                if (user.rol === 'usuario') {
                    const allowedFields = ['proposito', 'notas'];
                    const filteredData = {};
                    Object.keys(updateData).forEach(key => {
                        if (allowedFields.includes(key)) {
                            filteredData[key] = updateData[key];
                        }
                    });
                    finalUpdateData = filteredData;
                }
                
                if (esCritica && (finalUpdateData.fecha_inicio || finalUpdateData.fecha_fin)) {
                    console.log(`[CRITICAL_UPDATE] Modificando horario de reserva crítica ${id}`);
                }
                
                const validatedUpdateData = validateForDynamoDB('reserva', finalUpdateData, { 
                    isPartialUpdate: true,
                    existingData: reservaExistente 
                });
                
                return await db.updateEntity('reserva', id, validatedUpdateData);
            },
            {
                operation: 'updateReserva',
                priority: 'standard',
                reservaId: id,
                userId: user.id
            }
        );
        
        return success(result);
        
    } catch (error) {
        if (error.message === 'Reserva no encontrada' || error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas temporalmente sobrecargado',
                    suggestion: 'Intente nuevamente en unos momentos'
                })
            };
        }
        
        if (error.name === 'RetryExhaustedError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas no responde',
                    suggestion: 'Contacte soporte técnico'
                })
            };
        }
        
        logger.error('[UPDATE_RESERVA] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
});

const cancelReserva = withSecureAuth(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const reservaExistente = await db.getReservaById(id);
                if (!reservaExistente) {
                    throw new Error('Reserva no encontrada');
                }
                
                if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
                    throw new Error('Reserva no encontrada');
                }
                
                const esCritica = reservaExistente.prioridad === 'emergencia';
                
                if (esCritica) {
                    logger.warn('[CRITICAL_CANCELLATION] Cancelando reserva crítica ${id} por usuario ${user.id}');
                    
                    if (user.rol === 'usuario') {
                        throw new Error('Las reservas de emergencia requieren autorización de supervisión para cancelar');
                    }
                }
                
                return await db.updateEntity('reserva', id, { 
                    estado: 'cancelada',
                    fecha_cancelacion: new Date().toISOString(),
                    cancelado_por: user.id
                });
            },
            {
                operation: 'cancelReserva',
                priority: 'standard',
                reservaId: id,
                userId: user.id
            }
        );
        
        return success(result);
        
    } catch (error) {
        if (error.message === 'Reserva no encontrada' || error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        
        if (error.message.includes('requieren autorización de supervisión')) {
            return forbidden(error.message);
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas temporalmente sobrecargado',
                    suggestion: 'Intente nuevamente en unos momentos'
                })
            };
        }
        
        logger.error('[CANCEL_RESERVA] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
});

const deleteReserva = withSecureAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const reservaExistente = await db.getReservaById(id);
                if (!reservaExistente) {
                    throw new Error('Reserva no encontrada');
                }
                
                if (reservaExistente.prioridad === 'emergencia') {
                    logger.warn('[CRITICAL_DELETION] Eliminando reserva crítica ${id}');
                }
                
                await db.deleteEntity('reserva', id);
                return { message: 'Reserva eliminada correctamente', id };
            },
            {
                operation: 'deleteReserva',
                priority: 'standard',
                reservaId: id
            }
        );
        
        return success(result);
    } catch (error) {
        if (error.message === 'Reserva no encontrada' || error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de reservas temporalmente sobrecargado'
                })
            };
        }
        
        logger.error('[DELETE_RESERVA] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, ['admin']);

const getEstadisticasReservas = withSecureAuth(async (event) => {
    try {
        const stats = await resilienceManager.executeDatabase(
            async () => {
                const reservas = await db.getReservas();
                
                const estadisticas = {
                    total: reservas.length,
                    pendientes: reservas.filter(r => r.estado === 'pendiente').length,
                    confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
                    canceladas: reservas.filter(r => r.estado === 'cancelada').length,
                    completadas: reservas.filter(r => r.estado === 'completada').length,
                    criticas: reservas.filter(r => r.prioridad === 'emergencia').length,
                    hoy: reservas.filter(r => {
                        const hoy = new Date().toISOString().split('T')[0];
                        const fechaReserva = new Date(r.fecha_inicio).toISOString().split('T')[0];
                        return fechaReserva === hoy && r.estado === 'confirmada';
                    }).length
                };
                
                return estadisticas;
            },
            {
                operation: 'getEstadisticasReservas',
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
                        pendientes: 0,
                        confirmadas: 0,
                        canceladas: 0,
                        completadas: 0,
                        criticas: 0,
                        hoy: 0,
                        warning: 'Estadísticas no disponibles temporalmente'
                    }
                })
            };
        }
        
        logger.error('[GET_ESTADISTICAS_RESERVAS] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, ['admin', 'responsable']);

module.exports = {
    getReservas,
    getReserva,
    createReserva,
    updateReserva,
    cancelReserva,
    deleteReserva,
    getEstadisticasReservas
};
