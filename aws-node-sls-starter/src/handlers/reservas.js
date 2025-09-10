const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created, conflict } = require('../utils/responses');

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
 */
const createReserva = withAuth(async (event) => {
    const reservaData = parseBody(event);
    const user = event.user;
    
    const { espacio_id, fecha_inicio, fecha_fin, proposito, notas } = reservaData;
    
    if (!espacio_id || !fecha_inicio || !fecha_fin || !proposito) {
        return badRequest('Espacio, fechas de inicio y fin, y propósito son requeridos');
    }
    
    // Validar fechas
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    const ahora = new Date();
    
    if (inicio >= fin) {
        return badRequest('La fecha de fin debe ser posterior a la fecha de inicio');
    }
    
    if (inicio < ahora) {
        return badRequest('No se pueden crear reservas en el pasado');
    }
    
    // Verificar que el espacio existe y está disponible
    const espacio = await db.getEspacioById(espacio_id);
    if (!espacio) {
        return badRequest('El espacio especificado no existe');
    }
    
    if (espacio.estado !== 'disponible') {
        return badRequest('El espacio no está disponible para reservas');
    }
    
    // Verificar conflictos de horarios
    const reservasExistentes = await db.getReservas({ espacio_id });
    const hayConflicto = reservasExistentes.some(reserva => {
        if (reserva.estado === 'cancelada') return false;
        
        const reservaInicio = new Date(reserva.fecha_inicio);
        const reservaFin = new Date(reserva.fecha_fin);
        
        return (inicio < reservaFin && fin > reservaInicio);
    });
    
    if (hayConflicto) {
        return conflict('El espacio ya está reservado en ese horario');
    }
    
    // Los usuarios normales solo pueden reservar para sí mismos
    const usuario_id = user.rol === 'usuario' ? user.id : (reservaData.usuario_id || user.id);
    
    const nuevaReserva = await db.createReserva({
        espacio_id,
        usuario_id,
        fecha_inicio,
        fecha_fin,
        proposito,
        notas,
        estado: 'pendiente'
    });
    
    return created(nuevaReserva);
});

/**
 * Actualizar una reserva existente
 */
const updateReserva = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const reservaExistente = await db.getReservaById(id);
        if (!reservaExistente) {
            return notFound('Reserva no encontrada');
        }
        
        // Verificar permisos
        if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
            return notFound('Reserva no encontrada');
        }
        
        // Los usuarios normales solo pueden actualizar ciertas propiedades
        if (user.rol === 'usuario') {
            const allowedFields = ['proposito', 'notas'];
            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });
            updateData = filteredData;
        }
        
        const reservaActualizada = await db.updateEntity('reserva', id, updateData);
        return success(reservaActualizada);
    } catch (error) {
        if (error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        throw error;
    }
});

/**
 * Cancelar una reserva
 */
const cancelReserva = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        const reservaExistente = await db.getReservaById(id);
        if (!reservaExistente) {
            return notFound('Reserva no encontrada');
        }
        
        // Verificar permisos
        if (user.rol === 'usuario' && reservaExistente.usuario_id !== user.id) {
            return notFound('Reserva no encontrada');
        }
        
        const reservaActualizada = await db.updateEntity('reserva', id, { estado: 'cancelada' });
        return success(reservaActualizada);
    } catch (error) {
        if (error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        throw error;
    }
});

/**
 * Eliminar una reserva (solo admins)
 */
const deleteReserva = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la reserva es requerido');
    }
    
    try {
        await db.deleteEntity('reserva', id);
        return success({ message: 'Reserva eliminada correctamente' });
    } catch (error) {
        if (error.message === 'reserva no encontrado') {
            return notFound('Reserva no encontrada');
        }
        throw error;
    }
}, ['admin']);

/**
 * Obtener estadísticas de reservas
 */
const getEstadisticasReservas = withAuth(async (event) => {
    const reservas = await db.getReservas();
    
    const stats = {
        total: reservas.length,
        pendientes: reservas.filter(r => r.estado === 'pendiente').length,
        confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
        canceladas: reservas.filter(r => r.estado === 'cancelada').length,
        completadas: reservas.filter(r => r.estado === 'completada').length
    };
    
    return success(stats);
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
