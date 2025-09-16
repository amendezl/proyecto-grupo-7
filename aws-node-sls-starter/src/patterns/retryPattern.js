/**
 * Implementación del Patrón Retry para el Sistema de Gestión de Espacios
 * 
 * Este patrón maneja errores transitorios comunes en AWS:
 * - DynamoDB throttling
 * - Cognito timeouts
 * - SQS delivery delays
 * - Network connectivity issues
 * 
 * Características:
 * - Backoff exponencial
 * - Jitter para evitar thundering herd
 * - Tipos de error específicos
 * - Configuración por servicio
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Tipos de errores que son candidatos para retry
 */
const RETRYABLE_ERRORS = {
  // DynamoDB
  THROTTLING: 'ThrottlingException',
  PROVISIONED_THROUGHPUT: 'ProvisionedThroughputExceededException',
  INTERNAL_SERVER_ERROR: 'InternalServerError',
  SERVICE_UNAVAILABLE: 'ServiceUnavailable',
  
  // Cognito
  TOO_MANY_REQUESTS: 'TooManyRequestsException',
  INTERNAL_ERROR: 'InternalErrorException',
  
  // SQS
  SQS_THROTTLING: 'Throttling',
  
  // Network
  NETWORK_TIMEOUT: 'NetworkingError',
  CONNECTION_REFUSED: 'ECONNREFUSED',
  CONNECTION_TIMEOUT: 'ETIMEDOUT',
  
  // AWS SDK General
  REQUEST_TIMEOUT: 'RequestTimeout',
  BANDWIDTH_LIMIT: 'BandwidthLimitExceeded'
};

/**
 * Configuraciones predefinidas para diferentes servicios
 */
const RETRY_CONFIGS = {
  // Para operaciones críticas del sistema (reservas, procesos importantes)
  CRITICAL: {
    maxAttempts: 5,
    baseDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterMax: 50,
    enableLogging: true
  },
  
  // Para operaciones estándar (consultas, reportes)
  STANDARD: {
    maxAttempts: 3,
    baseDelay: 200,
    maxDelay: 3000,
    backoffMultiplier: 2,
    jitterMax: 100,
    enableLogging: true
  },
  
  // Para operaciones de baja prioridad (estadísticas, logs)
  LOW_PRIORITY: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitterMax: 200,
    enableLogging: false
  },
  
  // Para autenticación (rápido pero persistente)
  AUTH: {
    maxAttempts: 4,
    baseDelay: 50,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitterMax: 25,
    enableLogging: true
  }
};

/**
 * Clase principal del patrón Retry
 */
class RetryManager {
  constructor(config = RETRY_CONFIGS.STANDARD) {
    this.config = config;
    this.retryId = uuidv4();
  }

  /**
   * Ejecuta una operación con política de reintentos
   * @param {Function} operation - Función async a ejecutar
   * @param {Object} context - Contexto adicional para logs
   * @returns {Promise} - Resultado de la operación
   */
  async executeWithRetry(operation, context = {}) {
    const startTime = Date.now();
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        if (this.config.enableLogging && attempt > 1) {
          console.log(`[RETRY] Intento ${attempt}/${this.config.maxAttempts} para ${context.operation || 'operación'}`);
        }
        
        const result = await operation();
        
        if (this.config.enableLogging && attempt > 1) {
          const duration = Date.now() - startTime;
          console.log(`[RETRY] ✅ Éxito en intento ${attempt} después de ${duration}ms`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Verificar si el error es reintentable
        if (!this.isRetryableError(error)) {
          if (this.config.enableLogging) {
            console.log(`[RETRY] ❌ Error no reintentable: ${error.name || error.code || 'Unknown'}`);
          }
          throw error;
        }
        
        // Si es el último intento, lanzar el error
        if (attempt === this.config.maxAttempts) {
          if (this.config.enableLogging) {
            const duration = Date.now() - startTime;
            console.log(`[RETRY] ❌ Falló después de ${attempt} intentos en ${duration}ms`);
          }
          throw this.createRetryExhaustedError(lastError, attempt, context);
        }
        
        // Calcular tiempo de espera con backoff exponencial y jitter
        const delay = this.calculateDelay(attempt);
        
        if (this.config.enableLogging) {
          console.log(`[RETRY] ⏳ Intento ${attempt} falló, esperando ${delay}ms. Error: ${error.message}`);
        }
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Verifica si un error es candidato para retry
   * @param {Error} error - Error a evaluar
   * @returns {boolean} - true si es reintentable
   */
  isRetryableError(error) {
    if (!error) return false;
    
    const errorCode = error.code || error.name || '';
    const errorMessage = error.message || '';
    
    // Verificar códigos específicos de AWS
    for (const retryableCode of Object.values(RETRYABLE_ERRORS)) {
      if (errorCode.includes(retryableCode)) {
        return true;
      }
    }
    
    // Verificar HTTP status codes reintentables
    if (error.statusCode) {
      const status = parseInt(error.statusCode);
      if (status >= 500 || status === 429) {
        return true;
      }
    }
    
    // Verificar mensajes específicos
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'throttl',
      'rate limit',
      'temporarily unavailable'
    ];
    
    return retryableMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg)
    );
  }

