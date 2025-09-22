const { SNSClient, PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');
const { resilienceManager } = require('../utils/resilienceManager');
const authUtils = require('../utils/authUtils');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TOPICS = {
  SPACE_NOTIFICATIONS: process.env.SNS_TOPIC_ARN,
  SYSTEM_ALERTS: process.env.SNS_ALERTS_TOPIC_ARN,
  ADMIN_NOTIFICATIONS: process.env.SNS_ADMIN_TOPIC_ARN
};

const sendSpaceNotification = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const user = await authUtils.authenticateUser(event);
    if (!user || !user.userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Usuario no autenticado' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { message, subject, spaceId, actionType, metadata } = body;

    if (!message || !subject) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'message y subject son requeridos' })
      };
    }

    const notificationData = {
      userId: user.userId,
      userRole: user.role,
      spaceId: spaceId || 'general',
      actionType: actionType || 'notification',
      message,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    const result = await resilienceManager.executeWithFullResilience(
      'sns-space-notification',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.SPACE_NOTIFICATIONS,
          Message: JSON.stringify(notificationData),
          Subject: subject,
          MessageAttributes: {
            actionType: {
              DataType: 'String',
              StringValue: actionType || 'notification'
            },
            spaceId: {
              DataType: 'String', 
              StringValue: spaceId || 'general'
            },
            userRole: {
              DataType: 'String',
              StringValue: user.role || 'usuario'
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'HIGH_PRIORITY'
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        messageId: result.MessageId,
        message: 'Notificación de espacio enviada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error sending space notification:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error enviando notificación de espacio',
        details: error.message 
      })
    };
  }
};

const sendSystemAlert = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const user = await authUtils.authenticateUser(event);
    if (!user || !['admin', 'responsable'].includes(user.role)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Acceso denegado - solo admin/responsable' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { message, subject, alertLevel, component, metadata } = body;

    if (!message || !subject || !alertLevel) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'message, subject y alertLevel son requeridos' })
      };
    }

    const alertData = {
      userId: user.userId,
      userRole: user.role,
      alertLevel: alertLevel,
      component: component || 'system',
      message,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    const result = await resilienceManager.executeWithFullResilience(
      'sns-system-alert',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.SYSTEM_ALERTS,
          Message: JSON.stringify(alertData),
          Subject: `[${alertLevel.toUpperCase()}] ${subject}`,
          MessageAttributes: {
            alertLevel: {
              DataType: 'String',
              StringValue: alertLevel
            },
            component: {
              DataType: 'String',
              StringValue: component || 'system'
            },
            userRole: {
              DataType: 'String',
              StringValue: user.role
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'CRITICAL'
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        messageId: result.MessageId,
        message: 'Alerta del sistema enviada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error sending system alert:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error enviando alerta del sistema',
        details: error.message 
      })
    };
  }
};

const sendAdminNotification = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const user = await authUtils.authenticateUser(event);
    if (!user || user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Acceso denegado - solo administradores' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { message, subject, notificationType, priority, metadata } = body;

    if (!message || !subject) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'message y subject son requeridos' })
      };
    }

    const adminData = {
      userId: user.userId,
      userRole: user.role,
      notificationType: notificationType || 'general',
      priority: priority || 'normal',
      message,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    const result = await resilienceManager.executeWithFullResilience(
      'sns-admin-notification',
      async () => {
        const command = new PublishCommand({
          TopicArn: TOPICS.ADMIN_NOTIFICATIONS,
          Message: JSON.stringify(adminData),
          Subject: `[ADMIN] ${subject}`,
          MessageAttributes: {
            notificationType: {
              DataType: 'String',
              StringValue: notificationType || 'general'
            },
            priority: {
              DataType: 'String',
              StringValue: priority || 'normal'
            }
          }
        });
        
        return await snsClient.send(command);
      },
      'ADMIN'
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        messageId: result.MessageId,
        message: 'Notificación administrativa enviada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error sending admin notification:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error enviando notificación administrativa',
        details: error.message 
      })
    };
  }
};

const processSpaceNotification = async (event) => {
  try {
    console.log('Processing space notification:', JSON.stringify(event, null, 2));
    
    for (const record of event.Records) {
      const snsMessage = record.Sns;
      const message = JSON.parse(snsMessage.Message);
      
      console.log('Processing space notification:', {
        messageId: snsMessage.MessageId,
        subject: snsMessage.Subject,
        spaceId: message.spaceId,
        actionType: message.actionType,
        timestamp: message.timestamp
      });

      console.log(`✅ Space notification processed: ${message.actionType} for space ${message.spaceId}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Space notifications processed successfully' })
    };

  } catch (error) {
    console.error('Error processing space notification:', error);
    throw error;
  }
};

const processSystemAlert = async (event) => {
  try {
    console.log('Processing system alert:', JSON.stringify(event, null, 2));
    
    for (const record of event.Records) {
      const snsMessage = record.Sns;
      const alert = JSON.parse(snsMessage.Message);
      
      console.log('Processing system alert:', {
        messageId: snsMessage.MessageId,
        subject: snsMessage.Subject,
        alertLevel: alert.alertLevel,
        component: alert.component,
        timestamp: alert.timestamp
      });

      if (alert.alertLevel === 'critical') {
        console.log('🚨 CRITICAL ALERT - Triggering emergency procedures');
      }
      
      console.log(`✅ System alert processed: ${alert.alertLevel} for ${alert.component}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'System alerts processed successfully' })
    };

  } catch (error) {
    console.error('Error processing system alert:', error);
    throw error;
  }
};

