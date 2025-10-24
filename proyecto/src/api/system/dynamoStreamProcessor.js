const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { sendPersonalizationUpdateAsync } = require('../../infrastructure/messaging/snsNotifications');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

module.exports.handler = async (event) => {
  const results = [];
  
  for (const record of event.Records || []) {
    try {
      const eventName = record.eventName;
      const newImage = record.dynamodb.NewImage ? unmarshall(record.dynamodb.NewImage) : null;
      const oldImage = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage) : null;

      const image = newImage || oldImage;
      if (!image || image.PK !== 'CONFIG') {
        results.push({ recordId: record.eventID, status: 'SKIPPED', reason: 'Not CONFIG record' });
        continue;
      }

      const clientIdFromSK = (image.SK || '').split('#')[1] || null;

      await sendPersonalizationUpdateAsync({
        updateType: `db_${eventName.toLowerCase()}`,
        clientId: clientIdFromSK,
        item: image,
        subject: `DB ${eventName} for CONFIG ${image.SK}`
      });
      
      results.push({ recordId: record.eventID, status: 'SUCCESS' });
    } catch (err) {
      logger.error('Error processing stream record', { errorMessage: err.message, errorType: err.constructor.name });
      results.push({ recordId: record.eventID, status: 'FAILED', error: err.message });
    }
  }

  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  
  return {
    statusCode: failedCount > 0 ? 207 : 200,
    status: failedCount > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS',
    processedRecords: results.length,
    successCount,
    failedCount,
    results
  };
};
