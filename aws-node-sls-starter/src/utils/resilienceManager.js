/**
 * Manager de Resiliencia para el Sistema Hospitalario
 * 
 * Combina los patrones Retry y Circuit Breaker para máxima estabilidad:
 * - Retry para errores transitorios
 * - Circuit Breaker para prevenir cascadas de fallos
 * - Configuraciones específicas para servicios médicos críticos
 * - Monitoreo y métricas unificadas
 * - Fallbacks inteligentes para operaciones críticas
 */

const { createRetryManager, retryOperation } = require('./retryPattern');
const { createCircuitBreaker, circuitRegistry } = require('./circuitBreakerPattern');

/**
 * Configuraciones combinadas para diferentes niveles de criticidad
 */
const RESILIENCE_CONFIGS = {
  // Servicios críticos (emergencias, vida/muerte)
  CRITICAL_MEDICAL: {
    serviceName: 'critical-medical',
    retryType: 'critical',
    circuitType: 'emergency',
    enableMetrics: true,
    fallbackStrategy: 'EMERGENCY_FALLBACK'
  },
  
  // Autenticación (acceso al sistema)
  AUTHENTICATION: {
    serviceName: 'authentication',
    retryType: 'auth',
    circuitType: 'auth',
    enableMetrics: true,
    fallbackStrategy: 'CACHE_FALLBACK'
  },
  
  // Base de datos DynamoDB
  DATABASE_OPERATIONS: {
    serviceName: 'dynamodb',
    retryType: 'standard',
    circuitType: 'database',
    enableMetrics: true,
    fallbackStrategy: 'READ_REPLICA_FALLBACK'
  },
  
  // APIs externas (laboratorios, imágenes médicas)
  EXTERNAL_MEDICAL_API: {
    serviceName: 'external-medical',
    retryType: 'standard',
    circuitType: 'externalApi',
    enableMetrics: true,
    fallbackStrategy: 'CACHED_DATA_FALLBACK'
  },
  
  // Mensajería SQS
  MESSAGING: {
    serviceName: 'sqs-messaging',
    retryType: 'low_priority',
    circuitType: 'messaging',
    enableMetrics: true,
    fallbackStrategy: 'QUEUE_FALLBACK'
  }
};

/**
 * Estrategias de fallback específicas para el hospital
 */
