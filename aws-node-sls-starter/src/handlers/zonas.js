const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

/**
 * Obtener todas las zonas
 */
const getZonas = withErrorHandling(async (event) => {
    const queryParams = extractQueryParams(event);
    
    return await resilienceManager.executeDatabase(
        async () => {
            let zonas = await db.getEntities('zona');
            
            // Aplicar filtros si existen
            if (queryParams.piso) {
                zonas = zonas.filter(zona => zona.piso === queryParams.piso);
            }
            if (queryParams.activa !== undefined) {
                zonas = zonas.filter(zona => zona.activa === (queryParams.activa === 'true'));
            }
            
            return success({
                zonas,
                total: zonas.length
            });
        },
        {
            operation: 'getZonas',
            priority: 'standard',
            filters: queryParams
        }
    );
});

/**
 * Obtener una zona por ID
 */
const getZona = withErrorHandling(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la zona es requerido');
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            const zona = await db.getEntityById('zona', id);
            
            if (!zona) {
                return notFound('Zona no encontrada');
            }
            
            return success(zona);
        },
        {
            operation: 'getZona',
            zonaId: id,
            priority: 'standard'
        }
    );
});

/**
 * Crear una nueva zona
 */
const createZona = withAuth(async (event) => {
    const zonaData = parseBody(event);
    
    const { nombre, descripcion, piso, edificio } = zonaData;
    
    if (!nombre || !piso || !edificio) {
        return badRequest('Nombre, piso y edificio son requeridos');
    }
    
    // Determinar criticidad según el tipo de zona
    const esCritica = zonaData.tipoZona && 
        ['emergency', 'icu', 'surgery', 'critical_care', 'trauma'].includes(zonaData.tipoZona);
    
    return await resilienceManager.executeWithFullResilience(
        async () => {
            const nuevaZona = await db.createEntity('zona', {
                nombre,
                descripcion,
                piso,
                edificio,
                activa: zonaData.activa !== false,
                capacidadMaxima: zonaData.capacidadMaxima,
                tipoZona: zonaData.tipoZona,
                caracteristicas: zonaData.caracteristicas || [],
                horarioApertura: zonaData.horarioApertura,
                horarioCierre: zonaData.horarioCierre,
                diasOperacion: zonaData.diasOperacion || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
                observaciones: zonaData.observaciones
            });
            
            return created(nuevaZona);
        },
        esCritica ? 'CRITICAL_MEDICAL' : 'DATABASE_OPERATIONS',
        {
            operation: 'createZona',
            tipoZona: zonaData.tipoZona,
            priority: esCritica ? 'critical' : 'standard',
            isCritical: esCritica
        }
    );
}, ['admin']);

/**
 * Actualizar una zona existente
 */
const updateZona = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID de la zona es requerido');
    }
    
    // Determinar criticidad según el tipo de zona si se está actualizando
    const esCritica = updateData.tipoZona && 
        ['emergency', 'icu', 'surgery', 'critical_care', 'trauma'].includes(updateData.tipoZona);
    
    return await resilienceManager.executeWithFullResilience(
        async () => {
            try {
                const zonaActualizada = await db.updateEntity('zona', id, updateData);
                return success(zonaActualizada);
            } catch (error) {
                if (error.message === 'zona no encontrado') {
                    return notFound('Zona no encontrada');
                }
                throw error;
            }
        },
        esCritica ? 'CRITICAL_MEDICAL' : 'DATABASE_OPERATIONS',
        {
            operation: 'updateZona',
            zonaId: id,
            tipoZona: updateData.tipoZona,
            priority: esCritica ? 'critical' : 'standard',
            isCritical: esCritica
        }
    );
}, ['admin']);

/**
 * Eliminar una zona
 */
const deleteZona = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la zona es requerido');
    }
    
    try {
        // Verificar si la zona tiene espacios asignados
        const espacios = await db.getEspacios({ zona_id: id });
        if (espacios.length > 0) {
            return badRequest('No se puede eliminar la zona porque tiene espacios asignados');
        }
        
        await db.deleteEntity('zona', id);
        return success({ message: 'Zona eliminada correctamente' });
    } catch (error) {
        if (error.message === 'zona no encontrado') {
            return notFound('Zona no encontrada');
        }
        throw error;
    }
}, ['admin']);

/**
 * Cambiar estado de una zona (activar/desactivar)
 */
