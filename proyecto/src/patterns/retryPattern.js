const { v4: uuidv4 } = require('uuid');

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

const RETRY_CONFIGS = {

  CRITICAL: {
    maxAttempts: 5,
    baseDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterMax: 50,
    enableLogging: true
  },
  
  STANDARD: {
    maxAttempts: 3,
    baseDelay: 200,
    maxDelay: 3000,
    backoffMultiplier: 2,
    jitterMax: 100,
    enableLogging: true
  },
  
  LOW_PRIORITY: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitterMax: 200,
    enableLogging: false
  },
  
  AUTH: {
    maxAttempts: 4,
    baseDelay: 50,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitterMax: 25,
    enableLogging: true
  }
};

class RetryManager {
  constructor(config = RETRY_CONFIGS.STANDARD) {
    this.config = config;
    this.retryId = uuidv4();
  }

  /**
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
        
        if (!this.isRetryableError(error)) {
          if (this.config.enableLogging) {
            console.log(`[RETRY] ❌ Error no reintentable: ${error.name || error.code || 'Unknown'}`);
          }
          throw error;
        }
        
        if (attempt === this.config.maxAttempts) {
          if (this.config.enableLogging) {
            const duration = Date.now() - startTime;
            console.log(`[RETRY] ❌ Falló después de ${attempt} intentos en ${duration}ms`);
          }
          throw this.createRetryExhaustedError(lastError, attempt, context);
        }
        
        const delay = this.calculateDelay(attempt);
        
        if (this.config.enableLogging) {
          console.log(`[RETRY] ⏳ Intento ${attempt} falló, esperando ${delay}ms. Error: ${error.message}`);
        }
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * @param {Error} error - Error a evaluar
   * @returns {boolean} - true si es reintentable
   */
  isRetryableError(error) {
    if (!error) return false;
    
    const errorCode = error.code || error.name || '';
    const errorMessage = error.message || '';
    
    for (const retryableCode of Object.values(RETRYABLE_ERRORS)) {
      if (errorCode.includes(retryableCode)) {
        return true;
      }
    }
    
    if (error.statusCode) {
      const status = parseInt(error.statusCode);
      if (status >= 500 || status === 429) {
        return true;
      }
    }
    
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
   * @param {number} attempt - Número de intento actual
   * @returns {number} - Tiempo de espera en ms
   */
  calculateDelay(attempt) {

    const exponentialDelay = this.config.baseDelay * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    const boundedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    const jitter = Math.random() * this.config.jitterMax;
    
    return Math.floor(boundedDelay + jitter);
  }

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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const createRetryManager = {

  critical: () => new RetryManager(RETRY_CONFIGS.CRITICAL),
  standard: () => new RetryManager(RETRY_CONFIGS.STANDARD),
  lowPriority: () => new RetryManager(RETRY_CONFIGS.LOW_PRIORITY),
  auth: () => new RetryManager(RETRY_CONFIGS.AUTH),
  custom: (config) => new RetryManager(config)
};

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
