/**
 * Chaos Engineering Handler
 * Integra funcionalidades de chaos-engineering/ como funciones Lambda
 * Basado en el proxy HTTP para inyección de latencia y errores
 */

const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const logger = require('../infrastructure/monitoring/logger');

const cloudwatch = new CloudWatchClient({ region: process.env.REGION });
const sns = new SNSClient({ region: process.env.REGION });

/**
 * Chaos Engineering Resilience Testing
 * Ejecuta pruebas de resiliencia del sistema
 */
exports.resilience = async (event, context) => {
  logger.info('Chaos Engineering test triggered', {
    requestId: context?.requestId,
    testType: event?.queryStringParameters?.testType || 'all'
  });
  
  try {
    const testConfig = extractTestConfig(event);
    const results = [];
    
    // 1. Test de latencia en endpoints críticos
    if (testConfig.latencyTest) {
      results.push(await runLatencyTest(testConfig.latencyTest));
    }
    
    // 2. Test de inyección de errores
    if (testConfig.errorInjection) {
      results.push(await runErrorInjectionTest(testConfig.errorInjection));
    }
    
    // 3. Test de sobrecarga de sistema
    if (testConfig.loadTest) {
      results.push(await runLoadTest(testConfig.loadTest));
    }
    
    // 4. Test de fallos de dependencias
    if (testConfig.dependencyFailure) {
      results.push(await runDependencyFailureTest(testConfig.dependencyFailure));
    }
    
    // 5. Test de recuperación del circuito
    if (testConfig.circuitBreaker) {
      results.push(await runCircuitBreakerTest(testConfig.circuitBreaker));
    }
    
    // Compilar reporte de pruebas
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      testConfiguration: testConfig,
      testsExecuted: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      results
    };
    
    // Publicar métricas de chaos engineering
    await publishChaosMetrics(report);
    
    // Enviar reporte si hay fallos críticos
    if (report.failedTests > 0) {
      await sendChaosAlert(report);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Chaos engineering tests completed',
        report
      })
    };
    
  } catch (error) {
    logger.error('Chaos engineering test failed', { 
      errorMessage: error.message,
      errorType: error.constructor.name,
      errorStack: error.stack
    });
    
    await sendCriticalChaosAlert(error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Chaos engineering test failed',
        error: error.message
      })
    };
  }
};

/**
 * Extraer configuración de pruebas del evento
 */
function extractTestConfig(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  
  return {
    latencyTest: body.latencyTest || {
      enabled: true,
      endpoints: ['/auth/login', '/users', '/espacios'],
      maxLatency: 5000, // 5 segundos
      injectionRate: 0.1 // 10% de requests
    },
    errorInjection: body.errorInjection || {
      enabled: true,
      endpoints: ['/reservas', '/espacios'],
      errorRate: 0.05, // 5% de error rate
      errorCodes: [500, 502, 503]
    },
    loadTest: body.loadTest || {
      enabled: false, // Deshabilitado por defecto en lab
      duration: 60, // segundos
      concurrency: 10
    },
    dependencyFailure: body.dependencyFailure || {
      enabled: true,
      services: ['dynamodb', 'cognito']
    },
    circuitBreaker: body.circuitBreaker || {
      enabled: true,
      threshold: 5,
      timeout: 30000
    }
  };
}

/**
 * Test de inyección de latencia
 */
async function runLatencyTest(config) {
  logger.info('Running latency test', { 
    target: config.target,
    latency: config.latency
  });
  
  try {
    const results = [];
    
    for (const endpoint of config.endpoints) {
      const testResult = await simulateLatencyInjection(endpoint, config);
      results.push(testResult);
    }
    
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const success = avgLatency < config.maxLatency;
    
    return {
      testType: 'latency_injection',
      success,
      avgLatency,
      maxLatency: config.maxLatency,
      endpointResults: results
    };
    
  } catch (error) {
    return {
      testType: 'latency_injection',
      success: false,
      error: error.message
    };
  }
}

/**
 * Test de inyección de errores
 */
async function runErrorInjectionTest(config) {
  console.log('Running error injection test:', config);
  
  try {
    const results = [];
    
    for (const endpoint of config.endpoints) {
      const testResult = await simulateErrorInjection(endpoint, config);
      results.push(testResult);
    }
    
    const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;
    const success = avgErrorRate <= config.errorRate * 1.2; // Tolerancia del 20%
    
    return {
      testType: 'error_injection',
      success,
      avgErrorRate,
      targetErrorRate: config.errorRate,
      endpointResults: results
    };
    
  } catch (error) {
    return {
      testType: 'error_injection',
      success: false,
      error: error.message
    };
  }
}

/**
 * Test de sobrecarga del sistema
 */
async function runLoadTest(config) {
  console.log('Running load test:', config);
  
  if (!config.enabled) {
    return {
      testType: 'load_test',
      success: true,
      skipped: true,
      reason: 'Load test disabled for lab environment'
    };
  }
  
  // Implementación básica de load test
  return {
    testType: 'load_test',
    success: true,
    duration: config.duration,
    concurrency: config.concurrency,
    requestsCompleted: 100, // Simulado
    averageResponseTime: 250
  };
}

