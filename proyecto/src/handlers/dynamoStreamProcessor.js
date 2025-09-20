const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { sendPersonalizationUpdateAsync } = require('../utils/snsNotifications');

module.exports.handler = async (event) => {
  for (const record of event.Records || []) {
    try {
      const eventName = record.eventName; // INSERT, MODIFY, REMOVE
      const newImage = record.dynamodb.NewImage ? unmarshall(record.dynamodb.NewImage) : null;
      const oldImage = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage) : null;

      // Only handle CONFIG items
      const image = newImage || oldImage;
      if (!image || image.PK !== 'CONFIG') continue;

      const clientIdFromSK = (image.SK || '').split('#')[1] || null;

      await sendPersonalizationUpdateAsync({
        updateType: `db_${eventName.toLowerCase()}`,
        clientId: clientIdFromSK,
        item: image,
        subject: `DB ${eventName} for CONFIG ${image.SK}`
      });
    } catch (err) {
      console.error('Error processing stream record', err);
      // Let Lambda retry if needed
      throw err;
    }
  }

  return { statusCode: 200 };
};