const processAdminNotification = async (event) => {
  try {
    console.log('Processing admin notification:', JSON.stringify(event, null, 2));
    
    for (const record of event.Records) {
      const snsMessage = record.Sns;
      const notification = JSON.parse(snsMessage.Message);
      
      console.log('Processing admin notification:', {
        messageId: snsMessage.MessageId,
        subject: snsMessage.Subject,
        notificationType: notification.notificationType,
        priority: notification.priority,
        timestamp: notification.timestamp
      });

      switch (notification.notificationType) {
        case 'backup':
          console.log('Processing backup notification');
          break;
        case 'security':
          console.log('Processing security notification');
          break;
        case 'report':
          console.log('Processing report notification');
          break;
        default:
          console.log('Processing general admin notification');
      }
      
      console.log(`Admin notification processed: ${notification.notificationType}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Admin notifications processed successfully' })
    };

  } catch (error) {
    console.error('Error processing admin notification:', error);
    throw error;
  }
};

const subscribeToNotifications = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const user = await authUtils.authenticateUser(event);
    if (!user || !user.userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Usuario no autenticado' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { topicType, endpoint, protocol } = body;

    if (!topicType || !endpoint || !protocol) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'topicType, endpoint y protocol son requeridos' })
      };
    }

    let topicArn;
    switch (topicType) {
      case 'spaces':
        topicArn = TOPICS.SPACE_NOTIFICATIONS;
        break;
      case 'alerts':
        if (!['admin', 'responsable'].includes(user.role)) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acceso denegado para alertas del sistema' })
          };
        }
        topicArn = TOPICS.SYSTEM_ALERTS;
        break;
      case 'admin':
        if (user.role !== 'admin') {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acceso denegado para notificaciones administrativas' })
          };
        }
        topicArn = TOPICS.ADMIN_NOTIFICATIONS;
        break;
      default:
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'topicType inválido' })
        };
    }

    const result = await resilienceManager.executeWithFullResilience(
      'sns-subscribe',
      async () => {
        const command = new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: protocol,
          Endpoint: endpoint,
          Attributes: {
            FilterPolicy: JSON.stringify({
              userRole: [user.role]
            })
          }
        });
        
        return await snsClient.send(command);
      },
      'STANDARD'
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        subscriptionArn: result.SubscriptionArn,
        message: 'Suscripción creada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error creando suscripción',
        details: error.message 
      })
    };
  }
};

const listSubscriptions = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const user = await authUtils.authenticateUser(event);
    if (!user || !['admin', 'responsable'].includes(user.role)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Acceso denegado - solo admin/responsable' })
      };
    }

    const subscriptions = {};

    const topics = ['SPACE_NOTIFICATIONS'];
    if (['admin', 'responsable'].includes(user.role)) {
      topics.push('SYSTEM_ALERTS');
    }
    if (user.role === 'admin') {
      topics.push('ADMIN_NOTIFICATIONS');
    }

    for (const topicKey of topics) {
      const topicArn = TOPICS[topicKey];
      if (topicArn) {
        try {
          const result = await resilienceManager.executeWithFullResilience(
            'sns-list-subscriptions',
            async () => {
              const command = new ListSubscriptionsByTopicCommand({
                TopicArn: topicArn
              });
              return await snsClient.send(command);
            },
            'STANDARD'
          );

          subscriptions[topicKey.toLowerCase()] = result.Subscriptions.map(sub => ({
            subscriptionArn: sub.SubscriptionArn,
            protocol: sub.Protocol,
            endpoint: sub.Endpoint,
            confirmationWasAuthenticated: sub.ConfirmationWasAuthenticated
          }));
        } catch (error) {
          console.error(`Error listing subscriptions for ${topicKey}:`, error);
          subscriptions[topicKey.toLowerCase()] = { error: error.message };
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        subscriptions,
        topics: Object.keys(TOPICS)
      })
    };

  } catch (error) {
    console.error('Error listing subscriptions:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error listando suscripciones',
        details: error.message 
      })
    };
  }
};

module.exports = {
  sendSpaceNotification,
  sendSystemAlert,
  sendAdminNotification,
  processSpaceNotification,
  processSystemAlert,
  processAdminNotification,
  subscribeToNotifications,
  listSubscriptions
};