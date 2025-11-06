# 🔄 GUÍA DE ROLLBACK DE DEPLOYMENT

**Severidad**: 🔴 Crítica  
**Tiempo de Ejecución**: 5-15 minutos  
**Última Actualización**: 2025-11-06

---

## 📋 Cuándo Hacer Rollback

### Indicadores de rollback necesario:

| Indicador | Severidad | Acción |
|-----------|-----------|--------|
| Error rate > 20% | 🔴 Inmediato | Rollback automático |
| Error rate 10-20% | 🟠 Urgente | Evaluar en 5 min |
| Latencia > 2x normal | 🟡 Alto | Evaluar en 10 min |
| Funcionalidad crítica rota | 🔴 Inmediato | Rollback inmediato |
| Bug reportado por usuario | 🟢 Medio | Evaluar severidad |

---

## 🎯 Tipos de Rollback

### 1. **Rollback de Lambda (Más común)**
Revertir función serverless a versión anterior

### 2. **Rollback de Stack Completo**
Revertir todo el deployment de CloudFormation

### 3. **Rollback de Frontend (S3)**
Revertir assets estáticos de Next.js

### 4. **Rollback de Infraestructura (Terraform)**
Revertir cambios de infra DevOps

---

## 🚀 ROLLBACK RÁPIDO: Lambda Individual

### Paso 1: Identificar Versión Actual

```bash
# Ver versión actual en producción
aws lambda get-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --region us-east-1 | jq '{
    FunctionVersion: .FunctionVersion,
    RevisionId: .RevisionId
  }'
```

### Paso 2: Listar Versiones Disponibles

```bash
# Ver últimas 5 versiones
aws lambda list-versions-by-function \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --max-items 5 \
  --region us-east-1 | jq '.Versions[] | {
    Version: .Version,
    LastModified: .LastModified,
    Description: .Description
  }'
```

### Paso 3: Rollback a Versión Anterior

```bash
# Obtener versión N-1 (anterior a la actual)
CURRENT_VERSION=$(aws lambda get-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --region us-east-1 | jq -r '.FunctionVersion')

PREVIOUS_VERSION=$(aws lambda list-versions-by-function \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --region us-east-1 | \
  jq -r --arg cv "$CURRENT_VERSION" '.Versions | map(select(.Version != "$LATEST" and .Version != $cv)) | .[-1].Version')

echo "Rolling back from v$CURRENT_VERSION to v$PREVIOUS_VERSION"

# Ejecutar rollback
aws lambda update-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --function-version "$PREVIOUS_VERSION" \
  --region us-east-1

echo "✅ Rollback completed to version $PREVIOUS_VERSION"
```

**Tiempo de ejecución**: 30 segundos  
**Efecto**: Inmediato

### Paso 4: Verificar Rollback

```bash
# Confirmar nueva versión
aws lambda get-alias \
  --function-name sistema-gestion-espacios-prod-createReserva \
  --name prod \
  --region us-east-1 | jq -r '.FunctionVersion'

# Verificar métricas inmediatamente
sleep 60
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '2 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region us-east-1
```

---

## 🔄 ROLLBACK COMPLETO: Serverless Stack

### Opción A: Rollback a Versión Anterior del Stack

```bash
# Ver historial de deployments
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --region us-east-1 | \
  jq '.StackSummaries[] | select(.StackName | contains("sistema-gestion-espacios-prod")) | {
    StackName: .StackName,
    CreationTime: .CreationTime,
    LastUpdatedTime: .LastUpdatedTime
  }' | head -5

# NOTA: CloudFormation no tiene rollback directo a versión anterior
# Opción: Re-desplegar desde commit anterior
```

### Opción B: Re-deploy desde Commit Anterior (Recomendado)

```bash
#!/bin/bash
# rollback-serverless.sh

set -e

# 1. Identificar commit anterior
echo "📋 Git log reciente:"
git log --oneline -5

read -p "Enter commit hash to rollback to: " COMMIT_HASH

# 2. Crear branch de rollback
git checkout -b rollback-to-$COMMIT_HASH $COMMIT_HASH

# 3. Deploy desde ese commit
cd proyecto

echo "🚀 Deploying from commit $COMMIT_HASH..."
npm ci
npx serverless deploy --stage prod --region us-east-1 --verbose

echo "✅ Rollback deployment completed"

# 4. Verificar health
sleep 30
HEALTH_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name sistema-gestion-espacios-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendApiUrl`].OutputValue' \
  --output text)

