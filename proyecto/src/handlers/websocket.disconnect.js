const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { resilienceManager } = require('../utils/resilienceManager');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
    const q = new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: 'ConnectionIdIndex',
      KeyConditionExpression: 'connectionId = :cid',
      ExpressionAttributeValues: { ':cid': connectionId }
    });
    const res = await docClient.send(q);
    const items = res.Items || [];
    for (const it of items) {
      try {
        await resilienceManager.executeDatabase(
          () => docClient.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE, Key: { clientId: it.clientId, connectionId: it.connectionId } })),
          { operation: 'websocket.disconnect.deleteConnection', priority: 'auth' }
        );
      } catch (e) {
        console.warn('Failed to delete ws connection', e && e.message);
      }
    }
  } catch (err) {
    console.warn('Failed to delete ws connection', err);
  }

  return { statusCode: 200, body: 'Disconnected' };
};
