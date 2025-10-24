// Verificación de migración completa
const fs = require('fs');
const path = require('path');

// Lista de todos los archivos que deberían estar después de la migración
const archivosMigrados = {
  // API Layer - 21 archivos
  'src/api/auth/auth.js': 'handlers/auth.js',
  'src/api/auth/cognitoAuth.js': 'handlers/cognitoAuth.js',
  'src/api/business/espacios.js': 'handlers/espacios.js',
  'src/api/business/reservas.js': 'handlers/reservas.js',
  'src/api/business/responsables.js': 'handlers/responsables.js',
  'src/api/business/usuarios.js': 'handlers/usuarios.js',
  'src/api/business/zonas.js': 'handlers/zonas.js',
  'src/api/integrations/mobile.js': 'handlers/mobile.js',
  'src/api/integrations/personalization.js': 'handlers/personalization.js',
  'src/api/integrations/personalizationForwarder.js': 'handlers/personalizationForwarder.js',
  'src/api/integrations/sns.js': 'handlers/sns.js',
  'src/api/integrations/websocket.connect.js': 'handlers/websocket.connect.js',
  'src/api/integrations/websocket.default.js': 'handlers/websocket.default.js',
  'src/api/integrations/websocket.disconnect.js': 'handlers/websocket.disconnect.js',
  'src/api/integrations/websocket.js': 'handlers/websocket.js',
  'src/api/system/dashboard.js': 'handlers/dashboard.js',
  'src/api/system/dynamoStreamProcessor.js': 'handlers/dynamoStreamProcessor.js',
  'src/api/system/healthCheck.js': 'handlers/healthCheck.js',
  'src/api/system/horizontal.js': 'handlers/horizontal.js',
  'src/api/system/queueWorker.js': 'handlers/queueWorker.js',
  'src/api/system/vertical.js': 'handlers/vertical.js',

  // Core Layer - 6 archivos
  'src/core/auth/auth.js': 'utils/auth.js',
  'src/core/auth/cognito-users.js': 'utils/cognito-users.js',
  'src/core/auth/cognitoAuth.js': 'utils/cognitoAuth.js (duplicado)',
  'src/core/auth/permissions.js': 'utils/permissions.js',
  'src/core/validation/middleware.js': 'utils/middleware.js',
  'src/core/validation/validator.js': 'utils/validator.js',

  // Infrastructure Layer - 5 archivos
  'src/infrastructure/database/DynamoDBAdapter.js': 'database/DynamoDBAdapter.js',
  'src/infrastructure/database/DynamoDBManager.js': 'database/DynamoDBManager.js',
  'src/infrastructure/messaging/snsNotifications.js': 'utils/snsNotifications.js',
  'src/infrastructure/monitoring/logger.js': 'utils/logger.js',
  'src/infrastructure/monitoring/metrics.js': 'utils/metrics.js',

  // Shared Layer - 6 archivos
  'src/shared/patterns/bulkheadPattern.js': 'patterns/bulkheadPattern.js',
  'src/shared/patterns/circuitBreakerPattern.js': 'patterns/circuitBreakerPattern.js',
  'src/shared/patterns/retryPattern.js': 'patterns/retryPattern.js',
  'src/shared/utils/personalizationManager.js': 'utils/personalizationManager.js',
  'src/shared/utils/resilienceManager.js': 'utils/resilienceManager.js',
  'src/shared/utils/responses.js': 'utils/responses.js'
};

console.log('🔍 VERIFICANDO MIGRACIÓN DE ARCHIVOS...\n');

let archivosEncontrados = 0;
let archivosFaltantes = 0;

for (const [nuevaRuta, rutaAnterior] of Object.entries(archivosMigrados)) {
  if (fs.existsSync(nuevaRuta)) {
    archivosEncontrados++;
    console.log(`✅ ${nuevaRuta}`);
  } else {
    archivosFaltantes++;
    console.log(`❌ FALTA: ${nuevaRuta} (era: ${rutaAnterior})`);
  }
}

console.log(`\n📊 RESUMEN:`);
console.log(`✅ Archivos encontrados: ${archivosEncontrados}`);
console.log(`❌ Archivos faltantes: ${archivosFaltantes}`);
console.log(`📁 Total esperado: ${Object.keys(archivosMigrados).length}`);

// Verificar que no existan las carpetas antiguas
const carpetasAntiguas = ['src/handlers', 'src/utils', 'src/database', 'src/patterns'];
console.log(`\n🗂️ VERIFICANDO ELIMINACIÓN DE CARPETAS ANTIGUAS:`);
for (const carpeta of carpetasAntiguas) {
  if (fs.existsSync(carpeta)) {
    console.log(`⚠️ CARPETA ANTIGUA AÚN EXISTE: ${carpeta}`);
  } else {
    console.log(`✅ Carpeta antigua eliminada: ${carpeta}`);
  }
}

console.log(`\n${archivosFaltantes === 0 ? '🎉 MIGRACIÓN COMPLETA Y CORRECTA' : '⚠️ HAY ARCHIVOS FALTANTES'}`);