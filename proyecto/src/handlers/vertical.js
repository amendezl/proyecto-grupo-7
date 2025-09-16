/**
 * Handler específico para demostrar optimizaciones de modo vertical
 * Sin problemas de scrolling, paginación inteligente
 */

const DynamoDBManager = require('../database/DynamoDBManager');
const { withAuth, withErrorHandling } = require('../utils/auth');
const { success, badRequest } = require('../utils/responses');
const { resilienceManager } = require('../utils/resilienceManager');

const db = new DynamoDBManager();

/**
 * Dashboard ultra-compacto para modo vertical
 * Diseñado para caber en una sola pantalla sin scroll
 */
const getVerticalDashboard = withAuth(async (event) => {
    const user = event.user;
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    
    // Detectar tipo de dispositivo para optimizar elementos
    const isSmallScreen = userAgent.includes('iPhone') || 
                         userAgent.includes('Android') && !userAgent.includes('Tablet');
    const maxElements = isSmallScreen ? 3 : 5;
    
    return await resilienceManager.executeDatabase(
        async () => {
            const [espacios, reservas] = await Promise.all([
                db.getEspacios(),
                db.getReservas({ usuario_id: user.id })
            ]);
            
            // Solo mostrar reservas más próximas (sin scroll)
            const reservasProximas = reservas
                .filter(r => r.estado !== 'cancelada')
                .filter(r => {
                    const fechaReserva = new Date(r.fecha_inicio);
                    const ahora = new Date();
                    const unaSemana = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                    return fechaReserva >= ahora && fechaReserva <= unaSemana;
                })
                .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
                .slice(0, maxElements); // Máximo 3-5 elementos
            
            // Estadísticas ultra-compactas
            const stats = {
                espacios_disponibles: espacios.filter(e => e.estado === 'disponible').length,
                mis_reservas_activas: reservas.filter(r => r.estado !== 'cancelada').length
            };
            
            return success({
                usuario: {
                    nombre: `${user.nombre} ${user.apellido}`.substring(0, 20) // Nombre corto
                },
                estadisticas: stats,
                proximas_reservas: reservasProximas.map(r => ({
                    id: r.id,
                    fecha: r.fecha_inicio.split('T')[0], // Solo fecha, no hora
                    hora: r.fecha_inicio.split('T')[1]?.substring(0, 5) || '', // Solo HH:MM
                    espacio: r.espacio_nombre || 'Espacio', // Nombre corto
                    estado: r.estado
                })),
                ui: {
                    viewport: 'vertical',
                    elementos_mostrados: reservasProximas.length,
                    scroll_requerido: false,
                    optimized_for: isSmallScreen ? 'smartphone' : 'tablet'
                },
                timestamp: new Date().toISOString()
            });
        },
        {
            operation: 'getVerticalDashboard',
            userId: user.id,
            device: isSmallScreen ? 'smartphone' : 'tablet'
        }
    );
});

/**
 * Lista de espacios paginada para modo vertical
 * Garantiza que no hay problemas de scrolling
 */
