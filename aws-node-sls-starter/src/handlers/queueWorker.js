const { resilienceManager } = require('../utils/resilienceManager');

module.exports.process = async (event) => {
  const results = [];
  
  for (const record of event.Records || []) {
    const result = await resilienceManager.executeMessaging(
      async () => {
        try {
          const body = JSON.parse(record.body || "{}");
          console.log("🔧 Processing message:", body);
          
          // Determinar tipo de mensaje para asignar prioridad correcta
          const messageType = body.type || 'general';
          const isEmergency = body.priority === 'emergency' || messageType === 'emergency';
          
          // TODO: Add your business logic here
          // Ejemplo de procesamiento basado en tipo de mensaje
          switch (messageType) {
            case 'emergency':
              console.log('🚨 Processing emergency message:', body);
              break;
            case 'notification':
              console.log('📱 Processing notification:', body);
              break;
            case 'report':
              console.log('📊 Processing report:', body);
              break;
            default:
              console.log('📝 Processing general message:', body);
          }
          
          return { success: true, messageId: record.messageId, messageType };
        } catch (err) {
          console.error("❌ Error parsing/processing:", err);
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
    
    results.push(result);
  }
  
  return results;
};
