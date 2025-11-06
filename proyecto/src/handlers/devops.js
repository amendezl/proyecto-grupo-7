/**
 * DevOps Automation Handler
 * Integra funcionalidades de la carpeta devops/ como funciones Lambda
 */

const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');

const dynamodb = new DynamoDBClient({ region: process.env.REGION });
const cloudwatch = new CloudWatchClient({ region: process.env.REGION });
const sns = new SNSClient({ region: process.env.REGION });
const sqs = new SQSClient({ region: process.env.REGION });

/**
 * DevOps Automation Function
 * Ejecuta tareas automatizadas de DevOps como monitoreo, alertas, y mantenimiento
 */
async function automation(event, context) {
  console.log('DevOps Automation triggered:', JSON.stringify(event, null, 2));
  
  try {
    const tasks = [
      performHealthChecks(),
      collectSystemMetrics(),
      checkPendingAlerts(),
      cleanupTempResources(),
      backupCriticalState()
    ];
    
    const results = await Promise.allSettled(tasks);
    
    // Compilar reporte de ejecución
    const healthResult = results[0];

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
      })),
      health: healthResult?.status === 'fulfilled' ? healthResult.value : undefined,
      healthError: healthResult?.status === 'rejected' ? healthResult.reason?.message : undefined
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

  const services = results.map((result, index) => {
    const serviceName = getServiceName(index);
    if (result.status === 'fulfilled') {
      return {
        name: serviceName,
        status: 'healthy',
        details: result.value.details
      };
    }

    return {
      name: serviceName,
      status: 'unhealthy',
      error: result.reason?.message || 'Unknown error'
    };
  });

  const metricData = services.map(service => ({
    MetricName: `HealthCheck_${service.name}`,
    Value: service.status === 'healthy' ? 1 : 0,
    Unit: 'Count',
    Timestamp: new Date()
  }));

  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'DevOps/HealthChecks',
    MetricData: metricData
  }));

  return {
    task: 'health_checks',
    summary: {
      total: services.length,
      healthy: services.filter(service => service.status === 'healthy').length
    },
    services
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

async function status() {
  console.log('DevOps status endpoint invoked');
  try {
    const healthReport = await performHealthChecks();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'DevOps status available',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        summary: healthReport.summary,
        services: healthReport.services
      })
    };
  } catch (error) {
    console.error('DevOps status check failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'DevOps status check failed',
        error: error.message
      })
    };
  }
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
  const tableName = process.env.MAIN_TABLE;
  if (!tableName) {
    throw new Error('MAIN_TABLE environment variable is not defined');
  }

  const result = await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
  const table = result.Table;

  if (!table || table.TableStatus !== 'ACTIVE') {
    const status = table?.TableStatus || 'UNKNOWN';
    throw new Error(`DynamoDB table ${tableName} is not active (status: ${status})`);
  }

  return {
    service: 'database',
    status: 'healthy',
    details: {
      tableName,
      itemCount: table.ItemCount ?? 0,
      tableSizeBytes: table.TableSizeBytes ?? 0
    }
  };
}

async function checkApiHealth() {
  const apiBaseUrl = process.env.HTTP_API_URL;
  if (!apiBaseUrl) {
    throw new Error('HTTP_API_URL environment variable is not defined');
  }

  const start = Date.now();
  const response = await fetch(`${apiBaseUrl}/health`, {
    method: 'GET',
    headers: { 'User-Agent': 'devops-automation/1.0' }
  });
  const elapsed = Date.now() - start;

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));

  return {
    service: 'api',
    status: 'healthy',
    details: {
      latencyMs: elapsed,
      reportedStatus: payload.status || 'unknown'
    }
  };
}

async function checkWebSocketHealth() {
  const connectionsTable = process.env.CONNECTIONS_TABLE;
  if (!connectionsTable) {
    throw new Error('CONNECTIONS_TABLE environment variable is not defined');
  }

  const result = await dynamodb.send(new DescribeTableCommand({ TableName: connectionsTable }));
  const table = result.Table;

  if (!table || table.TableStatus !== 'ACTIVE') {
    const status = table?.TableStatus || 'UNKNOWN';
    throw new Error(`Connections table ${connectionsTable} is not active (status: ${status})`);
  }

  return {
    service: 'websocket',
    status: 'healthy',
    details: {
      tableName: connectionsTable,
      activeConnections: table.ItemCount ?? 0
    }
  };
}

