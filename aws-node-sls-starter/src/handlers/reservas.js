const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created, conflict } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

/**
 * Obtener todas las reservas con filtros opcionales
 */
const getReservas = withAuth(async (event) => {
    const queryParams = extractQueryParams(event);
    const user = event.user;
    
    const filters = {};
    
    // Los usuarios normales solo ven sus propias reservas
    if (user.rol === 'usuario') {
        filters.usuario_id = user.id;
    } else {
        // Admins y responsables pueden filtrar por usuario
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

/**
 * Obtener una reserva por ID
 */
const getReserva = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    const reserva = await db.getReservaById(id);
    
    if (!reserva) {
        return notFound('Reserva no encontrada');
    }
    
    // Verificar permisos: usuarios normales solo pueden ver sus propias reservas
    if (user.rol === 'usuario' && reserva.usuario_id !== user.id) {
        return notFound('Reserva no encontrada');
    }
    
    return success(reserva);
});

/**
 * Crear una nueva reserva
 * Incluye resiliencia crítica para reservas de emergencia
 */
const createReserva = withAuth(async (event) => {
    const reservaData = parseBody(event);
    const user = event.user;
    
    const { espacio_id, fecha_inicio, fecha_fin, proposito, notas, prioridad } = reservaData;
    
    if (!espacio_id || !fecha_inicio || !fecha_fin || !proposito) {
        return badRequest('Espacio, fechas de inicio y fin, y propósito son requeridos');
    }
    
    // Determinar si es una reserva crítica (emergencia médica)
    const esCritica = prioridad === 'emergencia' || 
                     proposito.toLowerCase().includes('emergencia') ||
                     proposito.toLowerCase().includes('urgente') ||
                     proposito.toLowerCase().includes('crítico');
    
    try {
        // Ejecutar validaciones y creación con resiliencia
        const nuevaReserva = await (esCritica ? 
            resilienceManager.executeCritical : 
            resilienceManager.executeDatabase
        )(
            async () => {
                // Validar fechas
                const inicio = new Date(fecha_inicio);
                const fin = new Date(fecha_fin);
                const ahora = new Date();
                
                if (inicio >= fin) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
                
                if (inicio < ahora) {
                    throw new Error('No se pueden crear reservas en el pasado');
                }
                
                // Verificar que el espacio existe y está disponible
                const espacio = await db.getEspacioById(espacio_id);
                if (!espacio) {
                    throw new Error('El espacio especificado no existe');
                }
                
                if (espacio.estado !== 'disponible') {
                    throw new Error('El espacio no está disponible para reservas');
                }
                
                // Para reservas críticas, verificar disponibilidad más rápido
                if (esCritica) {
                    // Verificación rápida solo de conflictos directos
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
                    // Verificación completa para reservas normales
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
                
                // Los usuarios normales solo pueden reservar para sí mismos
                const usuario_id = user.rol === 'usuario' ? user.id : (reservaData.usuario_id || user.id);
                
                // Crear la reserva
                return await db.createReserva({
                    espacio_id,
                    usuario_id,
                    fecha_inicio,
                    fecha_fin,
                    proposito,
                    notas,
                    prioridad: esCritica ? 'emergencia' : (prioridad || 'normal'),
                    estado: esCritica ? 'confirmada' : 'pendiente', // Emergencias se confirman automáticamente
                });
            },
            {
                operation: 'createReserva',
                priority: esCritica ? 'critical' : 'standard',
                espacioId: espacio_id,
                userId: user.id,
                esCritica,
                // Datos para fallback de emergencia
                priorityData: esCritica ? {
                    espacio_id,
                    usuario_id: user.id,
                    proposito,
                    timestamp: new Date().toISOString()
                } : null
            }
        );
        
        // Log especial para reservas críticas
        if (esCritica) {
            console.log(`[CRITICAL_RESERVATION] Reserva de emergencia creada: ${nuevaReserva.id} para espacio ${espacio_id}`);
        }
        
        return created(nuevaReserva);
        
    } catch (error) {
        console.error('[CREATE_RESERVA] Error:', error);
        
        // Manejo específico de errores de resiliencia
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
        
        // Errores de validación normales
        if (error.message.includes('CRITICAL_CONFLICT')) {
            return conflict('Espacio ocupado - En emergencias contacte supervisión para liberación');
        }
        
        return badRequest(error.message);
    }
});

/**
 * Actualizar una reserva existente
 * Incluye resiliencia para modificaciones críticas
 */
const updateReserva = withAuth(async (event) => {
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
                
                // Verificar permisos
                if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
                    throw new Error('Reserva no encontrada'); // Por seguridad, no revelar existencia
                }
                
                // Determinar si es una actualización crítica
                const esCritica = reservaExistente.prioridad === 'emergencia' ||
                                 updateData.prioridad === 'emergencia' ||
                                 (updateData.proposito && 
                                  updateData.proposito.toLowerCase().includes('emergencia'));
                
                // Los usuarios normales solo pueden actualizar ciertas propiedades
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
                
                // Si es una reserva crítica y hay cambios de horario, registrar
                if (esCritica && (finalUpdateData.fecha_inicio || finalUpdateData.fecha_fin)) {
                    console.log(`[CRITICAL_UPDATE] Modificando horario de reserva crítica ${id}`);
                }
                
                return await db.updateEntity('reserva', id, finalUpdateData);
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
        
        // Manejo de errores de resiliencia
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
        
        console.error('[UPDATE_RESERVA] Error:', error);
        throw error;
    }
});

/**
 * Cancelar una reserva
 * Incluye resiliencia y manejo especial para reservas críticas
 */
const cancelReserva = withAuth(async (event) => {
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
                
                // Verificar permisos
                if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
                    throw new Error('Reserva no encontrada'); // Por seguridad
                }
                
                // Verificar si es una reserva crítica
                const esCritica = reservaExistente.prioridad === 'emergencia';
                
                if (esCritica) {
                    console.warn(`[CRITICAL_CANCELLATION] Cancelando reserva crítica ${id} por usuario ${user.id}`);
                    
                    // Para reservas críticas, requerir confirmación adicional
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
        
        // Manejo de errores de resiliencia
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
        
        console.error('[CANCEL_RESERVA] Error:', error);
        throw error;
    }
});

/**
 * Eliminar una reserva (solo admins)
 * Incluye resiliencia para operaciones de eliminación
 */
const deleteReserva = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                // Verificar que la reserva existe antes de eliminar
                const reservaExistente = await db.getReservaById(id);
                if (!reservaExistente) {
                    throw new Error('Reserva no encontrada');
                }
                
                // Verificar si es una reserva crítica
                if (reservaExistente.prioridad === 'emergencia') {
                    console.warn(`[CRITICAL_DELETION] Eliminando reserva crítica ${id}`);
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
        
        // Manejo de errores de resiliencia
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
        
        console.error('[DELETE_RESERVA] Error:', error);
        throw error;
    }
}, ['admin']);

/**
 * Obtener estadísticas de reservas
 * Incluye resiliencia para consultas de análisis
 */
const getEstadisticasReservas = withAuth(async (event) => {
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
        // Manejo de errores de resiliencia con fallback de estadísticas básicas
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
        
        console.error('[GET_ESTADISTICAS_RESERVAS] Error:', error);
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
