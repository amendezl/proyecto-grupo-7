const DynamoDBManager = require('../../infrastructure/database/DynamoDBManager');
const { withPermissions, extractQueryParams, extractPathParams, parseBody } = require('../../core/auth/auth');
const { PERMISSIONS } = require('../../core/auth/permissions');
const { success, badRequest, notFound, created } = require('../../shared/utils/responses');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { validateForDynamoDB, validateBusinessRules } = require('../../core/validation/validator');

const db = new DynamoDBManager();

const getResponsables = withPermissions(async (event) => {
    const queryParams = extractQueryParams(event);
    const user = event.user;
    
    return await resilienceManager.executeDatabase(
        async () => {
            let responsables = await db.getEntities('responsable');
            
            // MULTITENANCY: Filtrar por empresa
            responsables = responsables.filter(resp => resp.empresa_id === user.empresa_id);
            
            if (queryParams.area) {
                responsables = responsables.filter(resp => resp.area === queryParams.area);
            }
            if (queryParams.activo !== undefined) {
                responsables = responsables.filter(resp => resp.activo === (queryParams.activo === 'true'));
            }
            
            return success({
                responsables,
                total: responsables.length
            });
        },
        {
            operation: 'getResponsables',
            priority: 'standard',
            filters: queryParams
        }
    );
}, [PERMISSIONS.RESPONSABLES_READ]);

const getResponsable = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del responsable es requerido');
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            const responsable = await db.getEntityById('responsable', id);
            
            if (!responsable) {
                return notFound('Responsable no encontrado');
            }
            
            return success(responsable);
        },
        {
            operation: 'getResponsable',
            responsableId: id,
            priority: 'standard'
        }
    );
}, [PERMISSIONS.RESPONSABLES_READ]);

const createResponsable = withPermissions(async (event) => {
    const responsableData = parseBody(event);
    const user = event.user; // MULTITENANCY: Obtener usuario autenticado
    
    const { nombre, apellido, email, telefono, area, cargo } = responsableData;
    
    if (!nombre || !apellido || !email || !area) {
        return badRequest('Nombre, apellido, email y área son requeridos');
    }
    
    const esCritico = ['critical', 'high_priority', 'management', 'security'].includes(area);
    
    return await resilienceManager.executeWithFullResilience(
        async () => {
            const responsableToCreate = {
                nombre,
                apellido,
                email,
                telefono,
                area,
                cargo,
                activo: responsableData.activo !== false,
                fechaIngreso: responsableData.fechaIngreso || new Date().toISOString(),
                horarioInicio: responsableData.horarioInicio,
                horarioFin: responsableData.horarioFin,
                diasTrabajo: responsableData.diasTrabajo || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
                observaciones: responsableData.observaciones,
                empresa_id: user.empresa_id // MULTITENANCY: Asignar empresa del usuario
            };
            
            const validatedResponsable = validateForDynamoDB('responsable', responsableToCreate);
            
            const nuevoResponsable = await db.createEntity('responsable', validatedResponsable);
            
            return created(nuevoResponsable);
        },
        esCritico ? 'CRITICAL_BUSINESS' : 'DATABASE_OPERATIONS',
        {
            operation: 'createResponsable',
            area: area,
            priority: esCritico ? 'critical' : 'standard',
            isCritical: esCritico
        }
    );
}, [PERMISSIONS.RESPONSABLES_CREATE]);

const updateResponsable = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID del responsable es requerido');
    }
    
    const esCritico = updateData.area && 
        ['critical', 'high_priority', 'management', 'security'].includes(updateData.area);
    
    return await resilienceManager.executeWithFullResilience(
        async () => {
            try {
                const existingResponsable = await db.getEntityById('responsable', id);
                if (!existingResponsable) {
                    return notFound('Responsable no encontrado');
                }
                
                const validatedUpdateData = validateForDynamoDB('responsable', updateData, { 
                    isPartialUpdate: true,
                    existingData: existingResponsable 
                });
                
                const responsableActualizado = await db.updateEntity('responsable', id, validatedUpdateData);
                return success(responsableActualizado);
            } catch (error) {
                if (error.message === 'responsable no encontrado') {
                    return notFound('Responsable no encontrado');
                }
                throw error;
            }
        },
        esCritico ? 'CRITICAL_BUSINESS' : 'DATABASE_OPERATIONS',
        {
            operation: 'updateResponsable',
            responsableId: id,
            area: updateData.area,
            priority: esCritico ? 'critical' : 'standard',
            isCritical: esCritico
        }
    );
}, [PERMISSIONS.RESPONSABLES_UPDATE]);

