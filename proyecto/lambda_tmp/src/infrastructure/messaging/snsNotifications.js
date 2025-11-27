const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TOPICS = {
  SPACE_NOTIFICATIONS: process.env.SNS_TOPIC_ARN,
  SYSTEM_ALERTS: process.env.SNS_ALERTS_TOPIC_ARN,
  ADMIN_NOTIFICATIONS: process.env.SNS_ADMIN_TOPIC_ARN
};
  
TOPICS.PERSONALIZATION_UPDATES = process.env.SNS_PERSONALIZATION_TOPIC_ARN || process.env.SNS_TOPIC_ARN || '';

const sendSpaceNotificationAsync = async (notificationData) => {
  try {
    if (!TOPICS.SPACE_NOTIFICATIONS) {
      console.log('SNS Topic for space notifications not configured, skipping notification');
      return null;
    }

    const result = await resilienceManager.executeWithFullResilience(
      'sns-auto-space-notification',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.SPACE_NOTIFICATIONS,
          Message: JSON.stringify({
            ...notificationData,
            timestamp: new Date().toISOString(),
            source: 'automatic'
          }),
          Subject: notificationData.subject || 'Actualización de Espacio',
          MessageAttributes: {
            actionType: {
              DataType: 'String',
              StringValue: notificationData.actionType || 'update'
            },
            spaceId: {
              DataType: 'String',
              StringValue: notificationData.spaceId || 'unknown'
            },
            automated: {
              DataType: 'String',
              StringValue: 'true'
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'STANDARD'
    );

    logger.info(' Space notification sent automatically: ${notificationData.actionType} for space ${notificationData.spaceId}');
    return result;

  } catch (error) {
    logger.error('Error sending automatic space notification:', { errorMessage: error.message, errorType: error.constructor.name });
    return null;
  }
};

const sendSystemAlertAsync = async (alertData) => {
  try {
    if (!TOPICS.SYSTEM_ALERTS) {
      console.log('SNS Topic for system alerts not configured, skipping alert');
      return null;
    }

    const result = await resilienceManager.executeWithFullResilience(
      'sns-auto-system-alert',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.SYSTEM_ALERTS,
          Message: JSON.stringify({
            ...alertData,
            timestamp: new Date().toISOString(),
            source: 'automatic'
          }),
          Subject: alertData.subject || 'Alerta del Sistema',
          MessageAttributes: {
            alertLevel: {
              DataType: 'String',
              StringValue: alertData.alertLevel || 'info'
            },
            component: {
              DataType: 'String',
              StringValue: alertData.component || 'system'
            },
            automated: {
              DataType: 'String',
              StringValue: 'true'
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'HIGH_PRIORITY'
    );

    console.log(`🚨 System alert sent automatically: ${alertData.alertLevel} for ${alertData.component}`);
    return result;

  } catch (error) {
    logger.error('Error sending automatic system alert:', { errorMessage: error.message, errorType: error.constructor.name });
    return null;
  }
};

const sendAdminNotificationAsync = async (notificationData) => {
  try {
    if (!TOPICS.ADMIN_NOTIFICATIONS) {
      console.log('SNS Topic for admin notifications not configured, skipping notification');
      return null;
    }

    const result = await resilienceManager.executeWithFullResilience(
      'sns-auto-admin-notification',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.ADMIN_NOTIFICATIONS,
          Message: JSON.stringify({
            ...notificationData,
            timestamp: new Date().toISOString(),
            source: 'automatic'
          }),
          Subject: notificationData.subject || 'Notificación Administrativa',
          MessageAttributes: {
            notificationType: {
              DataType: 'String',
              StringValue: notificationData.notificationType || 'general'
            },
            priority: {
              DataType: 'String',
              StringValue: notificationData.priority || 'normal'
            },
            automated: {
              DataType: 'String',
              StringValue: 'true'
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'ADMIN'
    );

    logger.info(' Admin notification sent automatically: ${notificationData.notificationType}');
    return result;

  } catch (error) {
    logger.error('Error sending automatic admin notification:', { errorMessage: error.message, errorType: error.constructor.name });
    return null;
  }
};

const notifySpaceCreated = async (spaceData, userId) => {
  return sendSpaceNotificationAsync({
    actionType: 'created',
    spaceId: spaceData.id,
    subject: `Nuevo espacio creado: ${spaceData.nombre}`,
    message: `Se ha creado un nuevo espacio '${spaceData.nombre}' en la zona ${spaceData.zona_id}`,
    userId,
    metadata: {
      spaceType: spaceData.tipo,
      zone: spaceData.zona_id,
      capacity: spaceData.capacidad
    }
  });
};

const notifySpaceUpdated = async (spaceData, userId, changes) => {
  return sendSpaceNotificationAsync({
    actionType: 'updated',
    spaceId: spaceData.id,
    subject: `Espacio actualizado: ${spaceData.nombre}`,
    message: `El espacio '${spaceData.nombre}' ha sido modificado`,
    userId,
    metadata: {
      changes,
      spaceType: spaceData.tipo,
      zone: spaceData.zona_id
    }
  });
};

const notifySpaceDeleted = async (spaceId, spaceName, userId) => {
  return sendSpaceNotificationAsync({
    actionType: 'deleted',
    spaceId,
    subject: `Espacio eliminado: ${spaceName}`,
    message: `El espacio '${spaceName}' ha sido eliminado del sistema`,
    userId,
    metadata: {
      deletedAt: new Date().toISOString()
    }
  });
};

const notifySystemError = async (error, component, context = {}) => {
  return sendSystemAlertAsync({
    alertLevel: 'critical',
    component,
    subject: `Error crítico en ${component}`,
    message: `Se ha detectado un error crítico: ${error.message}`,
    metadata: {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    }
  });
};

const notifyCapacityWarning = async (component, currentUsage, limit) => {
  return sendSystemAlertAsync({
    alertLevel: 'warning',
    component,
    subject: `Advertencia de capacidad en ${component}`,
    message: `El componente ${component} está usando ${currentUsage}/${limit} de su capacidad`,
    metadata: {
      currentUsage,
      limit,
      usagePercentage: Math.round((currentUsage / limit) * 100)
    }
  });
};

const notifyAdminOperation = async (operation, details, userId) => {
  return sendAdminNotificationAsync({
    notificationType: 'operation',
    priority: 'normal',
    subject: `Operación administrativa: ${operation}`,
    message: `Se ha ejecutado la operación '${operation}' por el usuario ${userId}`,
    userId,
    metadata: {
      operation,
      details,
      executedAt: new Date().toISOString()
    }
  });
};

module.exports = {
  sendSpaceNotificationAsync,
  sendSystemAlertAsync,
  sendAdminNotificationAsync,
  
  sendPersonalizationUpdateAsync: async (updateData) => {
    try {
      if (!TOPICS.PERSONALIZATION_UPDATES) {
        console.log('SNS Topic for personalization updates not configured, skipping notification');
        return null;
      }

      const result = await resilienceManager.executeWithFullResilience(
        'sns-personalization-update',
        async () => {
          const command = new PublishCommand({
            TopicArn: TOPICS.PERSONALIZATION_UPDATES,
            Message: JSON.stringify({
              ...updateData,
              timestamp: new Date().toISOString(),
              source: 'personalization'
            }),
            Subject: updateData.subject || 'Personalization Update',
            MessageAttributes: {
              updateType: {
                DataType: 'String',
                StringValue: updateData.updateType || 'config_update'
              },
              clientId: {
                DataType: 'String',
                StringValue: updateData.clientId || 'unknown'
              }
            }
          });

          return await snsClient.send(command);
        },
        'STANDARD'
      );

      console.log(`🔔 Personalization update published: ${updateData.updateType} for ${updateData.clientId || 'unknown'}`);
      return result;
    } catch (error) {
      logger.error('Error sending personalization update:', { errorMessage: error.message, errorType: error.constructor.name });
      return null;
    }
  },
  
  notifySpaceCreated,
  notifySpaceUpdated,
  notifySpaceDeleted,
  notifySystemError,
  notifyCapacityWarning,
  notifyAdminOperation,
  
  TOPICS
};