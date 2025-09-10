const DynamoDBManager = require('../database/DynamoDBManager');
const resilienceManager = require('../patterns/resilienceManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody } = require('../utils/auth');
const { success, badRequest, notFound, created } = require('../utils/responses');

const db = new DynamoDBManager();

/**
 * Obtener todos los espacios con filtros opcionales
 * Incluye resiliencia para consultas de espacios
 */
const getEspacios = withErrorHandling(async (event) => {
    const queryParams = extractQueryParams(event);
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const filters = {};
                if (queryParams.tipo) filters.tipo = queryParams.tipo;
                if (queryParams.estado) filters.estado = queryParams.estado;
                if (queryParams.zona_id) filters.zona_id = queryParams.zona_id;
                
                const espacios = await db.getEspacios(filters);
                
                return {
                    espacios,
                    total: espacios.length,
                    filtros_aplicados: Object.keys(filters).length > 0 ? filters : null
                };
            },
            {
                operation: 'getEspacios',
                priority: 'standard',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(result);
        
    } catch (error) {
        // Fallback para consultas de espacios
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        espacios: [],
                        total: 0,
                        warning: 'Datos de espacios no disponibles temporalmente'
                    }
                })
            };
        }
        
        console.error('[GET_ESPACIOS] Error:', error);
        throw error;
    }
});

/**
 * Obtener un espacio por ID
 * Incluye resiliencia para consultas individuales
 */
const getEspacio = withErrorHandling(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const espacio = await resilienceManager.executeDatabase(
            async () => {
                const resultado = await db.getEspacioById(id);
                if (!resultado) {
                    throw new Error('Espacio no encontrado');
                }
                return resultado;
            },
            {
                operation: 'getEspacio',
                priority: 'standard',
                espacioId: id,
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(espacio);
        
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound('Espacio no encontrado');
        }
        
        // Manejo de errores de resiliencia
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        console.error('[GET_ESPACIO] Error:', error);
        throw error;
    }
});

/**
 * Crear un nuevo espacio
 * Incluye resiliencia para creación de espacios críticos
 */
const createEspacio = withAuth(async (event) => {
    const espacioData = parseBody(event);
    
    const { nombre, tipo, capacidad, ubicacion, descripcion, zona_id, responsable_id } = espacioData;
    
    if (!nombre || !tipo || !capacidad || !ubicacion) {
        return badRequest('Nombre, tipo, capacidad y ubicación son requeridos');
    }
    
    try {
        // Determinar si es un espacio crítico (emergencias, quirófanos, UCI)
        const esCritico = tipo.toLowerCase().includes('emergencia') ||
                         tipo.toLowerCase().includes('quirófano') ||
                         tipo.toLowerCase().includes('uci') ||
                         tipo.toLowerCase().includes('urgencia') ||
                         nombre.toLowerCase().includes('emergencia');
        
        const nuevoEspacio = await (esCritico ? 
            resilienceManager.executeCritical : 
            resilienceManager.executeDatabase
        )(
            async () => {
                // Validar que no exista otro espacio con el mismo nombre en la zona
                if (zona_id) {
                    const espaciosExistentes = await db.getEspacios({ zona_id });
                    const nombreDuplicado = espaciosExistentes.some(e => 
                        e.nombre.toLowerCase() === nombre.toLowerCase()
                    );
                    
                    if (nombreDuplicado) {
                        throw new Error('Ya existe un espacio con ese nombre en la zona');
                    }
                }
                
                return await db.createEspacio({
                    nombre,
                    tipo,
                    capacidad: parseInt(capacidad),
                    ubicacion,
                    descripcion,
                    zona_id,
                    responsable_id,
                    estado: espacioData.estado || 'disponible',
                    prioridad: esCritico ? 'critico' : 'normal'
                });
            },
            {
                operation: 'createEspacio',
                priority: esCritico ? 'critical' : 'standard',
                espacioTipo: tipo,
                esCritico
            }
        );
        
        // Log para espacios críticos
        if (esCritico) {
            console.log(`[CRITICAL_SPACE] Espacio crítico creado: ${nuevoEspacio.id} - ${nombre} (${tipo})`);
        }
        
        return created(nuevoEspacio);
        
    } catch (error) {
        console.error('[CREATE_ESPACIO] Error:', error);
        
        // Manejo específico de errores de resiliencia
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado',
                    suggestion: 'Intente crear el espacio nuevamente en unos momentos'
                })
            };
        }
        
        if (error.name === 'RetryExhaustedError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios no responde',
                    fallback: 'Contacte administración para creación manual del espacio'
                })
            };
        }
        
        return badRequest(error.message);
    }
}, ['admin', 'responsable']);

/**
 * Actualizar un espacio existente
 * Incluye resiliencia para modificaciones de espacios críticos
 */
