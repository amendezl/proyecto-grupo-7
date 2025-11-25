# CloudFront + OAI for frontend bucket
# This will create a CloudFront distribution that serves the existing S3 bucket
# and will set a bucket policy to allow CloudFront OAI read access. WARNING: this
# resource will overwrite the existing bucket policy. If you prefer manual merge,
# remove aws_s3_bucket_policy resource and apply changes manually.

resource "aws_cloudfront_origin_access_identity" "frontend_oai" {
  comment = "OAI for sistema-gestion-espacios frontend"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Distribution for frontend static site"
  default_root_object = "index.html"

  origin {
    domain_name = "${var.frontend_bucket_name}.s3.amazonaws.com"
    origin_id   = "s3-${var.frontend_bucket_name}"

    s3_origin_config {
      origin_access_identity = "origin-access-identity/cloudfront/${aws_cloudfront_origin_access_identity.frontend_oai.id}"
    }
  }

  # API Gateway origin so CloudFront can proxy API calls under the same domain
  origin {
    domain_name = "ldnmxiqymd.execute-api.us-east-1.amazonaws.com"
    origin_id   = "api-gateway-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${var.frontend_bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_index.arn
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  # NOTE: do NOT route frontend pages under /auth/* to the API origin.
  # Keep API proxying limited to /api/* so that SPA pages like /auth/register
  # are served from the S3 origin. The ordered behavior for /auth/* was
  # removed to avoid conflicts with static pages.

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "api-gateway-origin"

    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["*"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  http_version = "http2"
  price_class = "PriceClass_100"

  tags = local.common_tags
}


# CloudFront Function to rewrite directory requests to index.html
resource "aws_cloudfront_function" "rewrite_index" {
  name    = "rewrite-index-for-s3"
  runtime = "cloudfront-js-1.0"
  comment = "Append index.html for folder requests so S3 origin returns route-specific pages"
  publish = true

  code = <<EOF
function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  // If URI ends with a slash, append index.html
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  // If URI doesn't contain a dot (no file extension), append /index.html
  var lastSegment = uri.split('/').pop();
  if (lastSegment && lastSegment.indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }
  return request;
}
EOF
}

# Overwrite the S3 bucket policy to allow CloudFront OAI read access.
# WARNING: This will replace any existing bucket policy. If you need to merge,
# fetch the existing policy and merge statements before applying.
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = var.frontend_bucket_name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid = "AllowCloudFrontRead",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${aws_cloudfront_origin_access_identity.frontend_oai.id}"
        },
        Action = "s3:GetObject",
        Resource = "arn:aws:s3:::${var.frontend_bucket_name}/*"
      }
    ]
  })
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "CloudFront domain for the frontend"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "CloudFront distribution id"
}

output "cloudfront_oai_canonical_user_id" {
  value       = aws_cloudfront_origin_access_identity.frontend_oai.s3_canonical_user_id
  description = "OAI S3 canonical user id (for bucket policy if needed)"
}
