const { SNSClient, PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');
const { resilienceManager } = require('../utils/resilienceManager');
const authUtils = require('../utils/authUtils');

// Initialize SNS client
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Topic ARNs from environment variables
const TOPICS = {
  SPACE_NOTIFICATIONS: process.env.SNS_TOPIC_ARN,
  SYSTEM_ALERTS: process.env.SNS_ALERTS_TOPIC_ARN,
  ADMIN_NOTIFICATIONS: process.env.SNS_ADMIN_TOPIC_ARN
};

/**
 * Send Space Notification
 * Notifica sobre eventos relacionados con espacios (creación, actualización, asignación)
 */
const sendSpaceNotification = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Authenticate user
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

    // Create notification message with metadata
    const notificationData = {
      userId: user.userId,
      userRole: user.role,
      spaceId: spaceId || 'general',
      actionType: actionType || 'notification',
      message,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    // Execute with resilience patterns
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

/**
 * Send System Alert
 * Envía alertas críticas del sistema (errores, mantenimiento, capacidad)
 */
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
      alertLevel: alertLevel, // 'critical', 'warning', 'info'
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

/**
 * Send Admin Notification
 * Envía notificaciones administrativas (reportes, backups, seguridad)
 */
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

/**
 * Process Space Notification
 * Procesa notificaciones de espacios recibidas por SNS
 */
const processSpaceNotification = async (event) => {
  try {
    console.log('Processing space notification:', JSON.stringify(event, null, 2));
    
    // Process each SNS record
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

      // Here you could:
      // - Send emails via SES
      // - Store notifications in DynamoDB
      // - Send push notifications
      // - Log to CloudWatch
      // - Trigger other Lambda functions
      
      // For now, just log the processed notification
      console.log(`✅ Space notification processed: ${message.actionType} for space ${message.spaceId}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Space notifications processed successfully' })
    };

  } catch (error) {
    console.error('Error processing space notification:', error);
    throw error; // Let SNS retry
  }
};

/**
 * Process System Alert
 * Procesa alertas del sistema recibidas por SNS
 */
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

      // Critical alerts should trigger immediate actions
      if (alert.alertLevel === 'critical') {
        console.log('🚨 CRITICAL ALERT - Triggering emergency procedures');
        // Here you could trigger:
        // - Emergency notification to on-call staff
        // - Automatic scaling
        // - Circuit breaker activation
        // - Backup system activation
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

/**
 * Process Admin Notification
 * Procesa notificaciones administrativas recibidas por SNS
 */
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

      // Route different notification types
      switch (notification.notificationType) {
        case 'backup':
          console.log('📦 Processing backup notification');
          break;
        case 'security':
          console.log('🔒 Processing security notification');
          break;
        case 'report':
          console.log('📊 Processing report notification');
          break;
        default:
          console.log('📋 Processing general admin notification');
      }
      
      console.log(`✅ Admin notification processed: ${notification.notificationType}`);
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

/**
 * Subscribe to Notifications
 * Permite a usuarios suscribirse a notificaciones
 */
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

    // Determine topic ARN based on user role and request
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
          Protocol: protocol, // 'email', 'sms', 'http', 'https'
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

/**
 * List Subscriptions
 * Lista las suscripciones existentes para los topics
 */
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

    // Get subscriptions for each topic based on user role
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