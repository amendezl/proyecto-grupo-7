#Now, if we want the Serverless application to get the details of the S3, we need to save it into ssm 
#We can do that by using the aws_ssm_parameter resource like this:

# parameters.tf

resource "aws_ssm_parameter" "s3_terraform_state" {
  name        = "/s3/terraform_state/name"
  description = "S3 bucket name for terraform_state"
  type        = "String"
  value       = "${aws_s3_bucket.terraform_state.bucket}"
  overwrite   = true
  
  tags = {
    Environment = "${var.environment}"
    ManagedBy = "terraform"
  }
}

resource "aws_ssm_parameter" "s3_frontend" {
  name        = "/s3/frontend/name"
  description = "S3 bucket name for the Frontend Bucket"
  type        = "String"
  value       = "${aws_s3_bucket.frontend_bucket.bucket}"
  overwrite   = true
  
  tags = {
    Environment = "${var.environment}"
    ManagedBy = "terraform"
  }
}

resource "aws_ssm_parameter" "random_string" {
  name        = "/terraform/random_string/result"
  description = "Randomly generated string, also used in these buckets"
  type        = "String"
  value       = "${random_string.bucket_suffix.result}"
  overwrite   = true
  
  tags = {
    Environment = "${var.environment}"
    ManagedBy = "terraform"
  }
}

resource "aws_ssm_parameter" "s3_frontend_RegionalDomainName" {
  name        = "/s3/frontend/regional_domain_name"
  description = "S3 bucket regional domain name for the Frontend Bucket"
  type        = "String"
  value       = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
  overwrite   = true
  
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "regional_domain_name" {
  value = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
}