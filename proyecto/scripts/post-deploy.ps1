# Post-deployment script for Windows PowerShell
# Handles frontend build, deployment, and database seeding

param(
    [string]$Stage = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

$ServiceName = "sistema-gestion-espacios"
$StackName = "${ServiceName}-${Stage}"

Write-Host "==> Starting post-deployment tasks for ${StackName}..." -ForegroundColor Green

# Get API URLs from CloudFormation stack
Write-Host "==> Getting API endpoints..." -ForegroundColor Yellow

try {
    $ApiUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" `
        --output text 2>$null
    
    if ([string]::IsNullOrWhiteSpace($ApiUrl) -or $ApiUrl -eq "None") {
        $ApiUrl = "https://api-placeholder.execute-api.${Region}.amazonaws.com"
        Write-Warning "Could not retrieve API_URL from stack outputs, using placeholder"
    }
} catch {
    $ApiUrl = "https://api-placeholder.execute-api.${Region}.amazonaws.com"
    Write-Warning "Error retrieving API_URL: $($_.Exception.Message)"
}

try {
    $WsUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiUrl'].OutputValue" `
        --output text 2>$null
    
    if ([string]::IsNullOrWhiteSpace($WsUrl) -or $WsUrl -eq "None") {
        $WsUrl = "wss://ws-placeholder.execute-api.${Region}.amazonaws.com/${Stage}"
        Write-Warning "Could not retrieve WS_URL from stack outputs, using placeholder"
    }
} catch {
    $WsUrl = "wss://ws-placeholder.execute-api.${Region}.amazonaws.com/${Stage}"
    Write-Warning "Error retrieving WS_URL: $($_.Exception.Message)"
}

Write-Host "API_URL: $ApiUrl" -ForegroundColor Cyan
Write-Host "WS_URL: $WsUrl" -ForegroundColor Cyan

# Check if frontend directory exists
if (-not (Test-Path "../frontend")) {
    Write-Warning "Frontend directory not found, skipping frontend deployment"
} else {
    Write-Host "==> Preparing frontend environment..." -ForegroundColor Yellow
    
    # Navigate to frontend directory
    Push-Location "../frontend"
    
    try {
        # Install dependencies
        Write-Host "==> Installing frontend dependencies..." -ForegroundColor Yellow
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        
        # Create environment file
        Write-Host "==> Creating environment configuration..." -ForegroundColor Yellow
        # Allow overriding the API base URL used by the frontend via FRONTEND_API_URL env var.
        $frontendApiUrl = $env:FRONTEND_API_URL
        if ([string]::IsNullOrWhiteSpace($frontendApiUrl)) { $frontendApiUrl = 'https://d3tse7z0pwpydh.cloudfront.net' }

        $envContent = @"
    NEXT_PUBLIC_API_URL=${frontendApiUrl}
    NEXT_PUBLIC_WS_URL=${WsUrl}
    NEXT_PUBLIC_STAGE=${Stage}
    NEXT_PUBLIC_AWS_REGION=${Region}
"@
        $envContent | Out-File -FilePath ".env.production.local" -Encoding UTF8
        # Optionally set frontend URL (CloudFront); allow override via FRONTEND_URL env var
        $frontendUrl = $env:FRONTEND_URL
        if ([string]::IsNullOrWhiteSpace($frontendUrl)) { $frontendUrl = 'https://d3tse7z0pwpydh.cloudfront.net' }
        "NEXT_PUBLIC_FRONTEND_URL=$frontendUrl" | Out-File -FilePath ".env.production.local" -Encoding UTF8 -Append
        
        # Build and export frontend
        Write-Host "==> Building frontend..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        
        Write-Host "==> Exporting frontend..." -ForegroundColor Yellow
        npm run export
        if ($LASTEXITCODE -ne 0) { throw "npm run export failed" }
        
    } catch {
        Write-Error "Frontend build failed: $($_.Exception.Message)"
    } finally {
        # Return to serverless directory
        Pop-Location
    }
    
    # Deploy frontend to S3
    Write-Host "==> Uploading frontend to S3..." -ForegroundColor Yellow
    try {
        npx serverless client deploy --stage $Stage --region $Region
        if ($LASTEXITCODE -ne 0) { throw "Frontend deployment failed" }
    } catch {
        Write-Warning "Frontend S3 deployment failed: $($_.Exception.Message)"
    }
}

# Seed database
Write-Host "==> Seeding database..." -ForegroundColor Yellow
if (Test-Path "scripts/seed-dynamodb.js") {
    try {
        $env:DYNAMODB_TABLE = "${ServiceName}-${Stage}-main"
        node scripts/seed-dynamodb.js --stage $Stage --yes
        if ($LASTEXITCODE -ne 0) { throw "Database seeding failed" }
    } catch {
        Write-Warning "Database seeding failed: $($_.Exception.Message)"
    }
} else {
    Write-Warning "Database seeding script not found"
}

# Run chaos engineering smoke tests
Write-Host "==> Running chaos engineering smoke tests..." -ForegroundColor Yellow
if (Test-Path "../chaos-engineering") {
    Push-Location "../chaos-engineering"
    
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed for chaos engineering" }
        
        npm run smoke
        if ($LASTEXITCODE -ne 0) { throw "Smoke tests failed" }
    } catch {
        Write-Warning "Chaos engineering smoke tests failed: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
} else {
    Write-Warning "Chaos engineering directory not found, skipping smoke tests"
}

Write-Host "==> Post-deployment tasks completed!" -ForegroundColor Green