const OrganizationManager = require('../../shared/utils/organizationManager');
const { withPermissions, withSecureAuth } = require('../../core/auth/auth');
const { success, badRequest, notFound, created } = require('../../shared/utils/responses');
const { PERMISSIONS } = require('../../core/auth/permissions');
const { logger } = require('../../infrastructure/monitoring/logger');

const organizationManager = new OrganizationManager();

/**
 * Obtiene la configuración de la organización del usuario actual
 */
const getMyOrganizationConfig = withSecureAuth(async (event) => {
    const user = event.user;
    
    try {
        const organization = await organizationManager.getUserOrganization(user.id);
        
        if (!organization) {
            return notFound('Usuario no pertenece a ninguna organización');
        }

        return success({
            orgId: organization.id,
            name: organization.name,
            industry: organization.industry,
            config: organization.config,
            terminology: organization.config.terminology
        });
    } catch (error) {
        logger.error('Error obteniendo configuración de organización:', {
            errorMessage: error.message,
            userId: user.id
        });
        return badRequest(error.message);
    }
});

/**
 * Obtiene solo la terminología de la organización del usuario
 */
const getMyOrganizationTerminology = withSecureAuth(async (event) => {
    const user = event.user;
    
    try {
        const organization = await organizationManager.getUserOrganization(user.id);
        
        if (!organization) {
            // Retornar terminología por defecto si no tiene organización
            const defaultConfig = organizationManager.personalizationManager.getDefaultClientConfig();
            return success({
                terminology: defaultConfig.terminology,
                isDefault: true
            });
        }

        return success({
            terminology: organization.config.terminology,
            orgId: organization.id,
            industry: organization.industry,
            isDefault: false
        });
    } catch (error) {
        logger.error('Error obteniendo terminología:', {
            errorMessage: error.message,
            userId: user.id
        });
        
        // Retornar terminología por defecto en caso de error
        const defaultConfig = organizationManager.personalizationManager.getDefaultClientConfig();
        return success({
            terminology: defaultConfig.terminology,
            isDefault: true,
            error: error.message
        });
    }
});

/**
 * Actualiza la configuración de la organización (solo admin)
 */
const updateMyOrganizationConfig = withSecureAuth(async (event) => {
    const user = event.user;
    const updates = JSON.parse(event.body || '{}');
    
    try {
        const organization = await organizationManager.getUserOrganization(user.id);
        
        if (!organization) {
            return notFound('Usuario no pertenece a ninguna organización');
        }

        // Verificar que el usuario sea admin de la organización
        if (organization.adminUserId !== user.id && user.rol !== 'admin') {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Solo el administrador de la organización puede actualizar la configuración'
                })
            };
        }

        const updatedOrganization = await organizationManager.updateOrganizationConfig(
            organization.id,
            updates,
            user.id
        );

        return success({
            message: 'Configuración actualizada exitosamente',
            config: updatedOrganization.config
        });
    } catch (error) {
        logger.error('Error actualizando configuración:', {
            errorMessage: error.message,
            userId: user.id
        });
        return badRequest(error.message);
    }
});

/**
 * Actualiza solo la terminología de la organización (solo admin)
 */
const updateMyOrganizationTerminology = withSecureAuth(async (event) => {
    const user = event.user;
    const { terminology } = JSON.parse(event.body || '{}');
    
    if (!terminology) {
        return badRequest('terminology es requerido');
    }

    try {
        const organization = await organizationManager.getUserOrganization(user.id);
        
        if (!organization) {
            return notFound('Usuario no pertenece a ninguna organización');
        }

        // Verificar que el usuario sea admin de la organización
        if (organization.adminUserId !== user.id && user.rol !== 'admin') {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Solo el administrador de la organización puede actualizar la terminología'
                })
            };
        }

        const updatedOrganization = await organizationManager.updateOrganizationConfig(
            organization.id,
            { terminology },
            user.id
        );

        return success({
            message: 'Terminología actualizada exitosamente',
            terminology: updatedOrganization.config.terminology
        });
    } catch (error) {
        logger.error('Error actualizando terminología:', {
            errorMessage: error.message,
            userId: user.id
        });
        return badRequest(error.message);
    }
});

