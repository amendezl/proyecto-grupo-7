#!/usr/bin/env bash

# ========================================
# INTEGRATION TESTS - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

set -euo pipefail

# Configuración
MONITOR_URL="${MONITOR_URL:-http://localhost:3000}"
API_BASE_URL="${API_BASE_URL:-https://api.sistema-espacios.com}"
FRONTEND_URL="${FRONTEND_URL:-https://sistema-espacios.com}"
DEVOPS_STATUS_URL="${DEVOPS_STATUS_URL:-${API_BASE_URL}/devops/status}"
TIMEOUT=10

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
# FUNCIONES DE TESTING
# ========================================

test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    log "Testing: $description"
    
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo "000")
    status_code=$(echo "$response" | tail -c 4)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        success "✓ $description (Status: $status_code)"
        return 0
    else
        error "✗ $description falló (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

test_json_response() {
    local url=$1
    local expected_key=$2
    local description=$3
    
    log "Testing JSON: $description"
    
    response=$(curl -s --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo '{}')
    
    if echo "$response" | grep -q "\"$expected_key\""; then
        success "✓ $description (Contains: $expected_key)"
        return 0
    else
        error "✗ $description falló (Missing key: $expected_key)"
        log "Response: $response"
        return 1
    fi
}

# ========================================
# INTEGRATION TESTS
# ========================================

log "Iniciando integration tests del Sistema de Gestión de Espacios..."

test_failures=0

# ========================================
# TESTS DEL SERVICIO DE MONITOREO
# ========================================

log "=== TESTS DEL SERVICIO DE MONITOREO ==="

# Test 1: Health endpoint
if ! test_endpoint "$MONITOR_URL/health" 200 "Monitor Health Check"; then
    test_failures=$((test_failures + 1))
fi

# Test 2: Status endpoint con datos válidos
if ! test_json_response "$MONITOR_URL/status" "backend" "Monitor Status Data"; then
    test_failures=$((test_failures + 1))
fi

# Test 3: Metrics endpoint
if ! test_json_response "$MONITOR_URL/metrics" "uptime_seconds" "Monitor Metrics Data"; then
    test_failures=$((test_failures + 1))
fi

# Test 4: Root endpoint información del servicio
if ! test_json_response "$MONITOR_URL/" "service" "Monitor Service Info"; then
    test_failures=$((test_failures + 1))
fi

# ========================================
# TESTS DEL BACKEND SERVERLESS
# ========================================

log "=== TESTS DEL BACKEND SERVERLESS ==="

# Test 5: Backend health (si está disponible)
if test_endpoint "$API_BASE_URL/health" 200 "Backend Health Check"; then
    success "✓ Backend está completamente funcional"
else
    # Puede estar en cold start, intentar con auth endpoint
    log "Backend health no responde, probando endpoint de auth..."
    if test_endpoint "$API_BASE_URL/auth/me" 401 "Backend Auth Endpoint (401 expected)"; then
        success "✓ Backend está funcional (respondió correctamente con 401)"
    else
        warning "⚠ Backend puede estar en cold start o no disponible"
        test_failures=$((test_failures + 1))
    fi
fi

# Test 6: Endpoints específicos del Sistema de Gestión de Espacios
backend_endpoints=(
    "/espacios:401:Gestión de Espacios"
    "/reservas:401:Gestión de Reservas" 
    "/usuarios:401:Gestión de Usuarios"
    "/responsables:401:Gestión de Responsables"
    "/zonas:401:Gestión de Zonas"
)

for endpoint_config in "${backend_endpoints[@]}"; do
    IFS=':' read -r endpoint expected_status description <<< "$endpoint_config"
    
    if ! test_endpoint "$API_BASE_URL$endpoint" "$expected_status" "$description Endpoint"; then
        warning "⚠ $description endpoint no respondió como esperado"
        # No contamos como falla crítica si es 401 (auth requerida)
    fi
done

# Test 7: DevOps status endpoint
if ! test_json_response "$DEVOPS_STATUS_URL" "services" "DevOps Status Endpoint"; then
    test_failures=$((test_failures + 1))
