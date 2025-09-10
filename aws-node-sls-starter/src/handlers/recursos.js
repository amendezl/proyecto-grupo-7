const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');

const db = new DynamoDBManager();

/**
 * Obtener todos los recursos
 */
const getRecursos = withErrorHandling(async (event) => {
    const queryParams = extractQueryParams(event);
    
    let recursos = await db.getEntities('recurso');
    
    // Aplicar filtros si existen
    if (queryParams.tipo) {
        recursos = recursos.filter(recurso => recurso.tipo === queryParams.tipo);
    }
    if (queryParams.estado) {
        recursos = recursos.filter(recurso => recurso.estado === queryParams.estado);
    }
    if (queryParams.disponible !== undefined) {
        recursos = recursos.filter(recurso => recurso.disponible === (queryParams.disponible === 'true'));
    }
    
    return success({
        recursos,
        total: recursos.length
    });
});

/**
 * Obtener un recurso por ID
 */
const getRecurso = withErrorHandling(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del recurso es requerido');
    }
    
    const recurso = await db.getEntityById('recurso', id);
    
    if (!recurso) {
        return notFound('Recurso no encontrado');
    }
    
    return success(recurso);
});

/**
 * Crear un nuevo recurso
 */
const createRecurso = withAuth(async (event) => {
    const recursoData = parseBody(event);
    
    const { nombre, tipo, descripcion, codigo, estado, cantidad, ubicacion } = recursoData;
    
    if (!nombre || !tipo) {
        return badRequest('Nombre y tipo son requeridos');
    }
    
    const nuevoRecurso = await db.createEntity('recurso', {
        nombre,
        tipo,
        descripcion,
        codigo,
        estado: estado || 'disponible',
        cantidad: cantidad || 1,
        ubicacion,
        disponible: recursoData.disponible !== false,
        fechaAdquisicion: recursoData.fechaAdquisicion,
        proveedor: recursoData.proveedor,
        valorUnitario: recursoData.valorUnitario,
        garantia: recursoData.garantia
    });
    
    return created(nuevoRecurso);
}, ['admin', 'responsable']);

/**
 * Actualizar un recurso existente
 */
const updateRecurso = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID del recurso es requerido');
    }
    
    try {
        const recursoActualizado = await db.updateEntity('recurso', id, updateData);
        return success(recursoActualizado);
    } catch (error) {
        if (error.message === 'recurso no encontrado') {
            return notFound('Recurso no encontrado');
        }
        throw error;
    }
}, ['admin', 'responsable']);

/**
 * Eliminar un recurso
 */
const deleteRecurso = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del recurso es requerido');
    }
    
    try {
        await db.deleteEntity('recurso', id);
        return success({ message: 'Recurso eliminado correctamente' });
    } catch (error) {
        if (error.message === 'recurso no encontrado') {
            return notFound('Recurso no encontrado');
        }
        throw error;
    }
}, ['admin']);

/**
 * Cambiar disponibilidad de un recurso
 */
const toggleDisponibilidad = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const { disponible } = parseBody(event);
    
    if (!id) {
        return badRequest('ID del recurso es requerido');
    }
    
    if (typeof disponible !== 'boolean') {
        return badRequest('La disponibilidad debe ser true o false');
    }
    
    try {
        const recursoActualizado = await db.updateEntity('recurso', id, { disponible });
        return success(recursoActualizado);
    } catch (error) {
        if (error.message === 'recurso no encontrado') {
            return notFound('Recurso no encontrado');
        }
        throw error;
    }
}, ['admin', 'responsable']);

/**
 * Obtener recursos por tipo
 */
const getRecursosPorTipo = withErrorHandling(async (event) => {
    const { tipo } = extractPathParams(event);
    
    if (!tipo) {
        return badRequest('Tipo de recurso es requerido');
    }
    
    let recursos = await db.getEntities('recurso');
    recursos = recursos.filter(recurso => recurso.tipo === tipo);
    
    return success({
        recursos,
        total: recursos.length,
        tipo
    });
});

/**
 * Obtener estadísticas de recursos
 */
const getEstadisticasRecursos = withAuth(async (event) => {
    const recursos = await db.getEntities('recurso');
    
    const stats = {
        total: recursos.length,
        disponibles: recursos.filter(r => r.disponible).length,
        noDisponibles: recursos.filter(r => !r.disponible).length,
        porTipo: {},
        porEstado: {},
        valorTotal: recursos.reduce((sum, r) => sum + (r.valorUnitario * r.cantidad || 0), 0)
    };
    
    recursos.forEach(recurso => {
        // Por tipo
        if (!stats.porTipo[recurso.tipo]) {
            stats.porTipo[recurso.tipo] = { count: 0, disponibles: 0 };
        }
        stats.porTipo[recurso.tipo].count++;
        if (recurso.disponible) {
            stats.porTipo[recurso.tipo].disponibles++;
        }
        
        // Por estado
        if (!stats.porEstado[recurso.estado]) {
            stats.porEstado[recurso.estado] = 0;
        }
        stats.porEstado[recurso.estado]++;
    });
    
    return success(stats);
}, ['admin', 'responsable']);

/**
 * Buscar recursos
 */
const buscarRecursos = withErrorHandling(async (event) => {
    const queryParams = extractQueryParams(event);
    const { q } = queryParams; // query de búsqueda
    
    if (!q || q.length < 2) {
        return badRequest('El término de búsqueda debe tener al menos 2 caracteres');
    }
    
    let recursos = await db.getEntities('recurso');
    
    // Buscar en nombre, descripción, código
    const termino = q.toLowerCase();
    recursos = recursos.filter(recurso => 
        recurso.nombre.toLowerCase().includes(termino) ||
        (recurso.descripcion && recurso.descripcion.toLowerCase().includes(termino)) ||
        (recurso.codigo && recurso.codigo.toLowerCase().includes(termino))
    );
    
    return success({
        recursos,
        total: recursos.length,
        termino: q
    });
});

module.exports = {
    getRecursos,
    getRecurso,
    createRecurso,
    updateRecurso,
    deleteRecurso,
    toggleDisponibilidad,
    getRecursosPorTipo,
    getEstadisticasRecursos,
    buscarRecursos
};
