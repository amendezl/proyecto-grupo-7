# 📚 Runbooks de Incidentes - Sistema de Gestión de Espacios

**Versión**: 1.0.0  
**Última Actualización**: 2025-11-06  
**Equipo**: DevOps + Backend

---

## 📋 Índice de Runbooks

| Runbook | Severidad | SLA | Archivo |
|---------|-----------|-----|---------|
| **Alta Latencia (> 500ms)** | 🟡 Media | 15 min | [high-latency.md](./high-latency.md) |
| **Circuit Breaker Abierto** | 🔴 Alta | 5 min | [circuit-breaker-open.md](./circuit-breaker-open.md) |
| **DLQ Llena** | 🟠 Alta | 10 min | [dlq-overflow.md](./dlq-overflow.md) |
| **Errores 5xx** | 🔴 Crítica | 5 min | [lambda-5xx-errors.md](./lambda-5xx-errors.md) |
| **DynamoDB Throttling** | 🟠 Alta | 10 min | [dynamodb-throttling.md](./dynamodb-throttling.md) |
| **Rollback de Deployment** | 🔴 Crítica | 5-15 min | [deployment-rollback.md](./deployment-rollback.md) |

---

## 🚨 Guía Rápida de Respuesta a Incidentes

### 1. **Identificar el Problema**

```bash
# Dashboard principal
open https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=sistema-gestion-espacios

# Ver alarmas activas
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --region us-east-1 | jq '.MetricAlarms[] | {Name: .AlarmName, Reason: .StateReason}'
```

### 2. **Determinar Severidad**

| Síntoma | Severidad | Runbook |
|---------|-----------|---------|
| Error rate > 20% | 🔴 Crítica | [Errores 5xx](./lambda-5xx-errors.md) |
| Circuit breaker abierto | 🔴 Alta | [Circuit Breaker](./circuit-breaker-open.md) |
| DLQ > 50 mensajes | 🟠 Alta | [DLQ Overflow](./dlq-overflow.md) |
| Latencia > 1000ms | 🟡 Media | [Alta Latencia](./high-latency.md) |
| DynamoDB throttling | 🟠 Alta | [DynamoDB Throttling](./dynamodb-throttling.md) |

### 3. **Ejecutar Runbook Apropiado**

Sigue el runbook paso a paso. Cada runbook incluye:
- ✅ Diagnóstico rápido
- ✅ Comandos ejecutables
- ✅ Mitigaciones inmediatas
- ✅ Verificación post-mitigación
- ✅ Escalación si es necesario

### 4. **Comunicar Estado**

```bash
# Template de mensaje
cat > /tmp/incident-msg.txt << EOF
🚨 INCIDENT: [Tipo de incidente]
Severidad: [Crítica/Alta/Media]
Estado: [Investigando/Mitigando/Resuelto]
Impacto: [Descripción del impacto]
ETA: [Tiempo estimado de resolución]
Próxima actualización: [En X minutos]
EOF

# Publicar en Slack/SNS
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:incident-updates \
  --subject "Incident Update" \
  --message file:///tmp/incident-msg.txt \
  --region us-east-1
```

---

## 🔧 Herramientas Esenciales

### Scripts de Diagnóstico Rápido

#### 1. Health Check Global
```bash
#!/bin/bash
# quick-health-check.sh

echo "🏥 QUICK HEALTH CHECK"
echo "===================="

# Lambda error rate
echo "1. Lambda Errors (last 5 min):"
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '[.Datapoints[].Sum] | add // 0'

# DynamoDB throttling
echo "2. DynamoDB Throttling:"
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '[.Datapoints[].Sum] | add // 0'

# DLQ depth
echo "3. DLQ Messages:"
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name sistema-gestion-espacios-prod-dlq --query 'QueueUrl' --output text) \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1 | jq '.Attributes.ApproximateNumberOfMessages'

# Circuit breaker status
echo "4. Circuit Breaker State:"
aws dynamodb scan \
  --table-name sistema-gestion-espacios-prod-circuit-state \
  --region us-east-1 | jq -r '.Items[] | "\(.serviceName.S): \(.state.S)"'

echo "===================="
```

#### 2. Log Analyzer
```bash
#!/bin/bash
# analyze-errors.sh

FUNCTION_NAME=${1:-"sistema-gestion-espacios-prod-createReserva"}
MINUTES=${2:-15}

echo "📊 Analyzing errors for $FUNCTION_NAME (last $MINUTES minutes)"

aws logs filter-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-pattern '{ $.level = "error" }' \
  --start-time $(date -d "$MINUTES minutes ago" +%s)000 \
  --region us-east-1 | \
  jq -r '.events[] | .message | fromjson | "\(.timestamp) [\(.errorType)] \(.errorMessage)"' | \
  head -20
```

