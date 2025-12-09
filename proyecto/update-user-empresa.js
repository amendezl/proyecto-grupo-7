const DynamoDBManager = require('./src/infrastructure/database/DynamoDBManager');

async function updateUser() {
    const db = new DynamoDBManager();
    
    try {
        // Primero, vamos a obtener el usuario actual
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
        
        const result = await dynamodb.update({
            TableName: 'sistema-gestion-espacios-dev',
            Key: {
                PK: 'USER#34588498-6091-70b3-a16d-8f9750aaab7a',
                SK: 'USER#34588498-6091-70b3-a16d-8f9750aaab7a'
            },
            UpdateExpression: 'SET empresa_id = :empresa_id',
            ExpressionAttributeValues: {
                ':empresa_id': 'default-empresa'
            },
            ReturnValues: 'ALL_NEW'
        }).promise();

        console.log('✅ Usuario actualizado:', result.Attributes);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateUser();
