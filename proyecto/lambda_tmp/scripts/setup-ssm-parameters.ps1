# SSM Parameter Store Setup Script (PowerShell)
# Configura secretos sensibles en AWS Systems Manager Parameter Store
# para uso con Serverless Framework

# Colores para output
function Write-Info { 
    Write-Host "[INFO] $args" -ForegroundColor Blue 
}
function Write-Success { 
    Write-Host "[SUCCESS] $args" -ForegroundColor Green 
}
function Write-Warning { 
    Write-Host "[WARNING] $args" -ForegroundColor Yellow 
}
function Write-Error { 
    Write-Host "[ERROR] $args" -ForegroundColor Red 
}

# Validar AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI no está instalado"
    Write-Info "Instalar desde: https://aws.amazon.com/cli/"
    exit 1
}

# Validar credenciales AWS
try {
    $null = aws sts get-caller-identity 2>&1
} catch {
    Write-Error "Credenciales AWS no configuradas"
    Write-Info "Configurar con: aws configure"
    exit 1
}

# Obtener información de la cuenta
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

Write-Info "AWS Account ID: $AWS_ACCOUNT_ID"
Write-Info "AWS Region: $AWS_REGION"

# Stage (dev, staging, prod)
$STAGE = if ($args[0]) { $args[0] } else { "dev" }
Write-Info "Stage: $STAGE"

# Base path para parámetros
$BASE_PATH = "/sistema-gestion/$STAGE"

Write-Host ""
Write-Info "=== Configuración de Secretos en SSM Parameter Store ==="
Write-Host ""

