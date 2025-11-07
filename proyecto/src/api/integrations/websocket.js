const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateForDynamoDB } = require('../../core/validation/validator');

const apigateway = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const timestamp = new Date().toISOString();
  
  try {
    // Validate connection data with AJV before writing to DynamoDB
    const connectionData = {
      clientId: connectionId, // Using connectionId as clientId for minimal schema
      connectionId,
      userId: connectionId, // Fallback - ideally should come from JWT
      userRole: 'usuario', // Default role
      status: 'connected',
      createdAt: timestamp
    };
    
    const validatedData = validateForDynamoDB('connection', connectionData);
    
    await dynamodb.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: validatedData
    }));
    
    logger.websocket('connect', connectionId, {
      timestamp,
      status: 'connected'
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Conectado al sistema de tiempo real',
        connectionId 
      })
    };
  } catch (error) {
    logger.error('Error conectando WebSocket', { errorMessage: error.message, errorType: error.constructor.name });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error de conexión' })
    };
  }
};

exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    await dynamodb.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }));
    
    logger.websocket('disconnect', connectionId, {
      status: 'disconnected'
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Desconectado' })
    };
  } catch (error) {
    logger.error('❌ Error desconectando WebSocket:', { errorMessage: error.message, errorType: error.constructor.name });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error de desconexión' })
    };
  }
};

exports.message = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body || '{}');
  
  logger.websocket('message_received', connectionId, {
    messageType: message.type || 'unknown',
    hasData: !!message.data
  });
  
  await sendMessageToConnection(connectionId, {
    type: 'ack',
    originalMessage: message,
    timestamp: new Date().toISOString()
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Mensaje procesado' })
  };
};

exports.notifyReserva = async (event) => {
  logger.info('DynamoDB Stream - Reservas', {
    recordCount: event.Records?.length || 0,
    eventSource: event.Records?.[0]?.eventSource
  });
  
  for (const record of event.Records) {
    if (record.eventName === 'INSERT' && record.dynamodb.NewImage.tipo?.S === 'reserva') {
      const reservaData = record.dynamodb.NewImage;
      
      const notificationMessage = {
        type: 'reserva_creada',
        data: {
          id: reservaData.id.S,
          espacio_nombre: reservaData.espacio_nombre?.S || 'Espacio no especificado',
          usuario_nombre: reservaData.usuario_nombre?.S || 'Usuario no especificado',
          fecha_reserva: reservaData.fecha_reserva?.S,
          hora_inicio: reservaData.hora_inicio?.S,
          hora_fin: reservaData.hora_fin?.S
        },
        timestamp: new Date().toISOString()
      };
      
      logger.websocket('notification_sent', 'broadcast', {
        notificationType: 'reservation_update',
        reservaId: notificationMessage.reserva?.id
      });
      await broadcastMessage(notificationMessage);
    }
  }
  
  return { statusCode: 200 };
};

exports.notifyEspacioEstado = async (event) => {
  logger.info('DynamoDB Stream - Espacios', {
    recordCount: event.Records?.length || 0,
    eventSource: event.Records?.[0]?.eventSource
  });
  
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY' && record.dynamodb.NewImage.tipo?.S === 'espacio') {
      const espacioData = record.dynamodb.NewImage;
      const oldData = record.dynamodb.OldImage;
      
      if (espacioData.estado?.S !== oldData.estado?.S) {
        const notificationMessage = {
          type: 'espacio_estado_cambiado',
          data: {
            id: espacioData.id.S,
            nombre: espacioData.nombre?.S,
            estado_anterior: oldData.estado?.S,
            estado_nuevo: espacioData.estado?.S,
            capacidad: espacioData.capacidad?.N
          },
          timestamp: new Date().toISOString()
        };
        
        logger.websocket('notification_sent', 'broadcast', {
          notificationType: 'space_status_change',
          espacioId: notificationMessage.espacio?.id,
          newStatus: notificationMessage.espacio?.estado
        });
        await broadcastMessage(notificationMessage);
      }
    }
  }
  
  return { statusCode: 200 };
};

async function broadcastMessage(message) {
  try {
    const params = {
      TableName: CONNECTIONS_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'active'
      },
      ProjectionExpression: 'clientId, connectionId'
    };
    
    const result = await dynamodb.send(new QueryCommand(params));
    const connections = result.Items || [];
    
    logger.websocket('broadcast_start', 'multiple', {
      connectionCount: connections.length,
      messageType: message.tipo || 'unknown'
    });
    
    const promises = connections.map(async (connection) => {
      try {
  await sendMessageToConnection(connection.connectionId, message);
      } catch (error) {

        if (error.statusCode === 410) {
          logger.websocket('connection_cleanup', connection.connectionId, {
            reason: 'stale_connection',
            statusCode: error.statusCode
          });
          await dynamodb.send(new DeleteCommand({
            TableName: CONNECTIONS_TABLE,
            Key: { clientId: connection.clientId, connectionId: connection.connectionId }
          }));
        } else {
          logger.error('Error sending message to connection', {
            connectionId: connection.connectionId,
            errorMessage: error.message,
            errorType: error.constructor.name
          });
        }
      }
    });
    
    await Promise.all(promises);
    logger.websocket('broadcast_completed', 'multiple', {
      connectionCount: connections.length,
      messageType: message.tipo || 'unknown'
    });
    
  } catch (error) {
    logger.error('Broadcast failed', {
      errorMessage: error.message,
      errorType: error.constructor.name
    });
  }
}

async function sendMessageToConnection(connectionId, message) {
  const cmd = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(message))
  });
  await apigateway.send(cmd);
}

exports.sendStats = async (event) => {
  try {

    const stats = await getRealtimeStats();
    
    const message = {
      type: 'stats_update',
      data: stats,
      timestamp: new Date().toISOString()
    };
    
    await broadcastMessage(message);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Estadísticas enviadas' })
    };
  } catch (error) {
    logger.error('Error sending statistics', { 
      errorMessage: error.message, 
      errorType: error.constructor.name 
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error enviando estadísticas' })
    };
  }
};

async function getRealtimeStats() {
  const hoy = new Date().toISOString().split('T')[0];
  
  const [reservasHoy, espaciosDisponibles, usuariosActivos] = await Promise.all([
    dynamodb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'begins_with(#fecha, :hoy)',
      ExpressionAttributeNames: {
        '#fecha': 'fecha_reserva'
      },
      ExpressionAttributeValues: {
        ':pk': 'TYPE#reserva',
        ':hoy': hoy
      },
      Select: 'COUNT'
    })),
    
    dynamodb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#estado = :estado',
      ExpressionAttributeNames: {
        '#estado': 'estado'
      },
      ExpressionAttributeValues: {
        ':pk': 'TYPE#espacio',
        ':estado': 'disponible'
      },
      Select: 'COUNT'
    })),
    
    dynamodb.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'active'
      },
      Select: 'COUNT'
    }))
  ]);
  
  return {
    reservas_hoy: reservasHoy.Count || 0,
    espacios_disponibles: espaciosDisponibles.Count || 0,
    usuarios_conectados: usuariosActivos.Count || 0,
    ultima_actualizacion: new Date().toISOString()
  };
}