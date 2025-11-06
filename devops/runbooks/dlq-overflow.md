# 🚨 RUNBOOK: Dead Letter Queue (DLQ) Llena

**Severidad**: 🟠 Alta  
**SLA de Respuesta**: 10 minutos  
**Última Actualización**: 2025-11-06

---

## 📊 Síntomas

- ✅ Alarma "DLQMessagesHigh" activada
- ✅ DLQ tiene > 10 mensajes acumulados
- ✅ Procesamiento de mensajes falló repetidamente
- ✅ Métricas muestran `ApproximateNumberOfMessagesVisible` alto

---

## 🔍 Diagnóstico

### 1. Verificar Cantidad de Mensajes en DLQ

```bash
# Obtener métricas de DLQ
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text) \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region us-east-1 | jq '.Attributes'
```

**Salida esperada**:
```json
{
  "ApproximateNumberOfMessages": "15",
  "ApproximateNumberOfMessagesNotVisible": "0"
}
```

### 2. Inspeccionar Mensajes en DLQ

```bash
# Recibir y leer mensajes sin eliminarlos
aws sqs receive-message \
  --queue-url $(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text) \
  --max-number-of-messages 10 \
  --visibility-timeout 300 \
  --region us-east-1 | jq '.Messages[] | {
    MessageId: .MessageId,
    Body: .Body | fromjson,
    Attributes: .Attributes
  }'
```

### 3. Analizar Causa de Fallos

```bash
# Buscar errores en logs de Lambda que procesa la cola
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-processQueue \
  --filter-pattern '"ERROR"' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1 | jq '.events[] | .message' | head -20
```

### 4. Identificar Patrón de Errores

```bash
# Agrupar errores por tipo
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-processQueue \
  --filter-pattern '{ $.level = "error" }' \
  --start-time $(date -d '2 hours ago' +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | .errorType' | \
  sort | uniq -c | sort -rn
```

---

## 🔧 Causas Comunes

| Causa | Probabilidad | Acción Requerida |
|-------|--------------|------------------|
| **Validación de datos falla** | 35% | Corregir schema |
| **Timeout en procesamiento** | 30% | Aumentar timeout |
| **Dependencia externa caída** | 20% | Verificar servicios |
| **Formato de mensaje inválido** | 10% | Fix en producer |
| **Bug en código de handler** | 5% | Hotfix deployment |

---

## 🛠️ Mitigación

### **Solución 1: Inspeccionar y Clasificar Mensajes**

#### Crear script de análisis:

```bash
#!/bin/bash
# dlq-analyzer.sh

DLQ_URL=$(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text)

echo "==> Analizando DLQ..."

# Recibir todos los mensajes
aws sqs receive-message \
  --queue-url "$DLQ_URL" \
  --max-number-of-messages 10 \
  --region us-east-1 > /tmp/dlq-messages.json

# Analizar tipos de errores
jq -r '.Messages[] | .Body | fromjson | .errorType' /tmp/dlq-messages.json | \
  sort | uniq -c | sort -rn

echo ""
echo "==> Ejemplos de errores:"
jq -r '.Messages[0:3][] | {error: (.Body | fromjson | .errorMessage), data: (.Body | fromjson | .data)}' /tmp/dlq-messages.json
```

```bash
chmod +x dlq-analyzer.sh
./dlq-analyzer.sh
```

### **Solución 2: Reprocesar Mensajes (Si el bug fue corregido)**

#### Opción A: Mover mensajes de vuelta a la cola principal

```bash
# Redrive de DLQ a cola principal
DLQ_URL=$(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text)
MAIN_QUEUE_URL=$(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-main-queue --query 'QueueUrl' --output text)

# Recibir y reenviar cada mensaje
for i in {1..10}; do
  MSG=$(aws sqs receive-message \
    --queue-url "$DLQ_URL" \
    --max-number-of-messages 1 \
    --region us-east-1)
  
  if [ "$(echo "$MSG" | jq -r '.Messages | length')" -eq "0" ]; then
    echo "No more messages in DLQ"
    break
  fi
  
  BODY=$(echo "$MSG" | jq -r '.Messages[0].Body')
  RECEIPT=$(echo "$MSG" | jq -r '.Messages[0].ReceiptHandle')
  
  # Enviar a cola principal
  aws sqs send-message \
    --queue-url "$MAIN_QUEUE_URL" \
    --message-body "$BODY" \
    --region us-east-1
  
  # Eliminar de DLQ
  aws sqs delete-message \
    --queue-url "$DLQ_URL" \
    --receipt-handle "$RECEIPT" \
    --region us-east-1
  
  echo "Moved message $i"
done
```

#### Opción B: Usar AWS Console (Más seguro)

