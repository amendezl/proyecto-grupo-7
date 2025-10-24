class BulkheadPool {
    constructor(name, maxConcurrency, queueSize = 100, timeoutMs = 30000) {
        this.name = name;
        this.maxConcurrency = maxConcurrency;
        this.queueSize = queueSize;
        this.timeoutMs = timeoutMs;
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
        
        this.requestTimeouts = new Map();
    }

    async execute(operation, context = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        this.metrics.totalRequests++;
        
        try {

            if (this.activeRequests >= this.maxConcurrency) {
                return await this._queueRequest(operation, context, requestId, startTime);
            }
            
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

    async _executeImmediate(operation, context, requestId, startTime) {
        this.activeRequests++;
        
        try {

            const timeoutPromise = new Promise((_, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Bulkhead timeout: ${this.name} operation exceeded ${this.timeoutMs}ms`));
                }, this.timeoutMs);
                
                this.requestTimeouts.set(requestId, timeoutId);
            });
            
            const result = await Promise.race([
                operation(),
                timeoutPromise
            ]);
            
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

    async _queueRequest(operation, context, requestId, startTime) {

        if (this.queue.length >= this.queueSize) {
            this.metrics.maxQueueSizeReached++;
                const err = new BulkheadRejectionError(
                    `Bulkhead ${this.name} queue full: ${this.queue.length}/${this.queueSize}`,
                    this.name,
                    'QUEUE_FULL'
                );
                try { require('../../infrastructure/monitoring/metrics').putMetric('BulkheadRejection', 1, 'Count', [{ Name: 'Pool', Value: this.name }]); } catch (e) {}
                throw err;
        }
        
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
            
            setTimeout(() => {
                if (this.queue.includes(queueItem)) {
                    this._removeFromQueue(queueItem);
                    reject(new Error(`Bulkhead queue timeout: ${this.name} request queued too long`));
                }
            }, this.timeoutMs);
        });
    }

    _processQueue() {
        while (this.queue.length > 0 && this.activeRequests < this.maxConcurrency) {
            const queueItem = this.queue.shift();
            
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

    _removeFromQueue(itemToRemove) {
        const index = this.queue.indexOf(itemToRemove);
        if (index > -1) {
            this.queue.splice(index, 1);
        }
    }

    _clearTimeout(requestId) {
        const timeoutId = this.requestTimeouts.get(requestId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.requestTimeouts.delete(requestId);
        }
    }

    _updateAverageExecutionTime(startTime) {
        const executionTime = Date.now() - startTime;
        this.metrics.averageExecutionTime = 
            (this.metrics.averageExecutionTime + executionTime) / 2;
    }

    _generateRequestId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getMetrics() {
        return {
            ...this.metrics,
            activeRequests: this.activeRequests,
            queueLength: this.queue.length,
            utilizationPercent: (this.activeRequests / this.maxConcurrency) * 100,
            queueUtilizationPercent: (this.queue.length / this.queueSize) * 100
        };
    }

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

class BulkheadRejectionError extends Error {
    constructor(message, poolName, reason) {
        super(message);
        this.name = 'BulkheadRejectionError';
        this.poolName = poolName;
        this.reason = reason;
        this.timestamp = new Date().toISOString();
    }
}

class SpaceBulkheadManager {
    constructor() {
        this.pools = new Map();
        this.initializeSpacePools();
    }

    initializeSpacePools() {

        this.pools.set('HIGH_PRIORITY', new BulkheadPool(
            'HIGH_PRIORITY',
            20,
            50,
            60000
        ));

        this.pools.set('CRITICAL', new BulkheadPool(
            'CRITICAL',
            15,
            30,
            45000
        ));

        this.pools.set('STANDARD', new BulkheadPool(
            'STANDARD',
            25,
            100,
            30000
        ));

        this.pools.set('LOW_PRIORITY', new BulkheadPool(
            'LOW_PRIORITY',
            10,
            20,
            15000
        ));

        this.pools.set('ADMIN', new BulkheadPool(
            'ADMIN',
            8,
            15,
            20000
        ));

        this.pools.set('AUTHENTICATION', new BulkheadPool(
            'AUTHENTICATION',
            30,
            50,
            10000
        ));

        console.log('[BULKHEAD] Pools de gestión de espacios inicializados:', Array.from(this.pools.keys()));
    }

    async executeInPool(poolName, operation, context = {}) {
        const pool = this.pools.get(poolName);
        
        if (!pool) {
            throw new Error(`Pool no encontrado: ${poolName}`);
        }

        try {
            const result = await pool.execute(operation, context);
            
            if (poolName === 'HIGH_PRIORITY' || poolName === 'CRITICAL') {
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

    async executeHighPriority(operation, context = {}) {
        return this.executeInPool('HIGH_PRIORITY', operation, { 
            ...context, 
            priority: 'high',
            type: 'business_critical'
        });
    }

    async executeCritical(operation, context = {}) {
        return this.executeInPool('CRITICAL', operation, { 
            ...context, 
            priority: 'critical',
            type: 'critical_business'
        });
    }

    async executeStandard(operation, context = {}) {
        return this.executeInPool('STANDARD', operation, { 
            ...context, 
            priority: 'standard'
        });
    }

    async executeLowPriority(operation, context = {}) {
        return this.executeInPool('LOW_PRIORITY', operation, { 
            ...context, 
            priority: 'low'
        });
    }

    async executeAdmin(operation, context = {}) {
        return this.executeInPool('ADMIN', operation, { 
            ...context, 
            priority: 'admin'
        });
    }

    async executeAuth(operation, context = {}) {
        return this.executeInPool('AUTHENTICATION', operation, { 
            ...context, 
            priority: 'auth'
        });
    }

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

    resetAllMetrics() {
        for (const pool of this.pools.values()) {
            pool.resetMetrics();
        }
    }

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
    SpaceBulkheadManager,
    BulkheadPool,
    BulkheadRejectionError
};
