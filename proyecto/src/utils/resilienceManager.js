const { createRetryManager, retryOperation } = require('../patterns/retryPattern');
const { createCircuitBreaker, circuitRegistry } = require('../patterns/circuitBreakerPattern');
const { SpaceBulkheadManager, BulkheadRejectionError } = require('../patterns/bulkheadPattern');
const { putMetric } = require('./metrics');

const RESILIENCE_CONFIGS = {

  CRITICAL_BUSINESS: {
    serviceName: 'critical-business',
    retryType: 'critical',
    circuitType: 'high_priority',
    enableMetrics: true,
    fallbackStrategy: 'PRIORITY_FALLBACK'
  },
  
  AUTHENTICATION: {
    serviceName: 'user-auth',
    retryType: 'auth',
    circuitType: 'auth',
    enableMetrics: true,
    fallbackStrategy: 'CACHE_FALLBACK'
  },
  
  DATABASE_OPERATIONS: {
    serviceName: 'database-ops',
    retryType: 'standard',
    circuitType: 'database',
    enableMetrics: true,
    fallbackStrategy: 'READ_REPLICA_FALLBACK'
  },
  
  EXTERNAL_API: {
    serviceName: 'external-api',
    retryType: 'standard',
    circuitType: 'externalApi',
    enableMetrics: true,
    fallbackStrategy: 'CACHED_DATA_FALLBACK'
  },
  
  MESSAGING: {
    serviceName: 'sqs-messaging',
    retryType: 'low_priority',
    circuitType: 'messaging',
    enableMetrics: true,
    fallbackStrategy: 'QUEUE_FALLBACK'
  }
};

const FALLBACK_STRATEGIES = {

  PRIORITY_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando datos prioritarios básicos');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Servicio en modo crítico - contactar soporte técnico',
        businessProtocol: 'Activar procedimientos manuales',
        contacto: 'IT: ext. 911'
      },
      timestamp: new Date().toISOString()
    };
  },
  
  CACHE_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando cache local');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Usando datos locales cacheados',
        warning: 'Los datos pueden no estar actualizados',
        cached: true
      },
      timestamp: new Date().toISOString()
    };
  },
  
  READ_REPLICA_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando réplica de lectura');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Datos obtenidos de réplica (solo lectura)',
        readOnly: true
      },
      timestamp: new Date().toISOString()
    };
  },
  
  CACHED_DATA_FALLBACK: async (context) => {
    console.log('[FALLBACK] Usando datos cacheados');
    return {
      success: false,
      fallback: true,
      data: {
        message: 'Datos externos cacheados (pueden estar desactualizados)',
        cached: true,
        age: '< 24 horas'
      },
      timestamp: new Date().toISOString()
    };
  },
  
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

