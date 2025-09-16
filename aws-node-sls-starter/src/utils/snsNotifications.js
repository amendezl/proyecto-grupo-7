const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { resilienceManager } = require('./resilienceManager');

// Initialize SNS client
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Topic ARNs from environment variables
const TOPICS = {
  SPACE_NOTIFICATIONS: process.env.SNS_TOPIC_ARN,
  SYSTEM_ALERTS: process.env.SNS_ALERTS_TOPIC_ARN,
  ADMIN_NOTIFICATIONS: process.env.SNS_ADMIN_TOPIC_ARN
};

/**
 * Utility to send space notifications automatically
 */
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

    console.log(`✅ Space notification sent automatically: ${notificationData.actionType} for space ${notificationData.spaceId}`);
    return result;

  } catch (error) {
    console.error('Error sending automatic space notification:', error);
    // Don't throw - notifications are not critical for main operations
    return null;
  }
};

/**
 * Send system alert automatically
 */
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
    console.error('Error sending automatic system alert:', error);
    return null;
  }
};

/**
 * Send admin notification automatically
 */
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

    console.log(`📋 Admin notification sent automatically: ${notificationData.notificationType}`);
    return result;

  } catch (error) {
    console.error('Error sending automatic admin notification:', error);
    return null;
  }
};

/**
 * Notify space creation
 */
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

/**
 * Notify space update
 */
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

/**
 * Notify space deletion
 */
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

/**
 * Notify resource creation
 */
const notifyResourceCreated = async (resourceData, userId) => {
  return sendSpaceNotificationAsync({
    actionType: 'resource_created',
    spaceId: resourceData.espacio_id || 'general',
    subject: `Nuevo recurso agregado: ${resourceData.nombre}`,
    message: `Se ha agregado el recurso '${resourceData.nombre}' de tipo ${resourceData.tipo}`,
    userId,
    metadata: {
      resourceType: resourceData.tipo,
      resourceId: resourceData.id,
      spaceId: resourceData.espacio_id
    }
  });
};

/**
 * Notify system errors
 */
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

/**
 * Notify capacity warnings
 */
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

/**
 * Notify admin operations
 */
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
  // Core functions
  sendSpaceNotificationAsync,
  sendSystemAlertAsync,
  sendAdminNotificationAsync,
  
  // Convenience functions for specific events
  notifySpaceCreated,
  notifySpaceUpdated,
  notifySpaceDeleted,
  notifyResourceCreated,
  notifySystemError,
  notifyCapacityWarning,
  notifyAdminOperation,
  
  // Topic ARNs for direct use
  TOPICS
};