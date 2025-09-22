const PersonalizationManager = require('../utils/personalizationManager');
const { withPermissions } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');
const { PERMISSIONS } = require('../utils/permissions');

const personalizationManager = new PersonalizationManager();

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

const getUserSpecificConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
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

const updateUserSpecificConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    const settings = JSON.parse(event.body || '{}');
    const updatedBy = event.user.id;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
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

const getCompleteUserConfig = withPermissions(async (event) => {
    const { clientId, userId } = event.pathParameters;
    
    if (!clientId || !userId) {
        return badRequest('clientId y userId son requeridos');
    }
    
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

const exportClientConfig = withPermissions(async (event) => {
    const { clientId } = event.pathParameters;
    
    if (!clientId) {
        return badRequest('clientId es requerido');
    }
    
    const exportData = await personalizationManager.exportClientConfig(clientId);
    
    return success(exportData);
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

const clearConfigurationCache = withPermissions(async (event) => {
    personalizationManager.clearCache();
    
    return success({
        message: 'Cache de configuraciones limpiada exitosamente',
        clearedAt: new Date().toISOString()
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

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