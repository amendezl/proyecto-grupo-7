const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

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
  const results = [];
  let totalConnections = 0;
  let successfulDeliveries = 0;
  let failedDeliveries = 0;
  let staleConnectionsRemoved = 0;
  
  for (const record of event.Records || []) {
    const recordResult = { recordId: record.Sns?.MessageId || `record-${results.length}` };
    
    try {
      const sns = record.Sns;
      let message;
      try {
        message = JSON.parse(sns.Message);
      } catch (err) {
        message = { raw: sns.Message };
      }

      const clientId = message.clientId || (message.payload && message.payload.clientId) || null;
      recordResult.clientId = clientId;
      recordResult.messageType = message.type || 'personalization.update';

      if (clientId) {
        let ExclusiveStartKey = undefined;
        do {
          // Query using GSI on clientId to find all connections for this client
          const q = new QueryCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            IndexName: 'ClientIdIndex',
            KeyConditionExpression: 'clientId = :cid',
            ExpressionAttributeValues: { ':cid': clientId },
            ExclusiveStartKey,
            Limit: 100
          });
          const res = await docClient.send(q);
          const items = res.Items || [];
          totalConnections += items.length;

          for (const conn of items) {
            try {
              const apigw = createApiGatewayClient(conn.domain, conn.stage);
              await resilienceManager.executeMessaging(
                () => postToConnection(apigw, conn.connectionId, { type: 'personalization.update', payload: message }),
                { operation: 'personalizationForward.postToConnection', priority: 'high' }
              );
              successfulDeliveries++;
            } catch (err) {
              const name = err.name || '';
              if (name === 'BulkheadRejectionError') {
                logger.warn('Bulkhead rejected post to connection', conn.connectionId);
                failedDeliveries++;
                continue;
              }
              if (name === 'GoneException' || (err.$metadata && err.$metadata.httpStatusCode === 410)) {
                try {
                  await resilienceManager.executeDatabase(
                    () => docClient.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE, Key: { clientId: conn.clientId, connectionId: conn.connectionId } })),
                    { operation: 'personalizationForward.deleteStaleConnection' }
                  );
                  console.log('Deleted stale connection', conn.connectionId);
                  staleConnectionsRemoved++;
                } catch (delErr) {
                  logger.warn('Failed deleting stale connection', conn.connectionId, delErr.message);
                }
              } else {
                logger.warn('Failed to post to connection', conn.connectionId, err.message || err);
                failedDeliveries++;
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
          totalConnections += items.length;
          
          for (const conn of items) {
            try {
              const apigw = createApiGatewayClient(conn.domain, conn.stage);
              await postToConnection(apigw, conn.connectionId, { type: 'personalization.update', payload: message });
              successfulDeliveries++;
            } catch (err) {
              const name = err.name || '';
              if (name === 'GoneException' || (err.$metadata && err.$metadata.httpStatusCode === 410)) {
                try {
                  await docClient.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE, Key: { clientId: conn.clientId, connectionId: conn.connectionId } }));
                  console.log('Deleted stale connection', conn.connectionId);
                  staleConnectionsRemoved++;
                } catch (delErr) {
                  logger.warn('Failed deleting stale connection', conn.connectionId, delErr.message);
                }
              } else {
                logger.warn('Failed to post to connection', conn.connectionId, err.message || err);
                failedDeliveries++;
              }
            }
          }

          ExclusiveStartKey = scanRes.LastEvaluatedKey;
        } while (ExclusiveStartKey);
      }
      
      recordResult.status = 'SUCCESS';
      recordResult.connectionsProcessed = totalConnections;
    } catch (err) {
      logger.error('Error processing SNS record', { errorMessage: err.message, errorType: err.constructor.name });
      recordResult.status = 'FAILED';
      recordResult.error = err.message;
    }
    
    results.push(recordResult);
  }

  const overallStatus = results.some(r => r.status === 'FAILED') ? 'PARTIAL_FAILURE' : 'SUCCESS';
  const hasFailures = failedDeliveries > 0 || results.some(r => r.status === 'FAILED');
  
  return {
    statusCode: hasFailures ? 207 : 200,
    status: overallStatus,
    processedRecords: results.length,
    totalConnections,
    successfulDeliveries,
    failedDeliveries,
    staleConnectionsRemoved,
    results
  };
};
