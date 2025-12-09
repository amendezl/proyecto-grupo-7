# Sistema de Gestión de Espacios - Entrega Final

## 📦 Contenido del Proyecto

Este archivo ZIP contiene el código fuente completo del Sistema de Gestión de Espacios desarrollado para AWS Academy.

### Estructura del Proyecto

```
proyecto-grupo-7/
├── frontend/              # Aplicación Next.js (React + TypeScript)
├── proyecto/              # Backend Serverless (Node.js + Lambda)
├── infrastructure/        # CloudFormation templates
├── devops/               # Scripts de deployment y testing
├── chaos-engineering/    # Módulo de pruebas de caos
├── docs/                 # Documentación técnica
├── scripts/              # Scripts auxiliares de deployment
└── README.md            # Documentación principal
```

## 🚀 Instrucciones de Instalación

### Prerrequisitos

- Node.js 18.x o superior
- AWS CLI configurado
- Cuenta AWS Academy
- Serverless Framework v4

### 1. Instalación de Dependencias

#### Backend
```bash
cd proyecto
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 2. Configuración

#### Variables de Entorno - Backend
Crear archivo `.env` en `proyecto/`:
```
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=<tu-user-pool-id>
COGNITO_CLIENT_ID=<tu-client-id>
DYNAMODB_TABLE=<tu-tabla>
```

#### Variables de Entorno - Frontend
Crear archivo `.env.production.local` en `frontend/`:
```
NEXT_PUBLIC_API_URL=<tu-api-gateway-url>
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<tu-user-pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<tu-client-id>
```

### 3. Deployment

#### Backend (Serverless)
```bash
cd proyecto
npx serverless deploy --stage dev
```

#### Frontend (Next.js)
```bash
cd frontend
npm run build
aws s3 sync out/ s3://<tu-bucket> --delete
```

## 📋 Características Principales

### Sistema Multi-tenant
- Separación por empresa_id
- Usuarios aislados por organización
- Datos segregados en DynamoDB

### Roles y Permisos
- **Admin**: Acceso completo al sistema
- **Responsable**: Gestión de reservas y espacios asignados
- **Usuario**: Vista de reservas propias

### Funcionalidades Core
- ✅ Gestión de Espacios y Zonas
- ✅ Reservas con validación de conflictos
- ✅ Usuarios con integración Cognito
- ✅ Dashboard con estadísticas por rol
- ✅ Reportes y métricas
- ✅ Sistema de multiidioma (10 idiomas)

### Arquitectura AWS
- **Backend**: Lambda + API Gateway
- **Frontend**: S3 + CloudFront
- **Base de Datos**: DynamoDB (single-table design)
- **Autenticación**: Cognito User Pools
- **Monitoreo**: CloudWatch + X-Ray

## 🔧 Scripts Disponibles

### Backend
- `npm run deploy`: Deploy a AWS
- `npm run test`: Ejecutar tests
- `npm run logs`: Ver logs de Lambda

### Frontend
- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run export`: Exportar estático

## 📚 Documentación Adicional

- **README.md**: Documentación principal del proyecto
- **docs/MULTITENANCY.md**: Guía de multi-tenancy
- **docs/MULTITENANCY_QUICKSTART.md**: Quick start
- **PLAN_DE_PRUEBAS.md**: Plan de pruebas del sistema

## 🎯 Casos de Uso Implementados

1. **Gestión de Espacios**: CRUD completo con estados
2. **Sistema de Reservas**: Con validación de disponibilidad
3. **Gestión de Usuarios**: Integración con Cognito
4. **Dashboard Personalizado**: Por rol de usuario
5. **Reportes**: Estadísticas de uso y ocupación

## ⚠️ Notas Importantes

- Este proyecto fue desarrollado para AWS Academy
- Algunos archivos sensibles (.env, credenciales) no están incluidos
- Las carpetas node_modules/ deben instalarse localmente
- Los archivos de estado de Terraform no están incluidos

## 👥 Equipo de Desarrollo

Proyecto Grupo 7 - AWS Academy

## 📄 Licencia

Ver archivo LICENSE para más detalles.

---

**Fecha de Entrega**: Diciembre 2025
**Versión**: 1.0.0