# Función para crear/actualizar parámetro
function Set-SSMParameter {
    param(
        [string]$ParamName,
        [string]$ParamValue,
        [string]$ParamDescription,
        [string]$ParamType = "SecureString"
    )
    
    $FullPath = "$BASE_PATH/$ParamName"
    
    try {
        $existing = aws ssm get-parameter --name $FullPath --region $AWS_REGION 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Warning "Parámetro $FullPath ya existe. ¿Actualizar? (y/n)"
            $response = Read-Host
            if ($response -match "^[Yy]$") {
                aws ssm put-parameter `
                    --name $FullPath `
                    --value $ParamValue `
                    --type $ParamType `
                    --overwrite `
                    --region $AWS_REGION `
                    --description $ParamDescription | Out-Null
                Write-Success "Parámetro actualizado: $FullPath"
            } else {
                Write-Info "Parámetro no actualizado: $FullPath"
            }
        }
    } catch {
        aws ssm put-parameter `
            --name $FullPath `
            --value $ParamValue `
            --type $ParamType `
            --region $AWS_REGION `
            --description $ParamDescription | Out-Null
        Write-Success "Parámetro creado: $FullPath"
    }
}

# Función para solicitar input
function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$IsSecret = $false
    )
    
    if ($IsSecret) {
        $secureString = Read-Host -Prompt $Prompt -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
        $value = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    } else {
        if ($Default) {
            $value = Read-Host -Prompt "$Prompt [$Default]"
            if ([string]::IsNullOrWhiteSpace($value)) {
                $value = $Default
            }
        } else {
            $value = Read-Host -Prompt $Prompt
        }
    }
    
    return $value
}

Write-Host ""
Write-Info "Configurando parámetros para stage: $STAGE"
Write-Host ""

# 1. Sentry DSN
Write-Info "1/6 - Sentry DSN (Monitoring de errores)"
$SENTRY_DSN = Get-UserInput -Prompt "Ingrese Sentry DSN (Enter para omitir)"
if ($SENTRY_DSN) {
    Set-SSMParameter -ParamName "sentry-dsn" -ParamValue $SENTRY_DSN -ParamDescription "Sentry DSN for error monitoring" -ParamType "SecureString"
} else {
    Write-Warning "Sentry DSN omitido (opcional)"
}

# 2. Sentry Traces Sample Rate
Write-Info "2/6 - Sentry Traces Sample Rate"
$SENTRY_TRACES_RATE = Get-UserInput -Prompt "Ingrese Sentry Traces Sample Rate" -Default "0.1"
if ($SENTRY_TRACES_RATE) {
    Set-SSMParameter -ParamName "sentry-traces-sample-rate" -ParamValue $SENTRY_TRACES_RATE -ParamDescription "Sentry traces sample rate" -ParamType "String"
} else {
    Write-Warning "Sentry Traces Sample Rate omitido"
}

# 3. Sentry Release (opcional)
Write-Info "3/6 - Sentry Release (opcional)"
Write-Warning "Util para rastrear versiones desplegadas"
$SENTRY_RELEASE = Get-UserInput -Prompt "Ingrese Sentry Release (Enter para omitir)"
if ($SENTRY_RELEASE) {
    Set-SSMParameter -ParamName "sentry-release" -ParamValue $SENTRY_RELEASE -ParamDescription "Sentry release version" -ParamType "String"
} else {
    Write-Warning "Sentry Release omitido"
}

# 4. Database Password (ejemplo para futuro)
Write-Info "4/6 - Database Password (ejemplo - opcional)"
Write-Warning "Si no usa base de datos externa, omita este paso"
$DB_PASSWORD = Get-UserInput -Prompt "Ingrese Database Password (Enter para omitir)" -IsSecret $true
if ($DB_PASSWORD) {
    Set-SSMParameter -ParamName "db-password" -ParamValue $DB_PASSWORD -ParamDescription "Database password" -ParamType "SecureString"
} else {
    Write-Warning "Database Password omitido"
}

# 5. API Keys externas (ejemplo)
Write-Info "5/6 - External API Key (ejemplo - opcional)"
Write-Warning "Si no usa APIs externas, omita este paso"
$EXTERNAL_API_KEY = Get-UserInput -Prompt "Ingrese External API Key (Enter para omitir)" -IsSecret $true
if ($EXTERNAL_API_KEY) {
    Set-SSMParameter -ParamName "external-api-key" -ParamValue $EXTERNAL_API_KEY -ParamDescription "External API key" -ParamType "SecureString"
} else {
    Write-Warning "External API Key omitido"
}

# 6. JWT Secret (ejemplo)
Write-Info "6/6 - JWT Secret (ejemplo - opcional)"
Write-Warning "Cognito maneja JWT automáticamente. Solo si necesita custom JWT"
$JWT_SECRET = Get-UserInput -Prompt "Ingrese JWT Secret (Enter para omitir)" -IsSecret $true
if ($JWT_SECRET) {
    Set-SSMParameter -ParamName "jwt-secret" -ParamValue $JWT_SECRET -ParamDescription "JWT signing secret" -ParamType "SecureString"
} else {
    Write-Warning "JWT Secret omitido"
}

Write-Host ""
Write-Success "=== Configuración completada ==="
Write-Host ""

# Listar parámetros creados
Write-Info "Parámetros creados/actualizados en $BASE_PATH :"
aws ssm get-parameters-by-path `
    --path $BASE_PATH `
    --region $AWS_REGION `
    --query 'Parameters[*].[Name,Type,LastModifiedDate]' `
    --output table

Write-Host ""
Write-Info "=== Uso en serverless.yml ==="
Write-Host ""
Write-Host "Para usar estos parámetros en tu serverless.yml:"
Write-Host ""
Write-Host "provider:" -ForegroundColor Green
Write-Host "  environment:" -ForegroundColor Green
Write-Host "    SENTRY_DSN: `${ssm:$BASE_PATH/sentry-dsn~true}" -ForegroundColor Green
Write-Host "    SENTRY_TRACES_SAMPLE_RATE: `${ssm:$BASE_PATH/sentry-traces-sample-rate}" -ForegroundColor Green
Write-Host "    SENTRY_RELEASE: `${ssm:$BASE_PATH/sentry-release, ''}" -ForegroundColor Green
Write-Host "    DB_PASSWORD: `${ssm:$BASE_PATH/db-password~true}" -ForegroundColor Green
Write-Host "    EXTERNAL_API_KEY: `${ssm:$BASE_PATH/external-api-key~true}" -ForegroundColor Green
Write-Host ""
Write-Warning "Nota: El sufijo ~true habilita el descifrado automático (solo para SecureString)"
Write-Host ""

# Instrucciones para eliminar parámetros
Write-Info "=== Para eliminar parámetros ==="
Write-Host ""
Write-Host "Eliminar un parámetro:"
Write-Host "aws ssm delete-parameter --name $BASE_PATH/parameter-name --region $AWS_REGION"
Write-Host ""
Write-Host "Eliminar todos los parámetros del stage $STAGE :"
Write-Host "aws ssm get-parameters-by-path --path `"$BASE_PATH`" --region $AWS_REGION --query 'Parameters[*].Name' --output text | ForEach-Object { aws ssm delete-parameter --name `$_ --region $AWS_REGION }"
Write-Host ""

Write-Success "Setup completado exitosamente!"
