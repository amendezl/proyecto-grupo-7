/**
 * Handler para monitoreo de salud del sistema de resiliencia
 * Proporciona métricas completas de Retry + Circuit Breaker + Bulkhead
 */

const { resilienceManager } = require('../utils/resilienceManager');
const { withAuth, withErrorHandling } = require('../utils/auth');
const { success } = require('../utils/responses');

/**
 * Obtiene métricas básicas del sistema de resiliencia
 */
const getResilienceHealth = withErrorHandling(async (event) => {
    const metrics = resilienceManager.getSystemMetrics();
    
    return success({
        status: 'healthy',
        patterns: ['retry', 'circuit-breaker'],
        ...metrics
    });
});

/**
 * Obtiene métricas completas incluyendo Bulkhead
 */
const getCompleteResilienceHealth = withErrorHandling(async (event) => {
    const completeMetrics = resilienceManager.getCompleteSystemMetrics();
    
    return success({
        status: completeMetrics.combinedHealthScore > 80 ? 'healthy' : 'degraded',
        patterns: ['retry', 'circuit-breaker', 'bulkhead'],
        ...completeMetrics
    });
});

/**
 * Obtiene estado detallado de los pools de Bulkhead
 */
const getBulkheadStatus = withAuth(async (event) => {
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

/**
 * Reinicia todas las métricas del sistema
 */
const resetResilienceMetrics = withAuth(async (event) => {
    resilienceManager.resetMetrics();
    
    return success({
        message: 'Métricas de resiliencia reiniciadas',
        patterns: ['retry', 'circuit-breaker', 'bulkhead'],
        timestamp: new Date().toISOString()
    });
}, ['admin']);

/**
 * Prueba los patrones de resiliencia con operaciones simuladas
 */
const testResiliencePatterns = withAuth(async (event) => {
    const testResults = {
        patterns: [],
        results: {},
        timestamp: new Date().toISOString()
    };
    
    try {
        // Test Bulkhead High Priority Pool
        testResults.patterns.push('bulkhead-high-priority');
        const highPriorityResult = await resilienceManager.executeHighPriority(
            async () => ({ test: 'high_priority', success: true }),
            { operation: 'test_high_priority_pool' }
        );
        testResults.results.highPriorityPool = { success: true, data: highPriorityResult };
        
        // Test Bulkhead Critical Pool
        testResults.patterns.push('bulkhead-critical');
        const criticalResult = await resilienceManager.executeCriticalBusiness(
            async () => ({ test: 'critical', success: true }),
            { operation: 'test_critical_pool' }
        );
        testResults.results.criticalPool = { success: true, data: criticalResult };
        
        // Test Bulkhead Auth Pool
        testResults.patterns.push('bulkhead-auth');
        const authResult = await resilienceManager.executeAuthWithBulkhead(
            async () => ({ test: 'auth', success: true }),
            { operation: 'test_auth_pool' }
        );
        testResults.results.authPool = { success: true, data: authResult };
        
        // Test Combined Resilience (Retry + Circuit Breaker + Bulkhead)
        testResults.patterns.push('combined-resilience');
        const combinedResult = await resilienceManager.executeDatabase(
            async () => ({ test: 'database', success: true }),
            { operation: 'test_combined_resilience' }
        );
        testResults.results.combinedResilience = { success: true, data: combinedResult };
        
    } catch (error) {
        testResults.results.error = {
            message: error.message,
            name: error.name,
            timestamp: new Date().toISOString()
        };
    }
    
    return success({
        message: 'Pruebas de patrones de resiliencia completadas',
        ...testResults
    });
}, ['admin']);

/**
 * Obtiene configuración actual de los patrones
 */
const getResilienceConfiguration = withAuth(async (event) => {
    const { RESILIENCE_CONFIGS } = require('../utils/resilienceManager');
    
    // Métricas actuales de pools
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
    testResiliencePatterns,
    getResilienceConfiguration
};