const deleteResponsable = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del responsable es requerido');
    }
    
    try {
        const espacios = await db.getEspacios({ responsable_id: id });
        if (espacios.length > 0) {
            return badRequest('No se puede eliminar el responsable porque tiene espacios asignados');
        }
        
        await db.deleteEntity('responsable', id);
        return success({ message: 'Responsable eliminado correctamente' });
    } catch (error) {
        if (error.message === 'responsable no encontrado') {
            return notFound('Responsable no encontrado');
        }
        throw error;
    }
}, [PERMISSIONS.RESPONSABLES_DELETE]);

const toggleResponsableEstado = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const { activo } = parseBody(event);
    
    if (!id) {
        return badRequest('ID del responsable es requerido');
    }
    
    if (typeof activo !== 'boolean') {
        return badRequest('El estado activo debe ser true o false');
    }
    
    try {
        const responsableActualizado = await db.updateEntity('responsable', id, { activo });
        return success(responsableActualizado);
    } catch (error) {
        if (error.message === 'responsable no encontrado') {
            return notFound('Responsable no encontrado');
        }
        throw error;
    }
}, [PERMISSIONS.RESPONSABLES_UPDATE]);

const getResponsablesPorArea = withPermissions(async (event) => {
    const { area } = extractPathParams(event);
    
    if (!area) {
        return badRequest('Área es requerida');
    }
    
    let responsables = await db.getEntities('responsable');
    responsables = responsables.filter(resp => resp.area === area && resp.activo);
    
    return success({
        responsables,
        total: responsables.length,
        area
    });
}, [PERMISSIONS.RESPONSABLES_READ]);

const getEspaciosAsignados = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del responsable es requerido');
    }
    
    const responsable = await db.getEntityById('responsable', id);
    if (!responsable) {
        return notFound('Responsable no encontrado');
    }
    
    const espacios = await db.getEspacios({ responsable_id: id });
    
    return success({
        espacios,
        total: espacios.length,
        responsable: {
            id: responsable.id,
            nombre: responsable.nombre,
            apellido: responsable.apellido,
            area: responsable.area
        }
    });
}, [PERMISSIONS.RESPONSABLES_READ]);

const asignarEspacio = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const { espacio_id } = parseBody(event);
    
    if (!id || !espacio_id) {
        return badRequest('ID del responsable y ID del espacio son requeridos');
    }
    
    try {
        const responsable = await db.getEntityById('responsable', id);
        if (!responsable) {
            return notFound('Responsable no encontrado');
        }
        
        const espacio = await db.getEspacioById(espacio_id);
        if (!espacio) {
            return notFound('Espacio no encontrado');
        }
        
        const espacioActualizado = await db.updateEspacio(espacio_id, { responsable_id: id });
        
        return success({
            message: 'Espacio asignado correctamente',
            espacio: espacioActualizado,
            responsable: {
                id: responsable.id,
                nombre: responsable.nombre,
                apellido: responsable.apellido
            }
        });
    } catch (error) {
        throw error;
    }
}, [PERMISSIONS.RESPONSABLES_ASSIGN_SPACE]);

const getEstadisticasResponsables = withPermissions(async (event) => {
    const responsables = await db.getEntities('responsable');
    const espacios = await db.getEspacios();
    
    const stats = {
        total: responsables.length,
        activos: responsables.filter(r => r.activo).length,
        inactivos: responsables.filter(r => !r.activo).length,
        porArea: {},
        espaciosAsignados: 0
    };
    
    responsables.forEach(responsable => {
        if (!stats.porArea[responsable.area]) {
            stats.porArea[responsable.area] = { total: 0, activos: 0 };
        }
        stats.porArea[responsable.area].total++;
        if (responsable.activo) {
            stats.porArea[responsable.area].activos++;
        }
    });
    
    stats.espaciosAsignados = espacios.filter(e => e.responsable_id).length;
    
    return success(stats);
}, [PERMISSIONS.RESPONSABLES_STATS]);

module.exports = {
    getResponsables,
    getResponsable,
    createResponsable,
    updateResponsable,
    deleteResponsable,
    toggleResponsableEstado,
    getResponsablesPorArea,
    getEspaciosAsignados,
    asignarEspacio,
    getEstadisticasResponsables
};
