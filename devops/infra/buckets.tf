# ========================================
# BUCKETS S3 
# ========================================
#Creacion de todos los buckets necesarios para el deployment

# Get current AWS account ID for IAM principal in bucket policy

resource "random_string" "bucket_suffix" {
  length  = 8
  upper   = false
  special = false
}

# S3 BUCKET PARA ARTIFACTS
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


# Bucket S3 para almacenar el state de Terraform
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.app_name}-terraform-state-${var.environment}-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.app_name}-terraform-state"
    Purpose     = "Terraform remote state storage"
    Environment = var.environment
  }

  lifecycle {
    prevent_destroy = false
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

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}





# === FRONTEND S3 BUCKET ===
# Bucket S3 para almacenar el sitio estático del frontend
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.app_name}-frontend-${var.environment}-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.app_name}-frontend"
    Purpose     = "Frontend static site hosting"
    Environment = var.environment
  }

  # The bucket you tried to delete is not empty. You must delete all versions in the bucket.
  force_destroy = true
  lifecycle {
    prevent_destroy = false
  }
}

# Versionado del bucket frontend
resource "aws_s3_bucket_versioning" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado del bucket frontend
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquear acceso público del bucket frontend
resource "aws_s3_bucket_public_access_block" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

    #CAMBIAR A TRUE DESPUES
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Lifecycle policy para el bucket frontend
resource "aws_s3_bucket_lifecycle_configuration" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# === CLOUDFRONT OAI AND BUCKET POLICY ===
# CloudFront Origin Access Identity (OAI) - Permite solo a CloudFront acceder a S3
# Incluye controles de seguridad para producción


# S3 Bucket Policy - Allows CloudFront + deployment, but denies public access
resource "aws_s3_bucket_policy" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontReadForGetBucketObjects"
        Effect = "Allow"
        Principal = {
          CanonicalUser = aws_cloudfront_origin_access_identity.frontend_oai.s3_canonical_user_id
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
      {
        Sid       = "AllowDeploymentUploads"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.frontend_bucket.arn}/*",
          aws_s3_bucket.frontend_bucket.arn
        ]
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          "${aws_s3_bucket.frontend_bucket.arn}/*",
          aws_s3_bucket.frontend_bucket.arn
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyPublicAccess"
        Effect    = "Deny"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringNotEquals = {
            "aws:SourceVpc" = aws_cloudfront_origin_access_identity.frontend_oai.s3_canonical_user_id
          }
          StringLike = {
            "aws:userid" = "!*:serverless"
          }
        }
      }
    ]
  })
}



# === OUTPUTS ===
output "terraform_state_bucket" {
  description = "Nombre del bucket S3 para el state de Terraform"
  value       = aws_s3_bucket.terraform_state.id
}

output "frontend_bucket" {
  description = "Nombre del bucket S3 para el frontend"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "frontend_bucket_arn" {
  description = "ARN del bucket S3 del frontend"
  value       = aws_s3_bucket.frontend_bucket.arn
}

output "cloudfront_oai_id" {
  description = "CloudFront OAI ID para el frontend"
  value       = aws_cloudfront_origin_access_identity.frontend_oai.id
}

