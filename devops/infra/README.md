# 🏗️ Infraestructura Terraform - Sistema de Gestión de Espacios

Este directorio contiene la definición de infraestructura como código (IaC) usando Terraform para el Sistema de Gestión de Espacios.

## 📁 Estructura de Archivos

```
devops/infra/
├── main.tf                      # Recursos principales (ECR, ECS, CodeBuild, S3)
├── variables.tf                 # Definición de variables de entrada
├── outputs.tf                   # Outputs del módulo
├── backend.tf                   # Configuración de backend S3 + DynamoDB lock
├── chaos_agent_example.tf       # Recursos para chaos engineering (SSM)
├── attach_labrole_policies.tf   # Políticas adicionales para LabRole
├── terraform.tfvars.example     # Ejemplo de valores de variables
└── README.md                    # Este archivo
```

## 🚀 Quick Start

### Prerrequisitos

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configurado con credenciales válidas
- Permisos IAM para crear: ECR, ECS, CodeBuild, S3, CloudWatch, SSM, IAM

### 1. Configurar Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores
```

### 2. Inicializar Terraform (Primera Vez)

```bash
terraform init
```

### 3. Validar Configuración

```bash
terraform fmt -check      # Verificar formato
terraform validate        # Validar sintaxis
terraform plan           # Ver plan de ejecución
```

### 4. Aplicar Infraestructura

```bash
# Desarrollo
terraform apply -var="environment=dev"

# Staging
terraform apply -var="environment=staging"

# Producción (requiere aprobación explícita)
terraform apply -var="environment=prod"
```

## 📋 Variables de Entrada

### Variables Requeridas

Ninguna variable es estrictamente requerida (todas tienen defaults), pero se recomienda personalizar:

| Variable | Descripción | Default | Ejemplo |
|----------|-------------|---------|---------|
| `aws_region` | Región AWS | `us-east-1` | `us-west-2` |
| `environment` | Entorno | `prod` | `dev`, `staging`, `prod` |
| `app_name` | Nombre de la app | `sistema-gestion-espacios` | `mi-app` |

### Variables Opcionales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `monitoring_service_name` | Nombre del servicio de monitoreo | `espacios-monitor` |
| `chaos_image` | Imagen Docker para chaos engineering | `public.ecr.aws/chaos/proxy:latest` |
| `chaos_target` | URL objetivo del proxy de chaos | `http://localhost:3000` |
| `log_retention_days` | Retención de logs (ecs/lambda/codebuild) | `{ecs=30, lambda=14, codebuild=7}` |
| `enable_container_insights` | Habilitar Container Insights | `true` |
| `ecr_image_tag_mutability` | Mutabilidad de tags ECR | `MUTABLE` |
| `ecr_repositories` | Map de repositorios ECR a crear | `{"espacios-monitor" = {...}}` |
| `ecr_lifecycle_keep_count` | Imágenes ECR a mantener (deprecated) | `10` |
| `enable_s3_versioning` | Versionado del bucket S3 | `true` |
| `codebuild_compute_type` | Tipo de instancia CodeBuild | `BUILD_GENERAL1_MEDIUM` |
| `enable_ecr_scan_on_push` | Escaneo ECR automático | `true` |
| `tags` | Tags personalizados adicionales | `{}` |

Ver **[variables.tf](./variables.tf)** para la lista completa con validaciones.

### Ejemplo de ECR Repositories Personalizados

La variable `ecr_repositories` permite gestionar múltiples repositorios ECR:

```hcl
ecr_repositories = {
  "espacios-monitor" = {
    scan_on_push         = true
    lifecycle_keep_count = 10
    description          = "Servicio de monitoreo y métricas"
  }
  "espacios-notifier" = {
    scan_on_push         = true
    lifecycle_keep_count = 7
    description          = "Servicio de notificaciones push"
  }
  "espacios-processor" = {
    scan_on_push         = false
    lifecycle_keep_count = 5
    description          = "Procesador batch de reportes"
  }
}
```

**Uso en CLI**:
```bash
terraform apply \
  -var='ecr_repositories={"espacios-monitor"={scan_on_push=true,lifecycle_keep_count=10,description="Monitoring"}}'
```

### Ejemplo de Tags Personalizados

Los tags personalizados se mezclan con los tags comunes automáticamente:

