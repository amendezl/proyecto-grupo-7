#!/usr/bin/env bash

# ========================================
# PRE-DEPLOYMENT CHECKS - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

set -euo pipefail

# Configuración
REQUIRED_VARS=("NODE_ENV" "AWS_REGION" "API_BASE_URL" "FRONTEND_URL")
MIN_DISK_SPACE_MB=1000
MIN_MEMORY_MB=512

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# ========================================
# VALIDACIONES DE PRERREQUISITOS
# ========================================

log "Iniciando validaciones de pre-deployment..."

# Check 1: Variables de entorno requeridas
log "Validando variables de entorno..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        error "Variable de entorno requerida no está configurada: $var"
        exit 1
    else
        success "✓ $var está configurado"
    fi
done

# Check 2: Disponibilidad de recursos del sistema
log "Validando recursos del sistema..."

# Verificar espacio en disco
available_space_kb=$(df /tmp | awk 'NR==2 {print $4}')
available_space_mb=$((available_space_kb / 1024))

if [ $available_space_mb -lt $MIN_DISK_SPACE_MB ]; then
    error "Espacio en disco insuficiente: ${available_space_mb}MB disponible, ${MIN_DISK_SPACE_MB}MB requerido"
    exit 1
else
    success "✓ Espacio en disco suficiente: ${available_space_mb}MB disponible"
fi

# Verificar memoria disponible
available_memory_kb=$(free | awk 'NR==2 {print $7}')
available_memory_mb=$((available_memory_kb / 1024))

if [ $available_memory_mb -lt $MIN_MEMORY_MB ]; then
    warning "⚠ Memoria disponible baja: ${available_memory_mb}MB (recomendado: ${MIN_MEMORY_MB}MB)"
else
    success "✓ Memoria suficiente: ${available_memory_mb}MB disponible"
fi

# Check 3: Conectividad de red
log "Validando conectividad de red..."

# Test de conectividad a AWS
if curl -s --connect-timeout 5 https://aws.amazon.com > /dev/null; then
    success "✓ Conectividad a AWS OK"
else
    error "✗ No hay conectividad a AWS"
    exit 1
fi

# Test de conectividad a ECR
if aws ecr get-authorization-token --region ${AWS_REGION} > /dev/null 2>&1; then
    success "✓ Autenticación con ECR OK"
else
    error "✗ Falló autenticación con ECR"
    exit 1
fi

# Check 4: Validación de servicios existentes
log "Validando servicios existentes..."

# Verificar que no haya deployments en progreso
if aws ecs list-services --cluster sistema-gestion-espacios-cluster --region ${AWS_REGION} 2>/dev/null | grep -q "espacios-monitor"; then
    log "Servicio existente detectado, verificando estado..."
    
    service_status=$(aws ecs describe-services \
        --cluster sistema-gestion-espacios-cluster \
        --services espacios-monitor \
        --region ${AWS_REGION} \
        --query 'services[0].deployments[?status==`PRIMARY`].runningCount' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$service_status" != "0" ]; then
        log "Servicio existente en ejecución con $service_status instancias"
    fi
else
    log "No hay servicio existente, será un deployment inicial"
fi

# Check 5: Validar configuración de ECS
log "Validando configuración de ECS..."
if aws ecs describe-clusters --clusters sistema-gestion-espacios-cluster --region ${AWS_REGION} > /dev/null 2>&1; then
    success "✓ Cluster ECS existe y está accesible"
else
    warning "⚠ Cluster ECS no existe, será creado durante el deployment"
fi

# Check 6: Validar permisos IAM
log "Validando permisos IAM..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    caller_arn=$(aws sts get-caller-identity --query 'Arn' --output text)
    success "✓ Permisos IAM OK - Identity: $caller_arn"
else
    error "✗ No hay permisos IAM válidos"
    exit 1
fi

# ========================================
# VALIDACIONES ESPECÍFICAS DEL PROYECTO
# ========================================

log "Validando configuración específica del Sistema de Gestión de Espacios..."

# Validar que las URLs tengan el formato correcto
if [[ $API_BASE_URL =~ ^https?:// ]]; then
    success "✓ API_BASE_URL tiene formato válido: $API_BASE_URL"
else
    error "✗ API_BASE_URL tiene formato inválido: $API_BASE_URL"
    exit 1
fi

if [[ $FRONTEND_URL =~ ^https?:// ]]; then
    success "✓ FRONTEND_URL tiene formato válido: $FRONTEND_URL"
else
    error "✗ FRONTEND_URL tiene formato inválido: $FRONTEND_URL"
    exit 1
fi

# ========================================
# RESUMEN Y FINALIZACIÓN
# ========================================

success "🎉 Todas las validaciones de pre-deployment pasaron exitosamente"

log "Configuración validada:"
log "  - Entorno: $NODE_ENV"
log "  - Región AWS: $AWS_REGION"
log "  - API Backend: $API_BASE_URL"
log "  - Frontend: $FRONTEND_URL"
log "  - Espacio disponible: ${available_space_mb}MB"
log "  - Memoria disponible: ${available_memory_mb}MB"

log "✅ Sistema listo para deployment del Sistema de Gestión de Espacios"

exit 0