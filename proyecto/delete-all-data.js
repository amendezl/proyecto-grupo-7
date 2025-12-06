/**
 * Script para eliminar TODOS los datos de DynamoDB
 * ⚠️ CUIDADO: Esto eliminará todos los espacios, zonas, reservas y usuarios
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'sistema-gestion-espacios-dev-main';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function deleteAllItems() {
  console.log('\n🗑️  ELIMINANDO TODOS LOS DATOS DE DYNAMODB...\n');
  console.log(`📦 Tabla: ${TABLE_NAME}`);
  console.log(`🌎 Región: ${AWS_REGION}\n`);

  let deletedCount = 0;
  let lastEvaluatedKey = undefined;

  do {
    // Escanear todos los items
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const scanResult = await docClient.send(scanCommand);
    const items = scanResult.Items || [];

    console.log(`📋 Encontrados ${items.length} items en este lote...`);

    // Eliminar cada item
    for (const item of items) {
      try {
        const deleteCommand = new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        });

        await docClient.send(deleteCommand);
        deletedCount++;

        // Mostrar progreso cada 10 items
        if (deletedCount % 10 === 0) {
          console.log(`   ✅ Eliminados ${deletedCount} items...`);
        }

        // Log detallado de cada item eliminado
        if (item.entityType) {
          console.log(`      🗑️  ${item.entityType}: ${item.nombre || item.email || item.id || 'N/A'}`);
        }
      } catch (error) {
        console.error(`   ❌ Error eliminando item ${item.PK}/${item.SK}:`, error.message);
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;

  } while (lastEvaluatedKey);

  console.log(`\n✅ COMPLETADO: ${deletedCount} items eliminados de la tabla\n`);
  
  // Resumen
  console.log('📊 La tabla ahora está vacía y lista para empezar desde cero\n');
  console.log('💡 Próximos pasos:');
  console.log('   1. Crea zonas desde la interfaz');
  console.log('   2. Crea espacios asociados a esas zonas');
  console.log('   3. Todos los recursos se asociarán automáticamente a "empresa-default"\n');
}

// Confirmación antes de ejecutar
console.log('\n⚠️  ⚠️  ⚠️  ADVERTENCIA ⚠️  ⚠️  ⚠️\n');
console.log('Este script eliminará TODOS los datos de la tabla DynamoDB:');
console.log(`  • Tabla: ${TABLE_NAME}`);
console.log('  • Espacios');
console.log('  • Zonas');
console.log('  • Reservas');
console.log('  • Usuarios');
console.log('  • Responsables');
console.log('  • Todas las demás entidades\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('¿Estás seguro de que deseas continuar? (escribe "SI" para confirmar): ', (answer) => {
  readline.close();
  
  if (answer.trim().toUpperCase() === 'SI') {
    deleteAllItems()
      .then(() => {
        console.log('✅ Proceso completado exitosamente\n');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
      });
  } else {
    console.log('\n❌ Operación cancelada. No se eliminó ningún dato.\n');
    process.exit(0);
  }
});
