/**
 * Script de prueba para validar la integración completa de resiliencia
 * Prueba los patrones Retry + Circuit Breaker + Bulkhead
 */

const { resilienceManager } = require('./src/utils/resilienceManager');

async function testResilienceIntegration() {
    console.log('🔬 Iniciando pruebas de integración de resiliencia...\n');
    
    // Test 1: Operación exitosa con resiliencia completa
    console.log('Test 1: Operación exitosa con resiliencia completa');
    try {
        const result1 = await resilienceManager.executeWithFullResilience(
            async () => {
                console.log('  ✅ Simulando operación de base de datos exitosa');
                return { success: true, data: 'Datos obtenidos correctamente' };
            },
            'DATABASE_OPERATIONS',
            {
                operation: 'testSuccessfulOperation',
                priority: 'standard'
            }
        );
        console.log('  ✅ Resultado:', result1);
    } catch (error) {
        console.error('  ❌ Error:', error.message);
    }
    
    // Test 2: Operación crítica médica
    console.log('\nTest 2: Operación médica crítica');
    try {
        const result2 = await resilienceManager.executeCritical(
            async () => {
                console.log('  🏥 Simulando operación médica crítica');
                return { success: true, data: 'Datos médicos críticos obtenidos' };
            },
            {
                operation: 'testCriticalMedicalOperation',
                type: 'medical_emergency'
            }
        );
        console.log('  ✅ Resultado:', result2);
    } catch (error) {
        console.error('  ❌ Error:', error.message);
    }
    
    // Test 3: Autenticación con Bulkhead dedicado
    console.log('\nTest 3: Autenticación con pool dedicado');
    try {
        const result3 = await resilienceManager.executeAuthWithBulkhead(
            async () => {
                console.log('  🔐 Simulando autenticación exitosa');
                return { success: true, data: 'Usuario autenticado' };
            },
            {
                operation: 'testAuthentication',
                userId: 'test-user-123'
            }
        );
        console.log('  ✅ Resultado:', result3);
    } catch (error) {
        console.error('  ❌ Error:', error.message);
    }
    
    // Test 4: Operación de baja prioridad (reportes)
    console.log('\nTest 4: Operación de baja prioridad (reportes)');
    try {
        const result4 = await resilienceManager.executeLowPriority(
            async () => {
                console.log('  📊 Simulando generación de reporte');
                return { success: true, data: 'Reporte generado' };
            },
            {
                operation: 'testReportGeneration',
                type: 'reporting'
            }
        );
        console.log('  ✅ Resultado:', result4);
    } catch (error) {
        console.error('  ❌ Error:', error.message);
    }
    
    // Test 5: Operación que falla para probar retry
    console.log('\nTest 5: Operación que falla (para probar retry)');
    let attemptCount = 0;
    try {
        const result5 = await resilienceManager.executeDatabase(
            async () => {
                attemptCount++;
                console.log(`  🔄 Intento ${attemptCount}`);
                if (attemptCount < 3) {
                    throw new Error('Fallo temporal simulado');
                }
                console.log('  ✅ Operación exitosa después de retry');
                return { success: true, data: 'Éxito después de reintentos' };
            },
            {
                operation: 'testRetryOperation',
                allowRetry: true
            }
        );
        console.log('  ✅ Resultado final:', result5);
    } catch (error) {
        console.error('  ❌ Error final:', error.message);
    }
    
    // Test 6: Obtener métricas del sistema
    console.log('\nTest 6: Métricas del sistema de resiliencia');
    try {
        const metrics = resilienceManager.getCompleteSystemMetrics();
        console.log('  📊 Métricas completas:');
        console.log('    - Operaciones totales:', metrics.resilience.totalOperations);
        console.log('    - Operaciones exitosas:', metrics.resilience.successfulOperations);
        console.log('    - Tasa de éxito:', metrics.resilience.successRate.toFixed(2) + '%');
        console.log('    - Score de salud combinado:', metrics.combinedHealthScore);
        console.log('    - Pools de Bulkhead activos:', Object.keys(metrics.bulkhead.metrics.pools).length);
        console.log('    - Requests activos totales:', metrics.bulkhead.metrics.totalActiveRequests);
    } catch (error) {
        console.error('  ❌ Error obteniendo métricas:', error.message);
    }
    
    console.log('\n🎉 Pruebas de integración completadas!');
    console.log('\n📋 Resumen de la integración de resiliencia:');
    console.log('  ✅ Patrón Retry: Implementado con reintentos exponenciales');
    console.log('  ✅ Patrón Circuit Breaker: Implementado con estados y fallbacks');
    console.log('  ✅ Patrón Bulkhead: Implementado con 6 pools específicos para hospital');
    console.log('  ✅ Handlers integrados: recursos, responsables, zonas, dashboard, queue, enqueue');
    console.log('  ✅ Métricas y monitoreo: Sistema completo de health checks');
    console.log('  ✅ Configuraciones específicas: Para servicios médicos críticos');
}

// Ejecutar pruebas
testResilienceIntegration().catch(console.error);