  /**
   * Calcula el tiempo de espera con backoff exponencial y jitter
   * @param {number} attempt - Número de intento actual
   * @returns {number} - Tiempo de espera en ms
   */
  calculateDelay(attempt) {
    // Backoff exponencial
    const exponentialDelay = this.config.baseDelay * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Aplicar límite máximo
    const boundedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // Agregar jitter aleatorio para evitar thundering herd
    const jitter = Math.random() * this.config.jitterMax;
    
    return Math.floor(boundedDelay + jitter);
  }

  /**
   * Crea un error específico cuando se agotan los reintentos
   */
  createRetryExhaustedError(originalError, attempts, context) {
    const error = new Error(
      `[RETRY_EXHAUSTED] Operación falló después de ${attempts} intentos. ` +
      `Contexto: ${JSON.stringify(context)}. ` +
      `Error original: ${originalError.message}`
    );
    
    error.name = 'RetryExhaustedError';
    error.originalError = originalError;
    error.attempts = attempts;
    error.context = context;
    error.retryId = this.retryId;
    
    return error;
  }

  /**
   * Función sleep para pausas
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory functions para crear instancias con configuraciones predefinidas
 */
const createRetryManager = {
  /**
   * Para operaciones críticas (reservas de emergencia, alertas médicas)
   */
  critical: () => new RetryManager(RETRY_CONFIGS.CRITICAL),
  
  /**
   * Para operaciones estándar (CRUD general)
   */
  standard: () => new RetryManager(RETRY_CONFIGS.STANDARD),
  
  /**
   * Para operaciones de baja prioridad (reportes, estadísticas)
   */
  lowPriority: () => new RetryManager(RETRY_CONFIGS.LOW_PRIORITY),
  
  /**
   * Para autenticación
   */
  auth: () => new RetryManager(RETRY_CONFIGS.AUTH),
  
  /**
   * Configuración personalizada
   */
  custom: (config) => new RetryManager(config)
};

/**
 * Decorador para añadir retry automáticamente a funciones
 */
function withRetry(retryType = 'standard', context = {}) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const retryManager = createRetryManager[retryType]();
      
      return retryManager.executeWithRetry(
        () => originalMethod.apply(this, args),
        { operation: `${target.constructor.name}.${propertyName}`, ...context }
      );
    };
    
    return descriptor;
  };
}

/**
 * Función helper para wrap manual de operaciones
 */
async function retryOperation(operation, type = 'standard', context = {}) {
  const retryManager = createRetryManager[type]();
  return retryManager.executeWithRetry(operation, context);
}

module.exports = {
  RetryManager,
  createRetryManager,
  withRetry,
  retryOperation,
  RETRY_CONFIGS,
  RETRYABLE_ERRORS
};
