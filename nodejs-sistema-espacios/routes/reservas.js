const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todas las reservas
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const estado = req.query.estado;
    const zona = req.query.zona;
    const fecha_desde = req.query.fecha_desde;
    const fecha_hasta = req.query.fecha_hasta;
    const search = req.query.search;

    // Construir filtros
    const where = {};
    if (estado) where.idestadoreserva = estado;
    if (fecha_desde) {
      where.fechareserva = where.fechareserva || {};
      where.fechareserva[db.sequelize?.Op?.gte || 'GTE'] = fecha_desde;
    }
    if (fecha_hasta) {
      where.fechareserva = where.fechareserva || {};
      where.fechareserva[db.sequelize?.Op?.lte || 'LTE'] = fecha_hasta;
    }

    // Incluir búsqueda por usuario o número de espacio
    if (search) {
      // Nota: Para búsqueda avanzada necesitaremos joins
      // Por ahora buscaremos solo en campos directos
      where[db.sequelize?.Op?.or || 'OR'] = [
        { observaciones: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } }
      ];
    }

    // Obtener reservas con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']]
    };

    const resultado = await reservaManager.findAndCountAll(options);
    const reservas = resultado.rows || resultado;
    const total = resultado.count || reservas.length;

    // Obtener datos para filtros
    const estadoReservaManager = db.getEstadoReservaManager();
    const zonaManager = db.getZonaManager();
    
    const [estadosReserva, zonas] = await Promise.all([
      estadoReservaManager.findAll(),
      zonaManager.findAll()
    ]);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('reservas/index', {
      title: 'Gestión de Reservas',
      reservas,
      estadosReserva,
      zonas,
      pagination,
      filters: { estado, zona, fecha_desde, fecha_hasta, search },
      currentPage: 'reservas'
    });

  } catch (error) {
    logger.error('Error listando reservas:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando reservas' }
    });
  }
});

/**
 * Mostrar formulario para crear reserva
 */
router.get('/crear', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    const usuarioManager = db.getUsuarioManager();
    const estadoReservaManager = db.getEstadoReservaManager();
    const responsableManager = db.getResponsableManager();

    const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
      espacioManager.findAll(),
      usuarioManager.findAll(),
      estadoReservaManager.findAll(),
      responsableManager.findAll()
    ]);

    res.render('reservas/crear', {
      title: 'Crear Reserva',
      espacios,
      usuarios,
      estadosReserva,
      responsables,
      currentPage: 'reservas'
    });

  } catch (error) {
    logger.error('Error mostrando formulario de creación:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando formulario' }
    });
  }
});

/**
 * Crear nueva reserva
 */
router.post('/crear', [
  body('idespacio')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un espacio válido'),
  body('idusuario')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un usuario válido'),
  body('idresponsable')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un responsable válido'),
  body('fechareserva')
    .isISO8601()
    .withMessage('Fecha de reserva inválida'),
  body('horainicio')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('horafin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de fin inválida (formato HH:MM)'),
  body('idestadoreserva')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un estado válido'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las observaciones no pueden exceder 500 caracteres')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const espacioManager = db.getEspacioManager();
      const usuarioManager = db.getUsuarioManager();
      const estadoReservaManager = db.getEstadoReservaManager();
      const responsableManager = db.getResponsableManager();

      const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
        espacioManager.findAll(),
        usuarioManager.findAll(),
        estadoReservaManager.findAll(),
        responsableManager.findAll()
      ]);

      return res.status(400).render('reservas/crear', {
        title: 'Crear Reserva',
        espacios,
        usuarios,
        estadosReserva,
        responsables,
        errors: errors.array(),
        formData: req.body,
        currentPage: 'reservas'
      });
    }

    // Validar que hora fin sea mayor a hora inicio
    if (req.body.horafin <= req.body.horainicio) {
      const db = req.db;
      const espacioManager = db.getEspacioManager();
      const usuarioManager = db.getUsuarioManager();
      const estadoReservaManager = db.getEstadoReservaManager();
      const responsableManager = db.getResponsableManager();

      const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
        espacioManager.findAll(),
        usuarioManager.findAll(),
        estadoReservaManager.findAll(),
        responsableManager.findAll()
      ]);

      return res.status(400).render('reservas/crear', {
        title: 'Crear Reserva',
        espacios,
        usuarios,
        estadosReserva,
        responsables,
        errors: [{ msg: 'La hora de fin debe ser posterior a la hora de inicio' }],
        formData: req.body,
        currentPage: 'reservas'
      });
    }

    const db = req.db;
    const reservaManager = db.getReservaManager();

    // Verificar disponibilidad del espacio
    const conflicto = await reservaManager.checkConflicts(
      req.body.idespacio,
      req.body.fechareserva,
      req.body.horainicio,
      req.body.horafin
    );

    if (conflicto) {
      const espacioManager = db.getEspacioManager();
      const usuarioManager = db.getUsuarioManager();
      const estadoReservaManager = db.getEstadoReservaManager();
      const responsableManager = db.getResponsableManager();

      const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
        espacioManager.findAll(),
        usuarioManager.findAll(),
        estadoReservaManager.findAll(),
        responsableManager.findAll()
      ]);

      return res.status(400).render('reservas/crear', {
        title: 'Crear Reserva',
        espacios,
        usuarios,
        estadosReserva,
        responsables,
        errors: [{ msg: 'El espacio no está disponible en el horario seleccionado' }],
        formData: req.body,
        currentPage: 'reservas'
      });
    }

    // Crear reserva
    const nuevaReserva = await reservaManager.create({
      idespacio: req.body.idespacio,
      idusuario: req.body.idusuario,
      idresponsable: req.body.idresponsable,
      fechareserva: req.body.fechareserva,
      horainicio: req.body.horainicio,
      horafin: req.body.horafin,
      idestadoreserva: req.body.idestadoreserva,
      observaciones: req.body.observaciones || null
    });

    logger.info('Reserva creada:', nuevaReserva);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Reserva creada exitosamente');
    
    res.redirect('/reservas');

  } catch (error) {
    logger.error('Error creando reserva:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando reserva' }
    });
  }
});

