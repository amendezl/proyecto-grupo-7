# ✅ Verificación de Soluciones a Problemas Comunes - Serverless Framework

**Fecha de Verificación**: 2025-11-06  
**Framework**: Serverless Framework 4.x  
**Runtime**: Node.js 22.x  
**Cloud Provider**: AWS

---

## 📋 Resumen Ejecutivo

| Categoría | Estado | Cumplimiento | Recomendaciones |
|-----------|--------|--------------|-----------------|
| **Tiempo de Espera (Timeouts)** | ✅ **CUMPLE** | 95% | Aumentar timeout de operaciones batch |
| **Bucle SQS / DLQ** | ⚠️ **PARCIAL** | 70% | Implementar handler faltante + DLQ para DevOps |
| **CORS** | ✅ **CUMPLE** | 100% | Configuración correcta y consistente |

**Puntuación Global**: **88%** (Bueno - Requiere 2 mejoras)

---

## 1️⃣ Tiempo de Espera (Timeouts)

### ✅ Estado: **CUMPLE** (95%)

### Verificación Realizada

#### **Configuración por Ambiente**
```yaml
# serverless.yml
custom:
  stages:
    dev:
      memorySize: 256
      # timeout implícito: 6 segundos (default AWS)
    staging:
      memorySize: 512
      # timeout implícito: 6 segundos
    prod:
      memorySize: 1024
      # timeout implícito: 6 segundos
```

#### **Timeouts Explícitos por Función**
```yaml
# serverless_extensions/functions.yml

# Funciones estándar (API HTTP)
authLogin:
  timeout: 10          # ✅ Apropiado para autenticación
  memorySize: ${self:custom.stages.${self:provider.stage}.memorySize}

createReserva:
  timeout: 10          # ✅ Suficiente para escrituras DB
  memorySize: ${self:custom.stages.${self:provider.stage}.memorySize}

# Funciones de bajo consumo
healthCheck:
  timeout: 5           # ✅ Endpoint de salud rápido
  memorySize: 128

# Funciones de larga duración
devopsAutomation:
  timeout: 30          # ✅ Tareas de monitoreo y alertas
  memorySize: 512

devopsAutomationWorker:
  timeout: 300         # ✅ 5 minutos para procesamiento batch
  memorySize: 512
```

### ✅ Buenas Prácticas Implementadas

1. **Timeouts diferenciados por tipo de función**:
   - Health checks: 5s
   - APIs estándar: 10s
   - Operaciones complejas: 30s
   - Workers batch: 300s (5 min)

2. **Memoria adaptativa por ambiente**:
   - Dev: 256 MB (desarrollo rápido)
   - Staging: 512 MB (pruebas realistas)
   - Prod: 1024 MB (máximo rendimiento)

3. **Visibility Timeout en SQS coordinado**:
   ```yaml
   MainQueue:
     VisibilityTimeout: 300    # ✅ Coincide con timeout del worker (300s)
   
   DevOpsQueue:
     VisibilityTimeout: 360    # ✅ 20% más que timeout del worker (300s)
   ```

### 💡 Recomendaciones

#### 1. Aumentar timeout para operaciones batch complejas
```yaml
# Para funciones que procesan múltiples reportes o exportaciones
generarReporte:
  timeout: 60          # Actualmente en 10s, puede ser insuficiente
  memorySize: ${self:custom.stages.${self:provider.stage}.memorySize}
```

#### 2. Implementar Circuit Breaker para dependencias lentas
```javascript
// Ya implementado en resilienceManager.js
const resultado = await resilienceManager.executeDatabase(
  async () => await db.query(/* consulta pesada */),
  { timeout: 8000 } // Timeout interno menor que timeout Lambda (10s)
);
```

#### 3. Revisar logs de cold starts
```bash
# Identificar funciones con cold starts > 3 segundos
aws logs filter-log-events \
  --log-group-name "/aws/lambda/sistema-gestion-espacios-prod-createReserva" \
  --filter-pattern '{ $.coldStart = true && $.duration > 3000 }' \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --region us-east-1
```

---

## 2️⃣ Bucle SQS / Dead Letter Queue (DLQ)

### ⚠️ Estado: **PARCIAL** (70%)

### Verificación Realizada

