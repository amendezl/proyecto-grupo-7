#Requires -Version 5.1
<#
.SYNOPSIS
    Pre-deployment script for Windows PowerShell - Sistema Gestión de Espacios
.DESCRIPTION
    This script handles pre-deployment tasks including infrastructure setup
    before the main serverless deployment process.
.PARAMETER Stage
    The deployment stage (dev, staging, prod). Default: 'dev'
.PARAMETER Region
    The AWS region for deployment. Default: 'us-east-1'
.EXAMPLE
    .\pre-deploy.ps1 -Stage dev -Region us-east-1
.EXAMPLE
    .\pre-deploy.ps1 dev us-east-1
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Stage = 'dev',
    
    [Parameter(Position=1)]
    [string]$Region = 'us-east-1'
)

# Set error action preference
$ErrorActionPreference = 'Continue'
$WarningPreference = 'Continue'

# Colors for output
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$ForegroundColor = [System.ConsoleColor]::White
    )
    $currentColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $currentColor
}

function Test-CommandExists {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-DirectoryExists {
    param([string]$Path)
    return Test-Path -Path $Path -PathType Container
}

# Main execution starts here
Write-ColorOutput '=====================================================' $Cyan
Write-ColorOutput '   PRE-DEPLOYMENT SCRIPT - WINDOWS POWERSHELL' $Cyan
Write-ColorOutput '=====================================================' $Cyan
Write-ColorOutput "Stage: $Stage" $Blue
Write-ColorOutput "Region: $Region" $Blue
Write-ColorOutput "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" $Blue
Write-ColorOutput '=====================================================' $Cyan

# Validate prerequisites
Write-ColorOutput ' Validating prerequisites...' $Yellow

$prerequisiteErrors = @()

# Check Node.js
if (-not (Test-CommandExists 'node')) {
    $prerequisiteErrors += 'Node.js is not installed or not in PATH'
} else {
    $nodeVersion = node --version 2>$null
    Write-ColorOutput " Node.js: $nodeVersion" $Green
}

# Check AWS CLI
if (-not (Test-CommandExists 'aws')) {
    $prerequisiteErrors += 'AWS CLI is not installed or not in PATH'
} else {
    try {
        $awsVersion = aws --version 2>$null
        Write-ColorOutput " AWS CLI: $awsVersion" $Green
    }
    catch {
        $prerequisiteErrors += 'AWS CLI is installed but not properly configured'
    }
}

# Check if infrastructure directory exists
$infrastructureDir = '..\infrastructure'
if (-not (Test-DirectoryExists $infrastructureDir)) {
    $prerequisiteErrors += "Infrastructure directory not found: $infrastructureDir"
} else {
    Write-ColorOutput ' Infrastructure directory found' $Green
}

# Check if deploy-infrastructure.js exists
$deployScript = "$infrastructureDir\deploy-infrastructure.js"
if (-not (Test-Path $deployScript)) {
    $prerequisiteErrors += "Deploy script not found: $deployScript"
} else {
    Write-ColorOutput " Deploy script found: $deployScript" $Green
}

if ($prerequisiteErrors.Count -gt 0) {
    Write-ColorOutput 'Prerequisites validation failed:' $Red
    foreach ($error in $prerequisiteErrors) {
        Write-ColorOutput "   - $error" $Red
    }
    Write-ColorOutput ' Continuing with warnings. Some steps may fail.' $Yellow
}

# Step 1: Deploy base infrastructure
Write-ColorOutput 'Step 1: Deploying base infrastructure...' $Yellow

try {
    Write-ColorOutput "Executing: node $deployScript $Stage" $Blue
    
    Push-Location $infrastructureDir
    
    # Execute the infrastructure deployment
    $deployProcess = Start-Process -FilePath 'node' -ArgumentList 'deploy-infrastructure.js', $Stage -NoNewWindow -PassThru -Wait
    
    Pop-Location
    
    if ($deployProcess.ExitCode -eq 0) {
        Write-ColorOutput 'Infrastructure deployment completed successfully' $Green
    } else {
        Write-ColorOutput 'Infrastructure deployment completed with warnings Exit Code:' $Yellow
        Write-ColorOutput "$($deployProcess.ExitCode)" $Yellow
    }
}
catch {
    Write-ColorOutput " Error during infrastructure deployment: $($_.Exception.Message)" $Red
    Write-ColorOutput '  Continuing with serverless deployment...' $Yellow
}

# Step 2: Validate AWS credentials and region
Write-ColorOutput 'Step 2: Validating AWS configuration...' $Yellow

try {
    # Test AWS credentials
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-ColorOutput " AWS Identity: $($identity.Arn)" $Green
        Write-ColorOutput "   Account: $($identity.Account)" $Blue
    } else {
        Write-ColorOutput '  Could not retrieve AWS identity' $Yellow
    }
    
    # Validate region
    $currentRegion = aws configure get region 2>$null
    if ($currentRegion -ne $Region) {
        Write-ColorOutput "  AWS CLI region ($currentRegion) differs from target region ($Region)" $Yellow
        Write-ColorOutput "   Using target region: $Region" $Blue
    } else {
        Write-ColorOutput " AWS region validated: $Region" $Green
    }
}
catch {
    Write-ColorOutput "  AWS validation warning: $($_.Exception.Message)" $Yellow
}

# Step 3: Check CloudFormation stack status (optional)
Write-ColorOutput ' Step 3: Checking existing infrastructure...' $Yellow

$stackName = "sistema-gestion-infraestructura-$Stage"

try {
    $stackStatus = aws cloudformation describe-stacks --stack-name $stackName --region $Region --query 'Stacks[0].StackStatus' --output text 2>$null
    
    if ($LASTEXITCODE -eq 0 -and $stackStatus) {
        Write-ColorOutput " Infrastructure stack status: $($stackStatus)" $Green
        
        if ($stackStatus -match 'ROLLBACK|FAILED') {
            Write-ColorOutput '  Stack is in a failed state. Consider cleanup before deployment.' $Yellow
        }
    } else {
        Write-ColorOutput ' Infrastructure stack not found (will be created during deployment)' $Blue
        }
} 
catch {
    Write-ColorOutput ' Could not check infrastructure stack status' $Blue
}

# Step 4: Environment setup summary
Write-ColorOutput 'Step 4: Environment summary...' $Yellow

Write-ColorOutput 'Environment Variables:' $Blue
Write-ColorOutput "  - AWS_REGION: $Region" $Blue
Write-ColorOutput "  - STAGE: $Stage" $Blue

# Set environment variables for the deployment process
$env:AWS_REGION = $Region
$env:STAGE = $Stage

Write-ColorOutput 'Pre-deployment setup completed!' $Green
Write-ColorOutput '=====================================================' $Cyan

# Final validation
if ($prerequisiteErrors.Count -eq 0) {
    Write-ColorOutput 'All checks passed. Ready for serverless deployment!' $Green
    exit 0
} else {
    Write-ColorOutput "Pre-deployment completed with $($prerequisiteErrors.Count) warning(s)" $Yellow
    Write-ColorOutput 'Serverless deployment will proceed but may encounter issues' $Yellow
    exit 0  # Don't fail the deployment, just warn
}

