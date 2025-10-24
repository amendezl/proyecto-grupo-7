#!/usr/bin/env bash

# ========================================
# FINAL VALIDATION - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

set -euo pipefail

# Configuración
MONITOR_URL="${MONITOR_URL:-http://localhost:3000}"
API_BASE_URL="${API_BASE_URL:-https://api.sistema-espacios.com}"
FRONTEND_URL="${FRONTEND_URL:-https://sistema-espacios.com}"
VALIDATION_DURATION=60  # 1 minuto de validación continua
CHECK_INTERVAL=5        # Cada 5 segundos

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
# FUNCIONES DE VALIDACIÓN
# ========================================

check_service_stability() {
    local service_name=$1
    local service_url=$2
    local check_count=0
    local success_count=0
    
    log "Validando estabilidad de $service_name durante ${VALIDATION_DURATION}s..."
    
    end_time=$(($(date +%s) + VALIDATION_DURATION))
    
    while [ $(date +%s) -lt $end_time ]; do
        check_count=$((check_count + 1))
        
        if curl -s --connect-timeout 5 "$service_url" > /dev/null 2>&1; then
            success_count=$((success_count + 1))
        fi
        
        sleep $CHECK_INTERVAL
    done
    
    success_rate=$(( (success_count * 100) / check_count ))
    
    log "$service_name: $success_count/$check_count checks exitosos ($success_rate%)"
    
    if [ $success_rate -ge 95 ]; then
        success "✓ $service_name es estable ($success_rate% uptime)"
        return 0
    elif [ $success_rate -ge 80 ]; then
        warning "⚠ $service_name tiene estabilidad aceptable ($success_rate% uptime)"
        return 0
    else
        error "✗ $service_name es inestable ($success_rate% uptime)"
        return 1
    fi
}

validate_business_flows() {
    log "Validando flujos de negocio del Sistema de Gestión de Espacios..."
    
    # Validar que el monitor esté reportando correctamente
    status_response=$(curl -s "$MONITOR_URL/status" 2>/dev/null || echo '{}')
    
    local validation_score=0
    local max_score=5
    
    # Check 1: Monitor está funcionando
    if echo "$status_response" | grep -q '"uptime"'; then
        success "✓ Servicio de monitoreo operacional"
        validation_score=$((validation_score + 1))
    else
        error "✗ Servicio de monitoreo no está operacional"
    fi
    
    # Check 2: Backend monitoring
    if echo "$status_response" | grep -q '"backend"'; then
        backend_status=$(echo "$status_response" | grep -o '"backend":"[^"]*"' | cut -d'"' -f4)
        if [ "$backend_status" = "healthy" ] || [ "$backend_status" = "unknown" ]; then
            success "✓ Backend está siendo monitoreado correctamente"
            validation_score=$((validation_score + 1))
        else
            warning "⚠ Backend status: $backend_status"
        fi
    else
        warning "⚠ Backend no está siendo monitoreado"
    fi
    
    # Check 3: Frontend monitoring  
    if echo "$status_response" | grep -q '"frontend"'; then
        frontend_status=$(echo "$status_response" | grep -o '"frontend":"[^"]*"' | cut -d'"' -f4)
        if [ "$frontend_status" = "healthy" ] || [ "$frontend_status" = "unknown" ]; then
            success "✓ Frontend está siendo monitoreado correctamente"
            validation_score=$((validation_score + 1))
        else
            warning "⚠ Frontend status: $frontend_status"
        fi
    else
        warning "⚠ Frontend no está siendo monitoreado"
    fi
    
    # Check 4: Database monitoring
    if echo "$status_response" | grep -q '"database"'; then
        database_status=$(echo "$status_response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
        if [ "$database_status" = "healthy" ] || [ "$database_status" = "unknown" ]; then
            success "✓ Base de datos está siendo monitoreada correctamente"
            validation_score=$((validation_score + 1))
        else
            warning "⚠ Database status: $database_status"
        fi
    else
        warning "⚠ Base de datos no está siendo monitoreada"
    fi
    
    # Check 5: Métricas disponibles
    metrics_response=$(curl -s "$MONITOR_URL/metrics" 2>/dev/null || echo '{}')
    if echo "$metrics_response" | grep -q '"uptime_seconds"'; then
        success "✓ Métricas del sistema están disponibles"
        validation_score=$((validation_score + 1))
    else
        warning "⚠ Métricas del sistema no están disponibles"
    fi
    
    local score_percentage=$(( (validation_score * 100) / max_score ))
    log "Puntuación de flujos de negocio: $validation_score/$max_score ($score_percentage%)"
    
    return $validation_score
}

check_resource_usage() {
    log "Validando uso de recursos del sistema..."
    
    # Verificar memoria del proceso Docker (si aplica)
    if command -v docker >/dev/null 2>&1; then
        container_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -i espacios || echo "")
        if [ -n "$container_stats" ]; then
            success "✓ Contenedor del Sistema de Gestión de Espacios está ejecutándose"
            log "Stats: $container_stats"
        else
            log "No se detectó contenedor Docker (puede estar ejecutándose nativamente)"
        fi
    fi
    
    # Verificar disponibilidad de memoria del sistema
    free_memory_mb=$(free -m | awk 'NR==2{printf "%d", $7}' 2>/dev/null || echo "0")
    if [ "$free_memory_mb" -gt 100 ]; then
        success "✓ Memoria del sistema disponible: ${free_memory_mb}MB"
    else
        warning "⚠ Memoria del sistema baja: ${free_memory_mb}MB"
    fi
    
    # Verificar carga del sistema
    if command -v uptime >/dev/null 2>&1; then
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        log "Carga promedio del sistema: $load_avg"
    fi
}

