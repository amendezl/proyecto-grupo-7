# ========================================
# BACKEND S3 + DYNAMODB LOCK - TERRAFORM STATE
# ========================================

# Este archivo configura los recursos necesarios para el backend remoto de Terraform
# Debe ejecutarse ANTES de configurar el backend en main.tf

# Bucket S3 para almacenar el state de Terraform
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.app_name}-terraform-state-${var.environment}"

  tags = {
    Name        = "${var.app_name}-terraform-state"
    Purpose     = "Terraform remote state storage"
    Environment = var.environment
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Versionado del bucket (protección contra borrados accidentales)
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado del bucket (protección de datos sensibles en el state)
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquear acceso público
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy para versiones antiguas
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

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
    prevent_destroy = true
  }
}

# ========================================
# OUTPUTS
# ========================================

output "terraform_state_bucket" {
  description = "Nombre del bucket S3 para el state de Terraform"
  value       = aws_s3_bucket.terraform_state.id
}

output "terraform_lock_table" {
  description = "Nombre de la tabla DynamoDB para locking"
  value       = aws_dynamodb_table.terraform_lock.id
}

output "backend_configuration" {
  description = "Configuración para copiar en main.tf después del despliegue inicial"
  value = <<-EOT
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