async function checkQueueHealth() {
  const queueUrl = process.env.MAIN_QUEUE_URL;
  if (!queueUrl) {
    throw new Error('MAIN_QUEUE_URL environment variable is not defined');
  }

  const response = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
  }));

  const messagesVisible = Number(response.Attributes?.ApproximateNumberOfMessages ?? '0');
  const messagesInFlight = Number(response.Attributes?.ApproximateNumberOfMessagesNotVisible ?? '0');

  return {
    service: 'queue',
    status: 'healthy',
    details: {
      queueUrl,
      messagesVisible,
      messagesInFlight
    }
  };
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
 * DevOps Automation Worker
 * Procesa mensajes de SQS con manejo de errores por mensaje
 * 
 * Utiliza ReportBatchItemFailures para reintentar solo mensajes fallidos
 */
async function automationWorker(event, context) {
  console.log('DevOps worker processing batch', {
    messageCount: event.Records?.length || 0,
    requestId: context.requestId
  });

  const batchItemFailures = [];
  const results = {
    successful: [],
    failed: []
  };

  // CRÍTICO: Procesar cada mensaje individualmente
  for (const record of event.Records || []) {
    const messageId = record.messageId;
    
    try {
      const message = JSON.parse(record.body);
      console.log('Processing DevOps message', { 
        messageId, 
        task: message.task,
        timestamp: message.timestamp 
      });

      // Ejecutar tarea basada en el tipo de mensaje
      const result = await processDevOpsTask(message);
      
      results.successful.push({
        messageId,
        task: message.task,
        result,
        processedAt: new Date().toISOString()
      });

      console.log('Message processed successfully', { 
        messageId,
        task: message.task 
      });

    } catch (error) {
      console.error('Message processing failed', {
        messageId,
        error: error.message,
        stack: error.stack
      });

      // Agregar a lista de fallos para que SQS lo reintente
      batchItemFailures.push({
        itemIdentifier: messageId
      });

      results.failed.push({
        messageId,
        error: error.message,
        failedAt: new Date().toISOString()
      });

      // Publicar métrica de fallo
      try {
        await cloudwatch.send(new PutMetricDataCommand({
          Namespace: 'DevOps/Worker',
          MetricData: [{
            MetricName: 'MessageProcessingFailure',
            Value: 1,
            Unit: 'Count',
            Timestamp: new Date()
          }]
        }));
      } catch (metricError) {
        console.error('Failed to publish failure metric', metricError);
      }
    }
  }

  // Publicar métricas de procesamiento
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'DevOps/Worker',
      MetricData: [
        {
          MetricName: 'MessagesProcessed',
          Value: results.successful.length,
          Unit: 'Count',
          Timestamp: new Date()
        },
        {
          MetricName: 'MessagesFailed',
          Value: results.failed.length,
          Unit: 'Count',
          Timestamp: new Date()
        }
      ]
    }));
  } catch (metricError) {
    console.error('Failed to publish metrics', metricError);
  }

  console.log('Batch processing completed', {
    summary: {
      total: event.Records?.length || 0,
      successful: results.successful.length,
      failed: results.failed.length
    }
  });

  // Retornar mensajes fallidos para reintento parcial
  // SQS solo reintentará los mensajes en batchItemFailures
  return {
    batchItemFailures
  };
}

/**
 * Procesar tarea individual de DevOps
 */
async function processDevOpsTask(message) {
  const { task, params = {} } = message;
  
  switch (task) {
    case 'health_check':
      return await performHealthChecks();
    
    case 'collect_metrics':
      return await collectSystemMetrics();
    
    case 'check_alerts':
      return await checkPendingAlerts();
    
    case 'cleanup':
      return await cleanupTempResources();
    
    case 'backup':
      return await backupCriticalState();
    
    case 'custom':
      // Permitir tareas personalizadas con parámetros
      if (params.action && typeof params.action === 'function') {
        return await params.action(params.data);
      }
      throw new Error('Custom task requires action function');
    
    default:
      throw new Error(`Unknown DevOps task type: ${task}`);
  }
}

/**
 * Utilidades
 */
function getTaskName(index) {
  const tasks = ['health_checks', 'system_metrics', 'pending_alerts', 'cleanup', 'backup'];
  return tasks[index] || `task_${index}`;
}

function getServiceName(index) {
  const services = ['database', 'api', 'websocket', 'queue'];
  return services[index] || `service_${index}`;
}

module.exports = {
  automation,
  automationWorker,
  status
};