curl -f "$HEALTH_ENDPOINT/health" && echo "✅ Health check passed" || echo "❌ Health check failed"
```

**Tiempo de ejecución**: 5-8 minutos  
**Riesgo**: Bajo (deployment completo y validado)

### Opción C: Rollback Automático con Serverless Pro

```yaml
# En serverless.yml (si usa Serverless Pro)
provider:
  deploymentMethod: direct
  deploymentSettings:
    type: Linear10PercentEvery1Minute
    alarms:
      - HighErrorRate
    rollbackConfiguration:
      alarms:
        - HighErrorRate
```

---

## 📦 ROLLBACK: Frontend (S3 + Next.js)

### Paso 1: Listar Versiones de S3 (Si versionado habilitado)

```bash
# Verificar versionado
BUCKET_NAME="sistema-gestion-espacios-frontend-prod"

aws s3api get-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --region us-east-1

# Listar versiones de index.html
aws s3api list-object-versions \
  --bucket "$BUCKET_NAME" \
  --prefix "index.html" \
  --max-items 5 \
  --region us-east-1 | jq '.Versions[] | {
    VersionId: .VersionId,
    LastModified: .LastModified,
    IsLatest: .IsLatest
  }'
```

### Paso 2: Restaurar Versión Anterior

```bash
# Obtener version ID anterior
PREVIOUS_VERSION=$(aws s3api list-object-versions \
  --bucket "$BUCKET_NAME" \
  --prefix "index.html" \
  --region us-east-1 | \
  jq -r '.Versions | map(select(.IsLatest == false)) | .[0].VersionId')

# Restaurar todos los archivos desde backup
cd frontend
git checkout HEAD~1 -- out/

# Re-upload
aws s3 sync out/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "max-age=31536000" \
  --region us-east-1

# Invalidar CloudFront (si aplica)
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?DomainName=='$BUCKET_NAME.s3.amazonaws.com']].Id | [0]" \
  --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --region us-east-1
  echo "✅ CloudFront invalidation created"
fi
```

**Tiempo de ejecución**: 3-5 minutos  
**Efecto**: Inmediato (con cache invalidation)

---

## 🏗️ ROLLBACK: Infraestructura (Terraform)

### Paso 1: Ver State Actual

```bash
cd devops/infra

# Ver recursos actuales
terraform show | head -50

# Ver plan de cambios
terraform plan -out=rollback.tfplan
```

### Paso 2: Rollback con Terraform

```bash
# Opción A: Revertir a commit anterior
git log --oneline terraform/ -5
git checkout <COMMIT_HASH> -- terraform/

# Aplicar cambios
terraform plan
read -p "Confirm rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  terraform apply -auto-approve
  echo "✅ Infrastructure rolled back"
fi
```

### Paso 3: Verificar Recursos

```bash
# Verificar ECS service
aws ecs describe-services \
  --cluster sistema-gestion-espacios-cluster \
  --services espacios-monitor-service \
  --region us-east-1 | jq '.services[0].status'

# Verificar ECR repository
aws ecr describe-repositories \
  --repository-names sistema-gestion-espacios/monitor \
  --region us-east-1
```

---

## 📊 ROLLBACK DE EMERGENCIA: Script Todo-en-Uno

```bash
#!/bin/bash
# emergency-rollback.sh
# Rollback completo del sistema

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================"

# 1. Rollback Lambda críticas
FUNCTIONS=(
  "createReserva"
  "getReservas"
  "updateReserva"
  "deleteReserva"
)

for func in "${FUNCTIONS[@]}"; do
  echo "Rolling back $func..."
  
  CURRENT=$(aws lambda get-alias \
    --function-name "sistema-gestion-espacios-prod-$func" \
    --name prod \
    --region us-east-1 | jq -r '.FunctionVersion')
  
  PREVIOUS=$(aws lambda list-versions-by-function \
    --function-name "sistema-gestion-espacios-prod-$func" \
    --region us-east-1 | \
    jq -r --arg cv "$CURRENT" '.Versions | map(select(.Version != "$LATEST" and .Version != $cv)) | .[-1].Version')
  
  aws lambda update-alias \
    --function-name "sistema-gestion-espacios-prod-$func" \
    --name prod \
    --function-version "$PREVIOUS" \
    --region us-east-1 > /dev/null
  
  echo "  ✅ $func: v$CURRENT → v$PREVIOUS"