/**
 * Ver detalles de una reserva específica
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();

    const reserva = await reservaManager.findById(req.params.id);
    
    if (!reserva) {
      return res.status(404).render('error', {
        title: 'Reserva no encontrada',
        error: { status: 404, message: 'La reserva solicitada no existe' }
      });
    }

    // Obtener recursos asignados a la reserva
    const reservaRecursoManager = db.getReservaRecursoManager();
    const recursos = await reservaRecursoManager.findAll({
      where: { idreserva: req.params.id }
    });

    res.render('reservas/detalle', {
      title: `Reserva #${reserva.idreserva}`,
      reserva,
      recursos,
      currentPage: 'reservas'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles de la reserva:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles de la reserva' }
    });
  }
});

/**
 * Editar reserva
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();
    
    const reserva = await reservaManager.findById(req.params.id);
    
    if (!reserva) {
      return res.status(404).render('error', {
        title: 'Reserva no encontrada',
        error: { status: 404, message: 'La reserva solicitada no existe' }
      });
    }

    const espacioManager = db.getEspacioManager();
    const usuarioManager = db.getUsuarioManager();
    const estadoReservaManager = db.getEstadoReservaManager();
    const responsableManager = db.getResponsableManager();

    const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
      espacioManager.findAll(),
      usuarioManager.findAll(),
      estadoReservaManager.findAll(),
      responsableManager.findAll()
    ]);

    res.render('reservas/editar', {
      title: `Editar Reserva #${reserva.idreserva}`,
      reserva,
      espacios,
      usuarios,
      estadosReserva,
      responsables,
      currentPage: 'reservas'
    });

  } catch (error) {
    logger.error('Error mostrando formulario de edición:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando formulario de edición' }
    });
  }
});

/**
 * Actualizar reserva
 */