const updateEspacio = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const espacioActualizado = await resilienceManager.executeDatabase(
            async () => {
                // Verificar que el espacio existe
                const espacioExistente = await db.getEspacioById(id);
                if (!espacioExistente) {
                    throw new Error('Espacio no encontrado');
                }
                
                // Determinar si es un espacio crítico
                const esCritico = espacioExistente.tipo?.toLowerCase().includes('emergencia') ||
                                 espacioExistente.tipo?.toLowerCase().includes('quirófano') ||
                                 espacioExistente.tipo?.toLowerCase().includes('uci') ||
                                 updateData.tipo?.toLowerCase().includes('emergencia');
                
                if (esCritico && updateData.estado === 'mantenimiento') {
                    console.warn(`[CRITICAL_MAINTENANCE] Espacio crítico ${id} entrando en mantenimiento`);
                }
                
                return await db.updateEspacio(id, updateData);
            },
            {
                operation: 'updateEspacio',
                priority: 'standard',
                espacioId: id
            }
        );
        
        return success(espacioActualizado);
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        
        // Manejo de errores de resiliencia
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        console.error('[UPDATE_ESPACIO] Error:', error);
        throw error;
    }
}, ['admin', 'responsable']);

/**
 * Eliminar un espacio
 * Incluye resiliencia y protección para espacios críticos
 */
const deleteEspacio = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del espacio es requerido');
    }
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                // Verificar que el espacio existe
                const espacioExistente = await db.getEspacioById(id);
                if (!espacioExistente) {
                    throw new Error('Espacio no encontrado');
                }
                
                // Verificar si es un espacio crítico
                const esCritico = espacioExistente.tipo?.toLowerCase().includes('emergencia') ||
                                 espacioExistente.tipo?.toLowerCase().includes('quirófano') ||
                                 espacioExistente.tipo?.toLowerCase().includes('uci');
                
                if (esCritico) {
                    console.warn(`[CRITICAL_DELETION] Eliminando espacio crítico ${id} - ${espacioExistente.nombre}`);
                }
                
                // Verificar que no tenga reservas activas
                const reservasActivas = await db.getReservas({ 
                    espacio_id: id, 
                    estado: 'confirmada' 
                });
                
                if (reservasActivas.length > 0) {
                    throw new Error('No se puede eliminar un espacio con reservas activas');
                }
                
                await db.deleteEspacio(id);
                return { message: 'Espacio eliminado correctamente', id };
            },
            {
                operation: 'deleteEspacio',
                priority: 'standard',
                espacioId: id
            }
        );
        
        return success(result);
    } catch (error) {
        if (error.message === 'Espacio no encontrado') {
            return notFound(error.message);
        }
        
        if (error.message.includes('reservas activas')) {
            return badRequest(error.message);
        }
        
        // Manejo de errores de resiliencia
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de espacios temporalmente sobrecargado'
                })
            };
        }
        
        console.error('[DELETE_ESPACIO] Error:', error);
        throw error;
    }
}, ['admin']);

/**
 * Obtener estadísticas de espacios
 * Incluye resiliencia para consultas de análisis
 */
const getEstadisticasEspacios = withAuth(async (event) => {
    try {
        const stats = await resilienceManager.executeDatabase(
            async () => {
                const espacios = await db.getEspacios();
                
                const estadisticas = {
                    total: espacios.length,
                    disponibles: espacios.filter(e => e.estado === 'disponible').length,
                    ocupados: espacios.filter(e => e.estado === 'ocupado').length,
                    mantenimiento: espacios.filter(e => e.estado === 'mantenimiento').length,
                    criticos: espacios.filter(e => {
                        const tipo = e.tipo?.toLowerCase() || '';
                        return tipo.includes('emergencia') || 
                               tipo.includes('quirófano') || 
                               tipo.includes('uci') ||
                               e.prioridad === 'critico';
                    }).length,
                    porTipo: {},
                    capacidadTotal: espacios.reduce((total, e) => total + (e.capacidad || 0), 0)
                };
                
                espacios.forEach(espacio => {
                    if (!stats.porTipo[espacio.tipo]) {
                        stats.porTipo[espacio.tipo] = 0;
                    }
                    stats.porTipo[espacio.tipo]++;
                });
                
                return estadisticas;
            },
            {
                operation: 'getEstadisticasEspacios',
                priority: 'low',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(stats);
        
    } catch (error) {
        // Fallback con estadísticas básicas
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        total: 0,
                        disponibles: 0,
                        ocupados: 0,
                        mantenimiento: 0,
                        criticos: 0,
                        porTipo: {},
                        capacidadTotal: 0,
                        warning: 'Estadísticas de espacios no disponibles temporalmente'
                    }
                })
            };
        }
        
        console.error('[GET_ESTADISTICAS_ESPACIOS] Error:', error);
        throw error;
    }
}, ['admin', 'responsable']);

module.exports = {
    getEspacios,
    getEspacio,
    createEspacio,
    updateEspacio,
    deleteEspacio,
    getEstadisticasEspacios
};
