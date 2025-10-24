const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { logger } = require('../../infrastructure/monitoring/logger');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function getUserFromEvent(event) {

  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (claims) {
    return {
      id: claims.sub,
      email: claims.email,
      rol: claims['custom:role'] || (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'][0] : claims['cognito:groups']) || 'usuario',
      claims
    };
  }

  const connectionId = event?.requestContext?.connectionId;
  if (!connectionId) return null;

  try {
    const q = new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: 'ConnectionIdIndex',
      KeyConditionExpression: 'connectionId = :cid',
      ExpressionAttributeValues: { ':cid': connectionId }
    });
    const res = await docClient.send(q);
    const it = res.Items && res.Items[0];
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
