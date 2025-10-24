const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { logger } = require('../../infrastructure/monitoring/logger');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;

  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (claims) {
    logger.websocket('disconnect', connectionId, {
      userId: claims?.sub || 'unknown',
      hasValidClaims: !!claims
    });
  }

  let deletedConnections = 0;
  let errors = [];
  
  try {
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
        deletedConnections++;
      } catch (e) {
        logger.warn('Failed to delete ws connection', e && e.message);
        errors.push({ connectionId: it.connectionId, error: e.message });
      }
    }
  } catch (err) {
    logger.warn('Failed to query connections for disconnect', err);
    errors.push({ operation: 'query', error: err.message });
  }

  const status = errors.length === 0 ? 'SUCCESS' : (deletedConnections > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');
  
  return {
    statusCode: errors.length === 0 ? 200 : (deletedConnections > 0 ? 207 : 500),
    body: JSON.stringify({
      status,
      message: status === 'SUCCESS' ? 'Disconnected' : 'Partial disconnection',
      connectionId,
      deletedConnections,
      errors: errors.length > 0 ? errors : undefined
    })
  };
};