router.post('/:id/editar', [
  body('idespacio')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un espacio válido'),
  body('idusuario')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un usuario válido'),
  body('idresponsable')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un responsable válido'),
  body('fechareserva')
    .isISO8601()
    .withMessage('Fecha de reserva inválida'),
  body('horainicio')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('horafin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de fin inválida (formato HH:MM)'),
  body('idestadoreserva')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un estado válido'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las observaciones no pueden exceder 500 caracteres')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const reservaManager = db.getReservaManager();
      const reserva = await reservaManager.findById(req.params.id);
      
      const espacioManager = db.getEspacioManager();
      const usuarioManager = db.getUsuarioManager();
      const estadoReservaManager = db.getEstadoReservaManager();
      const responsableManager = db.getResponsableManager();

      const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
        espacioManager.findAll(),
        usuarioManager.findAll(),
        estadoReservaManager.findAll(),
        responsableManager.findAll()
      ]);

      return res.status(400).render('reservas/editar', {
        title: `Editar Reserva #${reserva.idreserva}`,
        reserva: { ...reserva, ...req.body },
        espacios,
        usuarios,
        estadosReserva,
        responsables,
        errors: errors.array(),
        currentPage: 'reservas'
      });
    }

    // Validar que hora fin sea mayor a hora inicio
    if (req.body.horafin <= req.body.horainicio) {
      const db = req.db;
      const reservaManager = db.getReservaManager();
      const reserva = await reservaManager.findById(req.params.id);
      
      const espacioManager = db.getEspacioManager();
      const usuarioManager = db.getUsuarioManager();
      const estadoReservaManager = db.getEstadoReservaManager();
      const responsableManager = db.getResponsableManager();

      const [espacios, usuarios, estadosReserva, responsables] = await Promise.all([
        espacioManager.findAll(),
        usuarioManager.findAll(),
        estadoReservaManager.findAll(),
        responsableManager.findAll()
      ]);

      return res.status(400).render('reservas/editar', {
        title: `Editar Reserva #${reserva.idreserva}`,
        reserva: { ...reserva, ...req.body },
        espacios,
        usuarios,
        estadosReserva,
        responsables,
        errors: [{ msg: 'La hora de fin debe ser posterior a la hora de inicio' }],
        currentPage: 'reservas'
      });
    }

    const db = req.db;
    const reservaManager = db.getReservaManager();

    // Actualizar reserva
    const reservaActualizada = await reservaManager.update(req.params.id, {
      idespacio: req.body.idespacio,
      idusuario: req.body.idusuario,
      idresponsable: req.body.idresponsable,
      fechareserva: req.body.fechareserva,
      horainicio: req.body.horainicio,
      horafin: req.body.horafin,
      idestadoreserva: req.body.idestadoreserva,
      observaciones: req.body.observaciones || null
    });

    if (!reservaActualizada) {
      return res.status(404).render('error', {
        title: 'Reserva no encontrada',
        error: { status: 404, message: 'La reserva solicitada no existe' }
      });
    }

    logger.info('Reserva actualizada:', reservaActualizada);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Reserva actualizada exitosamente');
    
    res.redirect(`/reservas/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando reserva:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando reserva' }
    });
  }
});

/**
 * Cambiar estado de reserva
 */
router.post('/:id/estado', [
  body('idestadoreserva')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un estado válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Estado inválido' 
      });
    }

    const db = req.db;
    const reservaManager = db.getReservaManager();

    const reservaActualizada = await reservaManager.update(req.params.id, {
      idestadoreserva: req.body.idestadoreserva
    });

    if (!reservaActualizada) {
      return res.status(404).json({ 
        error: 'Reserva no encontrada' 
      });
    }

    logger.info(`Estado de reserva ${req.params.id} actualizado a ${req.body.idestadoreserva}`);
    res.json({ 
      message: 'Estado actualizado exitosamente',
      reserva: reservaActualizada 
    });

  } catch (error) {
    logger.error('Error cambiando estado de reserva:', error);
    res.status(500).json({ error: 'Error cambiando estado de reserva' });
  }
});

/**
 * Eliminar reserva
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const reservaManager = db.getReservaManager();

    const eliminado = await reservaManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Reserva no encontrada' 
      });
    }

    logger.info(`Reserva ${req.params.id} eliminada`);
    res.json({ message: 'Reserva eliminada exitosamente' });

  } catch (error) {
    logger.error('Error eliminando reserva:', error);
    res.status(500).json({ error: 'Error eliminando reserva' });
  }
});

/**
 * API endpoint para verificar conflictos de horario
 */
router.post('/verificar-conflictos', [
  body('idespacio').isInt({ min: 1 }),
  body('fechareserva').isISO8601(),
  body('horainicio').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('horafin').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('idreserva').optional().isInt({ min: 1 }) // Para excluir la reserva actual en edición
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Parámetros inválidos',
        details: errors.array()
      });
    }

    const { idespacio, fechareserva, horainicio, horafin, idreserva } = req.body;

    const db = req.db;
    const reservaManager = db.getReservaManager();

    const conflicto = await reservaManager.checkConflicts(
      idespacio,
      fechareserva,
      horainicio,
      horafin,
      idreserva // Excluir esta reserva si se está editando
    );

    res.json({
      hayConflicto: conflicto,
      espacio_id: idespacio,
      fecha: fechareserva,
      horainicio,
      horafin
    });

  } catch (error) {
    logger.error('Error verificando conflictos:', error);
    res.status(500).json({ error: 'Error verificando conflictos' });
  }
});

module.exports = router;
