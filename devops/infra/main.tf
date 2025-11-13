# ========================================
# INFRAESTRUCTURA DEVOPS - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Configurar S3 backend para state remoto (opcional)
  # backend "s3" {
  #   bucket = "sistema-espacios-terraform-state"
  #   key    = "devops/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "sistema-gestion-espacios"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "devops"
    }
  }
}

# ========================================
# LOCALS - VALORES CALCULADOS Y TAGS
# ========================================

locals {
  # Tags comunes para todos los recursos
  common_tags = merge(
    {
      Project     = "sistema-espacios"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "devops"
    },
    var.tags
  )

  # Tags específicos por servicio
  monitoring_tags = merge(
    local.common_tags,
    {
      Service = "monitoring"
    }
  )

  cicd_tags = merge(
    local.common_tags,
    {
      Service = "ci-cd"
    }
  )

  backend_tags = merge(
    local.common_tags,
    {
      Service = "backend"
    }
  )

  # Nombres de recursos calculados
  codebuild_project_name = "${var.app_name}-${var.environment}"
  ecs_cluster_name       = "${var.app_name}-cluster"

  # ARNs base para políticas IAM
  cloudwatch_log_arn_prefix = "arn:aws:logs:${var.aws_region}:*:log-group"
  ssm_parameter_arn_prefix  = "arn:aws:ssm:${var.aws_region}:*:parameter/sistema-gestion/${var.environment}"

  # Configuración por entorno
  is_production = var.environment == "prod"
  enable_backup = local.is_production
}

# ========================================
# RECURSOS PRINCIPALES
# (Variables ahora definidas en variables.tf)
# (Outputs ahora definidos en outputs.tf)
# ========================================

# ========================================
# ECR REPOSITORIES
# ========================================

# Repositorios ECR para servicios containerizados (gestionados con for_each)
resource "aws_ecr_repository" "services" {
  for_each = var.ecr_repositories

  name                 = each.key
  image_tag_mutability = var.ecr_image_tag_mutability

  image_scanning_configuration {
    scan_on_push = each.value.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(
    local.monitoring_tags,
    {
      Name        = "${var.app_name}-${each.key}"
      Repository  = each.key
      Description = each.value.description
    }
  )
}

# Políticas de lifecycle para ECR (gestionadas con for_each)
resource "aws_ecr_lifecycle_policy" "services" {
  for_each = aws_ecr_repository.services

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Mantener últimas ${var.ecr_repositories[each.key].lifecycle_keep_count} imágenes tagged"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = var.ecr_repositories[each.key].lifecycle_keep_count
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Mantener imágenes untagged por 1 día"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ========================================
# CLOUDWATCH LOGS
# ========================================

# Configuración centralizada de log groups
locals {
  log_groups = {
    ecs = {
      name              = "/ecs/${var.monitoring_service_name}"
      retention_in_days = var.log_retention_days.ecs
      service_tags      = local.monitoring_tags
      description       = "ECS monitoring service logs"
    }
    lambda = {
      name              = "/aws/lambda/${var.app_name}"
      retention_in_days = var.log_retention_days.lambda
      service_tags      = local.backend_tags
      description       = "Lambda functions (serverless backend)"
    }
    codebuild = {
      name              = "/aws/codebuild/${var.app_name}"
      retention_in_days = var.log_retention_days.codebuild
      service_tags      = local.cicd_tags
      description       = "CodeBuild pipeline logs"
    }
  }
}

# Log groups creados dinámicamente con for_each
resource "aws_cloudwatch_log_group" "main" {
  for_each = local.log_groups

  name              = each.value.name
  retention_in_days = each.value.retention_in_days

  tags = {
    Name        = "${each.key}-logs"
    LogType     = each.key
    Project     = "espacios"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ========================================
# ECS CLUSTER Y SERVICIOS
# ========================================

# Cluster ECS para el servicio de monitoreo
resource "aws_ecs_cluster" "monitoring_cluster" {
  name = "${var.app_name}-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.main["ecs"].name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(
    local.monitoring_tags,
    {
      Name = "${var.app_name}-cluster"
    }
  )
}

# ========================================
# CODEBUILD PROJECT
# ========================================

# Rol IAM para CodeBuild
resource "aws_iam_role" "codebuild_role" {
  name = "${var.app_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.cicd_tags,
    {
      Name = "${var.app_name}-codebuild-role"
    }
  )
}

# Política IAM para CodeBuild (restringida con menor privilegio)
resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.app_name}-codebuild-policy"
  role = aws_iam_role.codebuild_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs - Limitado a logs de CodeBuild
      {
        Sid    = "CloudWatchLogsAccess"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/codebuild/${var.app_name}",
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/codebuild/${var.app_name}:*"
        ]
      },
      # ECR Repository Access - Limitado a repositorios del proyecto
      {
        Sid    = "ECRRepositoryAccess"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = [
          for repo in aws_ecr_repository.services : repo.arn
        ]
      },
      # ECR GetAuthorizationToken requiere Resource = "*"
      {
        Sid      = "ECRAuthorizationToken"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      # SSM Parameter Store - Limitado al namespace de la app
      {
        Sid    = "SSMParameterAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/sistema-gestion/${var.environment}/*"
        ]
      }
    ]
  })
}

# Proyecto CodeBuild
resource "aws_codebuild_project" "main" {
  name         = var.app_name
  description  = "Pipeline CI/CD para Sistema de Gestión de Espacios"
  service_role = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "devops/pipeline/buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.main["codebuild"].name
    }
  }

  tags = merge(
    local.cicd_tags,
    {
      Name = "${var.app_name}-codebuild"
    }
  )
}

# ========================================
# S3 BUCKET PARA ARTIFACTS
# ========================================

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.app_name}-artifacts-${random_string.bucket_suffix.result}"

  tags = merge(
    local.cicd_tags,
    {
      Name = "${var.app_name}-artifacts"
    }
  )
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# ========================================
# OUTPUTS MOVIDOS A outputs.tf
# ========================================
# Ver archivo outputs.tf para todos los outputs del módulo
