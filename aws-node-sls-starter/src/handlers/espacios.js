const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');

const db = new DynamoDBManager();

/**
 * Obtener todos los espacios con filtros opcionales
 */
const getEspacios = withErrorHandling(async (event) => {
    const queryParams = extractQueryParams(event);
    
    const filters = {};
    if (queryParams.tipo) filters.tipo = queryParams.tipo;
    if (queryParams.estado) filters.estado = queryParams.estado;
    if (queryParams.zona_id) filters.zona_id = queryParams.zona_id;
    
    const espacios = await db.getEspacios(filters);
    
    return success({
        espacios,
        total: espacios.length
    });
});

/**
 * Obtener un espacio por ID
 */
const getEspacio = withErrorHandling(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    const espacio = await db.getEspacioById(id);
    
    if (!espacio) {
        return notFound('Espacio no encontrado');
    }
    
    return success(espacio);
});

/**
 * Crear un nuevo espacio
 */
const createEspacio = withAuth(async (event) => {
    const espacioData = parseBody(event);
    
    const { nombre, tipo, capacidad, ubicacion, descripcion, zona_id, responsable_id } = espacioData;
    
    if (!nombre || !tipo || !capacidad || !ubicacion) {
        return badRequest('Nombre, tipo, capacidad y ubicación son requeridos');
    }
    
    const nuevoEspacio = await db.createEspacio({
        nombre,
        tipo,
        capacidad: parseInt(capacidad),
        ubicacion,
        descripcion,
        zona_id,
        responsable_id,
        estado: espacioData.estado || 'disponible'
    });
    
    return created(nuevoEspacio);
}, ['admin', 'responsable']);

/**
 * Actualizar un espacio existente
 */
const updateEspacio = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const espacioActualizado = await db.updateEspacio(id, updateData);
        return success(espacioActualizado);
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        throw error;
    }
}, ['admin', 'responsable']);

/**
 * Eliminar un espacio
 */
const deleteEspacio = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        await db.deleteEspacio(id);
        return success({ message: 'Espacio eliminado correctamente' });
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        throw error;
    }
}, ['admin']);

/**
 * Obtener estadísticas de espacios
 */
const getEstadisticasEspacios = withAuth(async (event) => {
    const espacios = await db.getEspacios();
    
    const stats = {
        total: espacios.length,
        disponibles: espacios.filter(e => e.estado === 'disponible').length,
        ocupados: espacios.filter(e => e.estado === 'ocupado').length,
        mantenimiento: espacios.filter(e => e.estado === 'mantenimiento').length,
        porTipo: {}
    };
    
    espacios.forEach(espacio => {
        if (!stats.porTipo[espacio.tipo]) {
            stats.porTipo[espacio.tipo] = 0;
        }
        stats.porTipo[espacio.tipo]++;
    });
    
    return success(stats);
}, ['admin', 'responsable']);

module.exports = {
    getEspacios,
    getEspacio,
    createEspacio,
    updateEspacio,
    deleteEspacio,
    getEstadisticasEspacios
};
