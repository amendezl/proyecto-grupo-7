const { resilienceManager } = require('../../shared/utils/resilienceManager');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

module.exports.process = async (event) => {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  
  for (const record of event.Records || []) {
    try {
      const result = await resilienceManager.executeMessaging(
        async () => {
          try {
            const body = JSON.parse(record.body || "{}");
            console.log("🔧 Processing message:", body);
            
            const messageType = body.type || 'general';
            const isHighPriority = body.priority === 'high' || messageType === 'high_priority';
            
            switch (messageType) {
              case 'high_priority':
                console.log('Processing high priority message:', body);
                break;
              case 'notification':
                console.log('Processing notification:', body);
                break;
              case 'report':
                console.log('Processing report:', body);
                break;
              default:
                console.log('Processing general message:', body);
            }
            
            return { success: true, messageId: record.messageId, messageType };
          } catch (err) {
            logger.error('Error parsing/processing:', { errorMessage: err.message, errorType: err.constructor.name });
            throw err;
          }
        },
        {
          operation: 'processQueueMessage',
          messageId: record.messageId,
          messageType: record.body ? JSON.parse(record.body).type : 'unknown',
          priority: record.body ? JSON.parse(record.body).priority || 'standard' : 'standard'
        }
      );
      
      results.push({ 
        recordId: record.messageId, 
        status: 'SUCCESS',
        result 
      });
      successCount++;
    } catch (err) {
      logger.error('Failed to process SQS message:', { 
        messageId: record.messageId,
        errorMessage: err.message, 
        errorType: err.constructor.name 
      });
      results.push({ 
        recordId: record.messageId, 
        status: 'FAILED',
        error: err.message 
      });
      failedCount++;
    }
  }
  
  // Lambda must return SUCCESS/FAILED status to prevent hanging
  return {
    statusCode: failedCount > 0 ? 207 : 200,
    status: failedCount > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS',
    processedRecords: results.length,
    successCount,
    failedCount,
    results
  };
};
