const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling } = require('../utils/auth');
const { success, badRequest } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

const getHorizontalDashboard = withAuth(async (event) => {
    const user = event.user;
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    
    const isTablet = userAgent.includes('iPad') || 
                    (userAgent.includes('Android') && userAgent.includes('Tablet'));
    const isSmartphone = !isTablet && (userAgent.includes('iPhone') || userAgent.includes('Android'));
    
    const maxElementsPerColumn = isTablet ? 8 : isSmartphone ? 4 : 6;
    
    return await resilienceManager.executeDatabase(
        async () => {
            const [espacios, reservas, usuarios] = await Promise.all([
                db.getEspacios(),
                db.getReservas({ usuario_id: user.id }),
                user.rol === 'admin' ? db.getUsuarios() : Promise.resolve([])
            ]);
            
            const reservasProximas = reservas
                .filter(r => r.estado !== 'cancelada')
                .filter(r => {
                    const fechaReserva = new Date(r.fecha_inicio);
                    const ahora = new Date();
                    const tresDias = new Date(ahora.getTime() + (3 * 24 * 60 * 60 * 1000));
                    return fechaReserva >= ahora && fechaReserva <= tresDias;
                })
                .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
                .slice(0, maxElementsPerColumn);
            
            const espaciosDisponibles = espacios
                .filter(e => e.estado === 'disponible')
                .slice(0, maxElementsPerColumn);
            
            const stats = {
                espacios: {
                    disponibles: espacios.filter(e => e.estado === 'disponible').length,
                    ocupados: espacios.filter(e => e.estado === 'ocupado').length,
                    total: espacios.length
                },
                reservas: {
                    activas: reservas.filter(r => r.estado !== 'cancelada').length,
                    hoy: reservas.filter(r => {
                        const fechaReserva = new Date(r.fecha_inicio).toDateString();
                        const hoy = new Date().toDateString();
                        return fechaReserva === hoy && r.estado !== 'cancelada';
                    }).length
                }
            };
            
            if (user.rol === 'admin') {
                stats.usuarios = {
                    activos: usuarios.filter(u => u.activo).length,
                    total: usuarios.length
                };
            }
            
            return success({
                usuario: {
                    nombre: user.nombre,
                    apellido: user.apellido,
                    rol: user.rol
                },
                estadisticas: stats,
                layout: {
                    columna_izquierda: {
                        titulo: 'Próximas Reservas',
                        items: reservasProximas.map(r => ({
                            id: r.id,
                            fecha: r.fecha_inicio.split('T')[0],
                            hora: r.fecha_inicio.split('T')[1]?.substring(0, 5),
                            espacio: r.espacio_nombre || 'Espacio',
                            estado: r.estado,
                            proposito: r.proposito?.substring(0, 30) || ''
                        }))
                    },
                    columna_derecha: {
                        titulo: 'Espacios Disponibles',
                        items: espaciosDisponibles.map(e => ({
                            id: e.id,
                            nombre: e.nombre,
                            tipo: e.tipo,
                            capacidad: e.capacidad,
                            ubicacion: e.ubicacion
                        }))
                    }
                },
                ui: {
                    viewport: 'horizontal',
                    layout: 'two_columns',
                    device: isTablet ? 'tablet' : isSmartphone ? 'smartphone' : 'unknown',
                    elementos_por_columna: maxElementsPerColumn,
                    scroll_requerido: false
                },
                timestamp: new Date().toISOString()
            });
        },
        {
            operation: 'getHorizontalDashboard',
            userId: user.id,
            device: isTablet ? 'tablet' : 'smartphone'
        }
    );
});

