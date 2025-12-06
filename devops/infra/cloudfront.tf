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
    domain_name = var.api_gateway_domain
    origin_id   = "api-gateway-origin"

    # Add custom header to help API Gateway identify CloudFront requests
    custom_header {
      name  = "X-Origin-Verify"
      value = "cloudfront-sistema-gestion-espacios"
    }

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
      response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  # NOTE: do NOT route frontend pages under /auth/* to the API origin.
  # Keep API proxying limited to /api/* so that SPA pages like /auth/register
  # are served from the S3 origin. The ordered behavior for /auth/* was
  # removed to avoid conflicts with static pages.

  ordered_cache_behavior {
    # Match all API requests under /api/* and route to API Gateway origin
    path_pattern     = "api/*"
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

    # Function association removed - backend now accepts /api/* routes directly
    # function_association {
    #   event_type   = "viewer-request"
    #   function_arn = aws_cloudfront_function.strip_api_prefix.arn
    # }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id
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

  # REMOVED: These custom_error_responses were causing CloudFront to return
  # index.html for API Gateway 403/404 errors, breaking /api/* routing.
  # For SPA routing, we handle 404s client-side instead.
  
  # custom_error_response {
  #   error_code            = 403
  #   response_code         = 200
  #   response_page_path    = "/index.html"
  #   error_caching_min_ttl = 0
  # }

  # custom_error_response {
  #   error_code            = 404
  #   response_code         = 200
  #   response_page_path    = "/index.html"
  #   error_caching_min_ttl = 0
  # }

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
  // Do not rewrite API or Next.js internal asset requests
  if (uri.startsWith('/api/') || uri.startsWith('/_next/') || uri.startsWith('/static/') ) {
    return request;
  }
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

# CloudFront Function to strip leading /api prefix when forwarding to API origin
resource "aws_cloudfront_function" "strip_api_prefix" {
  name    = "strip-api-prefix"
  runtime = "cloudfront-js-1.0"
  comment = "Remove leading /api from request URI so API Gateway receives expected path"
  publish = true

  code = <<EOF
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Strip /api prefix: /api/auth/login becomes /auth/login
  if (uri.startsWith('/api/')) {
    request.uri = uri.substring(4);
  }
  
  return request;
}
EOF
}

// S3 bucket policy removed intentionally: we will not manage bucket policies here.
// CloudFront will provide CORS via `aws_cloudfront_response_headers_policy`.

# Response headers policy to add CORS headers at CloudFront level
resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "sistema-gestion-espacios-cors-policy"

  cors_config {
    access_control_allow_credentials = false
    access_control_allow_headers {
      items = ["Content-Type", "Authorization", "X-Api-Version", "X-Amz-Date", "X-Amz-Security-Token"]
    }
    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    }
    access_control_allow_origins {
      items = ["*"]
    }
    access_control_expose_headers {
      items = ["ETag"]
    }
    access_control_max_age_sec = 3600
    origin_override = true
  }
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
