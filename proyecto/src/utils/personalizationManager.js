/**
 * Sistema de Gestión de Personalización - SaaS Multi-tenant
 * 
 * Permite configuración a nivel de:
 * 1. Parámetros globales del cliente/organización
 * 2. Parámetros específicos del usuario
 * 3. Configuraciones del sistema
 * 
 * Emplea mecanismo de desacople mediante configuración externa
 */

const DynamoDBAdapter = require('../database/DynamoDBAdapter');
const { sendPersonalizationUpdateAsync } = require('./snsNotifications');
const { v4: uuidv4 } = require('uuid');

class PersonalizationManager {
    constructor() {
        this.db = new DynamoDBAdapter();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos cache
    }

    /**
     * CONFIGURACIONES GLOBALES POR CLIENTE/ORGANIZACIÓN
     */
    
    /**
     * Obtiene configuración global del cliente
     * @param {string} clientId - ID del cliente/organización
     * @returns {Object} Configuración global
     */
    async getClientGlobalConfig(clientId) {
        const cacheKey = `global_${clientId}`;
        
        // Verificar cache
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
            
            // Cachear resultado
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

        // Publish personalization update event (non-blocking)
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
        
        // Invalidar cache
        this.cache.delete(`global_${clientId}`);
        
        return configData;
    }
    
    /**
     * CONFIGURACIONES ESPECÍFICAS POR USUARIO
     */
    
    /**
     * Obtiene configuración específica del usuario
     * @param {string} clientId - ID del cliente
     * @param {string} userId - ID del usuario
     */
    async getUserSpecificConfig(clientId, userId) {
        const cacheKey = `user_${clientId}_${userId}`;
        
        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const userConfig = await this.db.getItem('CONFIG', `USER_SPECIFIC#${clientId}#${userId}`);
            const globalConfig = await this.getClientGlobalConfig(clientId);
            
            // Combinar configuraciones: específicas del usuario tienen prioridad
            const finalConfig = {
                ...globalConfig,
                ...userConfig?.settings,
                _userOverrides: userConfig?.settings || {}
            };
            
            // Cachear resultado
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

        // Publish personalization update event (non-blocking)
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
        
        // Invalidar cache
        this.cache.delete(`user_${clientId}_${userId}`);
        
        return configData;
    }
    
    /**
     * CONFIGURACIONES DEL SISTEMA (DESACOPLADAS)
     */
    
    /**
     * Obtiene configuraciones por defecto del cliente
     */
    getDefaultClientConfig() {
        return {
            // === CONFIGURACIONES DE UI ===
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
            
            // === CONFIGURACIONES DE NEGOCIO ===
            business: {
                industry: 'generic', // healthcare, education, office, parking, events
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
            
            // === CONFIGURACIONES DE ESPACIOS ===
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
            
            // === CONFIGURACIONES DE SEGURIDAD ===
            security: {
                sessionTimeout: 240, // 4 minutos (menos de 5)
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
            
            // === CONFIGURACIONES DE INTEGRACIÓN ===
            integrations: {
                allowExternalAPI: false,
                webhookEndpoints: [],
                emailProvider: 'aws-ses',
                smsProvider: 'aws-sns',
                storageProvider: 'aws-s3'
            }
        };
    }
    
    /**
     * Obtiene configuraciones específicas por tipo de industria
     */
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
     * MECANISMO DE DESACOPLE - CONFIGURACIÓN EXTERNA
     */
    
    /**
     * Carga configuración desde fuente externa (archivo, API, etc.)
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
            
            // Aplicar configuración externa
            if (Object.keys(externalConfig).length > 0) {
                await this.updateClientGlobalConfig(clientId, externalConfig, 'system');
            }
            
            return externalConfig;
        } catch (error) {
            console.error('Error cargando configuración externa:', error);
            return {};
        }
    }
    
    /**
     * Carga configuración desde variables de entorno
     */
    loadFromEnvironment(clientId) {
        const envPrefix = `CLIENT_${clientId.toUpperCase()}_`;
        const config = {};
        
        // Buscar variables de entorno con el prefijo del cliente
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
    
    /**
     * Carga configuración desde archivo JSON
     */
    async loadFromFile(clientId) {
        // En un entorno real, esto cargaría desde S3 o sistema de archivos
        // Por ahora retornamos configuración vacía
        return {};
    }
    
    /**
     * Carga configuración desde API externa
     */
    async loadFromAPI(clientId) {
        // En un entorno real, esto haría una llamada HTTP a una API externa
        // Por ahora retornamos configuración vacía
        return {};
    }
    
    /**
     * UTILIDADES
     */
    
    /**
     * Obtiene configuración completa para un usuario
     * Combina configuración global + específica del usuario + configuración externa
     */
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
    
    /**
     * Invalida toda la cache de configuraciones
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Exporta configuración completa de un cliente
     */
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