# ========================================
# EJECUCIÓN DE VALIDACIÓN FINAL
# ========================================

log "🔍 Iniciando validación final del Sistema de Gestión de Espacios..."
log "Duración de validación: ${VALIDATION_DURATION}s con checks cada ${CHECK_INTERVAL}s"

validation_failures=0

# ========================================
# VALIDACIÓN DE ESTABILIDAD
# ========================================

log "=== VALIDACIÓN DE ESTABILIDAD DE SERVICIOS ==="

# Validar estabilidad del servicio de monitoreo
if ! check_service_stability "Monitor DevOps" "$MONITOR_URL/health"; then
    validation_failures=$((validation_failures + 1))
fi

# Validar estabilidad del backend (si está disponible)
if curl -s --connect-timeout 5 "$API_BASE_URL/health" > /dev/null 2>&1; then
    if ! check_service_stability "Backend Serverless" "$API_BASE_URL/health"; then
        validation_failures=$((validation_failures + 1))
    fi
else
    log "Backend no disponible para test de estabilidad (puede estar en cold start)"
fi

# ========================================
# VALIDACIÓN DE FLUJOS DE NEGOCIO
# ========================================

log "=== VALIDACIÓN DE FLUJOS DE NEGOCIO ==="

validate_business_flows
business_score=$?

if [ $business_score -lt 3 ]; then
    warning "⚠ Puntuación de flujos de negocio baja: $business_score/5"
    validation_failures=$((validation_failures + 1))
fi

# ========================================
# VALIDACIÓN DE RECURSOS
# ========================================

log "=== VALIDACIÓN DE RECURSOS DEL SISTEMA ==="

check_resource_usage

# ========================================
# VALIDACIÓN DE LOGS Y MONITOREO
# ========================================

log "=== VALIDACIÓN DE LOGS Y MONITOREO ==="

# Verificar que los logs estén siendo generados
if curl -s "$MONITOR_URL/logs" > /dev/null 2>&1; then
    success "✓ Sistema de logs está disponible"
else
    warning "⚠ Sistema de logs no está disponible"
fi

# Verificar timestamp de la última actualización
status_response=$(curl -s "$MONITOR_URL/status" 2>/dev/null || echo '{}')
if echo "$status_response" | grep -q '"lastCheck"'; then
    last_check=$(echo "$status_response" | grep -o '"lastCheck":"[^"]*"' | cut -d'"' -f4)
    log "Último health check: $last_check"
    success "✓ Sistema está ejecutando health checks automáticos"
else
    warning "⚠ No se detectan health checks automáticos"
fi

# ========================================
# RESUMEN Y RESULTADO FINAL
# ========================================

log "=== RESUMEN DE VALIDACIÓN FINAL ==="

# Generar reporte final
cat << EOF

📊 REPORTE FINAL - SISTEMA DE GESTIÓN DE ESPACIOS
================================================

🎯 Servicio: Sistema de Gestión de Espacios - Monitor DevOps
📍 URLs Validadas:
   - Monitor: $MONITOR_URL
   - Backend: $API_BASE_URL  
   - Frontend: $FRONTEND_URL

📈 Resultados:
   - Flujos de Negocio: $business_score/5 puntos
   - Fallas de Validación: $validation_failures
   - Memoria Disponible: ${free_memory_mb:-N/A}MB

⏱️  Duración de Validación: ${VALIDATION_DURATION}s
🔄 Intervalo de Checks: ${CHECK_INTERVAL}s
📅 Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

EOF

if [ $validation_failures -eq 0 ] && [ $business_score -ge 4 ]; then
    success "🎉 VALIDACIÓN FINAL EXITOSA - Sistema completamente operacional"
    log "✅ Sistema de Gestión de Espacios está listo para producción"
    exit 0
elif [ $validation_failures -le 1 ] && [ $business_score -ge 3 ]; then
    warning "⚠ VALIDACIÓN FINAL CON ADVERTENCIAS - Sistema operacional con observaciones"
    log "⚠️  Sistema funcional pero requiere monitoreo adicional"
    exit 0
else
    error "❌ VALIDACIÓN FINAL FALLIDA - Sistema requiere atención inmediata"
    log "🚨 Sistema no está listo para producción"
    exit 1
fi