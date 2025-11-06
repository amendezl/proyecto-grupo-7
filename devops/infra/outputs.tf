# ========================================
# OUTPUTS - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

output "ecr_repositories" {
  description = "Map de repositorios ECR creados con URLs y ARNs"
  value = {
    for key, repo in aws_ecr_repository.services : key => {
      url = repo.repository_url
      arn = repo.arn
      name = repo.name
    }
  }
  
  # Ejemplo de uso:
  # terraform output -json ecr_repositories | jq -r '.["espacios-monitor"].url'
  # docker tag mi-imagen:latest $(terraform output -json ecr_repositories | jq -r '.["espacios-monitor"].url'):v1.0.0
  # docker push $(terraform output -json ecr_repositories | jq -r '.["espacios-monitor"].url'):v1.0.0
}

output "ecr_repository_url" {
  description = "URL del primer repositorio ECR (deprecated: usar ecr_repositories)"
  value       = values(aws_ecr_repository.services)[0].repository_url
  
  # Ejemplo de uso:
  # docker tag mi-imagen:latest $(terraform output -raw ecr_repository_url):v1.0.0
  # docker push $(terraform output -raw ecr_repository_url):v1.0.0
}

output "ecr_repository_arn" {
  description = "ARN del primer repositorio ECR (deprecated: usar ecr_repositories)"
  value       = values(aws_ecr_repository.services)[0].arn
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.monitoring_cluster.name
  
  # Ejemplo de uso:
  # aws ecs list-services --cluster $(terraform output -raw ecs_cluster_name)
}

output "ecs_cluster_arn" {
  description = "ARN del cluster ECS"
  value       = aws_ecs_cluster.monitoring_cluster.arn
}

output "codebuild_project_name" {
  description = "Nombre del proyecto CodeBuild"
  value       = aws_codebuild_project.main.name
  
  # Ejemplo de uso:
  # aws codebuild start-build --project-name $(terraform output -raw codebuild_project_name)
}

output "codebuild_project_arn" {
  description = "ARN del proyecto CodeBuild"
  value       = aws_codebuild_project.main.arn
}

output "codebuild_role_arn" {
  description = "ARN del rol IAM de CodeBuild (útil para otorgar permisos adicionales)"
  value       = aws_iam_role.codebuild_role.arn
}

output "artifacts_bucket_name" {
  description = "Nombre del bucket S3 para artifacts"
  value       = aws_s3_bucket.artifacts.id
  
  # Ejemplo de uso:
  # aws s3 ls s3://$(terraform output -raw artifacts_bucket_name)
}

output "artifacts_bucket_arn" {
  description = "ARN del bucket S3 de artifacts"
  value       = aws_s3_bucket.artifacts.arn
}

output "log_groups" {
  description = "Grupos de logs de CloudWatch creados (map con name, arn, retention)"
  value = {
    for key, lg in aws_cloudwatch_log_group.main : key => {
      name              = lg.name
      arn               = lg.arn
      retention_in_days = lg.retention_in_days
    }
  }
  
  # Ejemplo de uso:
  # terraform output -json log_groups | jq -r '.ecs.name'
  # aws logs tail $(terraform output -json log_groups | jq -r '.ecs.name') --follow
}

output "log_group_arns" {
  description = "ARNs de los grupos de logs de CloudWatch (deprecated, usar log_groups)"
  value = {
    for key, lg in aws_cloudwatch_log_group.main : key => lg.arn
  }
}

output "ssm_document_name" {
  description = "Nombre del documento SSM para ejecutar el contenedor de chaos"
  value       = aws_ssm_document.run_chaos_container.name
  
  # Ejemplo de uso:
  # aws ssm send-command \
  #   --document-name $(terraform output -raw ssm_document_name) \
  #   --targets "Key=tag:Environment,Values=dev" \
  #   --region us-east-1
}

output "chaos_policy_arn" {
  description = "ARN de la política IAM para ECR pull (chaos agent)"
  value       = aws_iam_policy.ecr_pull_policy_for_chaos.arn
}

output "environment_info" {
  description = "Información del entorno desplegado"
  value = {
    region      = var.aws_region
    environment = var.environment
    app_name    = var.app_name
  }
}

output "deployment_summary" {
  description = "Resumen completo del deployment para referencia rápida"
  value = {
    ecr_repositories      = { for k, v in aws_ecr_repository.services : k => v.repository_url }
    ecs_cluster           = aws_ecs_cluster.monitoring_cluster.name
    codebuild_project     = aws_codebuild_project.main.name
    artifacts_bucket      = aws_s3_bucket.artifacts.id
    log_group_ecs         = aws_cloudwatch_log_group.main["ecs"].name
    log_group_lambda      = aws_cloudwatch_log_group.main["lambda"].name
    log_group_codebuild   = aws_cloudwatch_log_group.main["codebuild"].name
    ssm_document          = aws_ssm_document.run_chaos_container.name
  }
}

# Output sensible (marcado como sensitive para no mostrarlo en logs)
output "codebuild_role_name" {
  description = "Nombre del rol IAM de CodeBuild (sensible para auditoría)"
  value       = aws_iam_role.codebuild_role.name
  sensitive   = false
}
