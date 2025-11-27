const { circuitRegistry } = require('../../shared/patterns/circuitBreakerPattern');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { response } = require('../../infrastructure/http/response');
const { logger } = require('../../infrastructure/monitoring/logger');

/**
 * 
 * Endpoint para monitorear el estado de todos los circuit breakers del sistema.
 * Proporciona visibilidad en tiempo real de la salud y resiliencia del sistema.
 * 
 * GET /system/circuit-status
 * 
 * Respuesta:
 * {
 *   ok: true,
 *   summary: {
 *     totalCircuits: 5,
 *     openCircuits: 1,
 *     halfOpenCircuits: 0,
 *     closedCircuits: 4,
 *     unhealthyCircuits: 1
 *   },
 *   circuits: { ... },
 *   resilienceMetrics: { ... },
 *   systemHealth: 85,
 *   timestamp: "2025-11-07T..."
 * }
 */
module.exports.handler = async (event) => {
  try {
    logger.info('[CIRCUIT_STATUS] Fetching circuit breaker status');
    
    // Obtener estadísticas de todos los circuit breakers
    const allStats = circuitRegistry.getAllStats();
    
    // Calcular resumen
    const circuitValues = Object.values(allStats);
    const summary = {
      totalCircuits: circuitValues.length,
      openCircuits: circuitValues.filter(c => c.currentState === 'OPEN').length,
      halfOpenCircuits: circuitValues.filter(c => c.currentState === 'HALF_OPEN').length,
      closedCircuits: circuitValues.filter(c => c.currentState === 'CLOSED').length,
      unhealthyCircuits: circuitValues.filter(c => c.healthScore < 70).length,
      degradedCircuits: circuitValues.filter(c => c.healthScore >= 70 && c.healthScore < 85).length,
      healthyCircuits: circuitValues.filter(c => c.healthScore >= 85).length
    };
    
    // Identificar circuitos críticos (abiertos o con salud baja)
    const criticalCircuits = circuitValues
      .filter(c => c.currentState === 'OPEN' || c.healthScore < 50)
      .map(c => ({
        serviceName: c.serviceName,
        state: c.currentState,
        healthScore: c.healthScore,
        failureCount: c.failureCount,
        lastFailureTime: c.lastFailureTime 
          ? new Date(c.lastFailureTime).toISOString() 
          : null
      }));
    
    // Obtener métricas del resilience manager
    const resilienceMetrics = resilienceManager.getCompleteSystemMetrics();
    
    // Calcular salud general del sistema
    const systemHealth = calculateSystemHealth(summary, resilienceMetrics);
    
    // Recomendaciones basadas en el estado
    const recommendations = generateRecommendations(summary, criticalCircuits, resilienceMetrics);
    
    return response(200, {
      ok: true,
      summary,
      criticalCircuits,
      circuits: allStats,
      resilienceMetrics: {
        totalOperations: resilienceMetrics.resilience.totalOperations,
        successRate: resilienceMetrics.resilience.successRate.toFixed(2) + '%',
        failureRate: resilienceMetrics.resilience.failureRate.toFixed(2) + '%',
        averageResponseTime: Math.round(resilienceMetrics.resilience.averageResponseTime) + 'ms',
        bulkheadHealth: resilienceMetrics.bulkhead.poolsSummary
      },
      systemHealth: {
        score: systemHealth,
        status: getHealthStatus(systemHealth),
        combinedScore: resilienceMetrics.combinedHealthScore
      },
      recommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('[CIRCUIT_STATUS] Error fetching status', { 
      errorMessage: error.message,
      errorStack: error.stack 
    });
    
    return response(500, { 
      ok: false, 
      error: 'Error al obtener estado de circuit breakers',
      details: error.message 
    });
  }
};

/**
 * Calcula la salud general del sistema basado en métricas
 */
function calculateSystemHealth(summary, resilienceMetrics) {
  if (summary.totalCircuits === 0) {
    return 100; // Sin circuitos = sistema saludable por defecto
  }
  
  // Penalizaciones por circuitos problemáticos
  let healthScore = 100;
  
  // Circuitos abiertos: -20 puntos cada uno
  healthScore -= summary.openCircuits * 20;
  
  // Circuitos degradados: -5 puntos cada uno
  healthScore -= summary.degradedCircuits * 5;
  
  // Circuitos en mal estado: -10 puntos cada uno
  healthScore -= summary.unhealthyCircuits * 10;
  
  // Bonus por circuitos saludables
  const healthyRatio = summary.healthyCircuits / summary.totalCircuits;
  healthScore += healthyRatio * 10;
  
  // Considerar métricas de resiliencia
  if (resilienceMetrics.resilience.failureRate > 10) {
    healthScore -= 15; // Alta tasa de fallos
  }
  
  // Limitar entre 0 y 100
  return Math.max(0, Math.min(100, Math.round(healthScore)));
}

/**
 * Determina el estado de salud basado en el score
 */
function getHealthStatus(score) {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'FAIR';
  if (score >= 40) return 'POOR';
  return 'CRITICAL';
}

/**
 * Genera recomendaciones basadas en el estado del sistema
 */
function generateRecommendations(summary, criticalCircuits, resilienceMetrics) {
  const recommendations = [];
  
  if (summary.openCircuits > 0) {
    recommendations.push({
      severity: 'HIGH',
      category: 'CIRCUIT_BREAKER',
      message: `${summary.openCircuits} circuit breaker(s) abierto(s). Revisar servicios: ${criticalCircuits.map(c => c.serviceName).join(', ')}`,
      action: 'Investigar causa raíz de fallos y verificar disponibilidad de servicios externos'
    });
  }
  
  if (summary.unhealthyCircuits > summary.totalCircuits * 0.3) {
    recommendations.push({
      severity: 'MEDIUM',
      category: 'HEALTH',
      message: `${summary.unhealthyCircuits} circuitos con salud baja (>30% del total)`,
      action: 'Revisar logs y métricas de servicios degradados'
    });
  }
  
  if (resilienceMetrics.resilience.failureRate > 15) {
    recommendations.push({
      severity: 'HIGH',
      category: 'RESILIENCE',
      message: `Alta tasa de fallos: ${resilienceMetrics.resilience.failureRate.toFixed(1)}%`,
      action: 'Verificar infraestructura y considerar aumentar timeouts/retries'
    });
  }
  
  const bulkheadSummary = resilienceMetrics.bulkhead.poolsSummary;
  if (bulkheadSummary.healthyPools < bulkheadSummary.totalPools * 0.7) {
    recommendations.push({
      severity: 'MEDIUM',
      category: 'BULKHEAD',
      message: 'Múltiples bulkhead pools con alta utilización',
      action: 'Considerar aumentar límites de concurrencia o agregar capacidad'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'INFO',
      category: 'SYSTEM',
      message: 'Sistema operando normalmente',
      action: 'Continuar monitoreo regular'
    });
  }
  
  return recommendations;
}