---

## 📞 Contactos de Escalación

### Nivel 1: DevOps Engineer (0-15 min)
- **On-Call**: Consultar PagerDuty/OpsGenie
- **Slack**: #devops-oncall
- **Responsabilidad**: Diagnóstico inicial y mitigación

### Nivel 2: Backend Lead (15-30 min)
- **Email**: backend-lead@example.com
- **Slack**: @backend-lead
- **Responsabilidad**: Análisis de código y fixes

### Nivel 3: Engineering Manager (30+ min)
- **Email**: eng-manager@example.com
- **Phone**: +1-XXX-XXX-XXXX
- **Responsabilidad**: Decisiones arquitectónicas y comunicación ejecutiva

### AWS Support
- **Caso Premium**: [Crear caso](https://console.aws.amazon.com/support/home)
- **TAM Contact**: (si aplica)

---

## 📊 Métricas y SLOs

### Service Level Objectives (SLOs)

| Métrica | Target | Runbook si se incumple |
|---------|--------|------------------------|
| **Availability** | > 99.5% | [Errores 5xx](./lambda-5xx-errors.md) |
| **Latency (P95)** | < 500ms | [Alta Latencia](./high-latency.md) |
| **Error Rate** | < 1% | [Errores 5xx](./lambda-5xx-errors.md) |
| **DLQ Depth** | < 10 mensajes | [DLQ Overflow](./dlq-overflow.md) |

### Dashboard Principal

```bash
# Crear dashboard consolidado
aws cloudwatch put-dashboard \
  --dashboard-name sistema-gestion-espacios-overview \
  --dashboard-body file://$(dirname "$0")/../monitoring/cloudwatch/dashboard-sistema-gestion.json \
  --region us-east-1
```

**URL**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=sistema-gestion-espacios

---

## 🧪 Testing de Runbooks

### Drill Trimestral

Ejecutar simulaciones de cada runbook:

```bash
# Calendario de drills
Q1 2025: Alta Latencia + DLQ Overflow
Q2 2025: Circuit Breaker + Errores 5xx
Q3 2025: DynamoDB Throttling + Rollback
Q4 2025: Todos (disaster recovery completo)
```

### Checklist de Drill:
- [ ] Runbook ejecutable de principio a fin
- [ ] Comandos funcionan correctamente
- [ ] Tiempos de mitigación dentro de SLA
- [ ] Documentación actualizada
- [ ] Contactos de escalación vigentes
- [ ] Herramientas disponibles y configuradas

---

## 📝 Mejora Continua

### Post-Mortem Template

Después de cada incidente:

1. **Timeline**: Hora de detección, mitigación, resolución
2. **Root Cause**: Causa técnica raíz
3. **Impact**: Usuarios afectados, downtime, pérdida de datos
4. **Mitigation**: Acciones tomadas
5. **Prevention**: ¿Cómo prevenir en el futuro?
6. **Action Items**: Tickets creados para mejoras

**Template**: `docs/post-mortem-template.md`

### Actualización de Runbooks

- ✅ Después de cada incidente: Actualizar runbook usado
- ✅ Quarterly: Revisar todos los runbooks
- ✅ Anual: Validar herramientas y contactos

---

## 🔗 Referencias

### Documentación del Sistema
- [README Principal](../../README.md)
- [Guía de Deployment](../../docs/unified-deployment.md)
- [Implementation Guide](../docs/IMPLEMENTATION_GUIDE.md)

### AWS Documentation
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)

### Herramientas
- [AWS Console](https://console.aws.amazon.com/)
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1)
- [X-Ray Service Map](https://console.aws.amazon.com/xray/home?region=us-east-1)

---

## 📌 Quick Commands Cheatsheet

```bash
# Ver alarmas activas
aws cloudwatch describe-alarms --state-value ALARM --region us-east-1

# Tail logs en tiempo real
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Error rate última hora
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Sum

# Rollback Lambda
aws lambda update-alias --function-name FUNCTION_NAME --name prod --function-version PREVIOUS_VERSION

# Health check
curl -f https://api.sistema-espacios.com/health
```

---

**Mantenido por**: Equipo DevOps  
**Última revisión**: 2025-11-06  
**Próxima revisión**: 2026-02-06
