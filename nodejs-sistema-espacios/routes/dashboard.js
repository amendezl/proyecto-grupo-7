const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Ruta principal del dashboard
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    
    // Obtener estadísticas del sistema
    const espacioManager = db.getEspacioManager();
    const reservaManager = db.getReservaManager();
    const usuarioManager = db.getUsuarioManager();
    const zonaManager = db.getZonaManager();

    const stats = await Promise.all([
      espacioManager.count(),
      reservaManager.count(),
      usuarioManager.count(),
      zonaManager.count()
    ]);

    const dashboardData = {
      totalEspacios: stats[0],
      totalReservas: stats[1], 
      totalUsuarios: stats[2],
      totalZonas: stats[3]
    };

    // Obtener reservas recientes
    const reservasRecientes = await reservaManager.findAll({
      limit: 10,
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']]
    });

    // Obtener espacios más utilizados (top 5)
    const espaciosPopulares = await espacioManager.findAll({
      limit: 5,
      include: ['zona', 'reservas']
    });

    res.render('dashboard/index', {
      title: 'Dashboard - Sistema de Gestión de Espacios',
      stats: dashboardData,
      reservasRecientes,
      espaciosPopulares,
      currentPage: 'dashboard'
    });

  } catch (error) {
    logger.error('Error en dashboard:', error);
    res.status(500).render('error', {
      title: 'Error en Dashboard',
      error: {
        status: 500,
        message: 'Error cargando el dashboard'
      }
    });
  }
});

/**
 * API endpoint para estadísticas en tiempo real
 */
router.get('/api/stats', async (req, res) => {
  try {
    const db = req.db;
    
    const espacioManager = db.getEspacioManager();
    const reservaManager = db.getReservaManager();

    // Estadísticas por estado de espacio
    const estadosEspacio = await espacioManager.findAll({
      include: ['estadoEspacio']
    });

    const estadisticas = {
      espaciosPorEstado: {},
      reservasPorMes: {},
      ocupacionActual: 0
    };

    // Agrupar espacios por estado
    estadosEspacio.forEach(espacio => {
      const estado = espacio.estadoEspacio?.descripcionestadoespacio || 'Sin estado';
      estadisticas.espaciosPorEstado[estado] = 
        (estadisticas.espaciosPorEstado[estado] || 0) + 1;
    });

    // Reservas de los últimos 6 meses
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 6);
    
    const reservasRecientes = await reservaManager.findByDateRange(
      fechaInicio.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );

    // Agrupar reservas por mes
    reservasRecientes.forEach(reserva => {
      const mes = new Date(reserva.fechareserva).toISOString().substring(0, 7);
      estadisticas.reservasPorMes[mes] = 
        (estadisticas.reservasPorMes[mes] || 0) + 1;
    });

    // Calcular ocupación actual (aproximada)
    const hoy = new Date().toISOString().split('T')[0];
    const reservasHoy = await reservaManager.findAll({
      where: { fechareserva: hoy }
    });
    
    const totalEspacios = await espacioManager.count();
    estadisticas.ocupacionActual = totalEspacios > 0 ? 
      Math.round((reservasHoy.length / totalEspacios) * 100) : 0;

    res.json(estadisticas);

  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

/**
 * Endpoint para actividad reciente
 */
router.get('/api/actividad', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();

    const limit = parseInt(req.query.limit) || 20;
    
    const actividades = await reservaManager.findAll({
      limit,
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']],
      include: ['espacio', 'usuario', 'responsable', 'estado']
    });

    const actividadesFormateadas = actividades.map(actividad => ({
      id: actividad.idreserva,
      tipo: 'reserva',
      descripcion: `Reserva del espacio ${actividad.espacio?.numeroespacio || 'N/A'}`,
      usuario: actividad.usuario ? 
        `${actividad.usuario.nombreusuario} ${actividad.usuario.apellidousuario}` : 
        'Usuario no especificado',
      fecha: actividad.fechareserva,
      hora: actividad.horainicio,
      estado: actividad.estado?.descripcionestado || 'Sin estado'
    }));

    res.json(actividadesFormateadas);

  } catch (error) {
    logger.error('Error obteniendo actividad:', error);
    res.status(500).json({ error: 'Error obteniendo actividad reciente' });
  }
});

/**
 * Endpoint para gráfico de ocupación semanal
 */
router.get('/api/ocupacion-semanal', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();

    // Obtener reservas de la semana actual
    const hoy = new Date();
    const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);

    const reservasSemana = await reservaManager.findByDateRange(
      inicioSemana.toISOString().split('T')[0],
      finSemana.toISOString().split('T')[0]
    );

    // Agrupar por día de la semana
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const ocupacionSemanal = diasSemana.map((dia, index) => {
      const fecha = new Date(inicioSemana);
      fecha.setDate(inicioSemana.getDate() + index);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      const reservasDelDia = reservasSemana.filter(
        reserva => reserva.fechareserva === fechaStr
      ).length;

      return {
        dia,
        fecha: fechaStr,
        reservas: reservasDelDia
      };
    });

    res.json(ocupacionSemanal);

  } catch (error) {
    logger.error('Error obteniendo ocupación semanal:', error);
    res.status(500).json({ error: 'Error obteniendo ocupación semanal' });
  }
});

module.exports = router;
