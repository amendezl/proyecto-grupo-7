const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'sistema-gestion-espacios-dev-main';
const USUARIO_ID = '34588498-6091-70b3-a16d-8f9750aaab7a';
const EMPRESA_ID = 'mi-empresa-bacan';

async function updateReservas() {
    console.log('🔍 Buscando reservaciones del usuario:', USUARIO_ID);
    
    // Scan para encontrar todas las reservas del usuario
    const scanResult = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pk) AND usuario_id = :userId',
        ExpressionAttributeValues: {
            ':pk': 'RESERVA#',
            ':userId': USUARIO_ID
        }
    }));

    console.log(`📊 Encontradas ${scanResult.Items.length} reservaciones`);
    
    // Actualizar cada reserva
    let updated = 0;
    let skipped = 0;
    
    for (const item of scanResult.Items) {
        if (item.empresa_id) {
            console.log(`⏭️  Reserva ${item.id} ya tiene empresa_id: ${item.empresa_id}`);
            skipped++;
            continue;
        }
        
        try {
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: item.PK,
                    SK: item.SK
                },
                UpdateExpression: 'SET empresa_id = :empresaId',
                ExpressionAttributeValues: {
                    ':empresaId': EMPRESA_ID
                }
            }));
            
            console.log(`✅ Actualizada reserva ${item.id}`);
            updated++;
        } catch (error) {
            console.error(`❌ Error actualizando reserva ${item.id}:`, error.message);
        }
    }
    
    console.log(`\n🎉 Proceso completado:`);
    console.log(`   ✅ Actualizadas: ${updated}`);
    console.log(`   ⏭️  Saltadas: ${skipped}`);
}

updateReservas().catch(console.error);
