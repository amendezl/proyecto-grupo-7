# 🚨 RUNBOOK: Errores 5xx en Lambda (500, 502, 503, 504)

**Severidad**: 🔴 Crítica  
**SLA de Respuesta**: 5 minutos  
**Última Actualización**: 2025-11-06

---

## 📊 Síntomas

- ✅ Alarma "High5xxErrors" activada
- ✅ Error rate > 5% en CloudWatch
- ✅ Usuarios reportan "Error interno del servidor"
- ✅ Métricas de Lambda muestran Errors > 10/min

---

## 🔍 Diagnóstico Rápido

### 1. Identificar Función Afectada

```bash
# Obtener error rate de todas las funciones
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '.Datapoints | sort_by(.Timestamp) | reverse'
```

### 2. Revisar Logs de Errores

```bash
# Tail de logs en tiempo real
aws logs tail /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --since 10m \
  --filter-pattern '{ $.level = "error" OR $.statusCode >= 500 }' \
  --format short \
  --follow
```

### 3. Analizar Tipos de Errores

```bash
# Agrupar errores por tipo
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.level = "error" }' \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | .errorType' | \
  sort | uniq -c | sort -rn | head -10
```

### 4. Verificar Últimos Deployments

```bash
# Revisar si hubo deployment reciente
aws lambda list-versions-by-function \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --max-items 5 \
  --region us-east-1 | \
  jq '.Versions[] | {Version: .Version, LastModified: .LastModified}'
```

---

## 🔧 Clasificación de Errores 5xx

### **500 - Internal Server Error**
**Causa común**: Bug en código, excepción no manejada

```bash
# Buscar stack traces
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"500"' \
  --start-time $(date -d '15 minutes ago' +%s)000 | \
  jq -r '.events[0].message | fromjson | .errorMessage, .stackTrace'
```

### **502 - Bad Gateway**
**Causa común**: Lambda devuelve respuesta mal formada

```bash
# Verificar formato de respuesta
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"502"' \
  --start-time $(date -d '10 minutes ago' +%s)000 | \
  jq -r '.events[0].message'
```

### **503 - Service Unavailable**
**Causa común**: Circuit breaker abierto, throttling

```bash
# Verificar circuit breaker
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"CircuitOpenError"' \
  --start-time $(date -d '10 minutes ago' +%s)000
```

### **504 - Gateway Timeout**
**Causa común**: Lambda timeout (> 30s API Gateway)

```bash
# Verificar timeouts
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"Task timed out"' \
  --start-time $(date -d '15 minutes ago' +%s)000 | \
  jq '.events | length'
```

---

## 🛠️ Mitigación por Tipo de Error

### **Solución 1: Rollback Inmediato (Si deployment reciente)**

```bash
# Verificar último deployment
LAST_VERSION=$(aws lambda list-versions-by-function \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --region us-east-1 | jq -r '.Versions[-2].Version')

# Rollback a versión anterior
aws lambda update-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --function-version "$LAST_VERSION" \
  --region us-east-1

echo "Rolled back to version $LAST_VERSION"
```

**Efecto**: Inmediato (< 1 min)

### **Solución 2: Aumentar Timeout (Para 504)**

```bash
# Aumentar timeout temporalmente
aws lambda update-function-configuration \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --timeout 60 \
  --region us-east-1
```

**Tiempo de aplicación**: 30-60 segundos

### **Solución 3: Aumentar Memoria (Para errores OOM)**

```bash
# Verificar si hay OutOfMemory errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"Runtime exited with error: signal: killed"' \
  --start-time $(date -d '15 minutes ago' +%s)000

# Si hay OOM, aumentar memoria
aws lambda update-function-configuration \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --memory-size 1536 \
  --region us-east-1
```

### **Solución 4: Deshabilitar Temporalmente Feature Flag**

Si un feature específico está causando errores:

```bash
# Deshabilitar feature problemático
aws ssm put-parameter \
  --name /espacios/features/enable-advanced-validation \
  --value "false" \
  --type String \
  --overwrite \
  --region us-east-1

# Lambda recogerá el cambio en siguiente invocación
```

### **Solución 5: Reducir Concurrency (Para sobrecargas)**

```bash
# Limitar concurrency temporalmente
aws lambda put-function-concurrency \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --reserved-concurrent-executions 20 \
  --region us-east-1
```

---

## 📊 Análisis de Causa Raíz

### Ejemplo 1: Null Pointer Exception

```bash
# Logs típicos
{
  "level": "error",
  "message": "Cannot read property 'id' of undefined",
  "errorType": "TypeError",
  "stackTrace": [
    "at createReserva (/var/task/src/api/business/reservas.js:85:30)"
  ]
}
```

