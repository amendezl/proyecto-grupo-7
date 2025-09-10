const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todos los espacios
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const zona = req.query.zona;
    const estado = req.query.estado;
    const search = req.query.search;

    // Construir filtros
    const where = {};
    if (zona) where.idzona = zona;
    if (estado) where.idestadoespacio = estado;
    if (search) {
      where[db.sequelize?.Op?.or || 'OR'] = [
        { numeroespacio: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } },
        { tipoactividadespacio: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } }
      ];
    }

    // Obtener espacios con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['numeroespacio', 'ASC']]
    };

    const resultado = await espacioManager.findAndCountAll(options);
    const espacios = resultado.rows || resultado;
    const total = resultado.count || espacios.length;

    // Obtener datos para filtros
    const zonaManager = db.getZonaManager();
    const estadoEspacioManager = db.getEstadoEspacioManager();
    
    const [zonas, estadosEspacio] = await Promise.all([
      zonaManager.findAll(),
      estadoEspacioManager.findAll()
    ]);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('espacios/index', {
      title: 'Gestión de Espacios',
      espacios,
      zonas,
      estadosEspacio,
      pagination,
      filters: { zona, estado, search },
      currentPage: 'espacios'
    });

  } catch (error) {
    logger.error('Error listando espacios:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando espacios' }
    });
  }
});

/**
 * Mostrar formulario para crear espacio
 */
