# 🚨 RUNBOOK: Alta Latencia en Lambdas (> 500ms)

**Severidad**: 🟡 Media  
**SLA de Respuesta**: 15 minutos  
**Última Actualización**: 2025-11-06

---

## 📊 Síntomas

- ✅ Latencia promedio de Lambda > 500ms
- ✅ Alarma CloudWatch "HighLatency" activada
- ✅ Usuarios reportan lentitud en la aplicación
- ✅ Métricas de CloudWatch muestran incremento en Duration

---

## 🔍 Diagnóstico

### 1. Verificar Métricas de CloudWatch

```bash
# Obtener métricas de latencia de las últimas 2 horas
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --region us-east-1
```

### 2. Revisar Logs Estructurados

```bash
# Buscar logs con alta latencia
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.responseTime > 500 }' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1
```

### 3. Verificar Cold Starts

```bash
# Identificar cold starts
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '"INIT_START"' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1 | jq '.events | length'
```

### 4. Inspeccionar X-Ray Traces

```bash
# Obtener traces con alta latencia
aws xray get-trace-summaries \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --filter-expression 'duration > 0.5' \
  --region us-east-1
```

---

## 🔧 Causas Comunes

| Causa | Probabilidad | Tiempo de Diagnóstico |
|-------|--------------|----------------------|
| **Cold Starts frecuentes** | 40% | 5 min |
| **Throttling de DynamoDB** | 25% | 10 min |
| **Consultas ineficientes a DB** | 20% | 15 min |
| **Falta de memoria** | 10% | 5 min |
| **Problemas de red/VPC** | 5% | 20 min |

---

## 🛠️ Mitigación

### **Solución 1: Cold Starts** (Si > 30% son cold starts)

```bash
# Aumentar Provisioned Concurrency temporalmente
aws lambda put-provisioned-concurrency-config \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --provisioned-concurrent-executions 5 \
  --region us-east-1
```

**Efecto**: Inmediato  
**Costo adicional**: ~$40/mes por función

### **Solución 2: Throttling de DynamoDB**

```bash
# Verificar throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

**Si hay throttling**:
- ✅ DynamoDB está en PAY_PER_REQUEST (on-demand) - escala automáticamente
- ⚠️ Verificar que no haya hot partitions

```bash
# Analizar patrones de acceso
aws dynamodb describe-table \
  --table-name sistema-gestion-espacios-prod-main \
  --region us-east-1 | jq '.Table.ItemCount, .Table.TableSizeBytes'
```

### **Solución 3: Aumentar Memoria de Lambda**

```yaml
# En serverless.yml, ajustar memorySize
functions:
  createReserva:
    memorySize: 1024  # De 512 a 1024 (también aumenta CPU)
```

```bash
# Desplegar cambio
cd proyecto
npx serverless deploy function -f createReserva --stage prod
```

**Tiempo de deployment**: 2-3 minutos

### **Solución 4: Optimizar Consultas**

Revisar logs para identificar consultas lentas:

```bash
# Buscar operaciones de DynamoDB lentas
aws logs filter-log-events \
  --log-group-name /aws/lambda/sistema-gestion-espacios-prod-createReserva \
  --filter-pattern '{ $.commandType = "*" && $.responseTime > 200 }' \
  --start-time $(date -d '30 minutes ago' +%s)000
```

**Optimizaciones comunes**:
- ✅ Usar Query en lugar de Scan
- ✅ Agregar GSI si se consulta por atributos no-key frecuentemente
- ✅ Implementar caching con ElastiCache (si aplica)

### **Solución 5: Habilitar Caching (Temporal)**

```typescript
// En el handler, agregar caching simple
const cache = new Map();
const CACHE_TTL = 60000; // 1 minuto

function getCached(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  const value = await fetchFn();
  cache.set(key, { value, timestamp: Date.now() });
  return value;
}
```

---

## 📈 Monitoreo Post-Mitigación

### Verificar mejora después de 10 minutos:

```bash
# Latencia promedio actual
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average \
  --region us-east-1 | jq '.Datapoints | map(.Average) | add / length'
```

**Target**: < 300ms promedio

---

## 🚨 Escalación

### Nivel 1: DevOps Engineer (0-15 min)
- Aplicar soluciones 1-3
- Monitorear métricas

### Nivel 2: Backend Lead (15-30 min)
- Optimizar queries
- Revisar código de handlers

### Nivel 3: CTO (30+ min)
- Decisiones de arquitectura
- Aprobar cambios de infraestructura mayores

**Contactos**:
- DevOps: devops-oncall@example.com
- Backend Lead: tech-lead@example.com
- CTO: cto@example.com

---

## 📝 Post-Mortem

Después de resolver el incidente:

1. **Documentar causa raíz** en Confluence/Notion
2. **Crear ticket** para solución permanente
3. **Actualizar métricas** de SLO
4. **Review retrospectivo** en próxima reunión de equipo

**Plantilla**: `docs/post-mortem-template.md`

---

## 🔗 Referencias

- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=sistema-gestion-espacios)
- [X-Ray Service Map](https://console.aws.amazon.com/xray/home?region=us-east-1)
- [DynamoDB Metrics](https://console.aws.amazon.com/dynamodb/home?region=us-east-1)
- [Lambda Configuration](https://console.aws.amazon.com/lambda/home?region=us-east-1)

---

**Última ejecución**: N/A  
**Incidentes resueltos**: 0  
**Tiempo promedio de resolución**: N/A
