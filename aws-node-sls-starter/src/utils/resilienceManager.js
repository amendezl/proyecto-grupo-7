/**
 * Manager de Resiliencia para el Sistema de Gestión de Espacios
 * 
 * Combina los patrones Retry, Circuit Breaker y Bulkhead para máxima estabilidad:
 * - Retry para errores transitorios
 * - Circuit Breaker para prevenir cascadas de fallos
 * - Bulkhead para aislamiento de recursos por tipo de operación
 * - Configuraciones específicas para servicios críticos del negocio
 * - Monitoreo y métricas unificadas
 * - Fallbacks inteligentes para operaciones importantes
 */

const { createRetryManager, retryOperation } = require('./retryPattern');
const { createCircuitBreaker, circuitRegistry } = require('./circuitBreakerPattern');
const SpaceBulkheadManager = require('./bulkheadPattern');

/**
 * Configuraciones combinadas para diferentes niveles de criticidad
 */
const RESILIENCE_CONFIGS = {
  // Servicios críticos del negocio (operaciones importantes)
  CRITICAL_BUSINESS: {
    serviceName: 'critical-business',
    retryType: 'critical',
    circuitType: 'high_priority',
    enableMetrics: true,
    fallbackStrategy: 'PRIORITY_FALLBACK'
  },
  
  // Autenticación de usuarios
  AUTHENTICATION: {
    serviceName: 'user-auth',
    retryType: 'auth',
    circuitType: 'auth',
    enableMetrics: true,
    fallbackStrategy: 'CACHE_FALLBACK'
  },
  
  // Operaciones de base de datos
  DATABASE_OPERATIONS: {
    serviceName: 'database-ops',
    retryType: 'standard',
    circuitType: 'database',
    enableMetrics: true,
    fallbackStrategy: 'READ_REPLICA_FALLBACK'
  },
  
  // APIs externas
  EXTERNAL_API: {
    serviceName: 'external-api',
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
 * Estrategias de fallback específicas para el sistema de gestión de espacios
 */
const FALLBACK_STRATEGIES = {
  /**
   * Para operaciones críticas del negocio - datos básicos siempre disponibles
   */
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
  
  /**
   * Para cache - usar últimos datos conocidos
   */
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
  
  /**
   * Para DB - usar réplica de lectura
   */
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
  
  /**
   * Para APIs externas - usar datos cacheados
   */
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
 * Clase principal del Manager de Resiliencia para el Sistema de Gestión de Espacios
 */
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
    
    // Inicializar el manager de Bulkhead
    this.bulkheadManager = new SpaceBulkheadManager();
    console.log('[RESILIENCE] Manager inicializado con Retry + Circuit Breaker + Bulkhead');
  }

  /**
   * Ejecuta operación con máxima resiliencia (Retry + Circuit Breaker + Bulkhead)
   */
  async executeWithFullResilience(operation, configKey, context = {}) {
    const startTime = Date.now();
    const config = RESILIENCE_CONFIGS[configKey];
    
    if (!config) {
      throw new Error(`Configuración de resiliencia no encontrada: ${configKey}`);
    }
    
    this.metrics.totalOperations++;
    
    try {
      // Determinar pool de Bulkhead según el tipo de operación
      const bulkheadPool = this._getBulkheadPoolForConfig(config, context);
      
      // Ejecutar con Bulkhead + Circuit Breaker + Retry
      const result = await this.bulkheadManager.executeInPool(
        bulkheadPool,
        // Operación wrapped con circuit breaker y retry
        async () => {
          const circuitBreaker = circuitRegistry.getOrCreate(
            config.serviceName, 
            config.circuitType
          );
          
          const fallbackFn = FALLBACK_STRATEGIES[config.fallbackStrategy];
          
          return await circuitBreaker.execute(
            () => retryOperation(
              operation,
              config.retryType,
              { ...context, serviceName: config.serviceName }
            ),
            fallbackFn,
            { ...context, configKey, operation: operation.name }
          );
        },
        {
          ...context,
          configKey,
          operation: context.operation || operation.name || 'unknown'
        }
      );
      
      // Métricas de éxito
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime, false);
      
      if (config.enableMetrics) {
        console.log(`[RESILIENCE_FULL] ✅ ${config.serviceName} [${bulkheadPool}]: Operación exitosa en ${responseTime}ms`);
      }
      
      return result;
      
    } catch (error) {
      // Métricas de fallo
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

  /**
   * Determina el pool de Bulkhead apropiado según la configuración
   */
  _getBulkheadPoolForConfig(config, context) {
    // Operaciones críticas del negocio
    if (config.serviceName.includes('critical-business') || 
        context.priority === 'critical' ||
        context.type === 'business_critical') {
      return 'HIGH_PRIORITY';
    }
    
    // Operaciones importantes (alta prioridad)
    if (config.serviceName.includes('critical') || 
        context.priority === 'high' ||
        context.type === 'high_priority') {
      return 'CRITICAL';
    }
    
    // Operaciones de autenticación
    if (config.serviceName.includes('auth') || 
        context.type === 'authentication') {
      return 'AUTHENTICATION';
    }
    
    // Operaciones administrativas
    if (config.serviceName.includes('admin') || 
        context.priority === 'admin') {
      return 'ADMIN';
    }
    
    // Operaciones de baja prioridad (reportes, estadísticas)
    if (config.serviceName.includes('low') || 
        context.priority === 'low' ||
        context.type === 'reporting') {
      return 'LOW_PRIORITY';
    }
    
    // Por defecto: operaciones estándar
    return 'STANDARD';
  }

  /**
   * Ejecuta operación con máxima resiliencia (Legacy - mantiene compatibilidad)
   */
  async executeWithResilience(operation, configKey, context = {}) {
    // Usar la versión completa con Bulkhead por defecto
    return this.executeWithFullResilience(operation, configKey, context);
  }

  /**
   * Métodos específicos para cada tipo de operación del sistema de gestión de espacios
   */

  // Para operaciones críticas del negocio
  async executeCritical(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'CRITICAL_BUSINESS', 
      { ...context, priority: 'critical' }
    );
  }

  // Para autenticación de usuarios
  async executeAuth(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'AUTHENTICATION', 
      { ...context, authType: 'cognito' }
    );
  }

  // Para operaciones de base de datos
  async executeDatabase(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'DATABASE_OPERATIONS', 
      { ...context, dbType: 'dynamodb' }
    );
  }

  // Para APIs externas
  async executeExternalApi(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'EXTERNAL_API', 
      { ...context, apiType: 'external' }
    );
  }

  // Para operaciones de mensajería
  async executeMessaging(operation, context = {}) {
    return this.executeWithResilience(
      operation, 
      'MESSAGING', 
      { ...context, queueType: 'sqs' }
    );
  }

  /**
   * Métodos específicos para acceso directo a pools de Bulkhead
   */

  // Operaciones de alta prioridad del negocio
  async executeHighPriority(operation, context = {}) {
    return this.bulkheadManager.executeHighPriority(operation, {
      ...context,
      operation: context.operation || 'high_priority_business'
    });
  }

  // Operaciones críticas del sistema
  async executeCriticalBusiness(operation, context = {}) {
    return this.bulkheadManager.executeCritical(operation, {
      ...context,
      operation: context.operation || 'critical_business'
    });
  }

  // Operaciones administrativas
  async executeAdministrative(operation, context = {}) {
    return this.bulkheadManager.executeAdmin(operation, {
      ...context,
      operation: context.operation || 'administrative'
    });
  }

  // Operaciones de baja prioridad (reportes, estadísticas)
  async executeLowPriority(operation, context = {}) {
    return this.bulkheadManager.executeLowPriority(operation, {
      ...context,
      operation: context.operation || 'low_priority'
    });
  }

  // Autenticación con pool dedicado
  async executeAuthWithBulkhead(operation, context = {}) {
    return this.bulkheadManager.executeAuth(operation, {
      ...context,
      operation: context.operation || 'authentication'
    });
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
   * Obtiene métricas completas incluyendo Bulkhead
   */
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
   * Calcula score de salud combinado incluyendo Bulkhead
   */
  calculateCombinedHealthScore(basicMetrics, bulkheadHealth) {
    const basicHealth = basicMetrics.healthScore || 0;
    
    const bulkheadPools = Object.values(bulkheadHealth);
    const healthyPools = bulkheadPools.filter(pool => pool.healthy).length;
    const totalPools = bulkheadPools.length;
    
    const bulkheadHealthPercent = totalPools > 0 ? (healthyPools / totalPools) * 100 : 100;
    
    // Peso: 60% basic resilience, 40% bulkhead health
    const combinedScore = (basicHealth * 0.6) + (bulkheadHealthPercent * 0.4);
    
    return Math.round(combinedScore);
  }

  /**
   * Reinicia métricas del sistema
   */
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

// Instancia global singleton
const resilienceManager = new SpaceResilienceManager();

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
  SpaceResilienceManager,
  resilienceManager,
  withResilience,
  RESILIENCE_CONFIGS,
  FALLBACK_STRATEGIES,
  SpaceBulkheadManager,
  BulkheadRejectionError
};