**Tags Comunes** (automáticos en todos los recursos):
- `Project`: `sistema-gestion-espacios`
- `Environment`: `dev` / `staging` / `prod`
- `ManagedBy`: `terraform`
- `Team`: `devops`
- `Timestamp`: Fecha de creación

**Tags Específicos por Servicio** (automáticos):
- `Service`: `monitoring` / `ci-cd` / `backend`

**Tags Personalizados** (variable `tags`):
```bash
terraform apply \
  -var="environment=prod" \
  -var='tags={"CostCenter"="Engineering","Owner"="john.doe@example.com","Compliance"="SOC2"}'
```

Resultado en recursos:
```json
{
  "Project": "sistema-gestion-espacios",
  "Environment": "prod",
  "ManagedBy": "terraform",
  "Team": "devops",
  "Service": "monitoring",
  "Name": "sistema-gestion-espacios-ecs-logs",
  "CostCenter": "Engineering",
  "Owner": "john.doe@example.com",
  "Compliance": "SOC2"
}
```

## 📤 Outputs

Después de `terraform apply`, puedes consultar los outputs:

```bash
# Ver todos los outputs
terraform output

# Ver un output específico (raw, sin quotes)
terraform output -raw ecr_repository_url

# Ver output en JSON
terraform output -json deployment_summary
```

### Outputs Principales

| Output | Descripción | Uso |
|--------|-------------|-----|
| `ecr_repository_url` | URL del repositorio ECR | Push de imágenes Docker |
| `ecs_cluster_name` | Nombre del cluster ECS | Despliegue de servicios |
| `codebuild_project_name` | Nombre del proyecto CodeBuild | Trigger de builds |
| `artifacts_bucket_name` | Bucket S3 de artifacts | Almacenamiento de builds |
| `log_groups` | Grupos de logs CloudWatch | Monitoreo y debugging |
| `ssm_document_name` | Documento SSM para chaos | Ejecutar chaos experiments |

Ver **[outputs.tf](./outputs.tf)** para ejemplos de uso de cada output.

## 🔗 Usar el dominio de CloudFront

Esta infraestructura crea una distribución de CloudFront delante del bucket de frontend y la protege mediante Origin Access Identity (OAI). Esto significa que el acceso público directo mediante la URL del S3 Website puede devolver `403 Forbidden`.

El dominio de CloudFront generado en esta ejecución es:

```
d3tse7z0pwpydh.cloudfront.net
```

Usa el dominio completo con `https://` para servir el frontend desde CloudFront, p.ej.:

```bash
curl -I https://d3tse7z0pwpydh.cloudfront.net/auth/register/
```

Si quieres reemplazar referencias antiguas al S3 Website en la documentación o scripts, ejecuta desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\replace-s3-with-cloudfront.ps1
```

El script hará backups automáticos en `scripts/replace-backups/`.

## 🏗️ Recursos Creados

### Contenedores y Registry

- **ECR Repository**: Repositorio privado para imágenes Docker
  - Escaneo de vulnerabilidades al push
  - Lifecycle policy (mantiene últimas 10 imágenes tagged)
  - Cifrado AES256

### Compute

- **ECS Cluster**: Cluster para servicios contenedorizados
  - Container Insights habilitado
  - Logging a CloudWatch

### CI/CD

- **CodeBuild Project**: Pipeline de CI/CD
  - Build de imágenes Docker
  - Push automático a ECR
  - Logs en CloudWatch

### Storage

- **S3 Bucket (Artifacts)**: Almacenamiento de artifacts de build
  - Versionado habilitado
  - Cifrado AES256
  - Nombre único con sufijo aleatorio

### Monitoring

- **CloudWatch Log Groups** (gestionados con `for_each`):
  - `/ecs/espacios-monitor` (30 días retención)
  - `/aws/lambda/sistema-gestion-espacios` (14 días retención)
  - `/aws/codebuild/sistema-gestion-espacios` (7 días retención)
  - **Fácil agregar nuevos**: Solo agregar entrada en `locals.log_groups`

### Chaos Engineering (Opcional)

- **SSM Document**: `RunChaosContainer`
  - Ejecuta contenedor de chaos en instancias EC2
  - Proxy transparente con inyección de fallas
- **IAM Policy**: Permisos para pull de imagen ECR

## 🔐 Seguridad

### Principio de Menor Privilegio

Todas las políticas IAM están restringidas a recursos específicos:

```hcl
# ✅ CORRECTO: ARNs específicos
Resource = [
  "arn:aws:logs:${var.aws_region}:*:log-group:/aws/codebuild/${var.app_name}",
  aws_ecr_repository.monitoring_service.arn
]

