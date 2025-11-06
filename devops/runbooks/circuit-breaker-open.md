# 🚨 RUNBOOK: Circuit Breaker Abierto

**Severidad**: 🔴 Alta  
**SLA de Respuesta**: 5 minutos  
**Última Actualización**: 2025-11-06

---

## 📊 Síntomas

- ✅ Alarma "CircuitBreakerOpen" activada en CloudWatch
- ✅ Métricas muestran `CircuitOpened = 1`
- ✅ Errores 503 "Service Temporarily Unavailable"
- ✅ Logs con mensaje "Circuit breaker is OPEN"
- ✅ Operaciones críticas fallan inmediatamente sin retry

---

## 🔍 Diagnóstico Rápido

### 1. Verificar Estado del Circuit Breaker

```bash
# Consultar tabla de estado de circuit breakers
aws dynamodb scan \
  --table-name sistema-gestion-espacios-prod-circuit-state \
  --region us-east-1 | jq '.Items[] | {service: .serviceName.S, state: .state.S, failures: .consecutiveFailures.N, lastUpdate: .lastStateChange.S}'
```

**Salida esperada**:
```json
{
  "service": "DynamoDB",
  "state": "OPEN",
  "failures": "6",
  "lastUpdate": "2025-11-06T14:30:45.123Z"
}
```

### 2. Identificar Servicio Afectado

```bash
# Revisar logs de circuit breaker
aws logs tail /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --since 15m \
  --filter-pattern "CircuitOpenError" \
  --format short
```

### 3. Verificar Salud del Servicio Backend

```bash
# Health check del servicio subyacente
SERVICE_URL=$(aws ssm get-parameter --name /espacios/api/base-url --query 'Parameter.Value' --output text)
curl -i "$SERVICE_URL/health"
```

---

## 🔧 Causas Comunes

| Causa | Probabilidad | Impacto |
|-------|--------------|---------|
| **DynamoDB throttling masivo** | 40% | 🔴 Crítico |
| **Cognito service disruption** | 25% | 🔴 Crítico |
| **Timeout en Lambda (función vecina)** | 20% | 🟡 Alto |
| **Fallo en dependencia externa** | 10% | 🟡 Alto |
| **Configuración errónea del CB** | 5% | 🟢 Medio |

---

## 🛠️ Mitigación Inmediata

### **Paso 1: Verificar Salud de Dependencias** (2 min)

#### DynamoDB:
```bash
# Verificar throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

**Si hay throttling**: Ver [runbook de DynamoDB throttling](./dynamodb-throttling.md)

#### Cognito:
```bash
# Verificar errores de Cognito
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"TooManyRequestsException"' \
  --start-time $(date -d '15 minutes ago' +%s)000
```

### **Paso 2: Forzar Cierre del Circuit Breaker** (SOLO SI BACKEND ESTÁ SANO)

```bash
# Actualizar estado manualmente en DynamoDB
aws dynamodb update-item \
  --table-name sistema-gestion-espacios-prod-circuit-state \
  --key '{"serviceName": {"S": "DynamoDB"}}' \
  --update-expression "SET #state = :closed, consecutiveFailures = :zero, consecutiveSuccesses = :two, lastStateChange = :now" \
  --expression-attribute-names '{"#state": "state"}' \
  --expression-attribute-values '{
    ":closed": {"S": "CLOSED"},
    ":zero": {"N": "0"},
    ":two": {"N": "2"},
    ":now": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}
  }' \
  --region us-east-1
```

⚠️ **ADVERTENCIA**: Solo hacer esto si confirmas que el backend está funcionando correctamente.

### **Paso 3: Activar Fallback Mode** (Si no se puede cerrar CB)

Editar temporalmente la configuración de resiliencia:

```javascript
// En resilienceManager.js, ajustar threshold temporalmente
const CIRCUIT_BREAKER_CONFIGS = {
  DATABASE: {
    failureThreshold: 10,  // De 5 a 10 (más tolerante)
    successThreshold: 2,
    timeout: 30000         // De 60s a 30s (más rápido)
  }
};
```

```bash
# Desplegar cambio de emergencia
cd proyecto
npx serverless deploy --stage prod --force
```

**Tiempo de deployment**: ~3-5 minutos

### **Paso 4: Habilitar Modo de Degradación Graciosa**

Si el problema persiste, activar fallbacks:

```bash
# Establecer feature flag para usar cache
aws ssm put-parameter \
  --name /espacios/features/use-fallback-cache \
  --value "true" \
  --type String \
  --overwrite \
  --region us-east-1