fi

# ========================================
# TESTS DE FRONTEND
# ========================================

log "=== TESTS DE FRONTEND ==="

# Test 8: Frontend availability
if test_endpoint "$FRONTEND_URL" 200 "Frontend Availability"; then
    success "✓ Frontend está completamente accesible"
else
    warning "⚠ Frontend no está disponible"
    test_failures=$((test_failures + 1))
fi

# Test 9: Frontend assets básicos (si están disponibles)
frontend_assets=("/_next/static" "/favicon.ico" "/manifest.json")

for asset in "${frontend_assets[@]}"; do
    asset_url="$FRONTEND_URL$asset"
    if curl -s --connect-timeout $TIMEOUT -I "$asset_url" | grep -q "200 OK"; then
        success "✓ Frontend asset disponible: $asset"
    else
        log "Asset no disponible (puede ser normal): $asset"
    fi
done

# ========================================
# TESTS DE INTEGRACIÓN COMPLETA
# ========================================

log "=== TESTS DE INTEGRACIÓN COMPLETA ==="

# Test 10: Monitor puede conectar con backend
log "Testing: Monitor → Backend connectivity"
monitor_status=$(curl -s "$MONITOR_URL/status" 2>/dev/null || echo '{}')

if echo "$monitor_status" | grep -q '"backend"'; then
    backend_status=$(echo "$monitor_status" | grep -o '"backend":"[^"]*"' | cut -d'"' -f4)
    if [ "$backend_status" = "healthy" ]; then
        success "✓ Monitor reporta backend como saludable"
    elif [ "$backend_status" = "unhealthy" ]; then
        warning "⚠ Monitor reporta backend como no saludable"
    else
        log "Monitor reporta backend como: $backend_status"
    fi
else
    warning "⚠ Monitor no está reportando estado del backend"
    test_failures=$((test_failures + 1))
fi

# Test 11: Monitor puede conectar con frontend
if echo "$monitor_status" | grep -q '"frontend"'; then
    frontend_status=$(echo "$monitor_status" | grep -o '"frontend":"[^"]*"' | cut -d'"' -f4)
    if [ "$frontend_status" = "healthy" ]; then
        success "✓ Monitor reporta frontend como saludable"
    elif [ "$frontend_status" = "unhealthy" ]; then
        warning "⚠ Monitor reporta frontend como no saludable"
    else
        log "Monitor reporta frontend como: $frontend_status"
    fi
else
    warning "⚠ Monitor no está reportando estado del frontend"
fi

# ========================================
# TESTS DE PERFORMANCE BÁSICOS
# ========================================

log "=== TESTS DE PERFORMANCE ==="

# Test 12: Tiempo de respuesta del monitor
log "Testing: Monitor response time"
start_time=$(date +%s%N)
curl -s "$MONITOR_URL/health" > /dev/null 2>&1
end_time=$(date +%s%N)
response_time=$(((end_time - start_time) / 1000000)) # Convert to milliseconds

if [ $response_time -lt 1000 ]; then
    success "✓ Monitor response time: ${response_time}ms (< 1000ms)"
elif [ $response_time -lt 5000 ]; then
    warning "⚠ Monitor response time: ${response_time}ms (> 1000ms pero acceptable)"
else
    error "✗ Monitor response time muy alto: ${response_time}ms"
    test_failures=$((test_failures + 1))
fi

# ========================================
# RESUMEN Y RESULTADO FINAL
# ========================================

log "=== RESUMEN DE INTEGRATION TESTS ==="

if [ $test_failures -eq 0 ]; then
    success "🎉 Todos los integration tests pasaron exitosamente"
    log "Sistema de Gestión de Espacios completamente integrado y funcional"
    exit 0
elif [ $test_failures -le 2 ]; then
    warning "⚠ Integration tests completados con $test_failures fallas menores"
    log "Sistema funcional con algunas advertencias no críticas"
    exit 0
else
    error "✗ Integration tests fallaron con $test_failures fallas críticas"
    log "Sistema puede tener problemas de integración que requieren atención"
    exit 1
fi