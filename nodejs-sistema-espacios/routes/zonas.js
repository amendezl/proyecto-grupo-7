const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todas las zonas
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const activo = req.query.activo;
    const search = req.query.search;

    // Construir filtros
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[db.sequelize?.Op?.or || 'OR'] = [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } },
        { descripcion: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } }
      ];
    }

    // Obtener zonas con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['nombre', 'ASC']]
    };

    const resultado = await zonaManager.findAndCountAll(options);
    const zonas = resultado.rows || resultado;
    const total = resultado.count || zonas.length;

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('zonas/index', {
      title: 'Gestión de Zonas',
      zonas,
      pagination,
      filters: { activo, search },
      currentPage: 'zonas'
    });

  } catch (error) {
    logger.error('Error listando zonas:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando zonas' }
    });
  }
});

/**
 * Mostrar formulario para crear zona
 */
router.get('/crear', async (req, res) => {
  try {
    res.render('zonas/crear', {
      title: 'Crear Zona',
      currentPage: 'zonas'
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
 * Crear nueva zona
 */
router.post('/crear', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('zonas/crear', {
        title: 'Crear Zona',
        errors: errors.array(),
        formData: req.body,
        currentPage: 'zonas'
      });
    }

    const db = req.db;
    const zonaManager = db.getZonaManager();

    // Verificar que el nombre no exista
    const zonaExistente = await zonaManager.findOne({
      nombre: req.body.nombre
    });

    if (zonaExistente) {
      return res.status(400).render('zonas/crear', {
        title: 'Crear Zona',
        errors: [{ msg: 'Ya existe una zona con ese nombre' }],
        formData: req.body,
        currentPage: 'zonas'
      });
    }

    // Crear zona
    const nuevaZona = await zonaManager.create({
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    logger.info('Zona creada:', nuevaZona);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Zona creada exitosamente');
    
    res.redirect('/zonas');

  } catch (error) {
    logger.error('Error creando zona:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando zona' }
    });
  }
});

/**
 * Ver detalles de una zona específica
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();
    const espacioManager = db.getEspacioManager();
    const zonaResponsableManager = db.getZonaResponsableManager();

    const zona = await zonaManager.findById(req.params.id);
    
    if (!zona) {
      return res.status(404).render('error', {
        title: 'Zona no encontrada',
        error: { status: 404, message: 'La zona solicitada no existe' }
      });
    }

    // Obtener espacios de la zona
    const espacios = await espacioManager.findAll({
      where: { idzona: req.params.id },
      order: [['numeroespacio', 'ASC']],
      limit: 50
    });

    // Obtener responsables asignados a la zona
    const responsables = await zonaResponsableManager.findAll({
      where: { idzona: req.params.id }
    });

    // Estadísticas de la zona
    const estadisticas = {
      totalEspacios: espacios.length,
      espaciosOcupados: espacios.filter(e => e.idestadoespacio === 2).length, // Asumiendo que 2 es ocupado
      espaciosDisponibles: espacios.filter(e => e.idestadoespacio === 1).length, // Asumiendo que 1 es disponible
      totalResponsables: responsables.length
    };

    res.render('zonas/detalle', {
      title: `Zona: ${zona.nombre}`,
      zona,
      espacios,
      responsables,
      estadisticas,
      currentPage: 'zonas'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles de la zona:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles de la zona' }
    });
  }
});

/**
 * Editar zona
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();
    
    const zona = await zonaManager.findById(req.params.id);
    
    if (!zona) {
      return res.status(404).render('error', {
        title: 'Zona no encontrada',
        error: { status: 404, message: 'La zona solicitada no existe' }
      });
    }

    res.render('zonas/editar', {
      title: `Editar Zona: ${zona.nombre}`,
      zona,
      currentPage: 'zonas'
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
 * Actualizar zona
 */
router.post('/:id/editar', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const zonaManager = db.getZonaManager();
      const zona = await zonaManager.findById(req.params.id);
      
      return res.status(400).render('zonas/editar', {
        title: `Editar Zona: ${zona.nombre}`,
        zona: { ...zona, ...req.body },
        errors: errors.array(),
        currentPage: 'zonas'
      });
    }

    const db = req.db;
    const zonaManager = db.getZonaManager();

    // Verificar que el nombre no exista en otra zona
    const zonaExistente = await zonaManager.findOne({
      nombre: req.body.nombre
    });

    if (zonaExistente && zonaExistente.idzona != req.params.id) {
      const zona = await zonaManager.findById(req.params.id);
      
      return res.status(400).render('zonas/editar', {
        title: `Editar Zona: ${zona.nombre}`,
        zona: { ...zona, ...req.body },
        errors: [{ msg: 'Ya existe otra zona con ese nombre' }],
        currentPage: 'zonas'
      });
    }

    // Actualizar zona
    const zonaActualizada = await zonaManager.update(req.params.id, {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    if (!zonaActualizada) {
      return res.status(404).render('error', {
        title: 'Zona no encontrada',
        error: { status: 404, message: 'La zona solicitada no existe' }
      });
    }

    logger.info('Zona actualizada:', zonaActualizada);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Zona actualizada exitosamente');
    
    res.redirect(`/zonas/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando zona:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando zona' }
    });
  }
});

/**
 * Activar/Desactivar zona
 */
router.post('/:id/toggle-estado', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();

    const zona = await zonaManager.findById(req.params.id);
    
    if (!zona) {
      return res.status(404).json({ 
        error: 'Zona no encontrada' 
      });
    }

    const zonaActualizada = await zonaManager.update(req.params.id, {
      activo: !zona.activo
    });

    logger.info(`Zona ${req.params.id} ${zona.activo ? 'desactivada' : 'activada'}`);
    res.json({ 
      message: `Zona ${zona.activo ? 'desactivada' : 'activada'} exitosamente`,
      zona: zonaActualizada 
    });

  } catch (error) {
    logger.error('Error cambiando estado de la zona:', error);
    res.status(500).json({ error: 'Error cambiando estado de la zona' });
  }
});

/**
 * Eliminar zona
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();
    const espacioManager = db.getEspacioManager();

    // Verificar si la zona tiene espacios
    const espaciosExistentes = await espacioManager.count({
      idzona: req.params.id
    });

    if (espaciosExistentes > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la zona porque tiene espacios asociados' 
      });
    }

    const eliminado = await zonaManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Zona no encontrada' 
      });
    }

    logger.info(`Zona ${req.params.id} eliminada`);
    res.json({ message: 'Zona eliminada exitosamente' });

  } catch (error) {
    logger.error('Error eliminando zona:', error);
    res.status(500).json({ error: 'Error eliminando zona' });
  }
});

/**
 * API endpoint para buscar zonas (para autocompletado)
 */
router.get('/api/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const db = req.db;
    const zonaManager = db.getZonaManager();

    const where = {
      activo: true,
      [db.sequelize?.Op?.or || 'OR']: [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } },
        { descripcion: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } }
      ]
    };

    const zonas = await zonaManager.findAll({
      where,
      limit: 10,
      order: [['nombre', 'ASC']]
    });

    const resultado = zonas.map(zona => ({
      id: zona.idzona,
      nombre: zona.nombre,
      descripcion: zona.descripcion,
      activo: zona.activo
    }));

    res.json(resultado);

  } catch (error) {
    logger.error('Error buscando zonas:', error);
    res.status(500).json({ error: 'Error buscando zonas' });
  }
});

/**
 * Obtener espacios de una zona
 */
router.get('/:id/espacios', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();

    const espacios = await espacioManager.findAll({
      where: { idzona: req.params.id },
      order: [['numeroespacio', 'ASC']]
    });

    res.json(espacios);

  } catch (error) {
    logger.error('Error obteniendo espacios de la zona:', error);
    res.status(500).json({ error: 'Error obteniendo espacios' });
  }
});

/**
 * Obtener responsables de una zona
 */
router.get('/:id/responsables', async (req, res) => {
  try {
    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    const responsables = await zonaResponsableManager.findAll({
      where: { idzona: req.params.id }
    });

    res.json(responsables);

  } catch (error) {
    logger.error('Error obteniendo responsables de la zona:', error);
    res.status(500).json({ error: 'Error obteniendo responsables' });
  }
});

/**
 * Asignar responsable a zona
 */
router.post('/:id/asignar-responsable', [
  body('idresponsable')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un responsable válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Responsable inválido',
        details: errors.array()
      });
    }

    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    // Verificar si ya existe la asignación
    const asignacionExistente = await zonaResponsableManager.findOne({
      idzona: req.params.id,
      idresponsable: req.body.idresponsable
    });

    if (asignacionExistente) {
      return res.status(400).json({ 
        error: 'El responsable ya está asignado a esta zona' 
      });
    }

    // Crear asignación
    const nuevaAsignacion = await zonaResponsableManager.create({
      idzona: req.params.id,
      idresponsable: req.body.idresponsable
    });

    logger.info('Responsable asignado a zona:', nuevaAsignacion);
    res.json({ 
      message: 'Responsable asignado a zona exitosamente',
      asignacion: nuevaAsignacion 
    });

  } catch (error) {
    logger.error('Error asignando responsable a zona:', error);
    res.status(500).json({ error: 'Error asignando responsable a zona' });
  }
});

/**
 * Remover responsable de zona
 */
router.delete('/:id/responsable/:responsable_id', async (req, res) => {
  try {
    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    const eliminado = await zonaResponsableManager.delete({
      idzona: req.params.id,
      idresponsable: req.params.responsable_id
    });

    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Asignación no encontrada' 
      });
    }

    logger.info(`Responsable ${req.params.responsable_id} removido de zona ${req.params.id}`);
    res.json({ message: 'Responsable removido de zona exitosamente' });

  } catch (error) {
    logger.error('Error removiendo responsable de zona:', error);
    res.status(500).json({ error: 'Error removiendo responsable de zona' });
  }
});

/**
 * Obtener estadísticas de ocupación de zona
 */
router.get('/:id/estadisticas', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    const reservaManager = db.getReservaManager();

    // Obtener espacios de la zona
    const espacios = await espacioManager.findAll({
      where: { idzona: req.params.id }
    });

    const espacioIds = espacios.map(e => e.idespacio);

    if (espacioIds.length === 0) {
      return res.json({
        totalEspacios: 0,
        reservasTotal: 0,
        ocupacionPromedio: 0,
        espacioMasOcupado: null
      });
    }

    // Filtros de fecha
    const whereReserva = {
      idespacio: { [db.sequelize?.Op?.in || 'IN']: espacioIds }
    };

    if (fecha_desde) {
      whereReserva.fechareserva = whereReserva.fechareserva || {};
      whereReserva.fechareserva[db.sequelize?.Op?.gte || 'GTE'] = fecha_desde;
    }

    if (fecha_hasta) {
      whereReserva.fechareserva = whereReserva.fechareserva || {};
      whereReserva.fechareserva[db.sequelize?.Op?.lte || 'LTE'] = fecha_hasta;
    }

    // Obtener reservas
    const reservas = await reservaManager.findAll({
      where: whereReserva
    });

    // Calcular estadísticas
    const reservasPorEspacio = {};
    espacioIds.forEach(id => { reservasPorEspacio[id] = 0; });
    
    reservas.forEach(reserva => {
      reservasPorEspacio[reserva.idespacio]++;
    });

    const espacioMasOcupado = Object.keys(reservasPorEspacio).reduce((a, b) => 
      reservasPorEspacio[a] > reservasPorEspacio[b] ? a : b
    );

    res.json({
      totalEspacios: espacios.length,
      reservasTotal: reservas.length,
      ocupacionPromedio: reservas.length / espacios.length,
      espacioMasOcupado: espacioMasOcupado ? {
        idespacio: espacioMasOcupado,
        reservas: reservasPorEspacio[espacioMasOcupado]
      } : null,
      reservasPorEspacio
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de la zona:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