```

Esto hace que la aplicación use:
- ✅ Cache local de datos
- ✅ Datos prioritarios básicos
- ✅ Modo read-only temporal

---

## 📊 Monitoreo de Recuperación

### Verificar transición a HALF_OPEN (cada 60s):

```bash
# Watch circuit breaker state
watch -n 60 'aws dynamodb get-item \
  --table-name sistema-gestion-espacios-prod-circuit-state \
  --key "{\"serviceName\": {\"S\": \"DynamoDB\"}}" \
  --region us-east-1 | jq ".Item.state.S"'
```

**Transiciones esperadas**:
```
OPEN → HALF_OPEN (después de timeout: 60s)
HALF_OPEN → CLOSED (después de 2 éxitos consecutivos)
```

### Verificar métricas de éxito:

```bash
# Success rate en los últimos 5 minutos
aws cloudwatch get-metric-statistics \
  --namespace Proyecto/Resilience \
  --metric-name CircuitClosed \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1
```

---

## 🔄 Prevención de Re-apertura

### 1. Implementar Rate Limiting Temporal

```bash
# Reducir concurrency de Lambda temporalmente
aws lambda put-function-concurrency \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --reserved-concurrent-executions 10 \
  --region us-east-1
```

### 2. Habilitar Request Throttling en API Gateway

```bash
# Aplicar throttling temporal
aws apigatewayv2 update-stage \
  --api-id <API_ID> \
  --stage-name prod \
  --throttle-settings RateLimit=50,BurstLimit=100 \
  --region us-east-1
```

### 3. Warmup de Conexiones

```bash
# Trigger manual de warmup
aws lambda invoke \
  --function-name sistema-gestion-espacios-prod-health \
  --region us-east-1 \
  /dev/stdout
```

---

## 📈 Métricas de Resolución

### Verificar que el sistema está estable (10 min post-cierre):

```bash
# Error rate < 1%
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1 | jq '[.Datapoints[].Sum] | add'

# Success rate > 99%
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.statusCode = 200 }' \
  --start-time $(date -d '10 minutes ago' +%s)000 | jq '.events | length'
```

---

## 🚨 Escalación

### Nivel 1: DevOps Engineer (0-5 min)
- ✅ Diagnosticar causa raíz
- ✅ Verificar salud de servicios
- ✅ Intentar cierre manual si backend está sano

### Nivel 2: Backend Lead (5-15 min)
- ✅ Revisar logs detallados
- ✅ Ajustar configuración de CB
- ✅ Implementar fallbacks

### Nivel 3: CTO + AWS Support (15+ min)
- ✅ Involucrar a AWS Support si es problema de plataforma
- ✅ Decisiones de arquitectura de emergencia
- ✅ Comunicación a stakeholders

**Contactos de Emergencia**:
- DevOps On-Call: +1-XXX-XXX-XXXX
- Backend Lead: backend-lead@example.com
- AWS Support: Caso Premium Support

---

## 🔔 Comunicación a Usuarios

Si el incidente dura > 10 minutos:

```bash
# Publicar mensaje en SNS para notificación a usuarios
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:sistema-espacios-status \
  --subject "Sistema en Modo Degradado" \
  --message "Estamos experimentando problemas técnicos. Funciones no críticas pueden estar limitadas. ETA de resolución: 15 minutos." \
  --region us-east-1
```

**Status page**: https://status.sistema-espacios.com

---

## 📝 Post-Incident Review

### Checklist:

- [ ] Documentar timeline del incidente
- [ ] Identificar causa raíz definitiva
- [ ] Crear tickets para mejoras permanentes
- [ ] Actualizar configuración de CB si fue false positive
- [ ] Revisar umbrales de alarmas
- [ ] Realizar drill de este runbook trimestralmente

**Plantilla de Post-Mortem**: `docs/post-mortem-circuit-breaker.md`

---

## 🔗 Referencias

- [Código de Circuit Breaker](../../proyecto/src/shared/patterns/circuitBreakerPattern.js)
- [Configuración de Resiliencia](../../proyecto/src/shared/utils/resilienceManager.js)
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=sistema-gestion-espacios)
- [DynamoDB Console](https://console.aws.amazon.com/dynamodb/home?region=us-east-1)

---

**Test de Runbook**: Ejecutar simulación trimestral  
**Última prueba**: N/A  
**Incidentes resueltos con este runbook**: 0
