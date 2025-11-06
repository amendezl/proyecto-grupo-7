#!/bin/bash

# SSM Parameter Store Setup Script
# Configura secretos sensibles en AWS Systems Manager Parameter Store
# para uso con Serverless Framework

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validar AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI no está instalado"
    log_info "Instalar con: pip install awscli"
    exit 1
fi

# Validar credenciales AWS
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "Credenciales AWS no configuradas"
    log_info "Configurar con: aws configure"
    exit 1
fi

# Obtener información de la cuenta
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

log_info "AWS Account ID: $AWS_ACCOUNT_ID"
log_info "AWS Region: $AWS_REGION"

# Stage (dev, staging, prod)
STAGE=${1:-dev}
log_info "Stage: $STAGE"

# Base path para parámetros
BASE_PATH="/sistema-gestion/${STAGE}"

echo ""
log_info "=== Configuración de Secretos en SSM Parameter Store ==="
echo ""

# Función para crear/actualizar parámetro
create_or_update_parameter() {
    local param_name=$1
    local param_value=$2
    local param_description=$3
    local param_type=${4:-SecureString}
    
    local full_path="${BASE_PATH}/${param_name}"
    
    if aws ssm get-parameter --name "$full_path" --region "$AWS_REGION" &> /dev/null; then
        log_warning "Parámetro $full_path ya existe. ¿Actualizar? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            aws ssm put-parameter \
                --name "$full_path" \
                --value "$param_value" \
                --type "$param_type" \
                --overwrite \
                --region "$AWS_REGION" \
                --description "$param_description" > /dev/null
            log_success "Parámetro actualizado: $full_path"
        else
            log_info "Parámetro no actualizado: $full_path"
        fi
    else
        aws ssm put-parameter \
            --name "$full_path" \
            --value "$param_value" \
            --type "$param_type" \
            --region "$AWS_REGION" \
            --description "$param_description" > /dev/null
        log_success "Parámetro creado: $full_path"
    fi
}

# Función para solicitar input
prompt_for_value() {
    local prompt_message=$1
    local default_value=$2
    local is_secret=${3:-false}
    
    if [ "$is_secret" = true ]; then
        echo -n "$prompt_message: "
        read -rs value
        echo ""
    else
        if [ -n "$default_value" ]; then
            read -p "$prompt_message [$default_value]: " value
            value=${value:-$default_value}
        else
            read -p "$prompt_message: " value
        fi
    fi
    
    echo "$value"
}

echo ""
log_info "Configurando parámetros para stage: $STAGE"
echo ""

# 1. Sentry DSN
log_info "1/6 - Sentry DSN (Monitoring de errores)"
SENTRY_DSN=$(prompt_for_value "Ingrese Sentry DSN" "" false)
if [ -n "$SENTRY_DSN" ]; then
    create_or_update_parameter "sentry-dsn" "$SENTRY_DSN" "Sentry DSN for error monitoring" "SecureString"
else
    log_warning "Sentry DSN omitido (opcional)"
fi

# 2. Sentry Traces Sample Rate
log_info "2/6 - Sentry Traces Sample Rate"
SENTRY_TRACES_RATE=$(prompt_for_value "Ingrese Sentry Traces Sample Rate" "0.1" false)
if [ -n "$SENTRY_TRACES_RATE" ]; then
    create_or_update_parameter "sentry-traces-sample-rate" "$SENTRY_TRACES_RATE" "Sentry traces sample rate" "String"
else
    log_warning "Sentry Traces Sample Rate omitido"
fi

# 3. Sentry Release (opcional)
log_info "3/6 - Sentry Release (opcional)"
log_warning "Util para rastrear versiones desplegadas"
SENTRY_RELEASE=$(prompt_for_value "Ingrese Sentry Release (Enter para omitir)" "" false)
if [ -n "$SENTRY_RELEASE" ]; then
    create_or_update_parameter "sentry-release" "$SENTRY_RELEASE" "Sentry release version" "String"
else
    log_warning "Sentry Release omitido"
fi

# 4. Database Password (ejemplo para futuro)
log_info "4/6 - Database Password (ejemplo - opcional)"
log_warning "Si no usa base de datos externa, omita este paso"
DB_PASSWORD=$(prompt_for_value "Ingrese Database Password (Enter para omitir)" "" true)
if [ -n "$DB_PASSWORD" ]; then
    create_or_update_parameter "db-password" "$DB_PASSWORD" "Database password" "SecureString"
else
    log_warning "Database Password omitido"
fi

# 5. API Keys externas (ejemplo)
log_info "5/6 - External API Key (ejemplo - opcional)"
log_warning "Si no usa APIs externas, omita este paso"
EXTERNAL_API_KEY=$(prompt_for_value "Ingrese External API Key (Enter para omitir)" "" true)
if [ -n "$EXTERNAL_API_KEY" ]; then
    create_or_update_parameter "external-api-key" "$EXTERNAL_API_KEY" "External API key" "SecureString"
else
    log_warning "External API Key omitido"
fi

# 6. JWT Secret (ejemplo)
log_info "6/6 - JWT Secret (ejemplo - opcional)"
log_warning "Cognito maneja JWT automáticamente. Solo si necesita custom JWT"
JWT_SECRET=$(prompt_for_value "Ingrese JWT Secret (Enter para omitir)" "" true)
if [ -n "$JWT_SECRET" ]; then
    create_or_update_parameter "jwt-secret" "$JWT_SECRET" "JWT signing secret" "SecureString"
else
    log_warning "JWT Secret omitido"
fi

echo ""
log_success "=== Configuración completada ==="
echo ""

# Listar parámetros creados
log_info "Parámetros creados/actualizados en $BASE_PATH:"
aws ssm get-parameters-by-path \
    --path "$BASE_PATH" \
    --region "$AWS_REGION" \
    --query 'Parameters[*].[Name,Type,LastModifiedDate]' \
    --output table

echo ""
log_info "=== Uso en serverless.yml ==="
echo ""
echo "Para usar estos parámetros en tu serverless.yml:"
echo ""
echo -e "${GREEN}provider:${NC}"
echo -e "${GREEN}  environment:${NC}"
echo -e "${GREEN}    SENTRY_DSN: \${ssm:${BASE_PATH}/sentry-dsn~true}${NC}"
echo -e "${GREEN}    SENTRY_TRACES_SAMPLE_RATE: \${ssm:${BASE_PATH}/sentry-traces-sample-rate}${NC}"
echo -e "${GREEN}    SENTRY_RELEASE: \${ssm:${BASE_PATH}/sentry-release, ''}${NC}"
echo -e "${GREEN}    DB_PASSWORD: \${ssm:${BASE_PATH}/db-password~true}${NC}"
echo -e "${GREEN}    EXTERNAL_API_KEY: \${ssm:${BASE_PATH}/external-api-key~true}${NC}"
echo ""
log_warning "Nota: El sufijo ~true habilita el descifrado automático (solo para SecureString)"
echo ""

# Instrucciones para eliminar parámetros
log_info "=== Para eliminar parámetros ==="
echo ""
echo "Eliminar un parámetro:"
echo "aws ssm delete-parameter --name ${BASE_PATH}/parameter-name --region $AWS_REGION"
echo ""
echo "Eliminar todos los parámetros del stage $STAGE:"
echo "aws ssm get-parameters-by-path --path \"${BASE_PATH}\" --region $AWS_REGION --query 'Parameters[*].Name' --output text | xargs -I {} aws ssm delete-parameter --name {} --region $AWS_REGION"
echo ""

log_success "Setup completado exitosamente!"
