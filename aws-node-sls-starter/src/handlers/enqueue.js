const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { resilienceManager } = require('../utils/resilienceManager');

const sqs = new SQSClient({});

module.exports.enqueue = async (event) => {
  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" })
    };
  }

  // Determinar prioridad del mensaje
  const priority = payload.priority || 'standard';
  const messageType = payload.type || 'general';
  
  const result = await resilienceManager.executeMessaging(
    async () => {
      const messageBody = JSON.stringify({
        id: payload.id || `${Date.now()}`,
        data: payload,
        priority: priority,
        type: messageType,
        timestamp: new Date().toISOString()
      });

      const command = new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: messageBody,
        MessageAttributes: {
          Priority: {
            DataType: 'String',
            StringValue: priority
          },
          Type: {
            DataType: 'String',
            StringValue: messageType
          }
        }
      });

      const response = await sqs.send(command);
      
      return {
        statusCode: 202,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          ok: true, 
          queued: true, 
          messageId: response.MessageId,
          priority: priority,
          type: messageType
        })
      };
    },
    {
      operation: 'enqueueMessage',
      messageType: messageType,
      priority: priority,
      payloadSize: JSON.stringify(payload).length
    }
  );

  return result;
};