router.get('/crear', async (req, res) => {
  try {
    const db = req.db;
    const zonaManager = db.getZonaManager();
    const estadoEspacioManager = db.getEstadoEspacioManager();
    const tipoActividadManager = db.getTipoActividadManager();

    const [zonas, estadosEspacio, tiposActividad] = await Promise.all([
      zonaManager.findAll(),
      estadoEspacioManager.findAll(),
      tipoActividadManager.findAll()
    ]);

    res.render('espacios/crear', {
      title: 'Crear Espacio',
      zonas,
      estadosEspacio,
      tiposActividad,
      currentPage: 'espacios'
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
 * Crear nuevo espacio
 */
router.post('/crear', [
  body('numeroespacio')
    .isInt({ min: 1 })
    .withMessage('El número de espacio debe ser un entero positivo'),
  body('idzona')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar una zona válida'),
  body('idestadoespacio')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un estado válido'),
  body('tipoactividadespacio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El tipo de actividad no puede exceder 100 caracteres')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const zonaManager = db.getZonaManager();
      const estadoEspacioManager = db.getEstadoEspacioManager();
      const tipoActividadManager = db.getTipoActividadManager();

      const [zonas, estadosEspacio, tiposActividad] = await Promise.all([
        zonaManager.findAll(),
        estadoEspacioManager.findAll(),
        tipoActividadManager.findAll()
      ]);

      return res.status(400).render('espacios/crear', {
        title: 'Crear Espacio',
        zonas,
        estadosEspacio,
        tiposActividad,
        errors: errors.array(),
        formData: req.body,
        currentPage: 'espacios'
      });
    }

    const db = req.db;
    const espacioManager = db.getEspacioManager();

    // Verificar que el número de espacio no exista en la zona
    const espacioExistente = await espacioManager.findOne({
      numeroespacio: req.body.numeroespacio,
      idzona: req.body.idzona
    });

    if (espacioExistente) {
      const zonaManager = db.getZonaManager();
      const estadoEspacioManager = db.getEstadoEspacioManager();
      const tipoActividadManager = db.getTipoActividadManager();

      const [zonas, estadosEspacio, tiposActividad] = await Promise.all([
        zonaManager.findAll(),
        estadoEspacioManager.findAll(),
        tipoActividadManager.findAll()
      ]);

      return res.status(400).render('espacios/crear', {
        title: 'Crear Espacio',
        zonas,
        estadosEspacio,
        tiposActividad,
        errors: [{ msg: 'Ya existe un espacio con ese número en la zona seleccionada' }],
        formData: req.body,
        currentPage: 'espacios'
      });
    }

    // Crear espacio
    const nuevoEspacio = await espacioManager.create({
      numeroespacio: req.body.numeroespacio,
      idzona: req.body.idzona,
      idestadoespacio: req.body.idestadoespacio,
      tipoactividadespacio: req.body.tipoactividadespacio || null
    });

    logger.info('Espacio creado:', nuevoEspacio);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Espacio creado exitosamente');
    
    res.redirect('/espacios');

  } catch (error) {
    logger.error('Error creando espacio:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando espacio' }
    });
  }
});

/**
 * Ver detalles de un espacio específico
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    const reservaManager = db.getReservaManager();

    const espacio = await espacioManager.findById(req.params.id);
    
    if (!espacio) {
      return res.status(404).render('error', {
        title: 'Espacio no encontrado',
        error: { status: 404, message: 'El espacio solicitado no existe' }
      });
    }

    // Obtener reservas del espacio
    const reservas = await reservaManager.findAll({
      where: { idespacio: req.params.id },
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']],
      limit: 20
    });

    // Obtener recursos del espacio
    const espacioRecursoManager = db.getEspacioRecursoManager();
    const recursos = await espacioRecursoManager.findAll({
      where: { idespacio: req.params.id }
    });

    res.render('espacios/detalle', {
      title: `Espacio ${espacio.numeroespacio}`,
      espacio,
      reservas,
      recursos,
      currentPage: 'espacios'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles del espacio:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles del espacio' }
    });
  }
});

/**
 * API endpoint para verificar disponibilidad
 */
router.get('/:id/disponibilidad', async (req, res) => {
  try {
    const { fecha, horainicio, horafin } = req.query;
    
    if (!fecha || !horainicio || !horafin) {
      return res.status(400).json({ 
        error: 'Faltan parámetros: fecha, horainicio, horafin' 
      });
    }

    const db = req.db;
    const reservaManager = db.getReservaManager();

    const conflictos = await reservaManager.checkConflicts(
      req.params.id, 
      fecha, 
      horainicio, 
      horafin
    );

    res.json({
      disponible: !conflictos,
      espacio_id: req.params.id,
      fecha,
      horainicio,
      horafin
    });

  } catch (error) {
    logger.error('Error verificando disponibilidad:', error);
    res.status(500).json({ error: 'Error verificando disponibilidad' });
  }
});

/**
 * Editar espacio
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    
    const espacio = await espacioManager.findById(req.params.id);
    
    if (!espacio) {
      return res.status(404).render('error', {
        title: 'Espacio no encontrado',
        error: { status: 404, message: 'El espacio solicitado no existe' }
      });
    }

    const zonaManager = db.getZonaManager();
    const estadoEspacioManager = db.getEstadoEspacioManager();
    const tipoActividadManager = db.getTipoActividadManager();

    const [zonas, estadosEspacio, tiposActividad] = await Promise.all([
      zonaManager.findAll(),
      estadoEspacioManager.findAll(),
      tipoActividadManager.findAll()
    ]);

    res.render('espacios/editar', {
      title: `Editar Espacio ${espacio.numeroespacio}`,
      espacio,
      zonas,
      estadosEspacio,
      tiposActividad,
      currentPage: 'espacios'
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
 * Actualizar espacio
 */
router.post('/:id/editar', [
  body('numeroespacio')
    .isInt({ min: 1 })
    .withMessage('El número de espacio debe ser un entero positivo'),
  body('idzona')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar una zona válida'),
  body('idestadoespacio')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un estado válido'),
  body('tipoactividadespacio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El tipo de actividad no puede exceder 100 caracteres')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const espacioManager = db.getEspacioManager();
      const espacio = await espacioManager.findById(req.params.id);
      
      const zonaManager = db.getZonaManager();
      const estadoEspacioManager = db.getEstadoEspacioManager();
      const tipoActividadManager = db.getTipoActividadManager();

      const [zonas, estadosEspacio, tiposActividad] = await Promise.all([
        zonaManager.findAll(),
        estadoEspacioManager.findAll(),
        tipoActividadManager.findAll()
      ]);

      return res.status(400).render('espacios/editar', {
        title: `Editar Espacio ${espacio.numeroespacio}`,
        espacio: { ...espacio, ...req.body },
        zonas,
        estadosEspacio,
        tiposActividad,
        errors: errors.array(),
        currentPage: 'espacios'
      });
    }

    const db = req.db;
    const espacioManager = db.getEspacioManager();

    // Actualizar espacio
    const espacioActualizado = await espacioManager.update(req.params.id, {
      numeroespacio: req.body.numeroespacio,
      idzona: req.body.idzona,
      idestadoespacio: req.body.idestadoespacio,
      tipoactividadespacio: req.body.tipoactividadespacio || null
    });

    if (!espacioActualizado) {
      return res.status(404).render('error', {
        title: 'Espacio no encontrado',
        error: { status: 404, message: 'El espacio solicitado no existe' }
      });
    }

    logger.info('Espacio actualizado:', espacioActualizado);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Espacio actualizado exitosamente');
    
    res.redirect(`/espacios/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando espacio:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando espacio' }
    });
  }
});

/**
 * Eliminar espacio
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const espacioManager = db.getEspacioManager();
    const reservaManager = db.getReservaManager();

    // Verificar si el espacio tiene reservas
    const reservasExistentes = await reservaManager.count({
      idespacio: req.params.id
    });

    if (reservasExistentes > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el espacio porque tiene reservas asociadas' 
      });
    }

    const eliminado = await espacioManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Espacio no encontrado' 
      });
    }

    logger.info(`Espacio ${req.params.id} eliminado`);
    res.json({ message: 'Espacio eliminado exitosamente' });

  } catch (error) {
    logger.error('Error eliminando espacio:', error);
    res.status(500).json({ error: 'Error eliminando espacio' });
  }
});

module.exports = router;