1. Ir a [SQS Console](https://console.aws.amazon.com/sqs/home?region=us-east-1)
2. Seleccionar DLQ: `sistema-gestion-espacios-prod-dlq`
3. Click en "Start DLQ redrive"
4. Seleccionar cola destino: `sistema-gestion-espacios-prod-main-queue`
5. Click en "Redrive messages"

### **Solución 3: Purgar DLQ (Solo si mensajes son inválidos)**

⚠️ **PELIGRO**: Esto elimina TODOS los mensajes sin reprocesarlos.

```bash
# SOLO usar si los mensajes son definitivamente inválidos
DLQ_URL=$(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text)

# Backup antes de purgar
aws sqs receive-message \
  --queue-url "$DLQ_URL" \
  --max-number-of-messages 10 \
  --region us-east-1 > "/tmp/dlq-backup-$(date +%Y%m%d-%H%M%S).json"

# Purgar DLQ
aws sqs purge-queue \
  --queue-url "$DLQ_URL" \
  --region us-east-1

echo "DLQ purged. Backup saved in /tmp/"
```

### **Solución 4: Corregir Código y Re-desplegar**

Si el problema es un bug en el handler:

```bash
# Fix el código en src/handlers/queueProcessor.js
# Luego desplegar solo esa función

cd proyecto
npx serverless deploy function -f processQueue --stage prod --region us-east-1
```

**Tiempo de deployment**: 2-3 minutos

### **Solución 5: Aumentar Timeout de Lambda**

Si los mensajes fallan por timeout:

```yaml
# En serverless.yml
functions:
  processQueue:
    timeout: 60  # Aumentar de 30 a 60 segundos
    memorySize: 1024  # Más memoria = más CPU
```

```bash
cd proyecto
npx serverless deploy --stage prod
```

---

## 📊 Análisis de Mensajes Comunes

### Ejemplo 1: Validación de Schema

```json
{
  "errorType": "ValidationError",
  "errorMessage": "Invalid data format",
  "data": {
    "espacio_id": null,
    "usuario_id": "user-123"
  }
}
```

**Solución**: Corregir validación en el producer o handler.

### Ejemplo 2: Timeout

```json
{
  "errorType": "TimeoutError",
  "errorMessage": "Task timed out after 30 seconds",
  "data": {
    "operation": "createReserva",
    "duration": 30000
  }
}
```

**Solución**: Aumentar timeout o optimizar código.

### Ejemplo 3: Dependencia Externa

```json
{
  "errorType": "NetworkError",
  "errorMessage": "ECONNREFUSED",
  "data": {
    "service": "DynamoDB",
    "operation": "PutItem"
  }
}
```

**Solución**: Verificar conectividad y salud de DynamoDB.

---

## 📈 Prevención

### 1. Implementar Validación Temprana

```javascript
// En el producer, validar antes de enviar a SQS
const { validateForDynamoDB } = require('./validator');

async function sendMessage(data) {
  try {
    // Validar primero
    const validated = validateForDynamoDB('reserva', data);
    
    await sqs.sendMessage({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(validated)
    });
  } catch (error) {
    logger.error('Validation failed before SQS send', { error, data });
    // No enviar a SQS si falla validación
    throw error;
  }
}
```

### 2. Implementar Circuit Breaker en Handler

```javascript
// En queueProcessor handler
const { resilienceManager } = require('./resilienceManager');

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      await resilienceManager.executeDatabase(
        () => processMessage(record),
        { maxRetries: 2 }  // Solo 2 reintentos antes de DLQ
      );
    } catch (error) {
      logger.error('Message processing failed', { error, record });
      throw error;  // Lambda enviará a DLQ automáticamente
    }
  }
};
```

### 3. Configurar Alarmas Proactivas

```bash
# Crear alarma para DLQ > 5 mensajes
aws cloudwatch put-metric-alarm \
  --alarm-name DLQMessagesWarning \
  --alarm-description "DLQ has more than 5 messages" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=sistema-gestion-espacios-prod-dlq \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:devops-alerts \
  --region us-east-1
```

---

## 🚨 Escalación

### Nivel 1: DevOps Engineer (0-10 min)
- ✅ Inspeccionar DLQ
- ✅ Clasificar tipos de errores
- ✅ Aplicar soluciones 1-3

### Nivel 2: Backend Developer (10-30 min)
- ✅ Analizar bugs en código
- ✅ Implementar fix y desplegar
- ✅ Reprocesar mensajes

### Nivel 3: Team Lead (30+ min)
- ✅ Decisiones sobre purgar DLQ
- ✅ Coordinación con otros equipos
- ✅ Comunicación a stakeholders

---

## 📝 Checklist de Resolución

- [ ] Identificar cantidad de mensajes en DLQ
- [ ] Analizar tipos de errores
- [ ] Determinar causa raíz
- [ ] Decidir: reprocesar, corregir o purgar
- [ ] Aplicar solución apropiada
- [ ] Verificar que DLQ se vacía
- [ ] Monitorear cola principal por 30 minutos
- [ ] Documentar incidente
- [ ] Actualizar validaciones/código si aplica

---

## 🔗 Referencias

- [SQS Console](https://console.aws.amazon.com/sqs/home?region=us-east-1)
- [Lambda Handler](../../proyecto/src/handlers/queueProcessor.js)
- [Configuración de Colas](../../proyecto/serverless_extensions/resources.yml)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups)

---

**Última ejecución**: N/A  
**Mensajes reprocesados**: 0  
**Mensajes purgados**: 0
