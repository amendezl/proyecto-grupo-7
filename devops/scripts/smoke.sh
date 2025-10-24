#!/usr/bin/env bash

# ========================================
# SMOKE TESTS - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

set -euo pipefail

# Configuración
SMOKE_URL="${SMOKE_URL:-http://localhost:3000}"
API_BASE_URL="${API_BASE_URL:-https://api.sistema-espacios.com}"
FRONTEND_URL="${FRONTEND_URL:-https://sistema-espacios.com}"
TIMEOUT=10
MAX_RETRIES=3
RETRY_DELAY=5

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
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

# Función para hacer requests con retry
curl_with_retry() {
    local url=$1
    local expected_status=${2:-200}
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null); then
            status_code=$(echo "$response" | tail -c 4)
            body=$(echo "$response" | sed '$d')
            
            if [ "$status_code" -eq "$expected_status" ]; then
                echo "$body"
                return 0
            fi
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            warning "Intento $retries fallido para $url, reintentando en ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    error "Falló después de $MAX_RETRIES intentos para $url"
    return 1
}

# ========================================
# TESTS DEL SERVICIO DE MONITOREO
# ========================================

log "Iniciando smoke tests del Sistema de Gestión de Espacios..."

# Test 1: Health check básico del servicio de monitoreo
log "Test 1: Health check del servicio de monitoreo..."
if health_response=$(curl_with_retry "$SMOKE_URL/health"); then
    if echo "$health_response" | grep -q '"status":"OK"'; then
        success "✓ Servicio de monitoreo está saludable"
    else
        error "✗ Health check falló - respuesta: $health_response"
        exit 1
    fi
else
    error "✗ No se pudo conectar al servicio de monitoreo en $SMOKE_URL"
    exit 1
fi

# Test 2: Endpoint de status del monitoreo
log "Test 2: Status del sistema..."
if status_response=$(curl_with_retry "$SMOKE_URL/status"); then
    if echo "$status_response" | grep -q '"backend"'; then
        success "✓ Endpoint de status funcional"
    else
        warning "⚠ Status endpoint responde pero formato inesperado"
    fi
else
    error "✗ Endpoint de status no responde"
    exit 1
fi

# Test 3: Métricas del sistema
log "Test 3: Métricas del sistema..."
if metrics_response=$(curl_with_retry "$SMOKE_URL/metrics"); then
    if echo "$metrics_response" | grep -q '"uptime_seconds"'; then
        success "✓ Endpoint de métricas funcional"
    else
        warning "⚠ Métricas endpoint responde pero formato inesperado"
    fi
else
    error "✗ Endpoint de métricas no responde"
    exit 1
fi

# ========================================
# TESTS DEL BACKEND SERVERLESS (si está disponible)
# ========================================

log "Test 4: Health check del backend serverless..."
if backend_health=$(curl_with_retry "$API_BASE_URL/health" 2>/dev/null); then
    success "✓ Backend serverless está accesible"
else
    warning "⚠ Backend serverless no responde (puede estar en cold start)"
fi

# Test 5: Endpoint de autenticación
log "Test 5: Endpoint de autenticación..."
auth_status=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$API_BASE_URL/auth/me" 2>/dev/null | tail -c 4 || echo "000")
if [ "$auth_status" = "401" ]; then
    success "✓ Endpoint de auth responde correctamente (401 esperado sin token)"
elif [ "$auth_status" = "200" ]; then
    success "✓ Endpoint de auth está funcional"
else
    warning "⚠ Endpoint de auth respondió con status $auth_status"
fi

# ========================================
# TESTS DEL FRONTEND (si está disponible)
# ========================================

log "Test 6: Frontend availability..."
frontend_status=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$FRONTEND_URL" 2>/dev/null | tail -c 4 || echo "000")
if [ "$frontend_status" = "200" ]; then
    success "✓ Frontend está accesible"
else
    warning "⚠ Frontend no responde (status: $frontend_status)"
fi

# ========================================
# VALIDACIONES DE CONFIGURACIÓN
# ========================================

log "Test 7: Validación de variables de entorno..."
if [ -n "${NODE_ENV:-}" ]; then
    log "NODE_ENV: $NODE_ENV"
else
    warning "⚠ NODE_ENV no está configurado"
fi

if [ -n "${PORT:-}" ]; then
    log "PORT: $PORT"
else
    warning "⚠ PORT no está configurado"
fi

# ========================================
# RESUMEN FINAL
# ========================================

log "Smoke tests completados para Sistema de Gestión de Espacios"
success "🎉 Todos los tests críticos pasaron exitosamente"

log "URLs validadas:"
log "  - Monitor: $SMOKE_URL"
log "  - Backend: $API_BASE_URL" 
log "  - Frontend: $FRONTEND_URL"

exit 0
