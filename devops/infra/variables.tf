# ========================================
# VARIABLES - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

variable "aws_region" {
  description = "Región AWS para desplegar la infraestructura"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]{1}$", var.aws_region))
    error_message = "La región debe seguir el formato estándar de AWS (ej: us-east-1)."
  }
}

variable "environment" {
  description = "Entorno de deployment (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "El entorno debe ser: dev, staging o prod."
  }
}

variable "app_name" {
  description = "Nombre de la aplicación"
  type        = string
  default     = "sistema-gestion-espacios"

  validation {
    condition     = length(var.app_name) <= 50 && can(regex("^[a-z0-9-]+$", var.app_name))
    error_message = "El nombre de la app debe tener máximo 50 caracteres y solo minúsculas, números y guiones."
  }
}

variable "monitoring_service_name" {
  description = "Nombre del servicio de monitoreo"
  type        = string
  default     = "espacios-monitor"
}

variable "chaos_image" {
  description = "Imagen Docker del agente de chaos engineering (formato: registry/repo:tag)"
  type        = string
  default     = "public.ecr.aws/chaos/proxy:latest"

  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z0-9.-]+/[a-z0-9-]+/[a-z0-9-]+:[a-z0-9.-]+$", var.chaos_image))
    error_message = "La imagen debe seguir el formato: registry.domain/namespace/repository:tag"
  }
}

variable "chaos_target" {
  description = "URL objetivo para el proxy de chaos engineering"
  type        = string
  default     = "http://localhost:3000"

  validation {
    condition     = can(regex("^https?://", var.chaos_target))
    error_message = "El target debe ser una URL válida (http:// o https://)."
  }
}

variable "log_retention_days" {
  description = "Días de retención para logs de CloudWatch"
  type = object({
    ecs       = number
    lambda    = number
    codebuild = number
  })
  default = {
    ecs       = 30
    lambda    = 14
    codebuild = 7
  }

  validation {
    condition = alltrue([
      contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days.ecs),
      contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days.lambda),
      contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days.codebuild)
    ])
    error_message = "Los días de retención deben ser valores válidos de CloudWatch."
  }
}

variable "enable_container_insights" {
  description = "Habilitar Container Insights en ECS cluster"
  type        = bool
  default     = true
}

variable "ecr_image_tag_mutability" {
  description = "Mutabilidad de tags en ECR (MUTABLE o IMMUTABLE)"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.ecr_image_tag_mutability)
    error_message = "La mutabilidad debe ser MUTABLE o IMMUTABLE."
  }
}

variable "ecr_lifecycle_keep_count" {
  description = "Número de imágenes tagged a mantener en ECR"
  type        = number
  default     = 10

  validation {
    condition     = var.ecr_lifecycle_keep_count >= 1 && var.ecr_lifecycle_keep_count <= 100
    error_message = "El número de imágenes debe estar entre 1 y 100."
  }
}

variable "tags" {
  description = "Tags adicionales para aplicar a todos los recursos (se mezclan con tags comunes)"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for k, v in var.tags : can(regex("^[a-zA-Z0-9_-]+$", k))])
    error_message = "Las keys de tags solo pueden contener letras, números, guiones y guiones bajos."
  }
}

variable "enable_s3_versioning" {
  description = "Habilitar versionado en bucket S3 de artifacts"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Tags comunes para todos los recursos (se fusionan con default_tags del provider)"
  type        = map(string)
  default     = {}
}

variable "codebuild_compute_type" {
  description = "Tipo de instancia de CodeBuild"
  type        = string
  default     = "BUILD_GENERAL1_MEDIUM"

  validation {
    condition = contains([
      "BUILD_GENERAL1_SMALL",
      "BUILD_GENERAL1_MEDIUM",
      "BUILD_GENERAL1_LARGE",
      "BUILD_GENERAL1_2XLARGE"
    ], var.codebuild_compute_type)
    error_message = "Debe ser un tipo de compute válido de CodeBuild."
  }
}

variable "enable_ecr_scan_on_push" {
  description = "Escanear imágenes ECR automáticamente al hacer push"
  type        = bool
  default     = true
}

variable "ecr_repositories" {
  type = map
  default = {"espacios-monitor"={scan_on_push=true,lifecycle_keep_count=10,description="Monitoring"}}

}

variable "labrole" {
  description = "Role used inside AWS enviroment"
  type = string
  default = ""
  #default = "LabRole"

}

variable "frontend_bucket_name" {
  description = "S3 bucket name that hosts the static frontend (existing)"
  type        = string
  default     = "sistema-gestion-espacios-frontend-dev"
}

variable "api_gateway_domain" {
  description = "Domain name of the API Gateway to use as CloudFront origin (ex: abcd1234.execute-api.us-east-1.amazonaws.com)."
  type        = string
  default     = "mui3vsx73f.execute-api.us-east-1.amazonaws.com"
}