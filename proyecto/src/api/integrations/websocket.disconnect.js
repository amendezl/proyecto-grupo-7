const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
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
    // Use DeleteCommand directly since connectionId is the primary key (HASH)
    // No need for Query or GSI - this is the optimal DynamoDB operation
    await resilienceManager.executeDatabase(
      () => docClient.send(new DeleteCommand({ 
        TableName: process.env.CONNECTIONS_TABLE, 
        Key: { connectionId } 
      })),
      { operation: 'websocket.disconnect.deleteConnection', priority: 'auth' }
    );
    deletedConnections++;
  } catch (err) {
    logger.warn('Failed to delete connection', err);
    errors.push({ operation: 'delete', error: err.message });
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