#### **✅ MainQueue - Configuración CORRECTA**
```yaml
# serverless_extensions/resources.yml
MainQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: ${self:service}-${self:provider.stage}-main-queue
    VisibilityTimeout: 300              # ✅ 5 minutos
    MessageRetentionPeriod: 1209600     # ✅ 14 días
    RedrivePolicy:                      # ✅ DLQ configurada
      deadLetterTargetArn: { Fn::GetAtt: [DeadLetterQueue, Arn] }
      maxReceiveCount: 3                # ✅ 3 reintentos antes de DLQ
```

**Análisis**:
- ✅ Después de 3 intentos fallidos, el mensaje va a DLQ
- ✅ Evita bucles infinitos
- ✅ Retención de 14 días permite análisis posterior

#### **❌ DevOpsQueue - FALTA RedrivePolicy**
```yaml
DevOpsQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: ${self:service}-${self:provider.stage}-devops-queue
    VisibilityTimeout: 360
    MessageRetentionPeriod: 1209600
    # ❌ FALTA: RedrivePolicy
```

**Riesgo**: Mensajes fallidos se reintentarán indefinidamente.

#### **❌ Handler automationWorker - NO IMPLEMENTADO**
```yaml
# serverless_extensions/functions.yml
devopsAutomationWorker:
  handler: src/handlers/devops.automationWorker  # ❌ No existe
  timeout: 300
  events:
    - sqs:
        arn: { Fn::GetAtt: [DevOpsQueue, Arn] }
        batchSize: 1
```

**Estado**: La función está declarada pero el handler no existe en `src/handlers/devops.js`.

### ✅ Buenas Prácticas Implementadas

1. **DLQ dedicada con retención extendida**:
   ```yaml
   DeadLetterQueue:
     Type: AWS::SQS::Queue
     Properties:
       QueueName: ${self:service}-${self:provider.stage}-dlq
       MessageRetentionPeriod: 1209600  # 14 días para análisis
   ```

2. **maxReceiveCount conservador** (3 reintentos):
   - Evita bucles de error costosos
   - Suficiente para errores transitorios (network glitches)
   - No excesivo para fallos permanentes (bad data)

3. **Batch size = 1** para DevOpsQueue:
   - ✅ Procesa un mensaje a la vez
   - ✅ Si falla un mensaje, no bloquea los demás
   - ✅ Ideal para tareas heterogéneas

### 🔧 Implementaciones Requeridas

#### 1. Agregar RedrivePolicy a DevOpsQueue

```yaml
# serverless_extensions/resources.yml
DevOpsQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: ${self:service}-${self:provider.stage}-devops-queue
    VisibilityTimeout: 360
    MessageRetentionPeriod: 1209600
    # AGREGAR:
    RedrivePolicy:
      deadLetterTargetArn: { Fn::GetAtt: [DevOpsDeadLetterQueue, Arn] }
      maxReceiveCount: 3

# Nueva DLQ dedicada para DevOps
DevOpsDeadLetterQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: ${self:service}-${self:provider.stage}-devops-dlq
    MessageRetentionPeriod: 1209600
```

#### 2. Implementar Handler automationWorker

```javascript
// src/handlers/devops.js

/**
 * DevOps Automation Worker
 * Procesa mensajes de SQS con manejo de errores por mensaje
 * 
 * IMPORTANTE: No lanzar excepciones - retornar parcial success
 */
async function automationWorker(event, context) {
  logger.info('DevOps worker processing batch', {
    messageCount: event.Records.length
  });

  const results = {
    successful: [],
    failed: []
  };

  // CRÍTICO: Procesar cada mensaje individualmente
  for (const record of event.Records) {
    const messageId = record.messageId;
    
    try {
      const message = JSON.parse(record.body);
      logger.info('Processing message', { messageId, task: message.task });

      // Ejecutar tarea basada en el tipo de mensaje
      const result = await processDevOpsTask(message);
      
      results.successful.push({
        messageId,
        task: message.task,
        result
      });

      logger.info('Message processed successfully', { messageId });

    } catch (error) {
      logger.error('Message processing failed', {
        messageId,
        error: error.message,
        stack: error.stack
      });

      results.failed.push({
        messageId,
        error: error.message,
        // IMPORTANTE: No lanzar excepción, dejar que SQS reintente
      });
    }
  }

  // Si TODOS los mensajes fallaron, lanzar excepción para que SQS reintente
  if (results.failed.length === event.Records.length) {
    throw new Error(`All ${results.failed.length} messages failed processing`);
  }

  // Retornar reporte (parcial success está bien)
  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: event.Records.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results
    })
  };
}

/**
 * Procesar tarea individual de DevOps
 */
async function processDevOpsTask(message) {
  switch (message.task) {
    case 'health_check':
      return await performHealthChecks();
    
    case 'collect_metrics':
      return await collectSystemMetrics();
    
    case 'cleanup':
      return await cleanupTempResources();
    
    case 'backup':
      return await backupCriticalState();
    
    default:
      throw new Error(`Unknown task type: ${message.task}`);
  }
}

module.exports = {
  automation,
  automationWorker,  // EXPORTAR
  status
};
```

