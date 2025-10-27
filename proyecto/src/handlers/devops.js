/**
 * DevOps Automation Handler
 * Integra funcionalidades de la carpeta devops/ como funciones Lambda
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const dynamodb = new DynamoDBClient({ region: process.env.REGION });
const cloudwatch = new CloudWatchClient({ region: process.env.REGION });
const sns = new SNSClient({ region: process.env.REGION });

/**
 * DevOps Automation Function
 * Ejecuta tareas automatizadas de DevOps como monitoreo, alertas, y mantenimiento
 */
exports.automation = async (event, context) => {
  console.log('DevOps Automation triggered:', JSON.stringify(event, null, 2));
  
  try {
    const tasks = [];
    
    // 1. Health Check de servicios críticos
    tasks.push(await performHealthChecks());
    
    // 2. Monitoreo de métricas del sistema
    tasks.push(await collectSystemMetrics());
    
    // 3. Verificación de alertas pendientes
    tasks.push(await checkPendingAlerts());
    
    // 4. Limpieza de recursos temporales
    tasks.push(await cleanupTempResources());
    
    // 5. Backup de estado crítico
    tasks.push(await backupCriticalState());
    
    const results = await Promise.allSettled(tasks);
    
    // Compilar reporte de ejecución
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tasksExecuted: results.length,
      successfulTasks: results.filter(r => r.status === 'fulfilled').length,
      failedTasks: results.filter(r => r.status === 'rejected').length,
      details: results.map((result, index) => ({
        task: getTaskName(index),
        status: result.status,
        result: result.status === 'fulfilled' ? result.value : result.reason?.message
      }))
    };
    
    // Enviar reporte vía SNS si hay fallos
    if (report.failedTasks > 0) {
      await sendAlertToOps(report);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'DevOps automation completed',
        report
      })
    };
    
  } catch (error) {
    console.error('DevOps automation failed:', error);
    
    // Enviar alerta crítica
    await sendCriticalAlert(error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'DevOps automation failed',
        error: error.message
      })
    };
  }
};

/**
 * Realizar verificaciones de salud de servicios críticos
 */
async function performHealthChecks() {
  const checks = [
    checkDatabaseHealth(),
    checkApiHealth(),
    checkWebSocketHealth(),
    checkQueueHealth()
  ];
  
  const results = await Promise.allSettled(checks);
  
  // Publicar métricas de salud
  const healthMetrics = results.map((result, index) => ({
    MetricName: `HealthCheck_${getServiceName(index)}`,
    Value: result.status === 'fulfilled' ? 1 : 0,
    Unit: 'Count',
    Timestamp: new Date()
  }));
  
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'DevOps/HealthChecks',
    MetricData: healthMetrics
  }));
  
  return {
    task: 'health_checks',
    checks: results.length,
    healthy: results.filter(r => r.status === 'fulfilled').length
  };
}

/**
 * Recopilar métricas del sistema
 */
async function collectSystemMetrics() {
  const metrics = [
    {
      MetricName: 'AutomationRun',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date()
    },
    {
      MetricName: 'SystemLoad',
      Value: Math.random() * 100, // En producción, obtener load real
      Unit: 'Percent',
      Timestamp: new Date()
    }
  ];
  
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'DevOps/System',
    MetricData: metrics
  }));
  
  return {
    task: 'system_metrics',
    metricsPublished: metrics.length
  };
}

/**
 * Verificar alertas pendientes
 */
async function checkPendingAlerts() {
  // En producción, consultar tabla de alertas o sistema de monitoreo
  return {
    task: 'pending_alerts',
    pendingCount: 0
  };
}

/**
 * Limpiar recursos temporales
 */
async function cleanupTempResources() {
  // Implementar limpieza de logs antiguos, conexiones WebSocket caducadas, etc.
  return {
    task: 'cleanup',
    resourcesCleaned: 0
  };
}

/**
 * Backup de estado crítico
 */
async function backupCriticalState() {
  // Implementar backup de configuraciones críticas
  return {
    task: 'backup',
    backupSize: '0MB'
  };
}

/**
 * Verificaciones de salud específicas
 */
async function checkDatabaseHealth() {
  // Implementar verificación de DynamoDB
  return { service: 'database', status: 'healthy' };
}

async function checkApiHealth() {
  // Implementar verificación de API Gateway
  return { service: 'api', status: 'healthy' };
}

async function checkWebSocketHealth() {
  // Implementar verificación de WebSocket API
  return { service: 'websocket', status: 'healthy' };
}

async function checkQueueHealth() {
  // Implementar verificación de SQS
  return { service: 'queue', status: 'healthy' };
}

/**
 * Enviar alerta a equipo de operaciones
 */
async function sendAlertToOps(report) {
  const message = {
    alert: 'DevOps Automation Issues Detected',
    environment: process.env.NODE_ENV,
    failedTasks: report.failedTasks,
    details: report.details.filter(d => d.status === 'rejected'),
    timestamp: report.timestamp
  };
  
  await sns.send(new PublishCommand({
    TopicArn: process.env.SYSTEM_ALERTS_TOPIC,
    Message: JSON.stringify(message, null, 2),
    Subject: `[${process.env.NODE_ENV.toUpperCase()}] DevOps Automation Alert`
  }));
}

/**
 * Enviar alerta crítica
 */
async function sendCriticalAlert(error) {
  const message = {
    alert: 'CRITICAL: DevOps Automation Failed',
    environment: process.env.NODE_ENV,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  await sns.send(new PublishCommand({
    TopicArn: process.env.SYSTEM_ALERTS_TOPIC,
    Message: JSON.stringify(message, null, 2),
    Subject: `[CRITICAL] [${process.env.NODE_ENV.toUpperCase()}] DevOps Automation Failed`
  }));
}

/**
 * Utilidades
 */
function getTaskName(index) {
  const tasks = ['health_checks', 'system_metrics', 'pending_alerts', 'cleanup', 'backup'];
  return tasks[index] || `task_${index}`;
}

function getServiceName(index) {
  const services = ['Database', 'API', 'WebSocket', 'Queue'];
  return services[index] || `Service_${index}`;
}