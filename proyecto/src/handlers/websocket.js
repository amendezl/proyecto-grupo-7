const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

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

exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {

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

exports.message = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body || '{}');
  
  console.log(`💬 Mensaje recibido de ${connectionId}:`, message);
  
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

exports.notifyEspacioEstado = async (event) => {
  console.log('🔄 DynamoDB Stream - Espacios:', JSON.stringify(event, null, 2));
  
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
        
        console.log('📢 Estado espacio cambiado:', notificationMessage);
        await broadcastMessage(notificationMessage);
      }
    }
  }
  
  return { statusCode: 200 };
};

async function broadcastMessage(message) {
  try {

      const connections = await dynamodb.scan({
        TableName: CONNECTIONS_TABLE,
        ProjectionExpression: 'connectionId'
      });
    
    console.log(`📡 Broadcasting a ${connections.Items.length} conexiones`);
    
    const promises = connections.Items.map(async (connection) => {
      try {
  await sendMessageToConnection(connection.connectionId, message);
      } catch (error) {

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
    console.error('❌ Error enviando estadísticas:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error enviando estadísticas' })
    };
  }
};

async function getRealtimeStats() {
  const hoy = new Date().toISOString().split('T')[0];
  
  const [reservasHoy, espaciosDisponibles, usuariosActivos] = await Promise.all([

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