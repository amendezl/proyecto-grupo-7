const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateForDynamoDB } = require('../../core/validation/validator');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  
  if (!claims) {
    logger.warn('WebSocket connection rejected - no JWT claims', {
      connectionId,
      domain,
      stage
    });
    return { 
      statusCode: 401, 
      body: JSON.stringify({
        status: 'FAILED',
        error: 'Unauthorized: JWT authorizer required',
        connectionId
      })
    };
  }

  const userId = claims.sub;
  const clientId = claims['custom:clientId'] || claims.clientId || claims.iss || userId || 'anonymous';
  const userEmail = claims.email;
  const userRole = claims['custom:role'] || (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'][0] : claims['cognito:groups']) || 'usuario';

  logger.websocket('connect', connectionId, { 
    userId, 
    clientId, 
    userRole,
    domain,
    stage
  });

  const item = {
    clientId,
    connectionId,
    userId,
    userEmail,
    userRole,
    domain,
    stage,
    status: 'active',
    createdAt: new Date().toISOString(),
    tokenIssuer: claims.iss,
    tokenAudience: claims.aud
  };

  try {
    // Validate connection data with AJV before writing to DynamoDB
    const validatedItem = validateForDynamoDB('connection', item);
    
    await resilienceManager.executeDatabase(
      () => docClient.send(new PutCommand({ TableName: process.env.CONNECTIONS_TABLE, Item: validatedItem })),
      { operation: 'websocket.connect.putConnection', priority: 'auth' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'SUCCESS',
        message: 'Connected successfully using JWT claims',
        connectionId,
        clientId,
        userId,
        userRole
      })
    };
  } catch (error) {
    logger.error('Failed to store WebSocket connection', {
      connectionId,
      userId,
      errorMessage: error.message,
      errorType: error.constructor.name
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'FAILED',
        error: 'Failed to establish connection',
        connectionId
      })
    };
  }
};
