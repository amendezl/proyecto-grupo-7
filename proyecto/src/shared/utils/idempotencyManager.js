const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateForDynamoDB } = require('../../core/validation/validator');
const crypto = require('crypto');

/**
 * IdempotencyManager
 * Implementa idempotencia para operaciones críticas usando DynamoDB
 * con TTL automático para limpieza de registros antiguos
 */
class IdempotencyManager {
  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.IDEMPOTENCY_TABLE || 
                     `${process.env.DYNAMODB_TABLE}-idempotency`;
    
    // TTL por defecto: 24 horas (86400 segundos)
    this.defaultTTL = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400');
  }

  /**
   * Genera un idempotency key a partir de los parámetros de la operación
   * @param {Object} event - Evento de Lambda
   * @param {Object} params - Parámetros adicionales
   * @returns {string} - Idempotency key único
   */
  generateIdempotencyKey(event, params = {}) {
    // Prioridad 1: Header explícito del cliente
    if (event.headers && event.headers['x-idempotency-key']) {
      return event.headers['x-idempotency-key'];
    }

    // Prioridad 2: Header alternativo
    if (event.headers && event.headers['idempotency-key']) {
      return event.headers['idempotency-key'];
    }

    // Prioridad 3: Generar basado en contenido de la operación
    const userId = event.user?.id || event.requestContext?.authorizer?.jwt?.claims?.sub || 'anonymous';
    const operation = params.operation || event.requestContext?.routeKey || 'unknown';
    
    // Hash del body para operaciones con payload
    let bodyHash = '';
    if (event.body) {
      try {
        const bodyContent = typeof event.body === 'string' ? event.body : JSON.stringify(event.body);
        bodyHash = crypto.createHash('sha256').update(bodyContent).digest('hex').substring(0, 16);
      } catch (error) {
        logger.warn('Failed to hash body for idempotency key', { error: error.message });
      }
    }

    // Generar key compuesta
    const keyComponents = [userId, operation, bodyHash].filter(Boolean);
    return keyComponents.join('-');
  }

  /**
   * Verifica si una operación ya fue ejecutada (idempotencia)
   * @param {string} idempotencyKey - Clave de idempotencia
   * @returns {Object|null} - Resultado de operación previa o null
   */
  async checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) {
      logger.warn('Idempotency key is empty, skipping check');
      return null;
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          idempotencyKey: idempotencyKey
        }
      });

      const result = await this.docClient.send(command);
      
      if (result.Item) {
        const now = Math.floor(Date.now() / 1000);
        
        // Verificar si el registro no ha expirado
        if (result.Item.ttl && result.Item.ttl > now) {
          logger.info('Idempotent operation detected - returning cached result', {
            idempotencyKey,
            operationId: result.Item.operationId,
            status: result.Item.status,
            cachedAt: result.Item.createdAt
          });

          return {
            cached: true,
            operationId: result.Item.operationId,
            status: result.Item.status,
            statusCode: result.Item.statusCode,
            response: result.Item.response,
            createdAt: result.Item.createdAt
          };
        } else {
          logger.info('Idempotency record expired, will execute operation', {
            idempotencyKey,
            expiredAt: result.Item.ttl
          });
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking idempotency', {
        idempotencyKey,
        error: error.message,
        errorType: error.name
      });
      // En caso de error, no bloquear la operación
      return null;
    }
  }

  /**
   * Almacena el resultado de una operación para idempotencia
   * @param {string} idempotencyKey - Clave de idempotencia
   * @param {Object} result - Resultado de la operación
   * @param {Object} metadata - Metadatos adicionales
   * @param {number} ttlSeconds - TTL personalizado en segundos
   */
  async storeIdempotency(idempotencyKey, result, metadata = {}, ttlSeconds = null) {
    if (!idempotencyKey) {
      logger.warn('Idempotency key is empty, skipping storage');
      return;
    }

    try {
      const now = new Date();
      const ttl = Math.floor(now.getTime() / 1000) + (ttlSeconds || this.defaultTTL);
      const operationId = uuidv4();

      const item = {
        idempotencyKey: idempotencyKey,
        operationId: operationId,
        status: result.statusCode >= 200 && result.statusCode < 300 ? 'SUCCESS' : 'FAILED',
        statusCode: result.statusCode || 200,
        response: this.sanitizeResponse(result),
        metadata: {
          userId: metadata.userId || 'unknown',
          operation: metadata.operation || 'unknown',
          clientInfo: metadata.clientInfo || {},
          ...metadata
        },
        createdAt: now.toISOString(),
        expiresAt: new Date(ttl * 1000).toISOString(),
        ttl: ttl  // DynamoDB TTL attribute
      };

      // Validate idempotency record with AJV before writing to DynamoDB
      const validatedItem = validateForDynamoDB('idempotency', item);

      const command = new PutCommand({
        TableName: this.tableName,
        Item: validatedItem,
        // Evitar sobrescribir si ya existe (por race conditions)
        ConditionExpression: 'attribute_not_exists(idempotencyKey)'
      });

      await this.docClient.send(command);

      logger.info('Idempotency record stored successfully', {
        idempotencyKey,
        operationId,
        status: item.status,
        ttl: ttlSeconds || this.defaultTTL
      });
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Idempotency record already exists (race condition)', {
          idempotencyKey
        });
      } else {
        logger.error('Error storing idempotency record', {
          idempotencyKey,
          error: error.message,
          errorType: error.name
        });
      }
    }
  }

  /**
   * Sanitiza la respuesta para almacenamiento (limita tamaño)
   * @param {Object} result - Resultado de la operación
   * @returns {Object} - Resultado sanitizado
   */
  sanitizeResponse(result) {
    try {
      const sanitized = {
        statusCode: result.statusCode,
        headers: result.headers || {}
      };

      // Limitar tamaño del body
      if (result.body) {
        const bodyStr = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
        const maxBodySize = 50 * 1024; // 50KB límite
        
        if (bodyStr.length > maxBodySize) {
          sanitized.body = JSON.stringify({
            message: 'Response truncated for storage',
            originalSize: bodyStr.length,
            truncatedSize: maxBodySize
          });
          sanitized.truncated = true;
        } else {
          sanitized.body = bodyStr;
        }
      }

      return sanitized;
    } catch (error) {
      logger.error('Error sanitizing response', { error: error.message });
      return { 
        statusCode: result.statusCode || 500,
        body: JSON.stringify({ message: 'Error sanitizing response' })
      };
    }
  }

  /**
   * Limpia registros expirados manualmente (DynamoDB TTL lo hace automáticamente)
   * Esta función es útil para testing o limpieza forzada
   * @param {number} olderThanSeconds - Eliminar registros más antiguos que X segundos
   */
  async cleanupExpiredRecords(olderThanSeconds = 86400) {
    try {
      const cutoffTime = Math.floor(Date.now() / 1000) - olderThanSeconds;

      const command = new QueryCommand({
        TableName: this.tableName,
        FilterExpression: 'ttl < :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': cutoffTime
        }
      });

      const result = await this.docClient.send(command);
      
      logger.info('Manual cleanup found expired records', {
        count: result.Items?.length || 0,
        cutoffTime: new Date(cutoffTime * 1000).toISOString()
      });

      return result.Items?.length || 0;
    } catch (error) {
      logger.error('Error during manual cleanup', {
        error: error.message,
        errorType: error.name
      });
      return 0;
    }
  }

  /**
   * Wrapper para ejecutar operaciones con idempotencia automática
   * @param {Object} event - Evento de Lambda
   * @param {Function} operation - Función a ejecutar
   * @param {Object} options - Opciones de idempotencia
   * @returns {Object} - Resultado de la operación
   */
  async executeIdempotent(event, operation, options = {}) {
    const {
      generateKey = true,
      ttlSeconds = null,
      operation: operationName = 'unknown'
    } = options;

    let idempotencyKey = null;

    try {
      // Generar o extraer idempotency key
      if (generateKey) {
        idempotencyKey = this.generateIdempotencyKey(event, { operation: operationName });
      } else if (event.headers && event.headers['x-idempotency-key']) {
        idempotencyKey = event.headers['x-idempotency-key'];
      }

      // Si no hay key, ejecutar sin idempotencia
      if (!idempotencyKey) {
        logger.warn('No idempotency key available, executing without idempotency', {
          operation: operationName
        });
        return await operation();
      }

      // Verificar si ya fue ejecutado
      const cached = await this.checkIdempotency(idempotencyKey);
      if (cached) {
        return {
          statusCode: cached.statusCode,
          body: cached.response.body,
          headers: {
            ...cached.response.headers,
            'X-Idempotency-Cached': 'true',
            'X-Operation-Id': cached.operationId
          }
        };
      }

      // Ejecutar operación
      const result = await operation();

      // Almacenar resultado
      await this.storeIdempotency(
        idempotencyKey,
        result,
        {
          userId: event.user?.id,
          operation: operationName,
          requestId: event.requestContext?.requestId
        },
        ttlSeconds
      );

      return {
        ...result,
        headers: {
          ...(result.headers || {}),
          'X-Idempotency-Key': idempotencyKey
        }
      };
    } catch (error) {
      logger.error('Error in idempotent execution', {
        idempotencyKey,
        operation: operationName,
        error: error.message,
        errorType: error.name
      });
      throw error;
    }
  }
}

// Singleton instance
let idempotencyManager = null;

function getIdempotencyManager() {
  if (!idempotencyManager) {
    idempotencyManager = new IdempotencyManager();
  }
  return idempotencyManager;
}

module.exports = {
  IdempotencyManager,
  getIdempotencyManager
};