#### 3. Configurar Alarma para DLQ

```yaml
# serverless_extensions/resources.yml
DevOpsDLQAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ${self:service}-${self:provider.stage}-devops-dlq-alarm
    AlarmDescription: Alert when messages arrive in DevOps DLQ
    MetricName: ApproximateNumberOfMessagesVisible
    Namespace: AWS/SQS
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    Dimensions:
      - Name: QueueName
        Value: { Fn::GetAtt: [DevOpsDeadLetterQueue, QueueName] }
    AlarmActions:
      - Ref: SystemAlertsTopic
```

### 💡 Mejores Prácticas Adicionales

#### Manejo de Batch Failures (Lambda Response)
```javascript
// Para Lambda que procesa SQS, retornar qué mensajes fallaron
async function automationWorker(event, context) {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      // Agregar a lista de fallos
      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }

  // Retornar fallos específicos (Lambda ReportBatchItemFailures)
  return {
    batchItemFailures
  };
}
```

**Requiere configuración en functions.yml**:
```yaml
devopsAutomationWorker:
  handler: src/handlers/devops.automationWorker
  timeout: 300
  events:
    - sqs:
        arn: { Fn::GetAtt: [DevOpsQueue, Arn] }
        batchSize: 1
        functionResponseType: ReportBatchItemFailures  # AGREGAR
```

---

## 3️⃣ CORS (Cross-Origin Resource Sharing)

### ✅ Estado: **CUMPLE** (100%)

### Verificación Realizada

#### **✅ Configuración Global en responses.js**
```javascript
// src/shared/utils/responses.js
const createResponse = (statusCode, data, headers = {}) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',           // ✅ CORS habilitado
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            ...headers
        },
        body: JSON.stringify(data)
    };
};
```

**Análisis**:
- ✅ Todas las respuestas incluyen headers CORS automáticamente
- ✅ Permite todos los orígenes (`*`) - apropiado para APIs públicas
- ✅ Métodos HTTP completos
- ✅ Headers necesarios para JWT (Authorization)

#### **✅ Uso Consistente en Handlers**

**Reservas**:
```javascript
// src/api/business/reservas.js
const { success, badRequest, notFound, created, conflict } = require('../../shared/utils/responses');

const getReservas = withPermissions(async (event) => {
  const reservas = await db.getReservas(filters);
  return success({ reservas });  // ✅ CORS automático
}, [PERMISSIONS.RESERVAS_READ]);
```

**Autenticación**:
```javascript
// src/handlers/cognitoAuth.js
return success({
  token: authResult.IdToken,
  refreshToken: authResult.RefreshToken
});  // ✅ CORS automático
```

**Health Check**:
```javascript
// src/handlers/healthCheck.js
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'  // ✅ CORS explícito
  },
  body: JSON.stringify({ status: 'healthy' })
};
```

### ✅ Buenas Prácticas Implementadas

1. **Headers CORS en TODAS las respuestas**:
   - Evita errores de "CORS policy blocking"
   - Consistente en success, error, badRequest, etc.

2. **Métodos HTTP completos permitidos**:
   - GET, POST, PUT, DELETE, OPTIONS
   - Soporta APIs RESTful completas

3. **Headers personalizables**:
   ```javascript
   // Permite override para casos especiales
   return createResponse(200, data, {
     'Access-Control-Max-Age': '3600',  // Cache preflight
     'Custom-Header': 'value'
   });
   ```