const toggleZonaEstado = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const { activa } = parseBody(event);
    
    if (!id) {
        return badRequest('ID de la zona es requerido');
    }
    
    if (typeof activa !== 'boolean') {
        return badRequest('El estado activa debe ser true o false');
    }
    
    try {
        const zonaActualizada = await db.updateEntity('zona', id, { activa });
        return success(zonaActualizada);
    } catch (error) {
        if (error.message === 'zona no encontrado') {
            return notFound('Zona no encontrada');
        }
        throw error;
    }
}, ['admin']);

/**
 * Obtener zonas por piso
 */
const getZonasPorPiso = withErrorHandling(async (event) => {
    const { piso } = extractPathParams(event);
    
    if (!piso) {
        return badRequest('Piso es requerido');
    }
    
    let zonas = await db.getEntities('zona');
    zonas = zonas.filter(zona => zona.piso === piso && zona.activa);
    
    return success({
        zonas,
        total: zonas.length,
        piso
    });
});

/**
 * Obtener espacios de una zona
 */
const getEspaciosZona = withErrorHandling(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID de la zona es requerido');
    }
    
    // Verificar que la zona existe
    const zona = await db.getEntityById('zona', id);
    if (!zona) {
        return notFound('Zona no encontrada');
    }
    
    const espacios = await db.getEspacios({ zona_id: id });
    
    return success({
        espacios,
        total: espacios.length,
        zona: {
            id: zona.id,
            nombre: zona.nombre,
            piso: zona.piso,
            edificio: zona.edificio
        }
    });
});

/**
 * Obtener estadísticas de zonas
 */
const getEstadisticasZonas = withAuth(async (event) => {
    const zonas = await db.getEntities('zona');
    const espacios = await db.getEspacios();
    
    const stats = {
        total: zonas.length,
        activas: zonas.filter(z => z.activa).length,
        inactivas: zonas.filter(z => !z.activa).length,
        porPiso: {},
        porEdificio: {},
        espaciosPorZona: {}
    };
    
    // Estadísticas por piso
    zonas.forEach(zona => {
        // Por piso
        if (!stats.porPiso[zona.piso]) {
            stats.porPiso[zona.piso] = { total: 0, activas: 0 };
        }
        stats.porPiso[zona.piso].total++;
        if (zona.activa) {
            stats.porPiso[zona.piso].activas++;
        }
        
        // Por edificio
        if (!stats.porEdificio[zona.edificio]) {
            stats.porEdificio[zona.edificio] = { total: 0, activas: 0 };
        }
        stats.porEdificio[zona.edificio].total++;
        if (zona.activa) {
            stats.porEdificio[zona.edificio].activas++;
        }
        
        // Espacios por zona
        const espaciosEnZona = espacios.filter(e => e.zona_id === zona.id);
        stats.espaciosPorZona[zona.id] = {
            zona: zona.nombre,
            totalEspacios: espaciosEnZona.length,
            disponibles: espaciosEnZona.filter(e => e.estado === 'disponible').length
        };
    });
    
    return success(stats);
}, ['admin', 'responsable']);

/**
 * Obtener pisos disponibles
 */
const getPisosDisponibles = withErrorHandling(async (event) => {
    const zonas = await db.getEntities('zona');
    
    const pisos = [...new Set(zonas.map(zona => zona.piso))].sort();
    
    const pisosInfo = pisos.map(piso => {
        const zonasEnPiso = zonas.filter(z => z.piso === piso);
        return {
            piso,
            totalZonas: zonasEnPiso.length,
            zonasActivas: zonasEnPiso.filter(z => z.activa).length
        };
    });
    
    return success({
        pisos: pisosInfo,
        total: pisos.length
    });
});

/**
 * Obtener edificios disponibles
 */
const getEdificiosDisponibles = withErrorHandling(async (event) => {
    const zonas = await db.getEntities('zona');
    
    const edificios = [...new Set(zonas.map(zona => zona.edificio))].sort();
    
    const edificiosInfo = edificios.map(edificio => {
        const zonasEnEdificio = zonas.filter(z => z.edificio === edificio);
        return {
            edificio,
            totalZonas: zonasEnEdificio.length,
            zonasActivas: zonasEnEdificio.filter(z => z.activa).length,
            pisos: [...new Set(zonasEnEdificio.map(z => z.piso))].sort()
        };
    });
    
    return success({
        edificios: edificiosInfo,
        total: edificios.length
    });
});

module.exports = {
    getZonas,
    getZona,
    createZona,
    updateZona,
    deleteZona,
    toggleZonaEstado,
    getZonasPorPiso,
    getEspaciosZona,
    getEstadisticasZonas,
    getPisosDisponibles,
    getEdificiosDisponibles
};
