const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling } = require('../utils/auth');
const { success, badRequest } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

const getMobileDashboard = withAuth(async (event) => {
    const user = event.user;
    
    return await resilienceManager.executeDatabase(
        async () => {
            const [espacios, reservas] = await Promise.all([
                db.getEspacios(),
                db.getReservas({ usuario_id: user.id })
            ]);
            
            const stats = {
                espacios: {
                    disponibles: espacios.filter(e => e.estado === 'disponible').length,
                    total: espacios.length
                },
                misReservas: {
                    activas: reservas.filter(r => r.estado !== 'cancelada').length,
                    proximas: reservas.filter(r => {
                        const fechaReserva = new Date(r.fecha_inicio);
                        const ahora = new Date();
                        const unaSemana = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                        return fechaReserva >= ahora && fechaReserva <= unaSemana && r.estado !== 'cancelada';
                    }).slice(0, 3)
                }
            };
            
            return success({
                usuario: {
                    id: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido
                },
                estadisticas: stats,
                timestamp: new Date().toISOString(),
                optimized: 'mobile'
            });
        },
        {
            operation: 'getMobileDashboard',
            userId: user.id,
            priority: 'high'
        }
    );
});

const getMobileSpaces = withAuth(async (event) => {
    const { limit = 20, offset = 0, tipo } = event.queryStringParameters || {};
    
    return await resilienceManager.executeDatabase(
        async () => {
            let espacios = await db.getEspacios();
            
            if (tipo) {
                espacios = espacios.filter(e => e.tipo === tipo);
            }
            
            espacios = espacios.filter(e => e.estado === 'disponible');
            
            const startIndex = parseInt(offset);
            const endIndex = startIndex + parseInt(limit);
            const espaciosPaginados = espacios.slice(startIndex, endIndex);
            
            const espaciosOptimizados = espaciosPaginados.map(espacio => ({
                id: espacio.id,
                nombre: espacio.nombre,
                tipo: espacio.tipo,
                capacidad: espacio.capacidad,
                estado: espacio.estado,
                ubicacion: espacio.ubicacion
            }));
            
            return success({
                espacios: espaciosOptimizados,
                pagination: {
                    total: espacios.length,
                    offset: startIndex,
                    limit: parseInt(limit),
                    hasMore: endIndex < espacios.length
                },
                optimized: 'mobile'
            });
        },
        {
            operation: 'getMobileSpaces',
            limit,
            offset
        }
    );
});

const getMobileReservations = withAuth(async (event) => {
    const user = event.user;
    const { estado, limit = 10 } = event.queryStringParameters || {};
    
    return await resilienceManager.executeDatabase(
        async () => {
            let reservas = await db.getReservas({ usuario_id: user.id });
            
            if (estado) {
                reservas = reservas.filter(r => r.estado === estado);
            }
            
            reservas.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
            
            reservas = reservas.slice(0, parseInt(limit));
            
            const espaciosIds = [...new Set(reservas.map(r => r.espacio_id))];
            const espacios = await Promise.all(
                espaciosIds.map(id => db.getEspacioById(id))
            );
            const espaciosMap = espacios.reduce((map, espacio) => {
                if (espacio) map[espacio.id] = espacio;
                return map;
            }, {});
            
            const reservasOptimizadas = reservas.map(reserva => ({
                id: reserva.id,
                fecha_inicio: reserva.fecha_inicio,
                fecha_fin: reserva.fecha_fin,
                estado: reserva.estado,
                proposito: reserva.proposito,
                espacio: espaciosMap[reserva.espacio_id] ? {
                    nombre: espaciosMap[reserva.espacio_id].nombre,
                    tipo: espaciosMap[reserva.espacio_id].tipo,
                    ubicacion: espaciosMap[reserva.espacio_id].ubicacion
                } : null
            }));
            
            return success({
                reservas: reservasOptimizadas,
                total: reservas.length,
                optimized: 'mobile'
            });
        },
        {
            operation: 'getMobileReservations',
            userId: user.id
        }
    );
});

const createMobileReservation = withAuth(async (event) => {
    const user = event.user;
    const { espacio_id, fecha_inicio, fecha_fin, proposito } = JSON.parse(event.body || '{}');
    
    if (!espacio_id || !fecha_inicio || !fecha_fin) {
        return badRequest('espacio_id, fecha_inicio y fecha_fin son requeridos');
    }
    
    return await resilienceManager.executeDatabase(
        async () => {

            const espacio = await db.getEspacioById(espacio_id);
            if (!espacio) {
                return badRequest('Espacio no encontrado');
            }
            
            if (espacio.estado !== 'disponible') {
                return badRequest('Espacio no disponible');
            }
            
            const nuevaReserva = await db.createReserva({
                espacio_id,
                usuario_id: user.id,
                fecha_inicio,
                fecha_fin,
                proposito: proposito || 'Reserva desde móvil',
                estado: 'pendiente'
            });
            
            return success({
                reserva: {
                    id: nuevaReserva.id,
                    fecha_inicio: nuevaReserva.fecha_inicio,
                    fecha_fin: nuevaReserva.fecha_fin,
                    estado: nuevaReserva.estado,
                    espacio: {
                        nombre: espacio.nombre,
                        tipo: espacio.tipo,
                        ubicacion: espacio.ubicacion
                    }
                },
                message: 'Reserva creada exitosamente',
                optimized: 'mobile'
            }, 201);
        },
        {
            operation: 'createMobileReservation',
            userId: user.id,
            espacioId: espacio_id
        }
    );
});

const getSpaceTypes = withAuth(async (event) => {
    return await resilienceManager.executeDatabase(
        async () => {
            const espacios = await db.getEspacios();
            const tipos = [...new Set(espacios.map(e => e.tipo))].sort();
            
            return success({
                tipos,
                total: tipos.length,
                optimized: 'mobile'
            });
        },
        {
            operation: 'getSpaceTypes'
        }
    );
});

module.exports = {
    getMobileDashboard,
    getMobileSpaces,
    getMobileReservations,
    createMobileReservation,
    getSpaceTypes
};