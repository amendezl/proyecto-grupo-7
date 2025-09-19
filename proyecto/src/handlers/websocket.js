/* 
 * WEBSOCKET HANDLERS - Tiempo Real
 * Sistema hospital - Notificaciones instantáneas
 */

const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const apigateway = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

// Tabla para manejar conexiones WebSocket
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

/**
 * Maneja nuevas conexiones WebSocket
 */
exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const timestamp = new Date().toISOString();
  
  try {
    // Guardar conexión en DynamoDB
    await dynamodb.put({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        timestamp,
        status: 'connected'
      }
    }).promise();
    
    console.log(`✅ Nueva conexión WebSocket: ${connectionId}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Conectado al sistema de tiempo real',
        connectionId 
      })
    };
  } catch (error) {
    console.error('❌ Error conectando WebSocket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error de conexión' })
    };
  }
};

/**
 * Maneja desconexiones WebSocket
 */
exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    // Eliminar conexión de DynamoDB
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();
    
    console.log(`❌ Desconexión WebSocket: ${connectionId}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Desconectado' })
    };
  } catch (error) {
    console.error('❌ Error desconectando WebSocket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error de desconexión' })
    };
  }
};

/**
 * Maneja mensajes por defecto
 */
exports.message = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body || '{}');
  
  console.log(`💬 Mensaje recibido de ${connectionId}:`, message);
  
  // Echo del mensaje (opcional)
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

/**
 * TRIGGER: Notifica cuando se crea una nueva reserva
 * Se ejecuta automáticamente desde DynamoDB Streams
 */
exports.notifyReserva = async (event) => {
  console.log('🔄 DynamoDB Stream - Reservas:', JSON.stringify(event, null, 2));
  
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
      
      console.log('📢 Enviando notificación:', notificationMessage);
      await broadcastMessage(notificationMessage);
    }
  }
  
  return { statusCode: 200 };
};

/**
 * TRIGGER: Notifica cuando cambia el estado de un espacio
 */
exports.notifyEspacioEstado = async (event) => {
  console.log('🔄 DynamoDB Stream - Espacios:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY' && record.dynamodb.NewImage.tipo?.S === 'espacio') {
      const espacioData = record.dynamodb.NewImage;
      const oldData = record.dynamodb.OldImage;
      
      // Solo notificar si cambió el estado
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
        
        console.log('📢 Estado espacio cambiado:', notificationMessage);
        await broadcastMessage(notificationMessage);
      }
    }
  }
  
  return { statusCode: 200 };
};

/**
 * Envía mensaje a todas las conexiones activas
 */
async function broadcastMessage(message) {
  try {
    // Obtener todas las conexiones activas
      const connections = await dynamodb.scan({
        TableName: CONNECTIONS_TABLE,
        ProjectionExpression: 'connectionId'
      });
    
    console.log(`📡 Broadcasting a ${connections.Items.length} conexiones`);
    
    // Enviar mensaje a cada conexión
    const promises = connections.Items.map(async (connection) => {
      try {
  await sendMessageToConnection(connection.connectionId, message);
      } catch (error) {
        // Si la conexión está muerta, eliminarla
        if (error.statusCode === 410) {
          console.log(`🗑️ Eliminando conexión muerta: ${connection.connectionId}`);
          await dynamodb.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId: connection.connectionId }
          }).promise();
        } else {
          console.error(`❌ Error enviando mensaje a ${connection.connectionId}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
    console.log('✅ Broadcast completado');
    
  } catch (error) {
    console.error('❌ Error en broadcast:', error);
  }
}

/**
 * Envía mensaje a una conexión específica
 */
async function sendMessageToConnection(connectionId, message) {
  const cmd = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(message))
  });
  await apigateway.send(cmd);
}

/**
 * TRIGGER MANUAL: Envía estadísticas en tiempo real
 * Puede ser llamado desde otros handlers
 */
exports.sendStats = async (event) => {
  try {
    // Obtener estadísticas actuales de la base de datos
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
    console.error('❌ Error enviando estadísticas:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error enviando estadísticas' })
    };
  }
};

/**
 * Obtiene estadísticas en tiempo real de la base de datos
 */
async function getRealtimeStats() {
  const hoy = new Date().toISOString().split('T')[0];
  
  // Estas consultas deberían optimizarse según tu estructura de datos
  const [reservasHoy, espaciosDisponibles, usuariosActivos] = await Promise.all([
    // Contar reservas de hoy
    dynamodb.query({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'TipoFechaIndex',
      KeyConditionExpression: 'tipo = :tipo AND begins_with(fecha_reserva, :fecha)',
      ExpressionAttributeValues: {
        ':tipo': 'reserva',
        ':fecha': hoy
      },
      Select: 'COUNT'
    }).promise(),
    
    // Contar espacios disponibles
    dynamodb.query({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'TipoEstadoIndex',
      KeyConditionExpression: 'tipo = :tipo AND estado = :estado',
      ExpressionAttributeValues: {
        ':tipo': 'espacio',
        ':estado': 'disponible'
      },
      Select: 'COUNT'
    }).promise(),
    
    // Contar conexiones activas (usuarios conectados)
    dynamodb.scan({
      TableName: CONNECTIONS_TABLE,
      Select: 'COUNT'
    }).promise()
  ]);
  
  return {
    reservas_hoy: reservasHoy.Count,
    espacios_disponibles: espaciosDisponibles.Count,
    usuarios_conectados: usuariosActivos.Count,
    ultima_actualizacion: new Date().toISOString()
  };
}