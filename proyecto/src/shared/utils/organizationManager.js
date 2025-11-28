const DynamoDBManager = require('../../infrastructure/database/DynamoDBManager');
const PersonalizationManager = require('./personalizationManager');
const { logger } = require('../../infrastructure/monitoring/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * OrganizationManager - Gestiona organizaciones multi-tenant
 * Cada organización tiene su propia configuración de personalización
 */
class OrganizationManager {
    constructor() {
        this.db = new DynamoDBManager();
        this.personalizationManager = new PersonalizationManager();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Crea una nueva organización
     * @param {Object} data - Datos de la organización
     * @param {string} data.name - Nombre de la organización
     * @param {string} data.industry - Industria (healthcare, office, parking, etc.)
     * @param {string} data.adminUserId - ID del usuario administrador
     * @param {Object} data.customTerminology - Terminología personalizada (opcional)
     * @returns {Object} Organización creada
     */
    async createOrganization(data) {
        const { name, industry = 'generic', adminUserId, customTerminology } = data;
        
        if (!name || !adminUserId) {
            throw new Error('name y adminUserId son requeridos');
        }

        const orgId = uuidv4();
        
        // Obtener configuración base según industria
        const industryConfig = this.personalizationManager.getIndustrySpecificConfig(industry);
        const defaultConfig = this.personalizationManager.getDefaultClientConfig();
        
        // Merge de configuraciones
        const organizationConfig = {
            ...defaultConfig,
            business: {
                ...defaultConfig.business,
                ...industryConfig.business,
                industry
            },
            terminology: {
                ...defaultConfig.terminology,
                ...industryConfig.terminology,
                ...customTerminology
            },
            spaces: {
                ...defaultConfig.spaces,
                ...industryConfig.spaces
            }
        };

        const organization = {
            PK: `ORG#${orgId}`,
            SK: 'METADATA',
            GSI1PK: 'ORGANIZATION',
            GSI1SK: name,
            entityType: 'organization',
            id: orgId,
            name,
            industry,
            config: organizationConfig,
            adminUserId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true,
            plan: 'free',
            userCount: 1
        };

        await this.db.putItem(organization);

        logger.info('Organization created', {
            orgId,
            name,
            industry,
            adminUserId
        });

        return organization;
    }

    /**
     * Obtiene una organización por ID
     * @param {string} orgId - ID de la organización
     * @returns {Object} Organización
     */
    async getOrganization(orgId) {
        const cacheKey = `org_${orgId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const organization = await this.db.getItem(`ORG#${orgId}`, 'METADATA');
            
            if (!organization) {
                throw new Error(`Organización ${orgId} no encontrada`);
            }

            this.cache.set(cacheKey, {
                data: organization,
                timestamp: Date.now()
            });

            return organization;
        } catch (error) {
            logger.error('Error obteniendo organización:', {
                errorMessage: error.message,
                errorType: error.constructor.name,
                orgId
            });
            throw error;
        }
    }

    /**
     * Actualiza la configuración de una organización
     * @param {string} orgId - ID de la organización
     * @param {Object} updates - Actualizaciones
     * @param {string} updatedBy - Usuario que actualiza
     * @returns {Object} Organización actualizada
     */
    async updateOrganizationConfig(orgId, updates, updatedBy) {
        try {
            const organization = await this.getOrganization(orgId);
            
            const updatedConfig = {
                ...organization.config,
                ...updates,
                terminology: {
                    ...organization.config.terminology,
                    ...updates.terminology
                }
            };

            const updatedOrganization = {
                ...organization,
                config: updatedConfig,
                updatedAt: new Date().toISOString(),
                updatedBy
            };

            await this.db.putItem(updatedOrganization);

            // Limpiar cache
            this.cache.delete(`org_${orgId}`);

            logger.info('Organization config updated', {
                orgId,
                updatedBy,
                updates: Object.keys(updates)
            });

            return updatedOrganization;
        } catch (error) {
            logger.error('Error actualizando configuración de organización:', {
                errorMessage: error.message,
                errorType: error.constructor.name,
                orgId
            });
            throw error;
        }
    }

    /**
     * Obtiene la configuración de terminología de una organización
     * @param {string} orgId - ID de la organización
     * @returns {Object} Terminología
     */
    async getOrganizationTerminology(orgId) {
        try {
            const organization = await this.getOrganization(orgId);
            return organization.config.terminology || {};
        } catch (error) {
            logger.error('Error obteniendo terminología:', {
                errorMessage: error.message,
                errorType: error.constructor.name,
                orgId
            });
            // Retornar terminología por defecto en caso de error
            return this.personalizationManager.getDefaultClientConfig().terminology;
        }
    }

    /**
     * Vincula un usuario a una organización
     * @param {string} userId - ID del usuario
     * @param {string} orgId - ID de la organización
     * @returns {Object} Vínculo creado
     */
    async linkUserToOrganization(userId, orgId) {
        const link = {
            PK: `USER#${userId}`,
            SK: `ORG#${orgId}`,
            entityType: 'user_organization_link',
            userId,
            orgId,
            createdAt: new Date().toISOString()
        };

        await this.db.putItem(link);

        logger.info('User linked to organization', { userId, orgId });

        return link;
    }

    /**
     * Obtiene la organización de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Object} Organización del usuario
     */
    async getUserOrganization(userId) {
        try {
            // Buscar el vínculo usuario-organización
            const link = await this.db.query({
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': `USER#${userId}`,
                    ':sk': 'ORG#'
                }
            });

            if (!link || link.length === 0) {
                return null;
            }

            const orgId = link[0].orgId;
            return await this.getOrganization(orgId);
        } catch (error) {
            logger.error('Error obteniendo organización del usuario:', {
                errorMessage: error.message,
                errorType: error.constructor.name,
                userId
            });
            return null;
        }
    }

    /**
     * Lista todas las organizaciones (para admins de sistema)
     * @param {Object} filters - Filtros
     * @returns {Array} Lista de organizaciones
     */
    async listOrganizations(filters = {}) {
        try {
            const result = await this.db.query({
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': 'ORGANIZATION'
                }
            });

            return result || [];
        } catch (error) {
            logger.error('Error listando organizaciones:', {
                errorMessage: error.message,
                errorType: error.constructor.name
            });
            return [];
        }
    }

    /**
     * Obtiene estadísticas de una organización
     * @param {string} orgId - ID de la organización
     * @returns {Object} Estadísticas
     */
    async getOrganizationStats(orgId) {
        try {
            const organization = await this.getOrganization(orgId);
            
            // Aquí podrías agregar más estadísticas según necesites
            return {
                orgId,
                name: organization.name,
                industry: organization.industry,
                userCount: organization.userCount || 0,
                plan: organization.plan,
                createdAt: organization.createdAt,
                active: organization.active
            };
        } catch (error) {
            logger.error('Error obteniendo estadísticas de organización:', {
                errorMessage: error.message,
                errorType: error.constructor.name,
                orgId
            });
            throw error;
        }
    }

    /**
     * Limpia el cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = OrganizationManager;