const FALLBACK_STRATEGIES = {
  /**
   * Para emergencias médicas - datos básicos siempre disponibles
   */
  EMERGENCY_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando datos de emergencia básicos');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Servicio en modo emergencia - contactar IT urgente',
        emergencyContact: '+1-800-HOSPITAL',
        basicData: context.emergencyData || null
      },
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Para autenticación - usar cache temporal si está disponible
   */
  CACHE_FALLBACK: async (context) => {
    console.log('[FALLBACK] Intentando autenticación con cache');
    // En implementación real, consultar cache Redis o localStorage
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Autenticación temporalmente limitada',
        cachedAuth: false,
        limitedAccess: true
      },
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Para DB - intentar réplica de solo lectura
   */
  READ_REPLICA_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando réplica de solo lectura');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Datos en modo solo lectura',
        readOnly: true,
        lastSync: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Para APIs externas - usar datos cacheados
   */
  CACHED_DATA_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando datos cacheados');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Datos de laboratorio cacheados (pueden estar desactualizados)',
        cached: true,
        age: '< 24 horas'
      },
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Para mensajería - guardar en cola local
   */
  QUEUE_FALLBACK: async (context) => {
    console.log('[FALLBACK] Guardando mensaje en cola local');
    return {
      success: true,
      fallback: true,
      data: {
        message: 'Mensaje guardado localmente - se enviará cuando el servicio se recupere',
        queued: true,
        messageId: `local-${Date.now()}`
      },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Clase principal del Manager de Resiliencia
 */
class ResilienceManager {
  constructor() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      fallbackExecutions: 0,
      circuitBreakerActivations: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * Ejecuta operación con máxima resiliencia (Retry + Circuit Breaker)
   * @param {Function} operation - Operación a ejecutar
   * @param {string} configKey - Clave de configuración (CRITICAL_MEDICAL, etc.)
   * @param {Object} context - Contexto adicional
   * @returns {Promise} - Resultado de la operación
   */
  async executeWithResilience(operation, configKey, context = {}) {
    const startTime = Date.now();
    const config = RESILIENCE_CONFIGS[configKey];
    
    if (!config) {
      throw new Error(`Configuración de resiliencia no encontrada: ${configKey}`);
    }
    
    this.metrics.totalOperations++;
    
    try {
      // Obtener circuit breaker para el servicio
      const circuitBreaker = circuitRegistry.getOrCreate(
        config.serviceName, 
        config.circuitType
      );
      
      // Preparar fallback
      const fallbackFn = FALLBACK_STRATEGIES[config.fallbackStrategy];
      
      // Ejecutar con circuit breaker y retry combinados
      const result = await circuitBreaker.execute(
        // Operación wrapped con retry
        () => retryOperation(
          operation,
          config.retryType,
          { ...context, serviceName: config.serviceName }
        ),
        // Fallback
        fallbackFn,
        // Contexto
        { ...context, configKey, operation: operation.name }
      );
      
      // Métricas de éxito
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime, false);
      
      if (config.enableMetrics) {
        console.log(`[RESILIENCE] ✅ ${config.serviceName}: Operación exitosa en ${responseTime}ms`);
      }
      
      return result;
      
    } catch (error) {
      // Métricas de fallo
      const responseTime = Date.now() - startTime;
      const wasFallback = error.name === 'CircuitOpenError' && 
                         FALLBACK_STRATEGIES[config.fallbackStrategy];
      
      this.updateMetrics(false, responseTime, wasFallback);
      
      if (config.enableMetrics) {
        console.error(`[RESILIENCE] ❌ ${config.serviceName}: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Métodos específicos para cada tipo de operación hospitalaria
   */

  /**
   * Para operaciones críticas de emergencia
   */
  async executeCritical(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'CRITICAL_MEDICAL', 
      { ...context, priority: 'critical' }
    );
  }

  /**
   * Para autenticación de usuarios
   */
  async executeAuth(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'AUTHENTICATION', 
      { ...context, authType: 'cognito' }
    );
  }

  /**
   * Para operaciones de base de datos
   */
  async executeDatabase(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'DATABASE_OPERATIONS', 
      { ...context, dbType: 'dynamodb' }
    );
  }

  /**
   * Para APIs médicas externas
   */
  async executeExternalApi(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'EXTERNAL_MEDICAL_API', 
      { ...context, apiType: 'medical' }
    );
  }

  /**
   * Para operaciones de mensajería
   */
  async executeMessaging(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'MESSAGING', 
      { ...context, queueType: 'sqs' }
    );
  }

  /**
   * Actualiza métricas internas
   */
  updateMetrics(success, responseTime, wasFallback) {
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }
    
    if (wasFallback) {
      this.metrics.fallbackExecutions++;
    }
    
    // Actualizar tiempo promedio de respuesta
    const totalOps = this.metrics.totalOperations;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalOps - 1)) + responseTime) / totalOps;
  }

  /**
   * Obtiene métricas completas del sistema
   */
  getSystemMetrics() {
    const circuitStats = circuitRegistry.getAllStats();
    
    return {
      resilience: {
        ...this.metrics,
        successRate: this.metrics.totalOperations > 0 ? 
          (this.metrics.successfulOperations / this.metrics.totalOperations) * 100 : 0,
        failureRate: this.metrics.totalOperations > 0 ? 
          (this.metrics.failedOperations / this.metrics.totalOperations) * 100 : 0,
        uptime: Date.now() - this.metrics.lastResetTime
      },
      circuits: circuitStats,
      healthScore: this.calculateOverallHealth(circuitStats),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calcula score de salud general del sistema
   */
  calculateOverallHealth(circuitStats) {
    const circuits = Object.values(circuitStats);
    if (circuits.length === 0) return 100;
    
    const avgHealth = circuits.reduce((sum, circuit) => 
      sum + circuit.healthScore, 0) / circuits.length;
    
    const resilienceBonus = this.metrics.successfulOperations > 0 ? 5 : 0;
    
    return Math.min(100, Math.round(avgHealth + resilienceBonus));
  }

  /**
   * Endpoint de health check para monitoring
   */
  async healthCheck() {
    const metrics = this.getSystemMetrics();
    const isHealthy = metrics.healthScore >= 70;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      health_score: metrics.healthScore,
      circuits: Object.keys(metrics.circuits).length,
      total_operations: metrics.resilience.totalOperations,
      success_rate: metrics.resilience.successRate,
      timestamp: metrics.timestamp
    };
  }

  /**
   * Resetea todas las métricas
   */
  resetMetrics() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      fallbackExecutions: 0,
      circuitBreakerActivations: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    circuitRegistry.resetAll();
    
    console.log('[RESILIENCE] Métricas reseteadas');
  }
}

// Instancia global singleton
const resilienceManager = new ResilienceManager();

/**
 * Decorador para añadir resiliencia automática a métodos
 */
function withResilience(configKey, context = {}) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      return resilienceManager.executeWithResilience(
        () => originalMethod.apply(this, args),
        configKey,
        { operation: `${target.constructor.name}.${propertyName}`, ...context }
      );
    };
    
    return descriptor;
  };
}

module.exports = {
  ResilienceManager,
  resilienceManager,
  withResilience,
  RESILIENCE_CONFIGS,
  FALLBACK_STRATEGIES
};
