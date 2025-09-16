/**
 * Implementación del Patrón Circuit Breaker para el Sistema Hospitalario
 * 
 * Este patrón previene cascadas de fallos en servicios críticos:
 * - DynamoDB connections
 * - Cognito authentication
 * - SQS messaging
 * - External APIs
 * 
 * Estados:
 * - CLOSED: Todo funciona normalmente
 * - OPEN: Servicio fallando, requests fallan inmediatamente
 * - HALF_OPEN: Probando si el servicio se recuperó
 * 
 * Configuraciones específicas para entorno hospitalario
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Estados del Circuit Breaker
 */
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',     // Funcionamiento normal
  OPEN: 'OPEN',         // Circuito abierto, fallos inmediatos
  HALF_OPEN: 'HALF_OPEN' // Probando recuperación
};

/**
 * Configuraciones predefinidas para diferentes servicios críticos
 */
const CIRCUIT_CONFIGS = {
  // Para servicios de emergencia médica (tolerancia mínima a fallos)
  HIGH_PRIORITY: {
    failureThreshold: 3,        // 3 fallos consecutivos
    recoveryTimeout: 5000,      // 5 segundos para reintentar
    successThreshold: 2,        // 2 éxitos para cerrar circuito
    timeout: 3000,              // 3 segundos timeout por request
    monitoringWindow: 60000,    // 1 minuto de ventana de monitoreo
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para DynamoDB (base de datos crítica)
  DATABASE: {
    failureThreshold: 5,        // 5 fallos en ventana de tiempo
    recoveryTimeout: 10000,     // 10 segundos para reintentar
    successThreshold: 3,        // 3 éxitos consecutivos
    timeout: 5000,              // 5 segundos timeout
    monitoringWindow: 120000,   // 2 minutos de ventana
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para autenticación Cognito
  AUTH: {
    failureThreshold: 4,        // 4 fallos
    recoveryTimeout: 15000,     // 15 segundos
    successThreshold: 2,        // 2 éxitos
    timeout: 2000,              // 2 segundos timeout
    monitoringWindow: 90000,    // 1.5 minutos
    enableLogging: true,
    fallbackEnabled: false      // Auth no tiene fallback
  },
  
  // Para servicios externos (APIs médicas, laboratorios)
  EXTERNAL_API: {
    failureThreshold: 3,        // 3 fallos
    recoveryTimeout: 30000,     // 30 segundos
    successThreshold: 3,        // 3 éxitos
    timeout: 10000,             // 10 segundos timeout
    monitoringWindow: 300000,   // 5 minutos
    enableLogging: true,
    fallbackEnabled: true
  },
  
  // Para SQS (mensajería)
  MESSAGING: {
    failureThreshold: 7,        // 7 fallos (más tolerante)
    recoveryTimeout: 20000,     // 20 segundos
    successThreshold: 3,        // 3 éxitos
    timeout: 8000,              // 8 segundos timeout
    monitoringWindow: 180000,   // 3 minutos
    enableLogging: true,
    fallbackEnabled: true
  }
};

/**
 * Clase principal del Circuit Breaker
 */
class CircuitBreaker {
  constructor(config = CIRCUIT_CONFIGS.DATABASE, serviceName = 'unknown') {
    this.config = config;
    this.serviceName = serviceName;
    this.circuitId = uuidv4();
    
    // Estado interno
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Estadísticas
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
    
    // Ventana deslizante para monitoreo
    this.requestWindow = [];
    
    if (this.config.enableLogging) {
      console.log(`[CIRCUIT_BREAKER] Inicializado para servicio: ${this.serviceName}`);
    }
  }

  /**
   * Ejecuta una operación protegida por el circuit breaker
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
    
    // Verificar estado del circuito
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CIRCUIT_STATES.HALF_OPEN;
        this.successCount = 0;
        
        if (this.config.enableLogging) {
          console.log(`[CIRCUIT_BREAKER] ${this.serviceName}: Transición a HALF_OPEN para probar recuperación`);
        }
      } else {
        // Circuito abierto, ejecutar fallback si está disponible
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
      // Ejecutar operación con timeout
      const result = await this.executeWithTimeout(operation, this.config.timeout);
      
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      // Si estamos en HALF_OPEN y la operación fue exitosa
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
      
      // Si estamos en HALF_OPEN y falló, volver a OPEN
      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        this.openCircuit();
      }
      
      // Si superamos el umbral de fallos, abrir circuito
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
        
        // Intentar fallback si está disponible
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

  /**
   * Ejecuta operación con timeout
   */
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

  /**
   * Ejecuta función fallback con manejo de errores
   */
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

  /**
   * Registra un éxito en las estadísticas
   */
  recordSuccess(responseTime) {
    this.failureCount = Math.max(0, this.failureCount - 1); // Decrementar contador gradualmente
    this.stats.totalSuccesses++;
    this.updateAverageResponseTime(responseTime);
    
    this.requestWindow.push({
      timestamp: Date.now(),
      success: true,
      responseTime
    });
  }

  /**
   * Registra un fallo en las estadísticas
   */
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

  /**
   * Actualiza el tiempo promedio de respuesta
   */
  updateAverageResponseTime(responseTime) {
    const total = this.stats.totalRequests;
    this.stats.averageResponseTime = 
      ((this.stats.averageResponseTime * (total - 1)) + responseTime) / total;
  }

  /**
   * Verifica si debe abrir el circuito
   */
  shouldOpenCircuit() {
    if (this.state === CIRCUIT_STATES.OPEN) return false;
    
    this.cleanRequestWindow();
    
    // Contar fallos en la ventana de tiempo
    const recentFailures = this.requestWindow.filter(req => !req.success).length;
    
    return recentFailures >= this.config.failureThreshold;
  }

  /**
   * Verifica si debe intentar resetear el circuito
   */
  shouldAttemptReset() {
    if (!this.lastFailureTime) return false;
    
    const timeElapsed = Date.now() - this.lastFailureTime;
    return timeElapsed >= this.config.recoveryTimeout;
  }

  /**
   * Abre el circuito
   */
  openCircuit() {
    if (this.state !== CIRCUIT_STATES.OPEN) {
      this.state = CIRCUIT_STATES.OPEN;
      this.stats.circuitOpened++;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      
      if (this.config.enableLogging) {
        console.warn(`[CIRCUIT_BREAKER] 🔴 ${this.serviceName}: Circuito ABIERTO - próximo intento en ${this.config.recoveryTimeout}ms`);
      }
    }
  }

  /**
   * Cierra el circuito
   */
  closeCircuit() {
    if (this.state !== CIRCUIT_STATES.CLOSED) {
      this.state = CIRCUIT_STATES.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.stats.circuitClosed++;
      
      if (this.config.enableLogging) {
        console.log(`[CIRCUIT_BREAKER] 🟢 ${this.serviceName}: Circuito CERRADO - servicio recuperado`);
      }
    }
  }

  /**
   * Limpia la ventana de requests antiguos
   */
  cleanRequestWindow() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.requestWindow = this.requestWindow.filter(req => req.timestamp > cutoff);
  }

  /**
   * Crea error específico cuando el circuito está abierto
   */
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

  /**
   * Crea error cuando falla el fallback
   */
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

  /**
   * Obtiene estadísticas actuales del circuit breaker
   */
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

  /**
   * Calcula un score de salud del servicio (0-100)
   */
  calculateHealthScore() {
    if (this.stats.totalRequests === 0) return 100;
    
    const successRate = (this.stats.totalSuccesses / this.stats.totalRequests) * 100;
    const stateModifier = this.state === CIRCUIT_STATES.CLOSED ? 1 : 0.5;
    
    return Math.round(successRate * stateModifier);
  }

  /**
   * Resetea estadísticas
   */
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

/**
 * Factory functions para crear circuit breakers específicos
 */
const createCircuitBreaker = {
  /**
   * Para servicios de emergencia médica
   */
  high_priority: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.HIGH_PRIORITY, serviceName),
  
  /**
   * Para DynamoDB
   */
  database: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.DATABASE, serviceName),
  
  /**
   * Para autenticación Cognito
   */
  auth: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.AUTH, serviceName),
  
  /**
   * Para APIs externas
   */
  externalApi: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.EXTERNAL_API, serviceName),
  
  /**
   * Para SQS messaging
   */
  messaging: (serviceName) => new CircuitBreaker(CIRCUIT_CONFIGS.MESSAGING, serviceName),
  
  /**
   * Configuración personalizada
   */
  custom: (config, serviceName) => new CircuitBreaker(config, serviceName)
};

/**
 * Registry global para circuit breakers reutilizables
 */
class CircuitBreakerRegistry {
  constructor() {
    this.circuits = new Map();
  }

  /**
   * Obtiene o crea un circuit breaker
   */
  getOrCreate(serviceName, type = 'database') {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, createCircuitBreaker[type](serviceName));
    }
    return this.circuits.get(serviceName);
  }

  /**
   * Obtiene estadísticas de todos los circuits
   */
  getAllStats() {
    const stats = {};
    for (const [name, circuit] of this.circuits) {
      stats[name] = circuit.getStats();
    }
    return stats;
  }

  /**
   * Resetea todos los circuits
   */
  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.resetStats();
    }
  }
}

// Instancia global del registry
const circuitRegistry = new CircuitBreakerRegistry();

module.exports = {
  CircuitBreaker,
  createCircuitBreaker,
  circuitRegistry,
  CIRCUIT_STATES,
  CIRCUIT_CONFIGS
};
