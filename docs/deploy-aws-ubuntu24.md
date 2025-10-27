# Despliegue en AWS (Ubuntu 24.04 LTS) - Serverless Framework

Este documento guía el despliegue del backend Serverless en una instancia EC2 Ubuntu 24.04 LTS (o VM equivalente) utilizando Node.js 22.

## Requisitos previos

- Ubuntu 24.04 LTS con acceso a internet
- Credenciales AWS (Access Key y Secret) con permisos para CloudFormation, Lambda, DynamoDB, Cognito, API Gateway, SNS, SQS
- Dominio opcional para frontend (Netlify/Vercel/S3+CloudFront)

## 1) Instalar Node.js 22 y npm

```bash
# Instalar NVM (opcional pero recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Instalar Node.js 22
nvm install 22
nvm use 22

# Verificar
node -v  # v22.x
npm -v   # 10.x
```

Alternativa sin NVM:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

## 2) Instalar AWS CLI v2

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

# Configurar credenciales
aws configure
# Region sugerida: us-east-1
```

## 3) Instalar Serverless Framework

```bash
npm i -g serverless@^3
sls --version
```

## 4) Clonar el repositorio y preparar proyecto

```bash
# Clonar
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/amendezl/proyecto-grupo-7.git
cd proyecto-grupo-7/proyecto

# Instalar dependencias del backend
npm ci
```

Si vas a habilitar monitoreo SaaS (opcional, Sentry):
```bash
# Variables de entorno opcionales
export SENTRY_DSN="https://<public_key>@o<org>.ingest.sentry.io/<project>"
export SENTRY_TRACES_SAMPLE_RATE="0.1"   # 10% de muestras (ajusta según costo)
export SENTRY_RELEASE="$(git rev-parse --short HEAD)"
```

## 5) Desplegar

```bash
# Despliegue rápido a dev en us-east-1
# Nota: si tu CLI 3.x advierte por nodejs22.x, apunta a una versión 3.x reciente
# (ya dejamos configValidationMode: warn en serverless.yml).
# No uses --disable-configuration-validation (no es una opción válida en 3.40).
serverless deploy --stage dev --region us-east-1

# O usando variables
export STAGE=dev
export REGION=us-east-1
npm run deploy:backend
```

## 6) Verificar

```bash
# Info del stack
serverless info --verbose

# Logs de una función (ejemplo)
serverless logs -f getEspacios -t
```

## 7) Variables importantes del entorno

- JWT_SECRET (opcional: si no se define, se genera una por stage)
- S3_BUCKET_NAME (para assets de frontend si se integra el pipeline)
- SENTRY_DSN (opcional, activa monitoreo SaaS)
- SENTRY_TRACES_SAMPLE_RATE (opcional, 0 a 1)
- AWS_REGION (fallback: us-east-1)

Todas las variables definidas en `provider.environment` dentro de `proyecto/serverless.yml` son inyectadas en las funciones.

## 8) Troubleshooting

- Error de permisos: valida que la IAM del usuario/rol tenga permisos para los servicios usados (CloudFormation, Lambda, DynamoDB, Cognito, API Gateway, SNS, SQS).
- Runtime: Asegúrate que la instancia tiene Node.js 22 (`node -v`). Si el CLI marca advertencia por `nodejs22.x`, actualiza Serverless a 3.x reciente; en `serverless.yml` ya se configuró `configValidationMode: warn`.
- Serverless plugins: ejecuta `npm run verify:plugins` para validar configuración de plugins.
- Región y stage: usa `--stage` y `--region` explícitos si no se inyectan por variables.
- Next.js SWC: si compilas el frontend en la misma VM, ejecuta `npm ci` dentro de `frontend/` para parchear dependencias de SWC.

### Problema: "DOTENV: Loading environment variables..." y luego "Maximum call stack size exceeded"

Esto indica casi siempre que el `.env` tiene referencias circulares o mal formadas. Implementamos una salida segura para no cargar dotenv si no es necesario.

Opciones:

1. Deshabilitar dotenv temporalmente para desplegar:
```bash
export DISABLE_DOTENV=1
serverless deploy --stage dev --region us-east-1
```

2. Eliminar o corregir el `.env` local (evita claves que se autoreferencian, ejemplo: `FOO=${FOO}`).

3. Dependiendo del entorno, setea variables directamente en el shell o en parámetros seguros (SSM/Secrets Manager) y evita `.env` en producción.

### Problema: FATAL ERROR JavaScript heap out of memory durante "Packaging"

Esto ocurre cuando el proceso Node se queda sin heap (memoria) al crear los zips. Mitigaciones:

1) Instalar solo dependencias de producción antes del deploy (reduce node_modules):
```bash
cd ~/proyecto-grupo-7/proyecto
# si aún no hay lockfile, primero:
npm install
# luego reinstala limpio solo prod deps
rm -rf node_modules
npm ci --omit=dev
```

2) Dar más heap a Node solo para el comando de deploy:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npx serverless deploy --stage dev --region us-east-1
```

3) El proyecto ya incluye optimizaciones de empaquetado en `serverless.yml`:
	- `package.individually: true`
	- Lista blanca: solo `src/**`, `package.json`, `package-lock.json`, `serverless-plugins.js`, `node_modules/**`
	- Excluye tests y markdown

Si aún falla en una instancia muy pequeña, sube temporalmente el tamaño de la instancia o ejecuta el deploy desde una máquina con más memoria.

## 9) Limpieza

```bash
serverless remove --stage dev --region us-east-1
```

---

Actualizado: 2025-10-26