/**
 * Obtiene estadísticas de la organización (solo admin)
 */
const getMyOrganizationStats = withSecureAuth(async (event) => {
    const user = event.user;
    
    try {
        const organization = await organizationManager.getUserOrganization(user.id);
        
        if (!organization) {
            return notFound('Usuario no pertenece a ninguna organización');
        }

        const stats = await organizationManager.getOrganizationStats(organization.id);
        
        return success(stats);
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', {
            errorMessage: error.message,
            userId: user.id
        });
        return badRequest(error.message);
    }
});

/**
 * Lista todas las organizaciones (solo para admins de sistema)
 */
const listOrganizations = withPermissions(async (event) => {
    try {
        const organizations = await organizationManager.listOrganizations();
        
        return success({
            organizations,
            total: organizations.length
        });
    } catch (error) {
        logger.error('Error listando organizaciones:', {
            errorMessage: error.message
        });
        return badRequest(error.message);
    }
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * Obtiene las industrias disponibles
 */
const getAvailableIndustries = withSecureAuth(async (event) => {
    const industries = [
        {
            id: 'healthcare',
            name: 'Salud',
            description: 'Hospitales, clínicas, centros médicos',
            defaultTerminology: {
                resource: { singular: 'sala', plural: 'salas' },
                reservation: { singular: 'turno', plural: 'turnos' }
            }
        },
        {
            id: 'education',
            name: 'Educación',
            description: 'Colegios, universidades, centros de formación',
            defaultTerminology: {
                resource: { singular: 'aula', plural: 'aulas' },
                reservation: { singular: 'reserva', plural: 'reservas' }
            }
        },
        {
            id: 'office',
            name: 'Oficinas',
            description: 'Espacios de trabajo corporativo',
            defaultTerminology: {
                resource: { singular: 'espacio', plural: 'espacios' },
                reservation: { singular: 'reserva', plural: 'reservas' }
            }
        },
        {
            id: 'coworking',
            name: 'Coworking',
            description: 'Espacios de trabajo compartido',
            defaultTerminology: {
                resource: { singular: 'box', plural: 'boxes' },
                reservation: { singular: 'reserva', plural: 'reservas' }
            }
        },
        {
            id: 'parking',
            name: 'Estacionamientos',
            description: 'Gestión de estacionamientos',
            defaultTerminology: {
                resource: { singular: 'estacionamiento', plural: 'estacionamientos' },
                reservation: { singular: 'reserva', plural: 'reservas' }
            }
        },
        {
            id: 'sports',
            name: 'Deportes',
            description: 'Canchas, gimnasios, instalaciones deportivas',
            defaultTerminology: {
                resource: { singular: 'cancha', plural: 'canchas' },
                reservation: { singular: 'turno', plural: 'turnos' }
            }
        },
        {
            id: 'equipment',
            name: 'Equipamiento',
            description: 'Préstamo de herramientas y equipos',
            defaultTerminology: {
                resource: { singular: 'herramienta', plural: 'herramientas' },
                reservation: { singular: 'préstamo', plural: 'préstamos' }
            }
        },
        {
            id: 'events',
            name: 'Eventos',
            description: 'Salones de eventos y conferencias',
            defaultTerminology: {
                resource: { singular: 'espacio', plural: 'espacios' },
                reservation: { singular: 'reserva', plural: 'reservas' }
            }
        }
    ];

    return success({ industries });
});

module.exports = {
    getMyOrganizationConfig,
    getMyOrganizationTerminology,
    updateMyOrganizationConfig,
    updateMyOrganizationTerminology,
    getMyOrganizationStats,
    listOrganizations,
    getAvailableIndustries
};
