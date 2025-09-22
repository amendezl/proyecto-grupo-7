const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || 'us-east-1';
const circuitStateTable = process.env.CIRCUIT_STATE_TABLE || null;
let ddbDocClient = null;
if (circuitStateTable) {
  try {
    const ddbClient = new DynamoDBClient({ region });
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
  } catch (err) {
    console.warn('Circuit breaker persistence disabled: failed to init DynamoDB client', err && err.message);
    ddbDocClient = null;
  }
}
const { putMetric } = require('../utils/metrics');

const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

const CIRCUIT_CONFIGS = {

  // Para servicios de alta prioridad
  HIGH_PRIORITY: {
    failureThreshold: 3,
    recoveryTimeout: 5000,
    successThreshold: 2,
    timeout: 3000,
    monitoringWindow: 60000,
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para DynamoDB
  DATABASE: {
    failureThreshold: 5,
    recoveryTimeout: 10000,
    successThreshold: 3,
    timeout: 5000,
    monitoringWindow: 120000,
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para autenticación Cognito
  AUTH: {
    failureThreshold: 4,
    recoveryTimeout: 15000,
    successThreshold: 2,
    timeout: 2000,
    monitoringWindow: 90000,
    enableLogging: true,
    fallbackEnabled: false
  },
  
  // Para servicios externos
  EXTERNAL_API: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    successThreshold: 3,
    timeout: 10000,
    monitoringWindow: 300000,
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para SQS
  MESSAGING: {
    failureThreshold: 7,
    recoveryTimeout: 20000,
    successThreshold: 3,
    timeout: 8000,
    monitoringWindow: 180000,
    enableLogging: true,
    fallbackEnabled: true
  }
};

class CircuitBreaker {
  constructor(config = CIRCUIT_CONFIGS.DATABASE, serviceName = 'unknown') {
    this.config = config;
    this.serviceName = serviceName;
    this.circuitId = uuidv4();
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      circuitOpened: 0,
      circuitClosed: 0,
      fallbackExecuted: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    this.requestWindow = [];
    
    if (this.config.enableLogging) {
      console.log(`[CIRCUIT_BREAKER] Inicializado para servicio: ${this.serviceName}`);
    }
  }

  /**
   * @param {Function} operation - Función async a ejecutar
   * @param {Function} fallback - Función fallback opcional
   * @param {Object} context - Contexto para logging
   * @returns {Promise} - Resultado de la operación
   */
  async execute(operation, fallback = null, context = {}) {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    this.stats.totalRequests++;
    this.cleanRequestWindow();
    
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CIRCUIT_STATES.HALF_OPEN;
        this.successCount = 0;
        
        if (this.config.enableLogging) {
          console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Transición a HALF_OPEN para probar recuperación`);
        }
      } else {

        if (fallback && this.config.fallbackEnabled) {
          this.stats.fallbackExecuted++;
          
          if (this.config.enableLogging) {
            console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Ejecutando fallback (circuito OPEN)`);
          }
          
          return await this.executeFallback(fallback, context);
        }
        
        throw this.createCircuitOpenError(context);
      }
    }

    try {

      const result = await this.executeWithTimeout(operation, this.config.timeout);
      
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        this.successCount++;
        
        if (this.successCount >= this.config.successThreshold) {
          this.closeCircuit();
        }
      }
      
      if (this.config.enableLogging && this.state !== CIRCUIT_STATES.CLOSED) {
        console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Operación exitosa en estado ${this.state}`);
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(error, responseTime);
      
      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        this.openCircuit();
      }
      
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
        
        if (fallback && this.config.fallbackEnabled) {
          this.stats.fallbackExecuted++;
          
          if (this.config.enableLogging) {
            console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Ejecutando fallback después de abrir circuito`);
          }
          
          return await this.executeFallback(fallback, context);
        }
      }
      
      throw error;
    }
  }

  async executeWithTimeout(operation, timeoutMs) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        this.stats.totalTimeouts++;
        reject(new Error(`[CIRCUIT_BREAKER] Timeout después de ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await operation();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  async executeFallback(fallback, context) {
    try {
      return await fallback(context);
    } catch (fallbackError) {
      if (this.config.enableLogging) {
        console.error(`[CIRCUIT_BREAKER] ${this.serviceName}: Fallback también falló:`, fallbackError.message);
      }
      
      throw this.createFallbackFailedError(fallbackError, context);
    }
  }

  recordSuccess(responseTime) {
    this.failureCount = Math.max(0, this.failureCount - 1);
    this.stats.totalSuccesses++;
    this.updateAverageResponseTime(responseTime);
    
    this.requestWindow.push({
      timestamp: Date.now(),
      success: true,
      responseTime
    });
  }

  recordFailure(error, responseTime) {
    this.failureCount++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    this.updateAverageResponseTime(responseTime);
    
    this.requestWindow.push({
      timestamp: Date.now(),
      success: false,
      error: error.message,
      responseTime
    });
  }

  updateAverageResponseTime(responseTime) {
    const total = this.stats.totalRequests;
    this.stats.averageResponseTime = 
      ((this.stats.averageResponseTime * (total - 1)) + responseTime) / total;
  }

  shouldOpenCircuit() {
    if (this.state === CIRCUIT_STATES.OPEN) return false;
    
    this.cleanRequestWindow();
    
    const recentFailures = this.requestWindow.filter(req => !req.success).length;
    
    return recentFailures >= this.config.failureThreshold;
  }

  shouldAttemptReset() {
    if (!this.lastFailureTime) return false;
    
    const timeElapsed = Date.now() - this.lastFailureTime;
    return timeElapsed >= this.config.recoveryTimeout;
  }

  openCircuit() {
    if (this.state !== CIRCUIT_STATES.OPEN) {
      this.state = CIRCUIT_STATES.OPEN;
      this.stats.circuitOpened++;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      
      if (this.config.enableLogging) {
        console.warn(`[CIRCUIT_BREAKER] 🔴 ${this.serviceName}: Circuito ABIERTO - próximo intento en ${this.config.recoveryTimeout}ms`);
      }

      if (ddbDocClient) {
        try {
          ddbDocClient.send(new PutCommand({ TableName: circuitStateTable, Item: { serviceName: this.serviceName, state: this.state, lastUpdated: Date.now() } }));
        } catch (e) {
          console.warn('Failed to persist circuit state', e && e.message);
        }
      }
      try { putMetric('CircuitOpened', 1, 'Count', [{ Name: 'Service', Value: this.serviceName }]); } catch (e) {}
    }
  }

  closeCircuit() {
    if (this.state !== CIRCUIT_STATES.CLOSED) {
      this.state = CIRCUIT_STATES.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.stats.circuitClosed++;
      
      if (this.config.enableLogging) {
        console.log(`[CIRCUIT_BREAKER] 🟢 ${this.serviceName}: Circuito CERRADO - servicio recuperado`);
      }
      if (ddbDocClient) {
        try {
          ddbDocClient.send(new PutCommand({ TableName: circuitStateTable, Item: { serviceName: this.serviceName, state: this.state, lastUpdated: Date.now() } }));
        } catch (e) {
          console.warn('Failed to persist circuit state', e && e.message);
        }
      }
      try { putMetric('CircuitClosed', 1, 'Count', [{ Name: 'Service', Value: this.serviceName }]); } catch (e) {}
    }
  }

  cleanRequestWindow() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.requestWindow = this.requestWindow.filter(req => req.timestamp > cutoff);
  }

  createCircuitOpenError(context) {
    const error = new Error(
      `[CIRCUIT_OPEN] Servicio ${this.serviceName} no disponible. ` +
      `Próximo intento: ${new Date(this.nextAttemptTime).toISOString()}. ` +
      `Contexto: ${JSON.stringify(context)}`
    );
    
    error.name = 'CircuitOpenError';
    error.serviceName = this.serviceName;
    error.circuitId = this.circuitId;
    error.nextAttemptTime = this.nextAttemptTime;
    error.context = context;
    
    return error;
  }

  createFallbackFailedError(originalError, context) {
    const error = new Error(
      `[FALLBACK_FAILED] Fallback para ${this.serviceName} también falló. ` +
      `Error: ${originalError.message}. Contexto: ${JSON.stringify(context)}`
    );
    
    error.name = 'FallbackFailedError';
    error.originalError = originalError;
    error.serviceName = this.serviceName;
    error.circuitId = this.circuitId;
    error.context = context;
    
    return error;
  }

  getStats() {
    this.cleanRequestWindow();
    
    const now = Date.now();
    const uptime = now - this.stats.lastResetTime;
    
    return {
      ...this.stats,
      currentState: this.state,
      serviceName: this.serviceName,
      circuitId: this.circuitId,
      failureCount: this.failureCount,
      successCount: this.successCount,
      uptime,
      recentRequests: this.requestWindow.length,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      healthScore: this.calculateHealthScore()
    };
  }

  calculateHealthScore() {
    if (this.stats.totalRequests === 0) return 100;
    
    const successRate = (this.stats.totalSuccesses / this.stats.totalRequests) * 100;
    const stateModifier = this.state === CIRCUIT_STATES.CLOSED ? 1 : 0.5;
    
    return Math.round(successRate * stateModifier);
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      circuitOpened: 0,
      circuitClosed: 0,
      fallbackExecuted: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    this.requestWindow = [];
    
    if (this.config.enableLogging) {
      console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Estadísticas reseteadas`);
    }
  }
}

const createCircuitBreaker = {

  high_priority: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.HIGH_PRIORITY, serviceName),
  database: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.DATABASE, serviceName),
  auth: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.AUTH, serviceName),
  externalApi: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.EXTERNAL_API, serviceName),
  messaging: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.MESSAGING, serviceName),
  custom: (config, serviceName) => new CircuitBreaker(config, serviceName)
};

class CircuitBreakerRegistry {
  constructor() {
    this.circuits = new Map();
  }

  getOrCreate(serviceName, type = 'database') {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, createCircuitBreaker[type](serviceName));
    }
    return this.circuits.get(serviceName);
  }

  getAllStats() {
    const stats = {};
    for (const [name, circuit] of this.circuits) {
      stats[name] = circuit.getStats();
    }
    return stats;
  }

  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.resetStats();
    }
  }
}
const circuitRegistry = new CircuitBreakerRegistry();

module.exports = {
  CircuitBreaker,
  createCircuitBreaker,
  circuitRegistry,
  CIRCUIT_STATES,
  CIRCUIT_CONFIGS
};
