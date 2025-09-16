# Despliegue Unificado con Serverless Framework

Este proyecto utiliza Serverless Framework para un despliegue unificado tanto del backend (AWS Lambda) como del frontend (S3 + CloudFront) en un solo comando.

## Estructura del Proyecto

```
proyecto/                # Backend serverless
  serverless.yml         # Configuración unificada de despliegue
  package.json           # Dependencias y scripts
  .env.example           # Ejemplo de variables de entorno
  src/                   # Código fuente del backend
    
frontend/                # Frontend (Next.js, React, etc.)
  package.json           # Dependencias y scripts
  src/                   # Código fuente del frontend
  out/                   # Build del frontend (generado)
```

## Configuración de Variables de Entorno

Antes de desplegar, crea un archivo `.env` en el directorio `proyecto/` basado en `.env.example`:

```bash
cp .env.example .env
# Edita el archivo .env con tus valores
```

Variables importantes:
- `AWS_ACCESS_KEY_ID`: ID de clave de acceso AWS
- `AWS_SECRET_ACCESS_KEY`: Clave de acceso secreta AWS
- `AWS_REGION`: Región AWS (por defecto: us-east-1)
- `JWT_SECRET`: Clave secreta para JWT
- `STAGE`: Entorno de despliegue (dev, staging, prod)

## Despliegue Local

Para desplegar toda la aplicación (backend + frontend) desde tu máquina local:

```bash
# Instala dependencias del backend
cd proyecto
npm install

# Instala dependencias del frontend
cd ../frontend
npm install

# Construye el frontend
npm run build

# Despliega todo desde el directorio del backend
cd ../proyecto
npm run deploy:full
```

Este comando:
1. Construye el frontend
2. Despliega el backend serverless
3. Sincroniza el frontend con S3
4. Configura CloudFront como CDN
5. Invalida la caché de CloudFront

## Entornos de Despliegue

Para desplegar a diferentes entornos:

```bash
# Despliegue a desarrollo (por defecto)
npm run deploy:full

# Despliegue a producción
npm run deploy:full:prod
```

## Despliegue Automático con GitHub Actions

El repositorio incluye un flujo de GitHub Actions que automatiza el despliegue unificado en cada push a las ramas principales:

- `main` → entorno de desarrollo
- `production` → entorno de producción

También permite despliegues manuales a cualquier entorno desde la interfaz de GitHub Actions.

### Secretos Requeridos en GitHub

Configura estos secretos en la configuración de GitHub Actions:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `JWT_SECRET`

## Recursos Desplegados

El despliegue unificado crea todos estos recursos:
- **Backend**: Funciones Lambda, API Gateway, DynamoDB, SQS, SNS
- **Frontend**: Bucket S3, Distribución CloudFront
- **WebSockets**: API Gateway WebSocket, Tabla DynamoDB para conexiones

## Verificación del Despliegue

Para verificar el despliegue:

```bash
cd proyecto
npm run info
```

Este comando mostrará todas las URLs y recursos desplegados.