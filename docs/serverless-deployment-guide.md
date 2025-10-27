# Deployment 100% Serverless - Sistema de Gestión de Espacios

## 🚀 Resumen Ejecutivo

Este documento describe la arquitectura y proceso de deployment **100% serverless** que integra:
- **Backend**: AWS Lambda + DynamoDB + SNS/SQS + WebSocket
- **Frontend**: Next.js → S3 + CloudFront
- **DevOps**: Automation como funciones Lambda
- **Chaos Engineering**: Testing de resiliencia como funciones Lambda
- **Infrastructure**: CloudFormation integrado en Serverless Framework

## 📋 Configuraciones Disponibles

### 1. `serverless-unified.yml` - Configuración Completa
- **95 funciones Lambda** con todas las características
- **Frontend Next.js** con S3 + CloudFront
- **DevOps automation** ejecutándose cada hora
- **Chaos engineering** on-demand vía API
- **Full monitoring** con CloudWatch + SNS alerts
- **Clean Architecture** con SaaS integrations (Sentry)

### 2. `serverless-minimal.yml` - Configuración Para AWS Lab
- **2 funciones Lambda** básicas (health + auth)
- **Sin recursos complejos** (compatible con labs)
- **Mínimas variables de entorno**
- **LabRole predefinido**

### 3. `serverless.yml` - Configuración Standard
- **Configuración intermedia** entre unified y minimal
- **Funciones core** del negocio
- **Split stacks** para deployments grandes

## 🏗️ Arquitectura Serverless

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│  Next.js → S3 Static Hosting → CloudFront Distribution     │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                              │
│  HTTP API Gateway → Lambda Functions → Cognito JWT Auth    │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC                            │
│  Clean Architecture: api/core/infrastructure/shared        │
│  - Authentication (Cognito)                                │
│  - CRUD Operations (Users, Espacios, Reservas)            │
│  - Real-time (WebSocket API)                              │
│  - DevOps Automation (Scheduled Lambda)                   │
│  - Chaos Engineering (On-demand Lambda)                   │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  DynamoDB Tables + SNS Topics + SQS Queues                │
│  - Main Table (PK/SK + GSI)                               │
│  - WebSocket Connections                                   │
│  - Circuit Breaker State                                  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                 MONITORING & OBSERVABILITY                  │
│  CloudWatch Metrics + SNS Alerts + Sentry (SaaS)         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Scripts de Deployment

### 1. Script Principal: `deploy-complete.js`
```bash
# Deployment completo con configuración unified
node scripts/deploy-complete.js dev unified

# Deployment mínimo para AWS labs
node scripts/deploy-complete.js dev minimal

# Deployment estándar
node scripts/deploy-complete.js staging standard
```

### 2. Script de Migración: `migrate-infrastructure.js`
```bash
# Migrar CloudFormation → Serverless
node scripts/migrate-infrastructure.js dev
```

### 3. Deployment Directo con Serverless
```bash
# Configuración completa
npx serverless deploy --config serverless-unified.yml --stage dev --region us-east-1

# Configuración mínima (para labs)
npx serverless deploy --config serverless-minimal.yml --stage dev --region us-east-1
```

## 📦 Integración de Componentes

### DevOps Automation (`src/handlers/devops.js`)
- **Trigger**: CloudWatch Events (cada 60 minutos)
- **Funciones**:
  - Health checks de servicios críticos
  - Recolección de métricas del sistema
  - Alertas automáticas vía SNS
  - Limpieza de recursos temporales
  - Backup de configuraciones críticas

### Chaos Engineering (`src/handlers/chaos.js`)
- **Trigger**: HTTP API POST `/chaos/test`
- **Funciones**:
  - Inyección de latencia simulada
  - Inyección de errores (5% rate)
  - Tests de circuit breaker
  - Tests de recuperación de dependencias
  - Métricas de resiliencia

### Frontend Next.js
- **Build**: `npm run build && npm run export`
- **Upload**: Serverless Finch → S3
- **CDN**: CloudFront distribution automática
- **Variables**: Inyección automática de URLs del backend

### Infrastructure Integration
- **CloudFormation**: Recursos complejos (VPC, RDS) si es necesario
- **Serverless Resources**: Todo lo serverless-native
- **Hybrid Strategy**: CF para base + Serverless para aplicación

## 🌐 Variables de Entorno

### Core Environment Variables
```bash
NODE_ENV=dev|staging|prod
AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
REGION=us-east-1
STAGE=dev

# Authentication
JWT_SECRET=generated-secret
COGNITO_USER_POOL_ID=auto-referenced
COGNITO_CLIENT_ID=auto-referenced

# Database
MAIN_TABLE=auto-referenced
CONNECTIONS_TABLE=auto-referenced
CIRCUIT_STATE_TABLE=auto-referenced

# Messaging
MAIN_QUEUE_URL=auto-referenced
SPACE_NOTIFICATIONS_TOPIC=auto-referenced
SYSTEM_ALERTS_TOPIC=auto-referenced

# WebSocket
WEBSOCKET_ENDPOINT=auto-generated

# Monitoring (SaaS)
SENTRY_DSN=optional
SENTRY_ENVIRONMENT=matching-stage

# Frontend
FRONTEND_BUCKET=auto-referenced
CLOUDFRONT_DISTRIBUTION=auto-referenced
```

## 🎯 Comandos de Deployment por Entorno

