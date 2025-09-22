const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { resilienceManager } = require('../utils/resilienceManager');

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const createApiGatewayClient = (domainName, stage) => {
  const endpoint = `https://${domainName}/${stage}`;
  return new ApiGatewayManagementApiClient({ endpoint });
};

const postToConnection = async (apigw, connectionId, payload) => {
  const command = new PostToConnectionCommand({ ConnectionId: connectionId, Data: Buffer.from(JSON.stringify(payload)) });
  return apigw.send(command);
};

module.exports.handler = async (event) => {
  for (const record of event.Records || []) {
    const sns = record.Sns;
    let message;
    try {
      message = JSON.parse(sns.Message);
    } catch (err) {
      message = { raw: sns.Message };
    }

    const clientId = message.clientId || (message.payload && message.payload.clientId) || null;

    if (clientId) {
      let ExclusiveStartKey = undefined;
      do {
        const q = new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          KeyConditionExpression: 'clientId = :cid',
          ExpressionAttributeValues: { ':cid': clientId },
          ExclusiveStartKey,
          Limit: 100
        });
        const res = await docClient.send(q);
        const items = res.Items || [];

        for (const conn of items) {
          try {
            const apigw = createApiGatewayClient(conn.domain, conn.stage);
            await resilienceManager.executeMessaging(
              () => postToConnection(apigw, conn.connectionId, { type: 'personalization.update', payload: message }),
              { operation: 'personalizationForward.postToConnection', priority: 'high' }
            );
          } catch (err) {
            const name = err.name || '';
            if (name === 'BulkheadRejectionError') {
              console.warn('Bulkhead rejected post to connection', conn.connectionId);
              continue;
            }
            if (name === 'GoneException' || (err.$metadata && err.$metadata.httpStatusCode === 410)) {
              try {
                await resilienceManager.executeDatabase(
                  () => docClient.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE, Key: { clientId: conn.clientId, connectionId: conn.connectionId } })),
                  { operation: 'personalizationForward.deleteStaleConnection' }
                );
                console.log('Deleted stale connection', conn.connectionId);
              } catch (delErr) {
                console.warn('Failed deleting stale connection', conn.connectionId, delErr.message);
              }
            } else {
              console.warn('Failed to post to connection', conn.connectionId, err.message || err);
            }
          }
        }

        ExclusiveStartKey = res.LastEvaluatedKey;
      } while (ExclusiveStartKey);
    } else {
      let ExclusiveStartKey = undefined;
      do {
        const scanRes = await docClient.send({
          input: { TableName: process.env.CONNECTIONS_TABLE, ExclusiveStartKey, Limit: 100 }
        });
        const items = scanRes.Items || [];
        for (const conn of items) {
          try {
            const apigw = createApiGatewayClient(conn.domain, conn.stage);
            await postToConnection(apigw, conn.connectionId, { type: 'personalization.update', payload: message });
          } catch (err) {
            const name = err.name || '';
            if (name === 'GoneException' || (err.$metadata && err.$metadata.httpStatusCode === 410)) {
              try {
                await docClient.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE, Key: { clientId: conn.clientId, connectionId: conn.connectionId } }));
                console.log('Deleted stale connection', conn.connectionId);
              } catch (delErr) {
                console.warn('Failed deleting stale connection', conn.connectionId, delErr.message);
              }
            } else {
              console.warn('Failed to post to connection', conn.connectionId, err.message || err);
            }
          }
        }

        ExclusiveStartKey = scanRes.LastEvaluatedKey;
      } while (ExclusiveStartKey);
    }
  }

  return { statusCode: 200 };
};
