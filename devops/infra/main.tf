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
# VARIABLES
# ========================================

variable "aws_region" {
  description = "Región AWS para desplegar la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno de deployment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Nombre de la aplicación"
  type        = string
  default     = "sistema-gestion-espacios"
}

variable "monitoring_service_name" {
  description = "Nombre del servicio de monitoreo"
  type        = string
  default     = "espacios-monitor"
}

# ========================================
# ECR REPOSITORIES
# ========================================

# Repositorio ECR para el servicio de monitoreo
resource "aws_ecr_repository" "monitoring_service" {
  name                 = var.monitoring_service_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.app_name}-monitoring"
    Service     = "monitoring"
    Environment = var.environment
  }
}

# Política de lifecycle para ECR
resource "aws_ecr_lifecycle_policy" "monitoring_service" {
  repository = aws_ecr_repository.monitoring_service.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Mantener últimas 10 imágenes tagged"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
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

# Log group para ECS (servicio de monitoreo)
resource "aws_cloudwatch_log_group" "ecs_monitoring" {
  name              = "/ecs/${var.monitoring_service_name}"
  retention_in_days = 30

  tags = {
    Name        = "${var.app_name}-ecs-logs"
    Service     = "monitoring"
    Environment = var.environment
  }
}

# Log group para Lambda functions (serverless backend)
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.app_name}"
  retention_in_days = 14

  tags = {
    Name        = "${var.app_name}-lambda-logs"
    Service     = "backend"
    Environment = var.environment
  }
}

# Log group para CodeBuild
resource "aws_cloudwatch_log_group" "codebuild_logs" {
  name              = "/aws/codebuild/${var.app_name}"
  retention_in_days = 7

  tags = {
    Name        = "${var.app_name}-codebuild-logs"
    Service     = "ci-cd"
    Environment = var.environment
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
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_monitoring.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.app_name}-ecs-cluster"
    Service     = "monitoring"
    Environment = var.environment
  }
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
}

# Política IAM para CodeBuild
resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.app_name}-codebuild-policy"
  role = aws_iam_role.codebuild_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:GetAuthorizationToken",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:CreateRepository",
          "ecr:DescribeRepositories",
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "*"
      }
    ]
  })
}

# Proyecto CodeBuild
resource "aws_codebuild_project" "main" {
  name          = var.app_name
  description   = "Pipeline CI/CD para Sistema de Gestión de Espacios"
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                      = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = true
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "devops/pipeline/buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild_logs.name
    }
  }

  tags = {
    Name        = "${var.app_name}-codebuild"
    Service     = "ci-cd"
    Environment = var.environment
  }
}

# ========================================
# S3 BUCKET PARA ARTIFACTS
# ========================================

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.app_name}-artifacts-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.app_name}-artifacts"
    Service     = "ci-cd"
    Environment = var.environment
  }
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
# OUTPUTS
# ========================================

output "ecr_repository_url" {
  description = "URL del repositorio ECR para el servicio de monitoreo"
  value       = aws_ecr_repository.monitoring_service.repository_url
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.monitoring_cluster.name
}

output "codebuild_project_name" {
  description = "Nombre del proyecto CodeBuild"
  value       = aws_codebuild_project.main.name
}

output "artifacts_bucket_name" {
  description = "Nombre del bucket S3 para artifacts"
  value       = aws_s3_bucket.artifacts.id
}

output "log_groups" {
  description = "Grupos de logs de CloudWatch creados"
  value = {
    ecs       = aws_cloudwatch_log_group.ecs_monitoring.name
    lambda    = aws_cloudwatch_log_group.lambda_logs.name
    codebuild = aws_cloudwatch_log_group.codebuild_logs.name
  }
}
