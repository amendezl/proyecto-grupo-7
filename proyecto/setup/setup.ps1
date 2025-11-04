<#
PowerShell setup script for Windows
Replicates the behaviour of setup.sh for Windows users.
Run in an elevated PowerShell (recommended) or normal PowerShell with ExecutionPolicy Bypass.
#>

Write-Host "Setting up Sistema de Gestión de Espacios (Windows)..." -ForegroundColor Cyan

Set-Location (Join-Path $PSScriptRoot '..')

$serverlessCmd = $null

# Helper: check command exists
function CommandExists([string]$cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Check AWS CLI
if (CommandExists aws) {
    Write-Host "AWS CLI detected:" -NoNewline; aws --version
} else {
    Write-Warning "AWS CLI not found. Please install the AWS CLI for Windows:
  https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    Write-Host "You can download the MSI and run the installer." -ForegroundColor Yellow
}

# Check Node.js
if (-not (CommandExists node)) {
    Write-Error "Node.js not found. Please install Node.js 22+ from https://nodejs.org/"
    exit 1
} else {
    $nodeMajor = [int](node -p "process.versions.node.split('.')[0]" 2>$null)
    if ($nodeMajor -lt 22) {
        Write-Error "Node.js $(node --version) detected. Please upgrade to Node.js 22 or newer from https://nodejs.org/"
        exit 1
    }
    Write-Host "Node.js version:" -NoNewline; node --version
}

# Install npm dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install exited with code $LASTEXITCODE"
    }
} catch {
    Write-Warning "npm install failed: $_"
    Write-Host "Resolve npm errors and rerun this script." -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials and set AWS_ACCOUNT_ID
if (CommandExists aws) {
    try {
        $acct = aws sts get-caller-identity --query Account --output text 2>$null
        if ($LASTEXITCODE -eq 0 -and $acct) {
            Write-Host "AWS credentials configured. Account ID: $acct" -ForegroundColor Green
            # Set for current session
            $env:AWS_ACCOUNT_ID = $acct
            Write-Host "AWS_ACCOUNT_ID set for current session: $env:AWS_ACCOUNT_ID"
            # Persist to user environment (setx)
            try {
                setx AWS_ACCOUNT_ID $acct | Out-Null
                Write-Host "AWS_ACCOUNT_ID persisted to user environment variables (requires new shell to take effect)" -ForegroundColor Green
            } catch {
                Write-Warning "Failed to persist AWS_ACCOUNT_ID: $_"
            }
        } else {
            Write-Warning "AWS credentials not configured. Run 'aws configure' to set credentials."
        }
    } catch {
        Write-Warning "Error while checking AWS credentials: $_"
    }
} else {
    Write-Warning "Skipping AWS credential check because aws CLI is not available."
}

# Check for serverless framework
if (CommandExists serverless) {
    $serverlessCmd = { serverless --version }
    Write-Host "Serverless CLI found:" -NoNewline; serverless -v
} elseif (CommandExists npx) {
    Write-Host "Serverless not found globally, using local CLI via npx." -ForegroundColor Yellow
    $serverlessCmd = { npx serverless --version }
} else {
    Write-Warning "Serverless CLI not found. Installing globally may require admin privileges."
    Write-Host "Attempting global install of serverless (this may prompt for elevation)..." -ForegroundColor Cyan
    try {
        npm install -g serverless
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Serverless installed globally:" -NoNewline; serverless -v
            $serverlessCmd = { serverless --version }
        } else {
            Write-Warning "Global installation failed. You can run serverless via npx or install manually."
            $serverlessCmd = { npx serverless --version }
        }
    } catch {
        Write-Warning "Failed to install serverless globally: $_"
        $serverlessCmd = { npx serverless --version }
    }
}

if ($serverlessCmd) {
    try {
        $serverlessVersionRaw = & $serverlessCmd | Select-Object -First 1
        $serverlessMajor = [int](([regex]::Match($serverlessVersionRaw, '\d+')).Value)
        if ($serverlessMajor -lt 4) {
            Write-Warning "Expected Serverless Framework v4+, detected: $serverlessVersionRaw"
        } else {
            Write-Host "Serverless Framework: $serverlessVersionRaw" -ForegroundColor Green
        }
    } catch {
        Write-Warning "Unable to determine Serverless Framework version: $_"
    }
}

Write-Host ""; Write-Host "--- Setup complete!" -ForegroundColor Green
Write-Host "You can deploy with:" -ForegroundColor Cyan
Write-Host "  npm run deploy" -ForegroundColor Yellow
Write-Host "or (local binary)" -ForegroundColor Cyan
Write-Host "  npx serverless deploy --stage dev --region us-east-1" -ForegroundColor Yellow

Write-Host "Notes:" -ForegroundColor Cyan
Write-Host "  - If you persisted AWS_ACCOUNT_ID using setx, open a new PowerShell window to see it." -ForegroundColor Yellow
Write-Host "  - To run this script if execution is restricted, use: powershell -ExecutionPolicy Bypass -File .\setup\setup.ps1" -ForegroundColor Yellow
Write-Host "  - For serverless-offline use 'npm run dev' after installation completes." -ForegroundColor Yellow
