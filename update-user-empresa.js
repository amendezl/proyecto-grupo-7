const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function updateUser() {
    try {
        const command = new UpdateCommand({
            TableName: 'sistema-gestion-espacios-dev',
            Key: {
                PK: 'USER#34588498-6091-70b3-a16d-8f9750aaab7a',
                SK: 'PROFILE'
            },
            UpdateExpression: 'SET empresa_id = :empresa_id',
            ExpressionAttributeValues: {
                ':empresa_id': 'default-empresa'
            },
            ReturnValues: 'ALL_NEW'
        });

        const result = await docClient.send(command);
        console.log('✅ Usuario actualizado:', result.Attributes);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateUser();