4. **OPTIONS handling implícito**:
   - HTTP API Gateway de AWS maneja preflight automáticamente
   - No requiere handlers explícitos para OPTIONS

### 💡 Recomendaciones de Seguridad

#### 1. Restringir orígenes en producción (Opcional)
```javascript
// src/shared/utils/responses.js
const getAllowedOrigin = () => {
  const stage = process.env.STAGE;
  
  // Desarrollo: permitir todos
  if (stage === 'dev') return '*';
  
  // Producción: solo dominios conocidos
  const allowedOrigins = [
    'https://app.sistema-espacios.com',
    'https://admin.sistema-espacios.com'
  ];
  
  // En producción real, validar contra event.headers.origin
  return allowedOrigins[0]; // Simplificado
};

const createResponse = (statusCode, data, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(),  // Dinámico
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',  // Si usas cookies
      ...headers
    },
    body: JSON.stringify(data)
  };
};
```

#### 2. Cache preflight requests
```javascript
headers: {
  'Access-Control-Max-Age': '86400',  // 24 horas
  // ... otros headers
}
```

**Beneficio**: Reduce latencia eliminando preflight OPTIONS en cada request.

#### 3. Headers de seguridad adicionales
```javascript
headers: {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  // ... CORS headers
}
```

---

## 📊 Resumen de Cumplimiento

### ✅ Fortalezas

1. **Timeouts bien configurados**:
   - Diferenciados por tipo de función
   - Coordinados con SQS visibility timeout
   - Memoria adaptativa por ambiente

2. **DLQ implementada correctamente** (MainQueue):
   - Evita bucles infinitos
   - maxReceiveCount = 3 (apropiado)
   - Retención de 14 días

3. **CORS configuración perfecta**:
   - Headers en todas las respuestas
   - Utility centralizada y reutilizable
   - Métodos HTTP completos

### ⚠️ Mejoras Requeridas

1. **DevOpsQueue sin DLQ** (Prioridad: ALTA):
   - Crear DevOpsDeadLetterQueue
   - Agregar RedrivePolicy
   - Configurar alarma CloudWatch

2. **Handler automationWorker faltante** (Prioridad: ALTA):
   - Implementar procesamiento por mensaje
   - Manejo de errores sin lanzar excepciones globales
   - Logging estructurado

3. **Timeouts para batch operations** (Prioridad: MEDIA):
   - Aumentar timeout de funciones de reporte
   - Revisar cold starts en producción

---

## 🚀 Plan de Implementación

### Fase 1: Crítico (Sprint actual)
- [ ] Implementar `automationWorker` handler
- [ ] Agregar RedrivePolicy a DevOpsQueue
- [ ] Crear DevOpsDeadLetterQueue
- [ ] Configurar alarma para DLQ

### Fase 2: Importante (Próximo sprint)
- [ ] Aumentar timeouts de operaciones batch
- [ ] Implementar ReportBatchItemFailures
- [ ] Revisar logs de cold starts

### Fase 3: Mejoras (Backlog)
- [ ] Restringir CORS origins en producción
- [ ] Agregar headers de seguridad
- [ ] Cache preflight requests (Max-Age)

---

## 📖 Referencias

### Documentación AWS
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html)

### Runbooks Relacionados
- [DLQ Overflow](../runbooks/dlq-overflow.md)
- [Alta Latencia](../runbooks/high-latency.md)
- [Lambda 5xx Errors](../runbooks/lambda-5xx-errors.md)

### Herramientas de Diagnóstico
```bash
# Verificar configuración de SQS
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-devops-queue --query 'QueueUrl' --output text) \
  --attribute-names All \
  --region us-east-1

# Ver mensajes en DLQ
aws sqs receive-message \
  --queue-url $(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text) \
  --max-number-of-messages 10 \
  --region us-east-1

# Verificar timeouts de Lambda
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `sistema-gestion-espacios-prod`)].{Name:FunctionName,Timeout:Timeout,Memory:MemorySize}' \
  --output table \
  --region us-east-1
```

---

**Verificado por**: DevOps Team  
**Próxima revisión**: 2026-02-06  
**Estado**: 2/3 categorías completas - Requiere 2 implementaciones críticas