# ❌ EVITADO: Resource = "*"
```

Excepciones justificadas:
- `ecr:GetAuthorizationToken` (limitación de AWS, requiere `Resource = "*"`)

### Cifrado

- ✅ S3 buckets: AES256 encryption at rest
- ✅ ECR: AES256 encryption
- ✅ CloudWatch Logs: Cifrado por defecto de AWS
- ✅ DynamoDB: Cifrado por defecto

### Bloqueo de Acceso Público

- ✅ S3 buckets: `block_public_acls = true`
- ✅ ECR: Privado por defecto

## 🏷️ Etiquetado

Todos los recursos se etiquetan automáticamente:

```hcl
# Tags por defecto (via provider)
Project     = "sistema-gestion-espacios"
Environment = var.environment
ManagedBy   = "terraform"
Team        = "devops"

# Tags específicas por recurso
Name    = "${var.app_name}-<recurso>"
Service = "monitoring" | "backend" | "ci-cd"
```

## 🔄 Backend Remoto (Recomendado)

### Paso 1: Crear Backend

Primera vez, crear recursos de backend:

```bash
cd devops/infra
terraform init
terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_lock
```

### Paso 2: Configurar Backend en main.tf

Descomentar el bloque `backend "s3"` en `main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "sistema-gestion-espacios-terraform-state-prod"
    key            = "devops/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sistema-gestion-espacios-terraform-lock-prod"
    encrypt        = true
  }
}
```

### Paso 3: Migrar State

```bash
terraform init -migrate-state
```

### Ventajas del Backend Remoto

- ✅ State versionado (S3 versioning)
- ✅ Locking (previene ejecuciones concurrentes)
- ✅ Cifrado en reposo
- ✅ Compartible entre equipo
- ✅ Backup automático

## 🧪 Chaos Engineering

### Ejecutar Chaos Experiment

```bash
# Obtener nombre del documento SSM
SSM_DOC=$(terraform output -raw ssm_document_name)

# Ejecutar en instancias tagged
aws ssm send-command \
  --document-name "$SSM_DOC" \
  --targets "Key=tag:Environment,Values=dev" \
  --comment "Chaos experiment: latency injection" \
  --region us-east-1
```

### Personalizar Chaos Agent

Editar `terraform.tfvars`:

```hcl
chaos_image  = "my-registry/chaos-proxy:v2.0"
chaos_target = "https://api.mi-app.com"
```

## 📊 Monitoreo

### Ver Logs en Tiempo Real

```bash
# Logs de ECS
aws logs tail $(terraform output -json log_groups | jq -r '.ecs') --follow

# Logs de Lambda
aws logs tail $(terraform output -json log_groups | jq -r '.lambda') --follow

# Logs de CodeBuild
aws logs tail $(terraform output -json log_groups | jq -r '.codebuild') --follow
```

### CloudWatch Insights

```sql
-- Query para errores en Lambda
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## 🔧 Comandos Útiles

### Terraform

```bash
# Formatear todos los archivos .tf
terraform fmt -recursive

# Validar configuración
terraform validate

# Ver plan sin aplicar
terraform plan -out=tfplan

# Aplicar plan guardado
terraform apply tfplan

# Ver state actual
terraform show

# Listar recursos en el state
terraform state list

# Importar recurso existente
terraform import aws_ecr_repository.monitoring_service espacios-monitor

# Destruir infraestructura (⚠️ CUIDADO)
terraform destroy -var="environment=dev"
```

### AWS CLI

```bash
# Push a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)

docker tag mi-imagen:latest $(terraform output -raw ecr_repository_url):v1.0.0
docker push $(terraform output -raw ecr_repository_url):v1.0.0

# Listar servicios en ECS
aws ecs list-services --cluster $(terraform output -raw ecs_cluster_name)

# Trigger de CodeBuild
aws codebuild start-build --project-name $(terraform output -raw codebuild_project_name)

# Listar artifacts en S3
aws s3 ls s3://$(terraform output -raw artifacts_bucket_name)
```

## 🛠️ Troubleshooting

### Error: Backend Configuration Changed

```bash
# Re-inicializar con nuevo backend
terraform init -reconfigure
```

