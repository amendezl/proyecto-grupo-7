const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { withSecureAuth, withErrorHandling } = require('../../core/auth/auth');
const { success } = require('../../shared/utils/responses');
const getResilienceHealth = withErrorHandling(async (event) => {
    const metrics = resilienceManager.getSystemMetrics();
    
    return success({
        status: 'healthy',
        patterns: ['retry', 'circuit-breaker'],
        ...metrics
    });
});

const getCompleteResilienceHealth = withErrorHandling(async (event) => {
    const completeMetrics = resilienceManager.getCompleteSystemMetrics();
    
    return success({
        status: completeMetrics.combinedHealthScore > 80 ? 'healthy' : 'degraded',
        patterns: ['retry', 'circuit-breaker', 'bulkhead'],
        ...completeMetrics
    });
});

const getBulkheadStatus = withSecureAuth(async (event) => {
    const bulkheadMetrics = resilienceManager.bulkheadManager.getAllMetrics();
    const bulkheadHealth = resilienceManager.bulkheadManager.getHealthStatus();
    
    return success({
        poolsMetrics: bulkheadMetrics,
        healthStatus: bulkheadHealth,
        summary: {
            totalPools: Object.keys(bulkheadMetrics.pools).length,
            healthyPools: Object.values(bulkheadHealth).filter(pool => pool.healthy).length,
            totalActiveRequests: bulkheadMetrics.totalActiveRequests,
            totalQueuedRequests: bulkheadMetrics.totalQueuedRequests,
            overallHealthy: Object.values(bulkheadHealth).every(pool => pool.healthy)
        },
        timestamp: new Date().toISOString()
    });
}, ['admin', 'responsable']);

const resetResilienceMetrics = withSecureAuth(async (event) => {
    resilienceManager.resetMetrics();
    
    return success({
        message: 'Métricas de resiliencia reiniciadas',
        patterns: ['retry', 'circuit-breaker', 'bulkhead'],
        timestamp: new Date().toISOString()
    });
}, ['admin']);

const getResilienceConfiguration = withSecureAuth(async (event) => {
    const { RESILIENCE_CONFIGS } = require('../../shared/utils/resilienceManager');
    
    const bulkheadMetrics = resilienceManager.bulkheadManager.getAllMetrics();
    
    return success({
        resilienceConfigs: RESILIENCE_CONFIGS,
        bulkheadPools: {
            HIGH_PRIORITY: { maxConcurrency: 20, queueSize: 50, timeoutMs: 60000 },
            CRITICAL: { maxConcurrency: 15, queueSize: 30, timeoutMs: 45000 },
            STANDARD: { maxConcurrency: 25, queueSize: 100, timeoutMs: 30000 },
            LOW_PRIORITY: { maxConcurrency: 10, queueSize: 20, timeoutMs: 15000 },
            ADMIN: { maxConcurrency: 8, queueSize: 15, timeoutMs: 20000 },
            AUTHENTICATION: { maxConcurrency: 30, queueSize: 50, timeoutMs: 10000 }
        },
        currentUtilization: bulkheadMetrics.pools,
        timestamp: new Date().toISOString()
    });
}, ['admin', 'responsable']);

module.exports = {
    getResilienceHealth,
    getCompleteResilienceHealth,
    getBulkheadStatus,
    resetResilienceMetrics,
    getResilienceConfiguration
};
