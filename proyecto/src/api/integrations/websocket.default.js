const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { logger } = require('../../infrastructure/monitoring/logger');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function getUserFromEvent(event) {

  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (claims) {
    return {
      id: claims.sub,
      email: claims.email,
      rol: claims['custom:role'] || (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'][0] : claims['cognito:groups']) || 'usuario'
      // Note: claims object excluded to avoid logging sensitive JWT data
    };
  }

  const connectionId = event?.requestContext?.connectionId;
  if (!connectionId) return null;

  try {
    // Use GetCommand since connectionId is the primary key (HASH)
    // This is the most efficient DynamoDB operation - no index needed
    const res = await docClient.send(new GetCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId }
    }));
    const it = res.Item;
    if (it) return { id: it.userId, clientId: it.clientId };
  } catch (e) {
    logger.warn('Failed to resolve user from connectionId', {
      errorMessage: e?.message,
      errorType: e?.constructor?.name
    });
  }
  return null;
}

module.exports.default = async (event) => {
  try {
    const user = await getUserFromEvent(event);
    const body = event.body ? String(event.body) : '';
    const connectionId = event?.requestContext?.connectionId;
    
    logger.websocket('message_received', connectionId, {
      messageLength: body?.length || 0,
      hasUser: !!user,
      userId: user?.id || 'unknown',
      userRole: user?.rol || 'unknown'
    });

    let messageData;
    try {
      messageData = body ? JSON.parse(body) : {};
    } catch (parseError) {
      logger.warn('Failed to parse WebSocket message body', {
        connectionId,
        errorMessage: parseError.message,
        errorType: parseError.constructor.name
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'FAILED',
          error: 'Invalid JSON message format',
          connectionId
        })
      };
    }

    logger.websocket('message_processed', connectionId, {
      messageType: messageData.type || 'unknown',
      userId: user?.id || 'unknown'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'SUCCESS',
        message: 'Message received and processed',
        connectionId,
        messageType: messageData.type || 'unknown'
      })
    };
  } catch (error) {
    logger.error('Error processing WebSocket message', {
      connectionId: event?.requestContext?.connectionId,
      errorMessage: error.message,
      errorType: error.constructor.name
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'FAILED',
        error: 'Internal server error processing message',
        connectionId: event?.requestContext?.connectionId
      })
    };
  }
};