### Error: State Lock

```bash
# Si un lock queda huérfano
terraform force-unlock <LOCK_ID>
```

### Error: Insufficient Permissions

Verificar que el usuario/rol IAM tenga permisos para:
- `ecr:*` en el repositorio específico
- `ecs:*` en el cluster específico
- `codebuild:*` en el proyecto específico
- `s3:*` en el bucket de artifacts
- `logs:*` en los log groups específicos

## 🔗 Integración con CI/CD

### GitHub Actions (Recomendado)

Crear workflow `.github/workflows/terraform.yml`:

```yaml
name: Terraform

on:
  pull_request:
    paths:
      - 'devops/infra/**'
  push:
    branches:
      - main
    paths:
      - 'devops/infra/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./devops/infra

    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform fmt
        run: terraform fmt -check

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -no-color
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Solo en main branch
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 📚 Referencias

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS CodeBuild Documentation](https://docs.aws.amazon.com/codebuild/)
- [Terraform Backend S3](https://www.terraform.io/docs/language/settings/backends/s3.html)

## 📝 Changelog

### v1.4.0 - 2025-11-06
- ✨ **NUEVO**: ECR Repositories con `for_each` - Gestión escalable de múltiples repositorios
  - Variable `ecr_repositories` (map) con configuración por repositorio
  - Configuración específica: `scan_on_push`, `lifecycle_keep_count`, `description`
  - 1 repositorio → N repositorios con 5 líneas en tfvars
- ✨ **NUEVO**: Output `ecr_repositories` con URLs y ARNs de todos los repos
- ✨ **MEJORA**: IAM policies automáticamente actualizadas para todos los repos (CodeBuild + Chaos Agent)
- ✨ **MEJORA**: Output `deployment_summary` con map de repositorios
- 🔧 **REFACTOR**: `ecr_lifecycle_keep_count` deprecated (usar `ecr_repositories[].lifecycle_keep_count`)
- 📚 **DOC**: Sección "Agregar Nuevos Repositorios ECR" en README
- 🔧 **REFACTOR**: Total acumulado -110 líneas (-30% del código original)

### v1.3.0 - 2025-11-06
- ✨ **NUEVO**: CloudWatch Logs con `for_each` - 3 recursos → 1 recurso reutilizable
  - Local `log_groups` con configuración centralizada (ecs, lambda, codebuild)
  - Metadata enriquecida: `LogType`, `Description` en tags
  - Fácil agregar nuevos log groups sin duplicar código
- ✨ **MEJORA**: Output `log_groups` ahora retorna objeto completo (name, arn, retention)
- ✨ **MEJORA**: Output `deployment_summary` incluye 3 log groups
- 🔧 **REFACTOR**: Reducción de ~40 líneas adicionales (total -90 líneas)
- 📚 **DOC**: Ejemplos de uso de `for_each` para log groups

### v1.2.0 - 2025-11-06
- ✨ **NUEVO**: Sistema de tags centralizado con `locals` y `merge()`
  - Tags comunes en `local.common_tags` (Project, Environment, ManagedBy, Team, Timestamp)
  - Tags específicos por servicio: `local.monitoring_tags`, `local.cicd_tags`, `local.backend_tags`
  - Variable `tags` para tags personalizados adicionales
- ✨ **NUEVO**: Variable `enable_ecr_scan_on_push` para control de escaneo ECR
- ✨ **NUEVO**: Provider `random` para sufijos únicos de buckets S3
- ✨ **MEJORA**: Valores calculados en `locals` (ARNs, nombres de recursos, flags por entorno)
- ✨ **MEJORA**: Tags en IAM role `codebuild_role`
- 📚 **DOC**: Ejemplos de uso de tags personalizados en README
- 🔧 **REFACTOR**: Reducción de ~50 líneas de tags duplicados

### v1.1.0 - 2025-11-06
- ✅ Variables separadas en `variables.tf`
- ✅ Outputs separados en `outputs.tf` con ejemplos
- ✅ Políticas IAM restringidas (menor privilegio)
- ✅ Backend S3 + DynamoDB configurado
- ✅ Documentación completa en README

### v1.0.0 (2025-10-01)
- Initial release
- ECR, ECS, CodeBuild, S3, CloudWatch

---

**Mantenido por**: DevOps Team  
**Última actualización**: 2025-11-06
