## Minimal helper to attach IAM policy (via Terraform) and set SSM chaos parameter.
##
## This script performs the minimal steps to enable the chaos middleware:
##  - copy example terraform vars to devops/infra/terraform.tfvars (if missing)
##  - run terraform init & apply in devops/infra to attach SSM policy to the role
##  - install node deps in chaos-engineering and set the SSM parameter using the included Node script
##
## Run this script from the repo root. It expects AWS credentials to be configured
## (environment, shared credentials file, or instance role). Use conservatively.

[CmdletBinding()]
param(
  [switch]$ApplyTerraform,
  [string]$ParamName = '/proyecto-grupo-7/prod/chaos',
  [int]$Latency = 200,
  [int]$ErrorRate = 5,
  [int]$ErrorStatus = 503,
  [string]$Region = 'us-east-1'
)

function Fail($msg) { Write-Error $msg; exit 1 }

Write-Host "== Chaos deploy helper =="

# Check AWS credentials quickly
try {
  $whoJson = aws sts get-caller-identity --region $Region 2>$null
  if ($LASTEXITCODE -eq 0 -and $whoJson) {
    $who = $whoJson | ConvertFrom-Json
    Write-Host "AWS identity:" $who.Arn
  } else {
    Write-Warning "Could not query AWS identity. Ensure AWS CLI is configured and credentials are valid."
  }
} catch {
  Write-Warning "Could not get AWS identity. Ensure AWS CLI is configured and credentials are valid."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

# Ensure terraform.tfvars exists
$tfvarsExample = Join-Path $repoRoot 'devops\infra\terraform.tfvars.example'
$tfvars = Join-Path $repoRoot 'devops\infra\terraform.tfvars'
if (-not (Test-Path $tfvars)) {
  if (Test-Path $tfvarsExample) {
    Copy-Item $tfvarsExample $tfvars -Force
    Write-Host "Copied terraform.tfvars.example -> devops/infra/terraform.tfvars"
  } else {
    Write-Warning "Example terraform.tfvars not found at $tfvarsExample. Skipping copy."
  }
} else {
  Write-Host "devops/infra/terraform.tfvars already exists; leaving it in place."
}

if ($ApplyTerraform) {
  # Ensure terraform is available
  if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Fail "terraform not found in PATH. Install terraform or remove -ApplyTerraform."
  }

  $infraPath = Join-Path $repoRoot 'devops\infra'
  if (-not (Test-Path $infraPath)) {
    Fail "Expected path $infraPath not found. Ensure you ran this from the repository root."
  }

  Push-Location $infraPath
  Write-Host "Running terraform init..."
  terraform init
  if ($LASTEXITCODE -ne 0) { Fail "terraform init failed" }
  Write-Host "Running terraform plan..."
  terraform plan -out=tfplan
  if ($LASTEXITCODE -ne 0) { Fail "terraform plan failed" }
  Write-Host "Applying terraform plan... (you will be prompted)"
  terraform apply tfplan
  if ($LASTEXITCODE -ne 0) { Fail "terraform apply failed" }
  Pop-Location
} else {
  Write-Host "Skipping Terraform step (use -ApplyTerraform to run it)."
}

# Install node deps and call set-ssm-config.js
Push-Location (Join-Path $repoRoot 'chaos-engineering')
if (-not (Test-Path 'package.json')) {
  Fail "chaos-engineering/package.json not found. Ensure you're in the repo root."
}
if (-not (Test-Path 'node_modules')) {
  Write-Host "Installing node dependencies (npm ci)..."
  npm ci
  if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }
} else {
  Write-Host "node_modules present; skipping npm ci"
}

$json = @{ enabled = $true; latency = $Latency; errorRate = $ErrorRate; errorStatus = $ErrorStatus } | ConvertTo-Json -Compress
Write-Host "Setting SSM parameter $ParamName with value: $json"

node set-ssm-config.js --name $ParamName --value "$json" --type String --region $Region
if ($LASTEXITCODE -ne 0) { Fail "set-ssm-config failed" }

Pop-Location

Write-Host "Done. Verify Lambda config and test the function."