done

# 2. Habilitar modo de emergencia
echo ""
echo "Enabling emergency mode..."
aws ssm put-parameter \
  --name /espacios/emergency-mode \
  --value "true" \
  --type String \
  --overwrite \
  --region us-east-1 > /dev/null

# 3. Notificar equipo
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:critical-alerts \
  --subject "🚨 Emergency Rollback Executed" \
  --message "Emergency rollback completed at $(date). All critical functions rolled back to previous version." \
  --region us-east-1 > /dev/null

echo ""
echo "✅ EMERGENCY ROLLBACK COMPLETED"
echo "================================"
echo "⏰ Time: $(date)"
echo "📊 Monitoring: https://console.aws.amazon.com/cloudwatch"
echo ""
echo "Next steps:"
echo "1. Monitor error rates for 10 minutes"
echo "2. Verify functionality with smoke tests"
echo "3. Investigate root cause"
echo "4. Document incident"
```

```bash
chmod +x emergency-rollback.sh
./emergency-rollback.sh
```

---

## ✅ VERIFICACIÓN POST-ROLLBACK

### Checklist de Verificación:

```bash
#!/bin/bash
# verify-rollback.sh

echo "🔍 POST-ROLLBACK VERIFICATION"
echo "=============================="

# 1. Error Rate
echo "1. Checking error rate..."
ERROR_COUNT=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '[.Datapoints[].Sum] | add // 0')

if [ "$ERROR_COUNT" -lt 5 ]; then
  echo "  ✅ Error rate OK ($ERROR_COUNT errors in 5 min)"
else
  echo "  ❌ Error rate HIGH ($ERROR_COUNT errors in 5 min)"
fi

# 2. Latency
echo "2. Checking latency..."
AVG_DURATION=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=sistema-gestion-espacios-prod-createReserva \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1 | jq '[.Datapoints[].Average] | add / length')

if (( $(echo "$AVG_DURATION < 500" | bc -l) )); then
  echo "  ✅ Latency OK (${AVG_DURATION}ms average)"
else
  echo "  ⚠️ Latency HIGH (${AVG_DURATION}ms average)"
fi

# 3. Health Endpoint
echo "3. Checking health endpoint..."
API_URL=$(aws ssm get-parameter --name /espacios/api/base-url --query 'Parameter.Value' --output text)
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")

if [ "$HEALTH_STATUS" = "200" ]; then
  echo "  ✅ Health endpoint OK"
else
  echo "  ❌ Health endpoint FAILED (HTTP $HEALTH_STATUS)"
fi

# 4. DynamoDB Throttling
echo "4. Checking DynamoDB throttling..."
THROTTLE_COUNT=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=sistema-gestion-espacios-prod-main \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 | jq '[.Datapoints[].Sum] | add // 0')

if [ "$THROTTLE_COUNT" -eq 0 ]; then
  echo "  ✅ No DynamoDB throttling"
else
  echo "  ⚠️ DynamoDB throttling detected ($THROTTLE_COUNT)"
fi

echo ""
echo "=============================="
echo "Verification complete. Monitor for 10 more minutes."
```

---

## 📝 POST-ROLLBACK CHECKLIST

- [ ] Error rate < 5% confirmado por 10 minutos
- [ ] Latencia vuelve a niveles normales
- [ ] Health checks passing
- [ ] Usuarios confirman que sistema funciona
- [ ] DLQ sin acumulación de mensajes
- [ ] Circuit breakers cerrados
- [ ] Crear ticket de post-mortem
- [ ] Documentar causa raíz
- [ ] Planear fix permanente
- [ ] Actualizar tests automatizados

---

## 🔗 Referencias

- [Lambda Versioning](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
- [CloudFormation Rollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html)
- [Serverless Deployment](https://www.serverless.com/framework/docs/providers/aws/guide/deploying)
- [Terraform State Management](https://www.terraform.io/docs/language/state/index.html)

---

**Última ejecución**: N/A  
**Rollbacks realizados**: 0  
**Tiempo promedio de rollback**: N/A  
**Success rate**: N/A
