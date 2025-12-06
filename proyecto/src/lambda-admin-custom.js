/**
 * Lambda Function de Ejemplo para Admin Panel
 * 
 * Esta es una función Lambda básica tipo "Hello World" que puedes
 * usar como punto de partida para agregar funcionalidad personalizada.
 * 
 * Puedes modificarla para:
 * - Procesar datos administrativos
 * - Ejecutar tareas programadas
 * - Integraciones con otros servicios
 * - Operaciones de base de datos especiales
 * - Generación de reportes personalizados
 */

exports.handler = async (event) => {
    console.log('Event recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Parsear el body si viene como string
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        // Extraer información del evento
        const { action, data } = body || {};
        
        // Respuesta básica
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Configurar según tu dominio
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                message: 'Hello World desde Lambda Admin!',
                timestamp: new Date().toISOString(),
                receivedAction: action || 'none',
                receivedData: data || null,
                environment: process.env.STAGE || 'dev',
                version: '1.0.0',
                examples: {
                    usage: 'Esta función puede ser usada para operaciones administrativas',
                    suggestions: [
                        'Procesar reportes personalizados',
                        'Ejecutar operaciones de mantenimiento',
                        'Sincronizar datos externos',
                        'Enviar notificaciones especiales',
                        'Generar backups programados'
                    ]
                }
            })
        };
        
        return response;
        
    } catch (error) {
        console.error('Error en Lambda:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Error en la función Lambda',
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Ejemplo de uso desde el frontend:
 * 
 * const callAdminLambda = async (action, data) => {
 *   const response = await fetch('YOUR_LAMBDA_URL', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${token}`
 *     },
 *     body: JSON.stringify({ action, data })
 *   });
 *   
 *   return response.json();
 * };
 * 
 * // Llamar a la función
 * const result = await callAdminLambda('test', { message: 'Hello' });
 */
