/**
 * Handlers para Gestión de Personalización
 * Componente SaaS multi-tenant con parámetros globales y específicos por usuario
 */

const PersonalizationManager = require('../utils/personalizationManager');
const { withPermissions } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');
const { PERMISSIONS } = require('../utils/permissions');

const personalizationManager = new PersonalizationManager();

/**
 * GET /api/personalization/client/{clientId}/global
 * Obtiene configuración global del cliente
 */
const getClientGlobalConfig = withPermissions(async (event) => {
    const { clientId } = event.pathParameters;
    
    if (!clientId) {
        return badRequest('clientId es requerido');
    }
    
    const config = await personalizationManager.getClientGlobalConfig(clientId);
    
    return success({
        clientId,
        config,
        type: 'global'
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * PUT /api/personalization/client/{clientId}/global
 * Actualiza configuración global del cliente
 */
const updateClientGlobalConfig = withPermissions(async (event) => {
    const { clientId } = event.pathParameters;
    const settings = JSON.parse(event.body || '{}');
    const updatedBy = event.user.id;
    
    if (!clientId) {
        return badRequest('clientId es requerido');
    }
    
    if (!settings || Object.keys(settings).length === 0) {
        return badRequest('settings son requeridos');
    }
    
    const updatedConfig = await personalizationManager.updateClientGlobalConfig(
        clientId, 
        settings, 
        updatedBy
    );
    
    return success({
        message: 'Configuración global actualizada exitosamente',
        config: updatedConfig
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * GET /api/personalization/client/{clientId}/user/{userId}
 * Obtiene configuración específica del usuario
 */
const getUserSpecificConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
    // Verificar que el usuario puede acceder a esta configuración
    if (event.user.id !== userId && !event.user.rol.includes('admin')) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Acceso denegado a configuración de otro usuario' }) };
    }
    
    const config = await personalizationManager.getUserSpecificConfig(clientId, userId);
    
    return success({
        clientId,
        userId,
        config,
        type: 'user_specific'
    });
}, [PERMISSIONS.USUARIOS_READ_PROFILE]);

/**
 * PUT /api/personalization/client/{clientId}/user/{userId}
 * Actualiza configuración específica del usuario
 */
const updateUserSpecificConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    const settings = JSON.parse(event.body || '{}');
    const updatedBy = event.user.id;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
    // Verificar que el usuario puede modificar esta configuración
    if (event.user.id !== userId && !event.user.rol.includes('admin')) {
        return { statusCode: 403, body: JSON.stringify({ error: 'No puede modificar configuración de otro usuario' }) };
    }
    
    if (!settings || Object.keys(settings).length === 0) {
        return badRequest('settings son requeridos');
    }
    
    const updatedConfig = await personalizationManager.updateUserSpecificConfig(
        clientId, 
        userId, 
        settings, 
        updatedBy
    );
    
    return success({
        message: 'Configuración del usuario actualizada exitosamente',
        config: updatedConfig
    });
}, [PERMISSIONS.USUARIOS_UPDATE_PROFILE]);

/**
 * GET /api/personalization/client/{clientId}/user/{userId}/complete
 * Obtiene configuración completa del usuario (global + específica + externa)
 */
const getCompleteUserConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
    // Verificar que el usuario puede acceder a esta configuración
    if (event.user.id !== userId && !event.user.rol.includes('admin')) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Acceso denegado a configuración de otro usuario' }) };
    }
    
    const config = await personalizationManager.getCompleteUserConfig(clientId, userId);
    
    return success({
        clientId,
        userId,
        config,
        type: 'complete'
    });
}, [PERMISSIONS.USUARIOS_READ_PROFILE]);

/**
 * POST /api/personalization/client/{clientId}/load-external
 * Carga configuración desde fuente externa (mecanismo de desacople)
 */
const loadExternalConfig = withPermissions(async (event) => {
    const { clientId } = event.pathParameters;
    const { source } = JSON.parse(event.body || '{}');
    
    if (!clientId) {
        return badRequest('clientId es requerido');
    }
    
    if (!source) {
        return badRequest('source es requerido (environment, file, api)');
    }
    
    const validSources = ['environment', 'file', 'api'];
    if (!validSources.includes(source)) {
        return badRequest(`source debe ser uno de: ${validSources.join(', ')}`);
    }
    
    const externalConfig = await personalizationManager.loadExternalConfig(source, clientId);
    
    return success({
        message: `Configuración cargada desde ${source}`,
        clientId,
        source,
        config: externalConfig,
        loadedAt: new Date().toISOString()
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * GET /api/personalization/client/{clientId}/export
 * Exporta toda la configuración del cliente
 */
const exportClientConfig = withPermissions(async (event) => {
    const { clientId } = event.pathParameters;
    
    if (!clientId) {
        return badRequest('clientId es requerido');
    }
    
    const exportData = await personalizationManager.exportClientConfig(clientId);
    
    return success(exportData);
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * POST /api/personalization/cache/clear
 * Limpia la cache de configuraciones
 */
const clearConfigurationCache = withPermissions(async (event) => {
    personalizationManager.clearCache();
    
    return success({
        message: 'Cache de configuraciones limpiada exitosamente',
        clearedAt: new Date().toISOString()
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

/**
 * GET /api/personalization/industries/{industry}/config
 * Obtiene configuración específica por industria
 */
const getIndustryConfig = withPermissions(async (event) => {
    const { industry } = event.pathParameters;
    
    if (!industry) {
        return badRequest('industry es requerida');
    }
    
    const validIndustries = ['healthcare', 'education', 'office', 'parking', 'events', 'generic'];
    if (!validIndustries.includes(industry)) {
        return badRequest(`industry debe ser una de: ${validIndustries.join(', ')}`);
    }
    
    const config = personalizationManager.getIndustrySpecificConfig(industry);
    
    return success({
        industry,
        config,
        type: 'industry_specific'
    });
}, [PERMISSIONS.SYSTEM_RESILIENCE_VIEW]);

module.exports = {
    getClientGlobalConfig,
    updateClientGlobalConfig,
    getUserSpecificConfig,
    updateUserSpecificConfig,
    getCompleteUserConfig,
    loadExternalConfig,
    exportClientConfig,
    clearConfigurationCache,
    getIndustryConfig
};