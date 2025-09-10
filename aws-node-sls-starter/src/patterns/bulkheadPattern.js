/**
 * Bulkhead Pattern Implementation for Hospital Management System
 * 
 * Inspirado en compartimentos estancos navales, este patrón aísla recursos
 * para que el fallo de un tipo de operación no afecte a otras operaciones críticas.
 * 
 * Implementa pools de recursos separados para:
 * - Operaciones de emergencia (máxima prioridad)
 * - Operaciones críticas (quirófanos, UCI)
 * - Operaciones estándar (consultas, reservas normales)
 * - Operaciones de baja prioridad (reportes, estadísticas)
 * - Operaciones administrativas
 */

class BulkheadPool {
    constructor(name, maxConcurrency, queueSize = 100, timeoutMs = 30000) {
        this.name = name;
        this.maxConcurrency = maxConcurrency;
        this.queueSize = queueSize;
        this.timeoutMs = timeoutMs;
        
        // Estado del pool
        this.activeRequests = 0;
        this.queue = [];
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rejectedRequests: 0,
            averageExecutionTime: 0,
            queuedRequests: 0,
            maxQueueSizeReached: 0
        };
        
        // Configuración de timeouts
        this.requestTimeouts = new Map();
    }

    /**
     * Ejecuta una operación en el pool con isolación de recursos
     */
    async execute(operation, context = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        this.metrics.totalRequests++;
        
        try {
            // Verificar si hay slots disponibles
            if (this.activeRequests >= this.maxConcurrency) {
                return await this._queueRequest(operation, context, requestId, startTime);
            }
            
            // Ejecutar inmediatamente
            return await this._executeImmediate(operation, context, requestId, startTime);
            
        } catch (error) {
            this.metrics.failedRequests++;
            this._updateAverageExecutionTime(startTime);
            
            if (error.name === 'BulkheadRejectionError') {
                this.metrics.rejectedRequests++;
            }
            
            throw error;
        }
    }

    /**
     * Ejecuta operación inmediatamente
     */
    async _executeImmediate(operation, context, requestId, startTime) {
        this.activeRequests++;
        
        try {
            // Configurar timeout
            const timeoutPromise = new Promise((_, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Bulkhead timeout: ${this.name} operation exceeded ${this.timeoutMs}ms`));
                }, this.timeoutMs);
                
                this.requestTimeouts.set(requestId, timeoutId);
            });
            
            // Ejecutar con timeout
            const result = await Promise.race([
                operation(),
                timeoutPromise
            ]);
            
            // Limpiar timeout
            this._clearTimeout(requestId);
            
            this.metrics.successfulRequests++;
            this._updateAverageExecutionTime(startTime);
            
            return result;
            
        } finally {
            this.activeRequests--;
            this._clearTimeout(requestId);
            this._processQueue();
        }
    }

    /**
     * Encola una operación cuando el pool está lleno
     */
    async _queueRequest(operation, context, requestId, startTime) {
        // Verificar límite de cola
        if (this.queue.length >= this.queueSize) {
            this.metrics.maxQueueSizeReached++;
            throw new BulkheadRejectionError(
                `Bulkhead ${this.name} queue full: ${this.queue.length}/${this.queueSize}`,
                this.name,
                'QUEUE_FULL'
            );
        }
        
        // Agregar a la cola
        return new Promise((resolve, reject) => {
            const queueItem = {
                operation,
                context,
                requestId,
                startTime,
                resolve,
                reject,
                queuedAt: Date.now()
            };
            
            this.queue.push(queueItem);
            this.metrics.queuedRequests++;
            
            // Timeout para elementos en cola
            setTimeout(() => {
                if (this.queue.includes(queueItem)) {
                    this._removeFromQueue(queueItem);
                    reject(new Error(`Bulkhead queue timeout: ${this.name} request queued too long`));
                }
            }, this.timeoutMs);
        });
    }

    /**
     * Procesa la cola cuando hay slots disponibles
     */
    _processQueue() {
        while (this.queue.length > 0 && this.activeRequests < this.maxConcurrency) {
            const queueItem = this.queue.shift();
            
            // Ejecutar elemento de la cola
            this._executeImmediate(
                queueItem.operation,
                queueItem.context,
                queueItem.requestId,
                queueItem.startTime
            )
            .then(queueItem.resolve)
            .catch(queueItem.reject);
        }
    }

    /**
     * Elimina elemento de la cola
     */
    _removeFromQueue(itemToRemove) {
        const index = this.queue.indexOf(itemToRemove);
        if (index > -1) {
            this.queue.splice(index, 1);
        }
    }

    /**
     * Limpia timeout de request
     */
    _clearTimeout(requestId) {
        const timeoutId = this.requestTimeouts.get(requestId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.requestTimeouts.delete(requestId);
        }
    }

    /**
     * Actualiza tiempo promedio de ejecución
     */
    _updateAverageExecutionTime(startTime) {
        const executionTime = Date.now() - startTime;
        this.metrics.averageExecutionTime = 
            (this.metrics.averageExecutionTime + executionTime) / 2;
    }

    /**
     * Genera ID único para request
     */
    _generateRequestId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtiene métricas del pool
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeRequests: this.activeRequests,
            queueLength: this.queue.length,
            utilizationPercent: (this.activeRequests / this.maxConcurrency) * 100,
            queueUtilizationPercent: (this.queue.length / this.queueSize) * 100
        };
    }

    /**
     * Reinicia métricas
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rejectedRequests: 0,
            averageExecutionTime: 0,
            queuedRequests: 0,
            maxQueueSizeReached: 0
        };
    }
}

/**
 * Error específico para rechazo por Bulkhead
 */
class BulkheadRejectionError extends Error {
    constructor(message, poolName, reason) {
        super(message);
        this.name = 'BulkheadRejectionError';
        this.poolName = poolName;
        this.reason = reason;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Manager principal del patrón Bulkhead para el sistema hospitalario
 */
class HospitalBulkheadManager {
    constructor() {
        this.pools = new Map();
        this.initializeHospitalPools();
    }

    /**
     * Inicializa pools específicos para operaciones hospitalarias
     */
    initializeHospitalPools() {
        // Pool para operaciones de emergencia (máxima prioridad)
        this.pools.set('EMERGENCY', new BulkheadPool(
            'EMERGENCY',
            20,      // 20 operaciones concurrentes máximo
            50,      // Cola de 50 operaciones
            60000    // Timeout de 60 segundos
        ));

        // Pool para operaciones críticas (quirófanos, UCI)
        this.pools.set('CRITICAL', new BulkheadPool(
            'CRITICAL',
            15,      // 15 operaciones concurrentes
            30,      // Cola de 30 operaciones
            45000    // Timeout de 45 segundos
        ));

        // Pool para operaciones estándar (reservas, consultas)
        this.pools.set('STANDARD', new BulkheadPool(
            'STANDARD',
            25,      // 25 operaciones concurrentes
            100,     // Cola de 100 operaciones
            30000    // Timeout de 30 segundos
        ));

        // Pool para operaciones de baja prioridad (reportes, estadísticas)
        this.pools.set('LOW_PRIORITY', new BulkheadPool(
            'LOW_PRIORITY',
            10,      // 10 operaciones concurrentes
            20,      // Cola de 20 operaciones
            15000    // Timeout de 15 segundos
        ));

        // Pool para operaciones administrativas
        this.pools.set('ADMIN', new BulkheadPool(
            'ADMIN',
            8,       // 8 operaciones concurrentes
            15,      // Cola de 15 operaciones
            20000    // Timeout de 20 segundos
        ));

        // Pool para autenticación (separado para aislar problemas de auth)
        this.pools.set('AUTHENTICATION', new BulkheadPool(
            'AUTHENTICATION',
            30,      // 30 operaciones concurrentes (alta demanda)
            50,      // Cola de 50 operaciones
            10000    // Timeout de 10 segundos (rápido)
        ));

        console.log('[BULKHEAD] Pools hospitalarios inicializados:', Array.from(this.pools.keys()));
    }

    /**
     * Ejecuta operación en el pool apropiado según el contexto hospitalario
     */
    async executeInPool(poolName, operation, context = {}) {
        const pool = this.pools.get(poolName);
        
        if (!pool) {
            throw new Error(`Pool no encontrado: ${poolName}`);
        }

        try {
            const result = await pool.execute(operation, context);
            
            // Log para operaciones críticas
            if (poolName === 'EMERGENCY' || poolName === 'CRITICAL') {
                console.log(`[BULKHEAD_${poolName}] Operación ejecutada:`, {
                    pool: poolName,
                    context: context.operation || 'unknown',
                    activeRequests: pool.activeRequests,
                    queueLength: pool.queue.length
                });
            }
            
            return result;
            
        } catch (error) {
            if (error instanceof BulkheadRejectionError) {
                console.warn(`[BULKHEAD_REJECTION] Pool ${poolName}:`, {
                    reason: error.reason,
                    context: context.operation || 'unknown',
                    metrics: pool.getMetrics()
                });
            }
            throw error;
        }
    }

    /**
     * Métodos convenientes para tipos específicos de operaciones hospitalarias
     */

    // Operaciones de emergencia
    async executeEmergency(operation, context = {}) {
        return this.executeInPool('EMERGENCY', operation, { 
            ...context, 
            priority: 'emergency',
            type: 'medical_emergency'
        });
    }

    // Operaciones críticas (quirófanos, UCI)
    async executeCritical(operation, context = {}) {
        return this.executeInPool('CRITICAL', operation, { 
            ...context, 
            priority: 'critical',
            type: 'critical_care'
        });
    }

    // Operaciones estándar
    async executeStandard(operation, context = {}) {
        return this.executeInPool('STANDARD', operation, { 
            ...context, 
            priority: 'standard'
        });
    }

    // Operaciones de baja prioridad
    async executeLowPriority(operation, context = {}) {
        return this.executeInPool('LOW_PRIORITY', operation, { 
            ...context, 
            priority: 'low'
        });
    }

    // Operaciones administrativas
    async executeAdmin(operation, context = {}) {
        return this.executeInPool('ADMIN', operation, { 
            ...context, 
            priority: 'admin'
        });
    }

    // Operaciones de autenticación
    async executeAuth(operation, context = {}) {
        return this.executeInPool('AUTHENTICATION', operation, { 
            ...context, 
            priority: 'auth'
        });
    }

    /**
     * Obtiene métricas de todos los pools
     */
    getAllMetrics() {
        const metrics = {};
        
        for (const [poolName, pool] of this.pools) {
            metrics[poolName] = pool.getMetrics();
        }
        
        return {
            pools: metrics,
            totalActiveRequests: Array.from(this.pools.values())
                .reduce((total, pool) => total + pool.activeRequests, 0),
            totalQueuedRequests: Array.from(this.pools.values())
                .reduce((total, pool) => total + pool.queue.length, 0),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reinicia métricas de todos los pools
     */
    resetAllMetrics() {
        for (const pool of this.pools.values()) {
            pool.resetMetrics();
        }
    }

    /**
     * Obtiene estado de salud de todos los pools
     */
    getHealthStatus() {
        const status = {};
        
        for (const [poolName, pool] of this.pools) {
            const metrics = pool.getMetrics();
            
            status[poolName] = {
                healthy: metrics.utilizationPercent < 90 && metrics.queueUtilizationPercent < 80,
                utilization: metrics.utilizationPercent,
                queueUtilization: metrics.queueUtilizationPercent,
                activeRequests: pool.activeRequests,
                queueLength: pool.queue.length,
                successRate: metrics.totalRequests > 0 ? 
                    (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
            };
        }
        
        return status;
    }
}

module.exports = {
    HospitalBulkheadManager,
    BulkheadPool,
    BulkheadRejectionError
};
