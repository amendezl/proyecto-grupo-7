# 🚨 RUNBOOK: DynamoDB Throttling

**Severidad**: 🟠 Alta  
**SLA de Respuesta**: 10 minutos  
**Última Actualización**: 2025-11-06

---

## 📊 Síntomas

- ✅ Errores `ProvisionedThroughputExceededException`
- ✅ Errores `ThrottlingException` en logs
- ✅ Latencia incrementada en operaciones de DynamoDB
- ✅ Alarma "DynamoDBThrottling" activada
- ✅ Usuarios experimentan errores o lentitud

---

## 🔍 Diagnóstico

### 1. Verificar Throttling en CloudWatch

```bash
# Métricas de throttling por tabla
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '.Datapoints'
```

### 2. Verificar Billing Mode

```bash
# Confirmar que está en PAY_PER_REQUEST (on-demand)
aws dynamodb describe-table \
  --table-name sistema-gestion-espacios-prod-main \
  --region us-east-1 | jq '{
    TableName: .Table.TableName,
    BillingMode: .Table.BillingModeSummary.BillingMode,
    ItemCount: .Table.ItemCount,
    TableSize: .Table.TableSizeBytes
  }'
```

**Salida esperada**:
```json
{
  "TableName": "sistema-gestion-espacios-prod-main",
  "BillingMode": "PAY_PER_REQUEST",  // ✅ On-demand
  "ItemCount": 15420,
  "TableSize": 2457600
}
```

### 3. Identificar Hot Partitions

```bash
# Revisar patrón de acceso en logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.commandType = "PutCommand" OR $.commandType = "QueryCommand" }' \
  --start-time $(date -d '15 minutes ago' +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | .PK' | \
  sort | uniq -c | sort -rn | head -10
```

### 4. Analizar Patrones de Throttling

```bash
# Agrupar throttling por tipo de operación
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"ThrottlingException"' \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | .commandType' | \
  sort | uniq -c | sort -rn
```

---

## 🔧 Causas Comunes (En modo PAY_PER_REQUEST)

| Causa | Probabilidad | Descripción |
|-------|--------------|-------------|
| **Hot Partition** | 40% | Una partition key recibe demasiadas requests |
| **Burst límite excedido** | 30% | Superó límite de ráfaga (instantáneo) |
| **GSI throttling** | 20% | Index secundario sobrecargado |
| **Request rate demasiado alto** | 10% | Superó límites de cuenta AWS |

**Nota**: En modo PAY_PER_REQUEST, DynamoDB escala automáticamente, pero tiene límites de ráfaga y puede throttlear temporalmente.

---

## 🛠️ Mitigación

### **Solución 1: Verificar que NO esté en modo PROVISIONED**

```bash
# Si por error está en PROVISIONED, cambiar a ON-DEMAND
BILLING_MODE=$(aws dynamodb describe-table \
  --table-name sistema-gestion-espacios-prod-main \
  --region us-east-1 | jq -r '.Table.BillingModeSummary.BillingMode')

if [ "$BILLING_MODE" != "PAY_PER_REQUEST" ]; then
  echo "⚠️ Tabla en modo PROVISIONED, cambiando a ON-DEMAND..."
  
  aws dynamodb update-table \
    --table-name sistema-gestion-espacios-prod-main \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
    
  echo "✅ Cambio a PAY_PER_REQUEST completado (toma ~5 min aplicar)"
else
  echo "✅ Tabla ya está en PAY_PER_REQUEST"
fi
```

**Tiempo de aplicación**: 5-10 minutos

### **Solución 2: Implementar Backoff Exponencial (Ya implementado ✅)**

El sistema ya tiene retry con backoff exponencial en `retryPattern.js`:

```javascript
// Verificar configuración actual
grep -A 10 "RETRY_CONFIGS" proyecto/src/shared/patterns/retryPattern.js
```

**Configuración actual**:
- ✅ Max 3 reintentos
- ✅ Backoff: 200ms, 400ms, 800ms
- ✅ Jitter: hasta 100ms

### **Solución 3: Distribuir Carga con Jitter**

Si hay spike de tráfico, agregar jitter adicional:

```bash
# Actualizar environment variable para más jitter
aws lambda update-function-configuration \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --environment "Variables={
    DYNAMODB_TABLE=sistema-gestion-espacios-prod-main,
    RETRY_JITTER_MAX=500
  }" \
  --region us-east-1
```

### **Solución 4: Identificar y Corregir Hot Partitions**

#### Analizar distribución de claves:

```bash
# Script para analizar hot partitions
cat > /tmp/analyze-partitions.sh << 'EOF'
#!/bin/bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.commandType = "PutCommand" OR $.commandType = "QueryCommand" }' \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | .PK' | \
  awk '{count[$0]++} END {for (key in count) print count[key], key}' | \
  sort -rn | head -20
EOF

chmod +x /tmp/analyze-partitions.sh
/tmp/analyze-partitions.sh
```

**Si hay hot partition** (ej: una PK con > 1000 requests/min):

**Opción A**: Agregar sufijo aleatorio a la PK
```javascript
// En DynamoDBManager.js
PK: `ESPACIO#${uuid}#${Math.floor(Math.random() * 10)}`  // 10 particiones
```

**Opción B**: Usar GSI con mejor distribución
```javascript
// Usar GSI1PK que ya está distribuido por entityType
IndexName: 'GSI1',
KeyConditionExpression: 'GSI1PK = :type',
ExpressionAttributeValues: { ':type': 'ESPACIO' }
```

### **Solución 5: Implementar Caching Temporal**

Para reducir presión sobre DynamoDB:

```javascript
// Agregar en handler (temporal)
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // 60 segundos