**Causa**: Falta validación de `event.user`  
**Fix rápido**: Agregar validación defensiva

```javascript
// En el handler
const user = event.user || event.requestContext?.authorizer?.jwt?.claims;
if (!user || !user.id) {
  return badRequest('User authentication required');
}
```

### Ejemplo 2: DynamoDB ProvisionedThroughputExceededException

```bash
# Error típico
{
  "errorType": "ProvisionedThroughputExceededException",
  "message": "The level of configured provisioned throughput for the table was exceeded"
}
```

**Causa**: Tabla en PROVISIONED mode sin suficiente capacidad  
**Solución**: Cambiar a PAY_PER_REQUEST (ya está configurado en este proyecto ✅)

### Ejemplo 3: Lambda Cold Start Timeout

```bash
# Pattern de logs
INIT_START Runtime Version: nodejs:22.v3
START RequestId: xyz123
Task timed out after 30.00 seconds
```

**Causa**: Inicialización lenta + timeout bajo  
**Solución**: Usar Provisioned Concurrency o aumentar timeout

---

## 🚨 Protocolo de Emergencia

### Si error rate > 20% (CRÍTICO):

```bash
#!/bin/bash
# emergency-mitigation.sh

echo "🚨 EMERGENCY MODE ACTIVATED"

# 1. Rollback a última versión estable
LAST_STABLE=$(aws lambda list-versions-by-function \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --region us-east-1 | jq -r '.Versions[-2].Version')

aws lambda update-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --function-version "$LAST_STABLE" \
  --region us-east-1

# 2. Habilitar modo de degradación
aws ssm put-parameter \
  --name /espacios/emergency-mode \
  --value "true" \
  --type String \
  --overwrite \
  --region us-east-1

# 3. Notificar equipo
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:critical-alerts \
  --subject "🚨 EMERGENCY: Lambda 5xx errors > 20%" \
  --message "Emergency rollback activated. Error rate: $(date)" \
  --region us-east-1

echo "✅ Emergency mitigation completed"
```

---

## 📈 Monitoreo Post-Mitigación

### Verificar error rate cada minuto (5 minutos):

```bash
# Watch error rate
watch -n 60 'aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1 | jq "[.Datapoints[].Sum] | add"'
```

**Target**: < 5 errores en 5 minutos

### Verificar success rate:

```bash
# Success rate > 99%
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1
```

---

## 🔔 Comunicación

### Template de notificación a usuarios:

```markdown
⚠️ Estamos experimentando problemas técnicos que afectan algunas funciones del sistema.

**Estado**: Investigando
**Impacto**: Operaciones de creación pueden fallar
**ETA**: 15 minutos
**Workaround**: Por favor intente nuevamente en unos minutos

Actualización: [timestamp]
```

### Publicar en status page:

```bash
# Actualizar status
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: Bearer $STATUSPAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "name": "Errores 5xx en API",
      "status": "investigating",
      "impact_override": "major",
      "body": "Estamos investigando errores internos del servidor."
    }
  }'
```

---

## 🚨 Escalación

### Nivel 1: DevOps Engineer (0-5 min)
- ✅ Identificar función y tipo de error
- ✅ Intentar rollback si deployment reciente
- ✅ Aplicar mitigaciones inmediatas

### Nivel 2: Backend Developer (5-15 min)
- ✅ Analizar logs y stack traces
- ✅ Identificar causa raíz en código
- ✅ Preparar hotfix

### Nivel 3: Engineering Manager (15+ min)
- ✅ Coordinar con otros equipos
- ✅ Decidir si activar DR (Disaster Recovery)
- ✅ Comunicación ejecutiva

**Contactos**:
- DevOps On-Call: Slack #incidents
- Backend Lead: @backend-lead
- Engineering Manager: @eng-manager

---

## 📝 Post-Incident Checklist

- [ ] Documentar timeline completo del incidente
- [ ] Identificar causa raíz técnica
- [ ] Crear bug tickets para fixes permanentes
- [ ] Revisar logs y mejorar observabilidad
- [ ] Actualizar runbook con nuevos aprendizajes
- [ ] Realizar retrospectiva con equipo
- [ ] Mejorar tests automatizados

---

## 🔗 Referencias

- [Lambda Console](https://console.aws.amazon.com/lambda/home?region=us-east-1)
- [CloudWatch Logs Insights](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:logs-insights)
- [X-Ray Service Map](https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map)
- [Código de Handlers](../../proyecto/src/handlers/)

---

**Test de runbook**: Mensual  
**Última prueba**: N/A  
**Incidentes resueltos**: 0  
**MTTR promedio**: N/A