### AWS Academy Labs (Permisos Limitados)
```bash
# Setup inicial
export AWS_ACCOUNT_ID=975050051149
cd proyecto

# Deployment mínimo
npx serverless deploy --config serverless-minimal.yml --stage dev --region us-east-1

# Verificar deployment
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/health
```

### Entorno de Desarrollo Completo
```bash
# Setup completo
cd proyecto
npm ci

# Configurar variables opcionales
export SENTRY_DSN=your-sentry-dsn
export JWT_SECRET=your-jwt-secret

# Deployment completo
node scripts/deploy-complete.js dev unified

# Verificar servicios
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/health
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/chaos/test
```

### Entorno de Producción
```bash
# Deployment de producción
export NODE_ENV=production
export SENTRY_DSN=your-production-sentry-dsn

# Deployment con full monitoring
node scripts/deploy-complete.js prod unified

# Setup de monitoreo adicional
aws logs create-log-group --log-group-name /aws/lambda/sistema-gestion-espacios-prod
```

## 📊 Outputs del Deployment

### URLs Generadas Automáticamente
- **API REST**: `https://{api-id}.execute-api.{region}.amazonaws.com`
- **WebSocket**: `wss://{ws-id}.execute-api.{region}.amazonaws.com/{stage}`
- **Frontend**: `https://{bucket}.s3-website-{region}.amazonaws.com`
- **CDN**: `https://{distribution-id}.cloudfront.net`

### Recursos Creados
- **Lambda Functions**: 2-95 dependiendo de la configuración
- **DynamoDB Tables**: 1-3 tablas
- **S3 Buckets**: 1 para frontend
- **CloudFront**: 1 distribución
- **Cognito**: User Pool + Client
- **SNS Topics**: 2-4 topics
- **SQS Queues**: 1-2 queues
- **WebSocket API**: 1 API + Stage

## 🔍 Troubleshooting

### Error: IAM Permissions
```bash
# Verificar permisos
aws sts get-caller-identity

# Usar LabRole en AWS Academy
export AWS_ACCOUNT_ID=975050051149
# El serverless.yml ya está configurado para usar LabRole
```

### Error: Node.js Memory
```bash
# Aumentar memoria para deployment
export NODE_OPTIONS="--max-old-space-size=6144"
```

### Error: Timeout
```bash
# Usar configuración minimal para labs
npx serverless deploy --config serverless-minimal.yml --stage dev --region us-east-1 --verbose
```

### Error: CloudFormation Limits
```bash
# El split-stacks plugin maneja automáticamente stacks grandes
# Si persiste, usar configuración minimal
```

## 🎛️ Monitoreo y Observabilidad

### CloudWatch Dashboards
- Métricas automáticas de Lambda
- Alertas de errores y latencia
- Dashboard unificado por environment

### SNS Notifications
- Alertas de sistema críticas
- Reportes de DevOps automation
- Resultados de chaos engineering

### Sentry Integration (SaaS)
- Error tracking cross-platform
- Performance monitoring
- Release tracking

## 📈 Escalabilidad

### Horizontal Scaling
- **Lambda**: Auto-scaling por defecto
- **DynamoDB**: Pay-per-request billing
- **API Gateway**: Maneja millones de requests

### Vertical Scaling
- **Memory**: Configurable por función (128MB-10GB)
- **Timeout**: Hasta 15 minutos por función
- **Architecture**: ARM64 para mejor performance/cost

### Geographic Scaling
- **CloudFront**: Edge locations globales
- **Multi-region**: Fácil replicación via scripts

## 🔐 Seguridad

### Authentication & Authorization
- **Cognito JWT**: Autenticación moderna
- **API Gateway Authorizers**: Autorización por endpoint
- **IAM Roles**: Permisos granulares por función

### Network Security
- **HTTPS**: Forzado en toda la stack
- **CORS**: Configurado apropiadamente
- **VPC**: Opcional para recursos que lo requieran

### Data Security
- **DynamoDB**: Encryption at rest
- **S3**: Server-side encryption
- **Lambda**: Environment variables encryption

## 📋 Checklist de Deployment

### Pre-deployment
- [ ] Node.js 22.x instalado
- [ ] AWS CLI configurado
- [ ] Serverless Framework disponible
- [ ] Variables de entorno configuradas
- [ ] Estructura de directorios validada

### Deployment
- [ ] Backend desplegado exitosamente
- [ ] Frontend built y uploaded
- [ ] Health check responde OK
- [ ] WebSocket conecta correctamente
- [ ] Autenticación funciona

### Post-deployment
- [ ] Monitoreo configurado
- [ ] Alertas funcionando
- [ ] Chaos engineering tested
- [ ] DevOps automation ejecutándose
- [ ] Documentación actualizada

## 🎯 Próximos Pasos

1. **Testing**: Ejecutar suite completa de tests
2. **Performance**: Optimizar memory/timeout por función
3. **Cost Optimization**: Revisar métricas de uso
4. **Security**: Penetration testing
5. **Monitoring**: Setup de alertas avanzadas
6. **Documentation**: API documentation con OpenAPI
7. **CI/CD**: Integration con GitHub Actions

---

## 📞 Soporte

Para problemas con el deployment serverless:
1. Revisar logs en CloudWatch
2. Verificar IAM permissions
3. Usar configuración minimal para labs
4. Consultar troubleshooting guide
5. Revisar AWS service limits

**Deployment Status**: ✅ Production Ready para entornos completos, ⚠️ Lab Ready para AWS Academy