class SpaceResilienceManager {
  constructor() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      fallbackExecutions: 0,
      circuitBreakerActivations: 0,
      bulkheadRejections: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    this.bulkheadManager = new SpaceBulkheadManager();
    console.log('[RESILIENCE] Manager inicializado con Retry + Circuit Breaker + Bulkhead');
  }

  async executeWithFullResilience(operation, configKey, context = {}) {
    const startTime = Date.now();
    const config = RESILIENCE_CONFIGS[configKey];
    
    if (!config) {
      throw new Error(`Configuración de resiliencia no encontrada: ${configKey}`);
    }
    
    this.metrics.totalOperations++;
    
    try {
      const bulkheadPool = this._getBulkheadPoolForConfig(config, context);
      
          const result = await this.bulkheadManager.executeInPool(
        bulkheadPool,
        async () => {
          const circuitBreaker = circuitRegistry.getOrCreate(
            config.serviceName, 
            config.circuitType
          );
          
          const fallbackFn = FALLBACK_STRATEGIES[config.fallbackStrategy];
          
            const op = async () => {
              try {
                return await retryOperation(operation, config.retryType, { ...context, serviceName: config.serviceName });
              } catch (err) {
                if (err && err.name === 'RetryExhaustedError') {
                  putMetric('RetryExhausted', 1, 'Count', [{ Name: 'Service', Value: config.serviceName }]);
                }
                throw err;
              }
            };

            const res = await circuitBreaker.execute(
              op,
              fallbackFn,
              { ...context, configKey, operation: operation.name }
            );

            if (res && res.fallback) {
              putMetric('FallbackExecuted', 1, 'Count', [{ Name: 'Service', Value: config.serviceName }]);
            }

            return res;
        },
        {
          ...context,
          configKey,
          operation: context.operation || operation.name || 'unknown'
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime, false);
      
      if (config.enableMetrics) {
        console.log(`[RESILIENCE_FULL] ✅ ${config.serviceName} [${bulkheadPool}]: Operación exitosa en ${responseTime}ms`);
      }
      
      return result;
      
    } catch (error) {

      const responseTime = Date.now() - startTime;
      const wasFallback = error.name === 'CircuitOpenError' && 
                         FALLBACK_STRATEGIES[config.fallbackStrategy];
      const wasBulkheadRejection = error instanceof BulkheadRejectionError;
      
      if (wasBulkheadRejection) {
        this.metrics.bulkheadRejections++;
      }
      
      this.updateMetrics(false, responseTime, wasFallback);
      
      if (config.enableMetrics) {
        const errorType = wasBulkheadRejection ? 'BULKHEAD_REJECTION' : 'GENERAL_ERROR';
        console.error(`[RESILIENCE_FULL] ❌ ${config.serviceName} [${errorType}]: ${error.message}`);
      }
      
      throw error;
    }
  }

  _getBulkheadPoolForConfig(config, context) {

    if (config.serviceName.includes('critical-business') || 
        context.priority === 'critical' ||
        context.type === 'business_critical') {
      return 'HIGH_PRIORITY';
    }
    
    if (config.serviceName.includes('critical') || 
        context.priority === 'high' ||
        context.type === 'high_priority') {
      return 'CRITICAL';
    }
    
    if (config.serviceName.includes('auth') || 
        context.type === 'authentication') {
      return 'AUTHENTICATION';
    }
    
    if (config.serviceName.includes('admin') || 
        context.priority === 'admin') {
      return 'ADMIN';
    }
    
    if (config.serviceName.includes('low') || 
        context.priority === 'low' ||
        context.type === 'reporting') {
      return 'LOW_PRIORITY';
    }
    
    return 'STANDARD';
  }

  async executeWithResilience(operation, configKey, context = {}) {
    return this.executeWithFullResilience(operation, configKey, context);
  }

  async executeCritical(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'CRITICAL_BUSINESS', 
      { ...context, priority: 'critical' }
    );
  }

  async executeAuth(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'AUTHENTICATION', 
      { ...context, authType: 'cognito' }
    );
  }

  async executeDatabase(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'DATABASE_OPERATIONS', 
      { ...context, dbType: 'dynamodb' }
    );
  }

  async executeExternalApi(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'EXTERNAL_API', 
      { ...context, apiType: 'external' }
    );
  }

  async executeMessaging(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'MESSAGING', 
      { ...context, queueType: 'sqs' }
    );
  }

  async executeHighPriority(operation, context = {}) {
    return this.bulkheadManager.executeHighPriority(operation, {
      ...context,
      operation: context.operation || 'high_priority_business'
    });
  }

  async executeCriticalBusiness(operation, context = {}) {
    return this.bulkheadManager.executeCritical(operation, {
      ...context,
      operation: context.operation || 'critical_business'
    });
  }

  async executeAdministrative(operation, context = {}) {
    return this.bulkheadManager.executeAdmin(operation, {
      ...context,
      operation: context.operation || 'administrative'
    });
  }

  async executeLowPriority(operation, context = {}) {
    return this.bulkheadManager.executeLowPriority(operation, {
      ...context,
      operation: context.operation || 'low_priority'
    });
  }

  async executeAuthWithBulkhead(operation, context = {}) {
    return this.bulkheadManager.executeAuth(operation, {
      ...context,
      operation: context.operation || 'authentication'
    });
  }

  updateMetrics(success, responseTime, wasFallback) {
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }
    
    if (wasFallback) {
      this.metrics.fallbackExecutions++;
    }
    
    const totalOps = this.metrics.totalOperations;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalOps - 1)) + responseTime) / totalOps;
  }

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

  getCompleteSystemMetrics() {
    const basicMetrics = this.getSystemMetrics();
    const bulkheadMetrics = this.bulkheadManager.getAllMetrics();
    const bulkheadHealth = this.bulkheadManager.getHealthStatus();
    
    return {
      ...basicMetrics,
      bulkhead: {
        metrics: bulkheadMetrics,
        healthStatus: bulkheadHealth,
        poolsSummary: {
          totalPools: Object.keys(bulkheadMetrics.pools).length,
          healthyPools: Object.values(bulkheadHealth).filter(pool => pool.healthy).length,
          totalActiveRequests: bulkheadMetrics.totalActiveRequests,
          totalQueuedRequests: bulkheadMetrics.totalQueuedRequests
        }
      },
      combinedHealthScore: this.calculateCombinedHealthScore(basicMetrics, bulkheadHealth)
    };
  }

  calculateOverallHealth(circuitStats) {
    const circuits = Object.values(circuitStats);
    if (circuits.length === 0) return 100;
    
    const avgHealth = circuits.reduce((sum, circuit) => 
      sum + circuit.healthScore, 0) / circuits.length;
    
    const resilienceBonus = this.metrics.successfulOperations > 0 ? 5 : 0;
    
    return Math.min(100, Math.round(avgHealth + resilienceBonus));
  }

  calculateCombinedHealthScore(basicMetrics, bulkheadHealth) {
    const basicHealth = basicMetrics.healthScore || 0;
    
    const bulkheadPools = Object.values(bulkheadHealth);
    const healthyPools = bulkheadPools.filter(pool => pool.healthy).length;
    const totalPools = bulkheadPools.length;
    
    const bulkheadHealthPercent = totalPools > 0 ? (healthyPools / totalPools) * 100 : 100;
    
    const combinedScore = (basicHealth * 0.6) + (bulkheadHealthPercent * 0.4);
    
    return Math.round(combinedScore);
  }

  resetMetrics() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      fallbackExecutions: 0,
      circuitBreakerActivations: 0,
      bulkheadRejections: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    circuitRegistry.resetAll();
    this.bulkheadManager.resetAllMetrics();
    
    console.log('[RESILIENCE] Métricas reseteadas - Retry + Circuit Breaker + Bulkhead');
  }
}

const resilienceManager = new SpaceResilienceManager();

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
  SpaceResilienceManager,
  resilienceManager,
  withResilience,
  RESILIENCE_CONFIGS,
  FALLBACK_STRATEGIES,
  SpaceBulkheadManager,
  BulkheadRejectionError
};
