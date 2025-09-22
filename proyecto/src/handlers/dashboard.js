const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling } = require('../utils/auth');
const { success } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

const getDashboard = withAuth(async (event) => {
    const user = event.user;
    
    return await resilienceManager.executeDatabase(
        async () => {
            const [espacios, reservas, usuarios, responsables, zonas] = await Promise.all([
                db.getEspacios(),
                db.getReservas(),
                db.getUsuarios(),
                db.getEntities('responsable'),
                db.getEntities('zona')
            ]);
        
        const stats = {
            espacios: {
                total: espacios.length,
                disponibles: espacios.filter(e => e.estado === 'disponible').length,
                ocupados: espacios.filter(e => e.estado === 'ocupado').length,
                mantenimiento: espacios.filter(e => e.estado === 'mantenimiento').length
            },
            reservas: {
                total: reservas.length,
                pendientes: reservas.filter(r => r.estado === 'pendiente').length,
                confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
                canceladas: reservas.filter(r => r.estado === 'cancelada').length,
                hoy: reservas.filter(r => {
                    const hoy = new Date().toISOString().split('T')[0];
                    return r.fecha_inicio.startsWith(hoy);
                }).length
            },
            usuarios: {
                total: usuarios.length,
                activos: usuarios.filter(u => u.activo).length,
                administradores: usuarios.filter(u => u.rol === 'admin').length,
                responsables: usuarios.filter(u => u.rol === 'responsable').length,
                usuarios: usuarios.filter(u => u.rol === 'usuario').length
            },
            responsables: {
                total: responsables.length,
                activos: responsables.filter(r => r.activo).length
            },
            zonas: {
                total: zonas.length,
                activas: zonas.filter(z => z.activa).length
            }
        };
        
        let dashboardData = {
            usuario: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol
            },
            estadisticas: stats,
            timestamp: new Date().toISOString()
        };
        
        if (user.rol === 'usuario') {
            const misReservas = reservas.filter(r => r.usuario_id === user.id);
            dashboardData.misReservas = {
                total: misReservas.length,
                pendientes: misReservas.filter(r => r.estado === 'pendiente').length,
                confirmadas: misReservas.filter(r => r.estado === 'confirmada').length,
                proximas: misReservas.filter(r => {
                    const fechaReserva = new Date(r.fecha_inicio);
                    const ahora = new Date();
                    const unaSemana = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                    return fechaReserva >= ahora && fechaReserva <= unaSemana && r.estado !== 'cancelada';
                }).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio)).slice(0, 5)
            };
        }
        
        if (user.rol === 'admin' || user.rol === 'responsable') {
            const actividad = [];
            
            const reservasRecientes = reservas
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(r => ({
                    tipo: 'reserva',
                    descripcion: `Nueva reserva para ${espacios.find(e => e.id === r.espacio_id)?.nombre || 'Espacio'}`,
                    fecha: r.createdAt,
                    estado: r.estado
                }));
            
            actividad.push(...reservasRecientes);
            
            dashboardData.actividadReciente = actividad;
            
            const espaciosUtilizacion = espacios.map(espacio => {
                const reservasEspacio = reservas.filter(r => r.espacio_id === espacio.id);
                return {
                    espacio: espacio.nombre,
                    id: espacio.id,
                    totalReservas: reservasEspacio.length,
                    reservasActivas: reservasEspacio.filter(r => r.estado === 'confirmada').length
                };
            }).sort((a, b) => b.totalReservas - a.totalReservas).slice(0, 5);
            
            dashboardData.espaciosMasUtilizados = espaciosUtilizacion;
            
            const alertas = [];
            
            const espaciosMantenimiento = espacios.filter(e => e.estado === 'mantenimiento');
            if (espaciosMantenimiento.length > 0) {
                alertas.push({
                    tipo: 'warning',
                    mensaje: `${espaciosMantenimiento.length} espacio(s) en mantenimiento`,
                    detalle: espaciosMantenimiento.map(e => e.nombre).join(', ')
                });
            }
            
            const reservasPendientes = reservas.filter(r => r.estado === 'pendiente');
            if (reservasPendientes.length > 0) {
                alertas.push({
                    tipo: 'info',
                    mensaje: `${reservasPendientes.length} reserva(s) pendientes de confirmación`
                });
            }
            
            dashboardData.alertas = alertas;
        }
        
        if (user.rol === 'responsable') {
            const responsable = responsables.find(r => r.email === user.email);
            if (responsable) {
                const espaciosAsignados = espacios.filter(e => e.responsable_id === responsable.id);
                dashboardData.miArea = {
                    area: responsable.area,
                    espaciosAsignados: espaciosAsignados.length,
                    espaciosDisponibles: espaciosAsignados.filter(e => e.estado === 'disponible').length,
                    reservasEnMisEspacios: reservas.filter(r => 
                        espaciosAsignados.some(e => e.id === r.espacio_id)
                    ).length
                };
            }
        }
        
        return success(dashboardData);
        
        },
        {
            operation: 'getDashboard',
            userId: user.id,
            userRole: user.rol,
            priority: 'standard'
        }
    );
});

const getEstadisticasDetalladas = withAuth(async (event) => {
    try {
        const [espacios, reservas, usuarios, responsables, zonas] = await Promise.all([
            db.getEspacios(),
            db.getReservas(),
            db.getUsuarios(),
            db.getEntities('responsable'),
            db.getEntities('zona')
        ]);
        
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        
        const reservasUltimos30Dias = reservas.filter(r => 
            new Date(r.createdAt) >= hace30Dias
        );
        
        const usuariosUltimos30Dias = usuarios.filter(u => 
            new Date(u.createdAt) >= hace30Dias
        );
        
        const estadisticasDetalladas = {
            resumen: {
                totalEspacios: espacios.length,
                totalReservas: reservas.length,
                totalUsuarios: usuarios.length
            },
            tendencias: {
                reservasUltimos30Dias: reservasUltimos30Dias.length,
                usuariosNuevosUltimos30Dias: usuariosUltimos30Dias.length,
                promedioReservasDiarias: reservasUltimos30Dias.length / 30
            },
            distribucion: {
                espaciosPorTipo: {},
                reservasPorEstado: {},
                usuariosPorRol: {}
            },
            ocupacion: {
                espaciosMasReservados: {},
                horasPico: {},
                diasMasActivos: {}
            }
        };
        
        espacios.forEach(espacio => {
            if (!estadisticasDetalladas.distribucion.espaciosPorTipo[espacio.tipo]) {
                estadisticasDetalladas.distribucion.espaciosPorTipo[espacio.tipo] = 0;
            }
            estadisticasDetalladas.distribucion.espaciosPorTipo[espacio.tipo]++;
        });
        
        reservas.forEach(reserva => {
            if (!estadisticasDetalladas.distribucion.reservasPorEstado[reserva.estado]) {
                estadisticasDetalladas.distribucion.reservasPorEstado[reserva.estado] = 0;
            }
            estadisticasDetalladas.distribucion.reservasPorEstado[reserva.estado]++;
        });
        
        usuarios.forEach(usuario => {
            if (!estadisticasDetalladas.distribucion.usuariosPorRol[usuario.rol]) {
                estadisticasDetalladas.distribucion.usuariosPorRol[usuario.rol] = 0;
            }
            estadisticasDetalladas.distribucion.usuariosPorRol[usuario.rol]++;
        });
        
        return success(estadisticasDetalladas);
        
    } catch (error) {
        console.error('Error al obtener estadísticas detalladas:', error);
        throw error;
    }
}, ['admin']);

module.exports = {
    getDashboard,
    getEstadisticasDetalladas
};
