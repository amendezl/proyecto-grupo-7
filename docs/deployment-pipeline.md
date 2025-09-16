# Documentación del Pipeline de Despliegue en AWS Cloud

Este documento explica el proceso de CI/CD implementado para el proyecto de Gestión de Espacios Hospitalarios.

## 📋 Requisitos Previos

Para utilizar este pipeline de despliegue, necesitas configurar los siguientes secretos en tu repositorio GitHub:

- `AWS_ACCESS_KEY_ID`: ID de la clave de acceso de AWS
- `AWS_SECRET_ACCESS_KEY`: Clave de acceso secreta de AWS
- `AWS_REGION`: Región de AWS donde se desplegarán los recursos (ej. `us-east-1`)
- `S3_FRONTEND_BUCKET`: Nombre base del bucket S3 donde se desplegará el frontend
- `CLOUDFRONT_DISTRIBUTION_ID`: ID de la distribución CloudFront
- `SLACK_WEBHOOK`: URL del webhook de Slack para notificaciones (opcional)

## 🚀 Proceso de Despliegue

El pipeline de despliegue está configurado para ejecutarse automáticamente en los siguientes casos:

1. **Push a las ramas principales**:
   - `main`: Despliegue al entorno de desarrollo
   - `production`: Despliegue al entorno de producción

2. **Activación manual** a través de la interfaz de GitHub Actions:
   - Selección de entorno: development, staging, production

## 📦 Pasos del Pipeline

### 1. Validación del Código

- Configuración de entorno Python y Node.js
- Instalación de dependencias
- Ejecución de pruebas unitarias
- Verificación de linting

### 2. Despliegue del Backend

- Autenticación en AWS
- Despliegue usando Serverless Framework
- Exportación de URLs de API y WebSocket para el frontend

### 3. Despliegue del Frontend

- Construcción del frontend con las URLs del backend
- Sincronización con el bucket S3
- Invalidación de la caché de CloudFront

### 4. Notificaciones

- Envío de notificaciones a Slack sobre el estado del despliegue

## ⚙️ Variables de Entorno Importantes

El despliegue configura automáticamente estas variables de entorno en el frontend:

- `NEXT_PUBLIC_API_URL`: URL de la API REST
- `NEXT_PUBLIC_WS_URL`: URL del endpoint WebSocket

## 🛠️ Comandos Útiles

Para probar el despliegue localmente:

```bash
# Despliegue del backend
cd proyecto
npm install
npx serverless deploy --stage dev

# Despliegue del frontend
cd frontend
npm install
npm run build
```

## 🔄 Diagrama del Flujo de Despliegue

```
GitHub Push → Validación → Deploy Backend → Deploy Frontend → Notificaciones
```

## 🚨 Solución de Problemas

Si el despliegue falla, verifica:

1. Configuración correcta de los secretos de GitHub
2. Permisos adecuados en la cuenta AWS
3. Estructura correcta del proyecto