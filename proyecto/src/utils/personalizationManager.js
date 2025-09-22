const DynamoDBAdapter = require('../database/DynamoDBAdapter');
const { sendPersonalizationUpdateAsync } = require('./snsNotifications');
const { v4: uuidv4 } = require('uuid');

class PersonalizationManager {
    constructor() {
        this.db = new DynamoDBAdapter();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000;
    }

    /**
     * CONFIGURACIONES GLOBALES POR CLIENTE/ORGANIZACIÓN
     */
    
    /**
     * @param {string} clientId - ID del cliente/organización
     * @returns {Object} Configuración global
     */
    async getClientGlobalConfig(clientId) {
        const cacheKey = `global_${clientId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const config = await this.db.getItem('CONFIG', `CLIENT_GLOBAL#${clientId}`);
            
            const defaultConfig = this.getDefaultClientConfig();
            const finalConfig = { ...defaultConfig, ...config?.settings };
            
            this.cache.set(cacheKey, {
                data: finalConfig,
                timestamp: Date.now()
            });
            
            return finalConfig;
        } catch (error) {
            console.error('Error obteniendo configuración global del cliente:', error);
            return this.getDefaultClientConfig();
        }
    }
    
    /**
     * Actualiza configuración global del cliente
     * @param {string} clientId - ID del cliente
     * @param {Object} settings - Nuevas configuraciones
     * @param {string} updatedBy - Usuario que actualiza
     */
    async updateClientGlobalConfig(clientId, settings, updatedBy) {
        const configData = {
            PK: 'CONFIG',
            SK: `CLIENT_GLOBAL#${clientId}`,
            clientId,
            settings,
            updatedBy,
            updatedAt: new Date().toISOString(),
            version: Date.now()
        };
        
        await this.db.putItem(configData);

        try {
            sendPersonalizationUpdateAsync({
                updateType: 'client_global_update',
                clientId,
                updatedBy,
                itemKey: configData.SK,
                subject: `Actualización de configuración global para ${clientId}`
            });
        } catch (err) {
            console.warn('Failed to publish personalization SNS event:', err);
        }
        
        this.cache.delete(`global_${clientId}`);
        
        return configData;
    }
    
    /**
     * CONFIGURACIONES ESPECÍFICAS POR USUARIO
     */
    
    /**
     * @param {string} clientId - ID del cliente
     * @param {string} userId - ID del usuario
     */
    async getUserSpecificConfig(clientId, userId) {
        const cacheKey = `user_${clientId}_${userId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const userConfig = await this.db.getItem('CONFIG', `USER_SPECIFIC#${clientId}#${userId}`);
            const globalConfig = await this.getClientGlobalConfig(clientId);
            
            const finalConfig = {
                ...globalConfig,
                ...userConfig?.settings,
                _userOverrides: userConfig?.settings || {}
            };
            
            this.cache.set(cacheKey, {
                data: finalConfig,
                timestamp: Date.now()
            });
            
            return finalConfig;
        } catch (error) {
            console.error('Error obteniendo configuración del usuario:', error);
            return await this.getClientGlobalConfig(clientId);
        }
    }
    
    /**
     * Actualiza configuración específica del usuario
     * @param {string} clientId - ID del cliente
     * @param {string} userId - ID del usuario
     * @param {Object} settings - Configuraciones específicas
     * @param {string} updatedBy - Usuario que actualiza
     */
    async updateUserSpecificConfig(clientId, userId, settings, updatedBy) {
        const configData = {
            PK: 'CONFIG',
            SK: `USER_SPECIFIC#${clientId}#${userId}`,
            clientId,
            userId,
            settings,
            updatedBy,
            updatedAt: new Date().toISOString(),
            version: Date.now()
        };
        
        await this.db.putItem(configData);

        try {
            sendPersonalizationUpdateAsync({
                updateType: 'user_specific_update',
                clientId,
                userId,
                updatedBy,
                itemKey: configData.SK,
                subject: `Actualización de configuración de usuario ${userId} para cliente ${clientId}`
            });
        } catch (err) {
            console.warn('Failed to publish personalization SNS event:', err);
        }
        
        this.cache.delete(`user_${clientId}_${userId}`);
        
        return configData;
    }
    
    /**
     * CONFIGURACIONES DEL SISTEMA
     */
    
    getDefaultClientConfig() {
        return {

            ui: {
                theme: 'light', // light, dark, auto
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                logo: null,
                companyName: 'Mi Empresa',
                showHeader: true,
                showFooter: true,
                language: 'es',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h'
            },
            
            business: {
                industry: 'generic',
                timezone: 'America/Santiago',
                currency: 'CLP',
                workingHours: {
                    start: '08:00',
                    end: '18:00',
                    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                },
                reservationLimits: {
                    maxDaysAdvance: 30,
                    maxReservationsPerUser: 5,
                    maxDurationHours: 8,
                    allowConcurrentReservations: false
                }
            },
            
            spaces: {
                defaultCapacity: 10,
                requireApproval: false,
                allowOverbooking: false,
                autoConfirm: true,
                notificationSettings: {
                    emailNotifications: true,
                    smsNotifications: false,
                    pushNotifications: true
                }
            },
            
            security: {
                sessionTimeout: 240,
                requirePasswordChange: false,
                passwordPolicy: {
                    minLength: 8,
                    requireUppercase: true,
                    requireNumbers: true,
                    requireSymbols: false
                },
                enableAuditLog: true,
                enableIPRestriction: false
            },
            
            integrations: {
                allowExternalAPI: false,
                webhookEndpoints: [],
                emailProvider: 'aws-ses',
                smsProvider: 'aws-sns',
                storageProvider: 'aws-s3'
            }
        };
    }
    
    getIndustrySpecificConfig(industry) {
        const configs = {
            healthcare: {
                business: {
                    workingHours: { start: '06:00', end: '22:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
                    reservationLimits: { maxDaysAdvance: 90, allowConcurrentReservations: true }
                },
                spaces: { requireApproval: true, allowOverbooking: false }
            },
            education: {
                business: {
                    workingHours: { start: '07:00', end: '20:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
                    reservationLimits: { maxDaysAdvance: 180 }
                },
                spaces: { defaultCapacity: 30, requireApproval: false }
            },
            office: {
                business: {
                    workingHours: { start: '08:00', end: '18:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
                    reservationLimits: { maxDaysAdvance: 30 }
                },
                spaces: { requireApproval: false, allowOverbooking: true }
            },
            parking: {
                business: {
                    workingHours: { start: '00:00', end: '23:59', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
                    reservationLimits: { maxDaysAdvance: 7, maxDurationHours: 24 }
                },
                spaces: { autoConfirm: true, allowOverbooking: false }
            },
            events: {
                business: {
                    reservationLimits: { maxDaysAdvance: 365, maxDurationHours: 24 }
                },
                spaces: { requireApproval: true, defaultCapacity: 100 }
            }
        };
        
        return configs[industry] || {};
    }
    
    /**
     * MECANISMO DE DESACOPLE
     */
    
    /**
     * @param {string} source - Fuente de configuración
     * @param {string} clientId - ID del cliente
     */
    async loadExternalConfig(source, clientId) {
        try {
            let externalConfig = {};
            
            switch (source) {
                case 'environment':
                    externalConfig = this.loadFromEnvironment(clientId);
                    break;
                case 'file':
                    externalConfig = await this.loadFromFile(clientId);
                    break;
                case 'api':
                    externalConfig = await this.loadFromAPI(clientId);
                    break;
                default:
                    console.warn(`Fuente de configuración no soportada: ${source}`);
                    return {};
            }
            
            if (Object.keys(externalConfig).length > 0) {
                await this.updateClientGlobalConfig(clientId, externalConfig, 'system');
            }
            
            return externalConfig;
        } catch (error) {
            console.error('Error cargando configuración externa:', error);
            return {};
        }
    }
    
    loadFromEnvironment(clientId) {
        const envPrefix = `CLIENT_${clientId.toUpperCase()}_`;
        const config = {};
        
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(envPrefix)) {
                const configKey = key.replace(envPrefix, '').toLowerCase();
                try {
                    config[configKey] = JSON.parse(value);
                } catch {
                    config[configKey] = value;
                }
            }
        }
        
        return config;
    }
    
    async loadFromFile(clientId) {
        return {};
    }
    
    async loadFromAPI(clientId) {
        return {};
    }
    
    async getCompleteUserConfig(clientId, userId) {
        const userConfig = await this.getUserSpecificConfig(clientId, userId);
        const externalConfig = await this.loadExternalConfig('environment', clientId);
        
        return {
            ...userConfig,
            ...externalConfig,
            _metadata: {
                clientId,
                userId,
                loadedAt: new Date().toISOString(),
                source: 'complete'
            }
        };
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    async exportClientConfig(clientId) {
        const globalConfig = await this.getClientGlobalConfig(clientId);
        
        return {
            clientId,
            globalConfig,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
}

module.exports = PersonalizationManager;