const getHorizontalSpaces = withAuth(async (event) => {
    const { page = 1, tipo, columns } = event.queryStringParameters || {};
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    
    let columnsCount = 2;
    let elementsPerPage = 12;
    
    if (userAgent.includes('iPad')) {
        columnsCount = parseInt(columns) || 3;
        elementsPerPage = 18;
    } else if (userAgent.includes('Tablet')) {
        columnsCount = parseInt(columns) || 3;
        elementsPerPage = 18;
    } else if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
        columnsCount = parseInt(columns) || 2;
        elementsPerPage = 12;
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            let espacios = await db.getEspacios();
            
            if (tipo) {
                espacios = espacios.filter(e => e.tipo === tipo);
            }
            
            const currentPage = parseInt(page);
            const startIndex = (currentPage - 1) * elementsPerPage;
            const endIndex = startIndex + elementsPerPage;
            const espaciosPagina = espacios.slice(startIndex, endIndex);
            
            const espaciosGrid = espaciosPagina.map(espacio => ({
                id: espacio.id,
                nombre: espacio.nombre.length > 20 ? 
                       espacio.nombre.substring(0, 17) + '...' : 
                       espacio.nombre,
                tipo: espacio.tipo,
                capacidad: espacio.capacidad,
                estado: espacio.estado,
                ubicacion: espacio.ubicacion.length > 15 ? 
                          espacio.ubicacion.substring(0, 12) + '...' : 
                          espacio.ubicacion,
                disponible: espacio.estado === 'disponible'
            }));
            
            const rows = [];
            for (let i = 0; i < espaciosGrid.length; i += columnsCount) {
                rows.push(espaciosGrid.slice(i, i + columnsCount));
            }
            
            const totalPages = Math.ceil(espacios.length / elementsPerPage);
            
            return success({
                espacios_grid: rows,
                pagination: {
                    page: currentPage,
                    elements_per_page: elementsPerPage,
                    total_elements: espacios.length,
                    total_pages: totalPages,
                    has_previous: currentPage > 1,
                    has_next: currentPage < totalPages
                },
                ui: {
                    viewport: 'horizontal',
                    layout: 'grid',
                    columns: columnsCount,
                    rows_per_page: Math.ceil(elementsPerPage / columnsCount),
                    device: userAgent.includes('iPad') ? 'iPad' : 
                            userAgent.includes('Tablet') ? 'Android Tablet' : 
                            'Smartphone',
                    scroll_requerido: false
                }
            });
        },
        {
            operation: 'getHorizontalSpaces',
            page: currentPage,
            columns: columnsCount
        }
    );
});

const createHorizontalReservation = withAuth(async (event) => {
    const user = event.user;
    const { 
        espacio_id, 
        fecha, 
        hora_inicio, 
        hora_fin, 
        proposito = '',
        recurrente = false,
        dias_recurrencia = []
    } = JSON.parse(event.body || '{}');
    
    if (!espacio_id || !fecha || !hora_inicio || !hora_fin) {
        return badRequest('espacio_id, fecha, hora_inicio y hora_fin son requeridos');
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            const fecha_inicio = `${fecha}T${hora_inicio}:00`;
            const fecha_fin = `${fecha}T${hora_fin}:00`;
            
            if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
                return badRequest('La hora de fin debe ser posterior a la hora de inicio');
            }
            
            const espacio = await db.getEspacioById(espacio_id);
            if (!espacio || espacio.estado !== 'disponible') {
                return badRequest('Espacio no disponible');
            }
            
            const nuevaReserva = await db.createReserva({
                espacio_id,
                usuario_id: user.id,
                fecha_inicio,
                fecha_fin,
                proposito: proposito || 'Reserva desde móvil horizontal',
                estado: 'pendiente'
            });
            
            const reservasCreadas = [nuevaReserva];
            if (recurrente && dias_recurrencia.length > 0) {
                for (const dias of dias_recurrencia.slice(0, 4)) {
                    const fechaRecurrente = new Date(fecha);
                    fechaRecurrente.setDate(fechaRecurrente.getDate() + parseInt(dias));
                    
                    const fechaRecurrenteStr = fechaRecurrente.toISOString().split('T')[0];
                    const reservaRecurrente = await db.createReserva({
                        espacio_id,
                        usuario_id: user.id,
                        fecha_inicio: `${fechaRecurrenteStr}T${hora_inicio}:00`,
                        fecha_fin: `${fechaRecurrenteStr}T${hora_fin}:00`,
                        proposito: `${proposito} (Recurrente)`,
                        estado: 'pendiente'
                    });
                    reservasCreadas.push(reservaRecurrente);
                }
            }
            
            return success({
                reservas: reservasCreadas.map(r => ({
                    id: r.id,
                    fecha: r.fecha_inicio.split('T')[0],
                    hora_inicio: r.fecha_inicio.split('T')[1]?.substring(0, 5),
                    hora_fin: r.fecha_fin.split('T')[1]?.substring(0, 5),
                    estado: r.estado
                })),
                espacio: {
                    nombre: espacio.nombre,
                    tipo: espacio.tipo,
                    ubicacion: espacio.ubicacion
                },
                mensaje: recurrente ? 
                        `${reservasCreadas.length} reservas creadas exitosamente` :
                        'Reserva creada exitosamente',
                ui: {
                    viewport: 'horizontal',
                    layout: 'form_horizontal',
                    recurrente_procesado: recurrente,
                    scroll_requerido: false
                }
            }, 201);
        },
        {
            operation: 'createHorizontalReservation',
            userId: user.id,
            espacioId: espacio_id,
            recurrente
        }
    );
});

module.exports = {
    getHorizontalDashboard,
    getHorizontalSpaces,
    createHorizontalReservation
};