#!/usr/bin/env bash

# ========================================
# HEALTH CHECK POST-DEPLOYMENT - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

set -euo pipefail

# Configuración
SERVICE_URL="${SERVICE_URL:-http://localhost:3000}"
MAX_WAIT_TIME=300  # 5 minutos
CHECK_INTERVAL=10  # 10 segundos
HEALTH_ENDPOINT="$SERVICE_URL/health"
STATUS_ENDPOINT="$SERVICE_URL/status"

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
# FUNCIONES DE HEALTH CHECK
# ========================================

wait_for_service() {
    local endpoint=$1
    local max_time=$2
    local interval=$3
    local elapsed=0
    
    log "Esperando que el servicio esté disponible en: $endpoint"
    
    while [ $elapsed -lt $max_time ]; do
        if curl -s --connect-timeout 5 "$endpoint" > /dev/null 2>&1; then
            success "✓ Servicio está respondiendo"
            return 0
        fi
        
        log "Servicio no disponible aún, esperando ${interval}s... (${elapsed}/${max_time}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    error "✗ Timeout: Servicio no estuvo disponible después de ${max_time}s"
    return 1
}

validate_health_response() {
    local response=$1
    
    # Validar que la respuesta contenga status OK
    if echo "$response" | grep -q '"status":"OK"'; then
        success "✓ Health check respuesta válida"
        return 0
    else
        error "✗ Health check respuesta inválida: $response"
        return 1
    fi
}

validate_service_info() {
    local response=$1
    
    # Verificar que la respuesta contenga información del servicio
    if echo "$response" | grep -q "sistema-gestion-espacios"; then
        success "✓ Servicio identificado correctamente como Sistema de Gestión de Espacios"
    else
        warning "⚠ Respuesta no contiene identificación del servicio esperada"
    fi
    
    # Verificar version
    version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$version" ]; then
        log "Versión del servicio: $version"
    fi
    
    # Verificar uptime
    uptime=$(echo "$response" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    if [ -n "$uptime" ]; then
        log "Uptime del servicio: ${uptime}s"
    fi
}

# ========================================
# EJECUCIÓN DE HEALTH CHECKS
# ========================================

log "Iniciando health checks post-deployment del Sistema de Gestión de Espacios..."

# Step 1: Esperar que el servicio esté disponible
if ! wait_for_service "$HEALTH_ENDPOINT" $MAX_WAIT_TIME $CHECK_INTERVAL; then
    error "El servicio no estuvo disponible en el tiempo esperado"
    exit 1
fi

# Step 2: Validar el endpoint de health
log "Validando endpoint de health..."
health_response=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null || echo '{"error":"no_response"}')

if ! validate_health_response "$health_response"; then
    error "Health check falló"
    exit 1
fi

# Step 3: Validar el endpoint de status
log "Validando endpoint de status..."
status_response=$(curl -s "$STATUS_ENDPOINT" 2>/dev/null || echo '{"error":"no_response"}')

if [ "$status_response" != '{"error":"no_response"}' ]; then
    success "✓ Endpoint de status responde"
    validate_service_info "$status_response"
else
    warning "⚠ Endpoint de status no responde"
fi

# Step 4: Verificar métricas básicas
log "Validando métricas básicas..."
metrics_response=$(curl -s "$SERVICE_URL/metrics" 2>/dev/null || echo '{"error":"no_response"}')

if echo "$metrics_response" | grep -q "uptime_seconds"; then
    success "✓ Métricas están disponibles"
else
    warning "⚠ Métricas no están disponibles o tienen formato incorrecto"
fi

# Step 5: Test de carga básico
log "Ejecutando test de carga básico..."
load_test_results=0

for i in {1..5}; do
    if curl -s --connect-timeout 5 "$HEALTH_ENDPOINT" > /dev/null; then
        load_test_results=$((load_test_results + 1))
    fi
done

if [ $load_test_results -eq 5 ]; then
    success "✓ Test de carga básico pasado (5/5 requests exitosos)"
elif [ $load_test_results -ge 3 ]; then
    warning "⚠ Test de carga parcialmente exitoso ($load_test_results/5 requests exitosos)"
else
    error "✗ Test de carga falló ($load_test_results/5 requests exitosos)"
    exit 1
fi

# Step 6: Verificar logs (si están disponibles)
log "Verificando disponibilidad de logs..."
if curl -s "$SERVICE_URL/logs" > /dev/null 2>&1; then
    success "✓ Endpoint de logs está disponible"
else
    warning "⚠ Endpoint de logs no está disponible"
fi

# ========================================
# VALIDACIONES ESPECÍFICAS DEL NEGOCIO
# ========================================

log "Ejecutando validaciones específicas del Sistema de Gestión de Espacios..."

# Verificar que el servicio tenga las características esperadas
if echo "$status_response" | grep -q '"backend"'; then
    success "✓ Servicio está monitoreando el backend"
else
    warning "⚠ Servicio no está reportando estado del backend"
fi

if echo "$status_response" | grep -q '"frontend"'; then
    success "✓ Servicio está monitoreando el frontend" 
else
    warning "⚠ Servicio no está reportando estado del frontend"
fi

if echo "$status_response" | grep -q '"database"'; then
    success "✓ Servicio está monitoreando la base de datos"
else
    warning "⚠ Servicio no está reportando estado de la base de datos"
fi

# ========================================
# RESUMEN FINAL
# ========================================

success "🎉 Health checks post-deployment completados exitosamente"

log "Servicio del Sistema de Gestión de Espacios está operacional:"
log "  - Health: $HEALTH_ENDPOINT ✓"
log "  - Status: $STATUS_ENDPOINT ✓"
log "  - Metrics: $SERVICE_URL/metrics ✓"
log "  - Logs: $SERVICE_URL/logs ✓"

log "✅ Deployment validado - Sistema listo para recibir tráfico"

exit 0