async function getEspacioById(id) {
  const cached = cache.get(`espacio:${id}`);
  if (cached) return cached;
  
  const espacio = await db.getEspacioById(id);
  cache.set(`espacio:${id}`, espacio);
  return espacio;
}
```

**Deploy rápido**:
```bash
cd proyecto
npm install node-cache --save
npx serverless deploy function -f getEspacio --stage prod
```

### **Solución 6: Rate Limiting Temporal en API Gateway**

```bash
# Reducir rate limit temporalmente
API_ID=$(aws apigatewayv2 get-apis --region us-east-1 | jq -r '.Items[] | select(.Name | contains("sistema-gestion-espacios")) | .ApiId')

aws apigatewayv2 update-stage \
  --api-id "$API_ID" \
  --stage-name prod \
  --throttle-settings RateLimit=100,BurstLimit=200 \
  --region us-east-1

echo "✅ API Gateway throttling aplicado (100 req/s)"
```

---

## 📊 Análisis Detallado

### Verificar límites de cuenta AWS:

```bash
# Service Quotas para DynamoDB
aws service-quotas list-service-quotas \
  --service-code dynamodb \
  --region us-east-1 | jq '.Quotas[] | select(.QuotaName | contains("account")) | {
    Name: .QuotaName,
    Value: .Value,
    Unit: .Unit
  }'
```

**Límites típicos en PAY_PER_REQUEST**:
- ✅ Read capacity: 40,000 RCU per table (burst)
- ✅ Write capacity: 40,000 WCU per table (burst)
- ✅ Sustained: Automático hasta límites de cuenta

### Analizar costo de operaciones:

```bash
# Revisar consumed capacity en logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.ConsumedCapacity exists }' \
  --start-time $(date -d '15 minutes ago' +%s)000 | \
  jq -r '.events[] | .message | fromjson | .ConsumedCapacity'
```

---

## 📈 Monitoreo Post-Mitigación

### Dashboard de métricas clave:

```bash
# Crear/actualizar dashboard
aws cloudwatch put-dashboard \
  --dashboard-name DynamoDB-Throttling-Monitor \
  --dashboard-body file:///tmp/dynamodb-dashboard.json \
  --region us-east-1
```

### Watch throttling en tiempo real:

```bash
# Monitor cada 30 segundos
watch -n 30 'aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1 | jq "[.Datapoints[].Sum] | add // 0"'
```

**Target**: 0 throttled requests en 5 minutos

---

## 🚨 Prevención a Largo Plazo

### 1. Mejorar Diseño de Particiones

```javascript
// ANTES (puede causar hot partition)
PK: `USER#${userId}`  // Si un usuario muy activo

// DESPUÉS (mejor distribución)
PK: `USER#${userId}#${date}`  // Distribuye por fecha
// O usar hash de UUID que ya está implementado ✅
PK: `USER#${uuid()}`  // Distribución uniforme
```

### 2. Implementar DAX (DynamoDB Accelerator)

Para casos con muchas lecturas repetidas:

```yaml
# En resources.yml (futuro)
DaxCluster:
  Type: AWS::DAX::Cluster
  Properties:
    ClusterName: espacios-dax-cluster
    NodeType: dax.t3.small
    ReplicationFactor: 3
    IAMRoleARN: !GetAtt DaxRole.Arn
```

**Costo**: ~$150/mes (evaluar ROI)

### 3. Batch Operations

```javascript
// En lugar de múltiples PutItem
await docClient.send(new PutCommand({ TableName, Item: item1 }));
await docClient.send(new PutCommand({ TableName, Item: item2 }));

// Usar BatchWrite
await docClient.send(new BatchWriteCommand({
  RequestItems: {
    [TableName]: [
      { PutRequest: { Item: item1 } },
      { PutRequest: { Item: item2 } }
    ]
  }
}));
```

### 4. Alarmas Proactivas

```bash
# Alarma para throttling > 10 en 5 minutos
aws cloudwatch put-metric-alarm \
  --alarm-name DynamoDBThrottlingWarning \
  --alarm-description "DynamoDB throttling detected" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:devops-alerts \
  --region us-east-1
```

---

## 🚨 Escalación

### Nivel 1: DevOps Engineer (0-10 min)
- ✅ Verificar billing mode
- ✅ Analizar patrones de throttling
- ✅ Aplicar mitigaciones 1-3

### Nivel 2: Backend Developer (10-30 min)
- ✅ Analizar hot partitions
- ✅ Implementar caching
- ✅ Optimizar queries

### Nivel 3: Solutions Architect (30+ min)
- ✅ Reevaluar diseño de particiones
- ✅ Considerar DAX o cambios arquitectónicos
- ✅ Contactar AWS Support si es issue de plataforma

---

## 📝 Post-Incident Checklist

- [ ] Documentar frecuencia y duración de throttling
- [ ] Identificar hot partitions específicas
- [ ] Revisar diseño de claves de partición
- [ ] Evaluar necesidad de DAX
- [ ] Actualizar alarmas y thresholds
- [ ] Implementar mejoras en código
- [ ] Realizar load testing

---

## 🔗 Referencias

- [DynamoDB Console](https://console.aws.amazon.com/dynamodb/home?region=us-east-1)
- [Best Practices for Partition Keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [DynamoDB Limits](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html)
- [Código de DynamoDBManager](../../proyecto/src/infrastructure/database/DynamoDBManager.js)

---

**Última ejecución**: N/A  
**Incidentes resueltos**: 0  
**Hot partitions identificadas**: 0