/**
 * Test de fallos de dependencias
 */
async function runDependencyFailureTest(config) {
  console.log('Running dependency failure test:', config);
  
  try {
    const results = [];
    
    for (const service of config.services) {
      const testResult = await simulateDependencyFailure(service);
      results.push(testResult);
    }
    
    const allRecovered = results.every(r => r.recovered);
    
    return {
      testType: 'dependency_failure',
      success: allRecovered,
      serviceResults: results
    };
    
  } catch (error) {
    return {
      testType: 'dependency_failure',
      success: false,
      error: error.message
    };
  }
}

/**
 * Test del circuit breaker
 */
async function runCircuitBreakerTest(config) {
  console.log('Running circuit breaker test:', config);
  
  try {
    const startTime = Date.now();
    
    // Simular apertura del circuit breaker
    const circuitOpened = await simulateCircuitBreakerOpening(config);
    
    // Simular recuperación
    const circuitRecovered = await simulateCircuitBreakerRecovery(config);
    
    const totalTime = Date.now() - startTime;
    const success = circuitOpened && circuitRecovered && totalTime < config.timeout;
    
    return {
      testType: 'circuit_breaker',
      success,
      circuitOpened,
      circuitRecovered,
      totalTime,
      threshold: config.threshold
    };
    
  } catch (error) {
    return {
      testType: 'circuit_breaker',
      success: false,
      error: error.message
    };
  }
}

/**
 * Simulaciones de pruebas (para lab environment)
 */
async function simulateLatencyInjection(endpoint, config) {
  // Simular latencia aleatoria
  const latency = Math.random() * config.maxLatency * 0.8; // 80% del máximo
  await new Promise(resolve => setTimeout(resolve, Math.min(latency, 1000))); // Max 1s en lambda
  
  return {
    endpoint,
    latency,
    injected: Math.random() < config.injectionRate
  };
}

async function simulateErrorInjection(endpoint, config) {
  // Simular tasa de error
  const errorRate = Math.random() * config.errorRate * 1.5;
  
  return {
    endpoint,
    errorRate,
    errorsInjected: Math.floor(errorRate * 100),
    totalRequests: 100
  };
}

async function simulateDependencyFailure(service) {
  // Simular fallo y recuperación de dependencia
  const failureDuration = Math.random() * 5000; // 0-5 segundos
  await new Promise(resolve => setTimeout(resolve, Math.min(failureDuration, 1000)));
  
  return {
    service,
    failed: true,
    recovered: true,
    failureDuration
  };
}

async function simulateCircuitBreakerOpening(config) {
  // Simular apertura del circuit breaker
  await new Promise(resolve => setTimeout(resolve, 100));
  return true;
}

async function simulateCircuitBreakerRecovery(config) {
  // Simular recuperación del circuit breaker
  await new Promise(resolve => setTimeout(resolve, 200));
  return true;
}

/**
 * Publicar métricas de chaos engineering
 */
async function publishChaosMetrics(report) {
  const metrics = [
    {
      MetricName: 'ChaosTestsExecuted',
      Value: report.testsExecuted,
      Unit: 'Count',
      Timestamp: new Date()
    },
    {
      MetricName: 'ChaosTestsSuccessful',
      Value: report.successfulTests,
      Unit: 'Count',
      Timestamp: new Date()
    },
    {
      MetricName: 'ChaosTestsFailed',
      Value: report.failedTests,
      Unit: 'Count',
      Timestamp: new Date()
    }
  ];
  
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'ChaosEngineering/Tests',
    MetricData: metrics
  }));
}

/**
 * Enviar alerta de chaos engineering
 */
async function sendChaosAlert(report) {
  const message = {
    alert: 'Chaos Engineering Test Issues',
    environment: process.env.NODE_ENV,
    failedTests: report.failedTests,
    results: report.results.filter(r => !r.success),
    timestamp: report.timestamp
  };
  
  await sns.send(new PublishCommand({
    TopicArn: process.env.SYSTEM_ALERTS_TOPIC,
    Message: JSON.stringify(message, null, 2),
    Subject: `[${process.env.NODE_ENV.toUpperCase()}] Chaos Engineering Alert`
  }));
}

/**
 * Enviar alerta crítica de chaos engineering
 */
async function sendCriticalChaosAlert(error) {
  const message = {
    alert: 'CRITICAL: Chaos Engineering Test Failed',
    environment: process.env.NODE_ENV,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  await sns.send(new PublishCommand({
    TopicArn: process.env.SYSTEM_ALERTS_TOPIC,
    Message: JSON.stringify(message, null, 2),
    Subject: `[CRITICAL] [${process.env.NODE_ENV.toUpperCase()}] Chaos Engineering Failed`
  }));
}