# Script para desplegar frontend manualmente a S3 cuando serverless falla
# Uso: .\deploy-frontend-manual.ps1 -BucketName "sistema-gestion-espacios-frontend-dev"

param(
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "sistema-gestion-espacios-frontend-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$CloudFrontDistributionId = "EX85UQ1KKM9BI",
    
    [Parameter(Mandatory=$false)]
    [string]$FrontendPath = "../frontend/out",
    
    [Parameter(Mandatory=$false)]
    [string]$Profile = "Admin"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Deploying frontend to S3..." -ForegroundColor Green
Write-Host "Bucket: $BucketName" -ForegroundColor Cyan
Write-Host "Source: $FrontendPath" -ForegroundColor Cyan

# Verificar que el directorio existe
if (-not (Test-Path $FrontendPath)) {
    Write-Error "Frontend build directory not found: $FrontendPath"
    Write-Host "Run 'npm run build' in the frontend directory first" -ForegroundColor Yellow
    exit 1
}

# Verificar credenciales AWS
try {
    $identity = aws sts get-caller-identity --profile $Profile 2>$null | ConvertFrom-Json
    Write-Host "AWS Account: $($identity.Account)" -ForegroundColor Cyan
    Write-Host "AWS Profile: $Profile" -ForegroundColor Cyan
} catch {
    Write-Error "AWS credentials not configured or expired. Run 'aws configure --profile $Profile' first."
    exit 1
}

# Sync to S3 with proper cache headers
Write-Host "`n==> Uploading files to S3..." -ForegroundColor Yellow

# Upload HTML files with no-cache
aws s3 sync $FrontendPath s3://$BucketName/ `
    --profile $Profile `
    --exclude "*" `
    --include "*.html" `
    --cache-control "no-cache, no-store, must-revalidate" `
    --metadata-directive REPLACE `
    --acl public-read

# Upload JS/CSS with long cache
aws s3 sync $FrontendPath s3://$BucketName/ `
    --profile $Profile `
    --exclude "*.html" `
    --cache-control "public, max-age=31536000, immutable" `
    --acl public-read

Write-Host "`n==> Upload complete!" -ForegroundColor Green

# Invalidate CloudFront cache if distribution ID provided
if ($CloudFrontDistributionId) {
    Write-Host "`n==> Invalidating CloudFront cache..." -ForegroundColor Yellow
    aws cloudfront create-invalidation `
        --profile $Profile `
        --distribution-id $CloudFrontDistributionId `
        --paths "/*" | Out-Null
    Write-Host "CloudFront invalidation created!" -ForegroundColor Green
} else {
    Write-Host "`nNote: CloudFront cache not invalidated. Provide -CloudFrontDistributionId to invalidate." -ForegroundColor Yellow
    Write-Host "You can find the distribution ID with: terraform output cloudfront_distribution_id" -ForegroundColor Cyan
}

Write-Host "`n==> Deployment complete!" -ForegroundColor Green
Write-Host "Frontend URL: https://$BucketName.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