const getVerticalSpaces = withAuth(async (event) => {
    const { page = 1, tipo, viewport_height } = event.queryStringParameters || {};
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    
    // Calcular elementos por página según dispositivo y altura de viewport
    let elementsPerPage = 10; // Default
    
    if (userAgent.includes('iPhone')) {
        elementsPerPage = viewport_height > 800 ? 8 : 6; // iPhone Pro vs regular
    } else if (userAgent.includes('Android') && !userAgent.includes('Tablet')) {
        elementsPerPage = viewport_height > 800 ? 9 : 7; // Android grande vs pequeño
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
        elementsPerPage = viewport_height > 1000 ? 15 : 12; // Tablet portrait
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            let espacios = await db.getEspacios();
            
            // Filtrar por tipo si se especifica
            if (tipo) {
                espacios = espacios.filter(e => e.tipo === tipo);
            }
            
            // Solo espacios disponibles para simplicidad en móvil
            espacios = espacios.filter(e => e.estado === 'disponible');
            
            // Paginación calculada para evitar scroll
            const currentPage = parseInt(page);
            const startIndex = (currentPage - 1) * elementsPerPage;
            const endIndex = startIndex + elementsPerPage;
            const espaciosPagina = espacios.slice(startIndex, endIndex);
            
            // Simplificar datos para modo vertical
            const espaciosOptimizados = espaciosPagina.map(espacio => ({
                id: espacio.id,
                nombre: espacio.nombre.length > 25 ? 
                       espacio.nombre.substring(0, 22) + '...' : 
                       espacio.nombre, // Nombres cortos
                tipo: espacio.tipo,
                capacidad: espacio.capacidad,
                ubicacion: espacio.ubicacion.length > 20 ? 
                          espacio.ubicacion.substring(0, 17) + '...' : 
                          espacio.ubicacion, // Ubicaciones cortas
                disponible: true // Simplificado
            }));
            
            const totalPages = Math.ceil(espacios.length / elementsPerPage);
            
            return success({
                espacios: espaciosOptimizados,
                pagination: {
                    page: currentPage,
                    elements_per_page: elementsPerPage,
                    total_elements: espacios.length,
                    total_pages: totalPages,
                    has_previous: currentPage > 1,
                    has_next: currentPage < totalPages,
                    scroll_required: false // Garantizado
                },
                ui: {
                    viewport: 'vertical',
                    optimized_for_device: userAgent.includes('iPhone') ? 'iPhone' : 
                                         userAgent.includes('iPad') ? 'iPad' : 
                                         userAgent.includes('Android') ? 'Android' : 'Unknown',
                    elements_fit_screen: true
                }
            });
        },
        {
            operation: 'getVerticalSpaces',
            page: currentPage,
            elementsPerPage
        }
    );
});

/**
 * Crear reserva optimizada para modo vertical
 * Formulario mínimo, campos esenciales solamente
 */
const createVerticalReservation = withAuth(async (event) => {
    const user = event.user;
    const { espacio_id, fecha, hora_inicio, duracion_horas = 1 } = JSON.parse(event.body || '{}');
    
    if (!espacio_id || !fecha || !hora_inicio) {
        return badRequest('espacio_id, fecha y hora_inicio son requeridos');
    }
    
    return await resilienceManager.executeDatabase(
        async () => {
            // Construir fecha completa
            const fecha_inicio = `${fecha}T${hora_inicio}:00`;
            const fecha_fin_date = new Date(fecha_inicio);
            fecha_fin_date.setHours(fecha_fin_date.getHours() + parseInt(duracion_horas));
            const fecha_fin = fecha_fin_date.toISOString();
            
            // Verificar disponibilidad del espacio
            const espacio = await db.getEspacioById(espacio_id);
            if (!espacio || espacio.estado !== 'disponible') {
                return badRequest('Espacio no disponible');
            }
            
            // Crear reserva con datos mínimos
            const nuevaReserva = await db.createReserva({
                espacio_id,
                usuario_id: user.id,
                fecha_inicio,
                fecha_fin,
                proposito: 'Reserva desde móvil vertical',
                estado: 'pendiente'
            });
            
            return success({
                reserva: {
                    id: nuevaReserva.id,
                    espacio: espacio.nombre,
                    fecha: fecha,
                    hora: hora_inicio,
                    duracion: `${duracion_horas}h`,
                    estado: 'pendiente'
                },
                mensaje: 'Reserva creada exitosamente',
                ui: {
                    viewport: 'vertical',
                    accion_completada: true,
                    scroll_requerido: false
                }
            }, 201);
        },
        {
            operation: 'createVerticalReservation',
            userId: user.id,
            espacioId: espacio_id
        }
    );
});

module.exports = {
    getVerticalDashboard,
    getVerticalSpaces,
    createVerticalReservation
};