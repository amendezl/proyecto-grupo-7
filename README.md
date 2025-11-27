# Sistema de Gestion de Espacios - Guia de Despliegue

Este repositorio monorepo contiene el backend serverless (`proyecto/`), el frontend Next.js (`frontend/`), automatizaciones DevOps (`devops/`) y herramientas de chaos testing (`chaos-engineering/`). Sigue los pasos siguientes para desplegar la solucion en AWS.

## 1. Requisitos previos

- Cuenta AWS con permisos para crear recursos (el rol LabRole de VocLabs funciona).
- AWS CLI v2 configurado en tu maquina.
- Node.js 22.x y npm 10+.
- Git.
- Serverless Framework 4.22 instalado globalmente (`npm install -g serverless@4.22.0`).
- Terraform >= 1.6 (solo si utilizaras `devops/infra`).
- zip/unzip disponibles en tu sistema.

### Instalacion rapida en Ubuntu 24.04

```bash
sudo apt update && sudo apt install -y git curl unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g serverless@4.22.0
```

En Windows instala Node.js 22 desde https://nodejs.org/, Amazon CLI v2 desde https://aws.amazon.com/cli/ y luego ejecuta `npm install -g serverless@4.22.0` en PowerShell.

Comprueba versiones:

```bash
node --version
npm --version
aws --version
serverless --version
terraform --version  # opcional
```

## 2. Configurar credenciales de AWS

```bash
aws configure
aws sts get-caller-identity
```

Usa la region `us-east-1` y el formato `json`.

## 3. Preparar el repositorio

```bash
git clone https://github.com/amendezl/proyecto-grupo-7.git
cd proyecto-grupo-7
cd proyecto && npm ci && cd ..
cd frontend && npm ci && cd ..
cd chaos-engineering && npm ci && cd ..
```

Si trabajas en Windows puedes ejecutar `npm run setup:win` dentro de `proyecto/` para validar requisitos.

## 4. Configurar secretos en SSM (opcional pero recomendado)

Los scripts `proyecto/scripts/setup-ssm-parameters.sh` y `proyecto/scripts/setup-ssm-parameters.ps1` crean los valores esperados por `serverless.yml` (Sentry, JWT, etc.).

```bash
cd proyecto
./scripts/setup-ssm-parameters.sh dev
```

En PowerShell:

```powershell
cd proyecto
./scripts/setup-ssm-parameters.ps1 dev
```

## 5. Provisionar infraestructura base (una sola vez por entorno)

### Opcion A (recomendada): Terraform en `devops/infra`

```bash
cd devops/infra
cp terraform.tfvars.example terraform.tfvars   # personaliza valores
terraform init
terraform apply -var="environment=dev"
terraform output
cd ../..
```

Guarda los outputs (repositorio ECR, bucket de artefactos, nombres de log groups).

### Opcion B: CloudFormation script

```bash
node infrastructure/deploy-infrastructure.js dev
```

El script valida el template y guarda `infrastructure/outputs-dev.json` con los endpoints generados.

## 6. Desplegar backend y frontend

1. Regresa al directorio raiz si no estas ahi: `cd proyecto-grupo-7/proyecto`.
2. Asegura dependencias: `npm ci`.
3. Ejecuta el despliegue:

   ```bash
   npx serverless deploy --stage dev --region us-east-1
   ```

   En PowerShell puedes usar `npm run deploy:ps`. Para otros entornos reemplaza `dev` por `staging` o `prod`.

El hook `after:deploy:deploy` empaqueta el backend, construye el frontend, sincroniza el bucket S3, ejecuta el seeding DynamoDB (`scripts/seed-dynamodb.js`) y corre el smoke test del modulo `chaos-engineering`.

## 7. Verificar el despliegue

```bash
npx serverless info --stage dev --verbose
aws cloudformation describe-stacks --stack-name sistema-gestion-espacios-dev
curl https://<api-id>.execute-api.us-east-1.amazonaws.com/health
aws s3 ls s3://sistema-gestion-espacios-frontend-dev/
```

Nota: Este proyecto ahora sirve el frontend a través de CloudFront con Origin Access Identity (OAI).
El acceso público directo mediante la URL del S3 Website (por ejemplo `http://<bucket>.s3-website-us-east-1.amazonaws.com`) puede devolver `403 Forbidden`
porque la política del bucket permite lectura sólo desde CloudFront. Usa el dominio de CloudFront (HTTPS) que se genera en la salida de Terraform/CloudFormation.

Ejemplo (reemplaza por tu dominio):

```bash
# Comprueba el frontend servido por CloudFront (HTTPS)
curl -I https://d3tse7z0pwpydh.cloudfront.net/
```

Revisa CloudWatch logs si alguna funcion reporta errores:

```bash
npx serverless logs -f healthCheck --stage dev
```

## 8. Actualizar o repetir un despliegue

- Pull de cambios: `git pull origin main`.
- Vuelve a correr `npx serverless deploy --stage dev`.
- Para resembrar datos sin redeploy completo:

  ```bash
  cd proyecto
  DYNAMODB_TABLE=sistema-gestion-espacios-dev-main node scripts/seed-dynamodb.js --stage dev --yes
  ```

## 9. Automatizar con GitHub Actions (opcional)

El repositorio incluye tres flujos listos en `.github/workflows/`:

- `cloud-deployment.yml`: lint del frontend y despliegue unificado con Serverless (se ejecuta en `main` y `production`, o de forma manual con `workflow_dispatch`).
- `deploy-frontend.yml`: build y despliegue del frontend a Vercel cuando hay cambios en `frontend/**` (o a demanda).
- `chaos-deploy.yml`: build de la imagen del módulo de chaos engineering y ejecución remota vía SSM sobre instancias etiquetadas.

Configura los secretos siguientes (usa los que apliquen a tu flujo):

```
AWS_ACCESS_KEY_ID          # requerido por cloud-deployment y chaos-deploy
AWS_SECRET_ACCESS_KEY      # requerido por cloud-deployment y chaos-deploy
AWS_REGION                 # opcional, por defecto us-east-1
VERCEL_TOKEN               # requerido por deploy-frontend
VERCEL_ORG_ID              # requerido por deploy-frontend
VERCEL_PROJECT_ID          # requerido por deploy-frontend
```

## 10. Limpiar recursos

Para retirar el stack serverless:

```bash
cd proyecto
npx serverless remove --stage dev
```

Para destruir la infraestructura creada con Terraform:

```bash
cd devops/infra
terraform destroy -var="environment=dev"
```

Si usaste CloudFormation, elimina el stack:

```bash
aws cloudformation delete-stack --stack-name gestion-espacios-dev
```

## 11. Recursos utiles

- `docs/serverless-deployment-guide.md`: detalles ampliados del pipeline serverless.
- `docs/deployment-pipeline.md`: descripcion del flujo CI/CD.
- `devops/README.md`: resumen de infraestructura y scripts.