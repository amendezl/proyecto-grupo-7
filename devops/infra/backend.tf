# ========================================
# BACKEND S3 + DYNAMODB LOCK - TERRAFORM STATE
# ========================================

# Este archivo configura los recursos necesarios para el backend remoto de Terraform
# Debe ejecutarse ANTES de configurar el backend en main.tf


# Tabla DynamoDB para locking (prevenir ejecuciones concurrentes)
resource "aws_dynamodb_table" "terraform_lock" {
  name         = "${var.app_name}-terraform-lock-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "${var.app_name}-terraform-lock"
    Purpose     = "Terraform state locking"
    Environment = var.environment
  }

  lifecycle {
    prevent_destroy = false
  }
}

# ========================================
# OUTPUTS
# ========================================

output "terraform_lock_table" {
  description = "Nombre de la tabla DynamoDB para locking"
  value       = aws_dynamodb_table.terraform_lock.id
}

output "backend_configuration" {
  description = "Configuración para copiar en main.tf después del despliegue inicial"
  value       = <<-EOT
    Copiar esta configuración en main.tf después de aplicar este módulo:

    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.terraform_state.id}"
        key            = "devops/terraform.tfstate"
        region         = "${var.aws_region}"
        dynamodb_table = "${aws_dynamodb_table.terraform_lock.id}"
        encrypt        = true
      }
    }

    Luego ejecutar: terraform init -migrate-state
  EOT
}
