const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todos los responsables
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const responsableManager = db.getResponsableManager();
    
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
        { email: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } },
        { telefono: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } }
      ];
    }

    // Obtener responsables con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['nombre', 'ASC']]
    };

    const resultado = await responsableManager.findAndCountAll(options);
    const responsables = resultado.rows || resultado;
    const total = resultado.count || responsables.length;

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('responsables/index', {
      title: 'Gestión de Responsables',
      responsables,
      pagination,
      filters: { activo, search },
      currentPage: 'responsables'
    });

  } catch (error) {
    logger.error('Error listando responsables:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando responsables' }
    });
  }
});

/**
 * Mostrar formulario para crear responsable
 */
router.get('/crear', async (req, res) => {
  try {
    res.render('responsables/crear', {
      title: 'Crear Responsable',
      currentPage: 'responsables'
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
 * Crear nuevo responsable
 */
router.post('/crear', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido'),
  body('telefono')
    .optional()
    .isMobilePhone('any')
    .withMessage('Debe proporcionar un teléfono válido'),
  body('cargo')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El cargo no puede exceder 100 caracteres'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('responsables/crear', {
        title: 'Crear Responsable',
        errors: errors.array(),
        formData: req.body,
        currentPage: 'responsables'
      });
    }

    const db = req.db;
    const responsableManager = db.getResponsableManager();

    // Verificar que el email no exista
    const responsableExistente = await responsableManager.findOne({
      email: req.body.email
    });

    if (responsableExistente) {
      return res.status(400).render('responsables/crear', {
        title: 'Crear Responsable',
        errors: [{ msg: 'Ya existe un responsable con ese email' }],
        formData: req.body,
        currentPage: 'responsables'
      });
    }

    // Crear responsable
    const nuevoResponsable = await responsableManager.create({
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono || null,
      cargo: req.body.cargo || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    logger.info('Responsable creado:', nuevoResponsable);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Responsable creado exitosamente');
    
    res.redirect('/responsables');

  } catch (error) {
    logger.error('Error creando responsable:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando responsable' }
    });
  }
});

/**
 * Ver detalles de un responsable específico
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const responsableManager = db.getResponsableManager();
    const reservaManager = db.getReservaManager();

    const responsable = await responsableManager.findById(req.params.id);
    
    if (!responsable) {
      return res.status(404).render('error', {
        title: 'Responsable no encontrado',
        error: { status: 404, message: 'El responsable solicitado no existe' }
      });
    }

    // Obtener reservas supervisadas por este responsable
    const reservas = await reservaManager.findAll({
      where: { idresponsable: req.params.id },
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']],
      limit: 20
    });

    // Estadísticas del responsable
    const estadisticas = {
      totalReservas: reservas.length,
      reservasActivas: reservas.filter(r => r.idestadoreserva === 1).length, // Asumiendo que 1 es activa
      reservasCanceladas: reservas.filter(r => r.idestadoreserva === 3).length // Asumiendo que 3 es cancelada
    };

    res.render('responsables/detalle', {
      title: `Responsable: ${responsable.nombre}`,
      responsable,
      reservas,
      estadisticas,
      currentPage: 'responsables'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles del responsable:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles del responsable' }
    });
  }
});

/**
 * Editar responsable
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const responsableManager = db.getResponsableManager();
    
    const responsable = await responsableManager.findById(req.params.id);
    
    if (!responsable) {
      return res.status(404).render('error', {
        title: 'Responsable no encontrado',
        error: { status: 404, message: 'El responsable solicitado no existe' }
      });
    }

    res.render('responsables/editar', {
      title: `Editar Responsable: ${responsable.nombre}`,
      responsable,
      currentPage: 'responsables'
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
 * Actualizar responsable
 */
router.post('/:id/editar', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido'),
  body('telefono')
    .optional()
    .isMobilePhone('any')
    .withMessage('Debe proporcionar un teléfono válido'),
  body('cargo')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El cargo no puede exceder 100 caracteres'),
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
      const responsableManager = db.getResponsableManager();
      const responsable = await responsableManager.findById(req.params.id);
      
      return res.status(400).render('responsables/editar', {
        title: `Editar Responsable: ${responsable.nombre}`,
        responsable: { ...responsable, ...req.body },
        errors: errors.array(),
        currentPage: 'responsables'
      });
    }

    const db = req.db;
    const responsableManager = db.getResponsableManager();

    // Verificar que el email no exista en otro responsable
    const responsableExistente = await responsableManager.findOne({
      email: req.body.email
    });

    if (responsableExistente && responsableExistente.idresponsable != req.params.id) {
      const responsable = await responsableManager.findById(req.params.id);
      
      return res.status(400).render('responsables/editar', {
        title: `Editar Responsable: ${responsable.nombre}`,
        responsable: { ...responsable, ...req.body },
        errors: [{ msg: 'Ya existe otro responsable con ese email' }],
        currentPage: 'responsables'
      });
    }

    // Actualizar responsable
    const responsableActualizado = await responsableManager.update(req.params.id, {
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono || null,
      cargo: req.body.cargo || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    if (!responsableActualizado) {
      return res.status(404).render('error', {
        title: 'Responsable no encontrado',
        error: { status: 404, message: 'El responsable solicitado no existe' }
      });
    }

    logger.info('Responsable actualizado:', responsableActualizado);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Responsable actualizado exitosamente');
    
    res.redirect(`/responsables/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando responsable:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando responsable' }
    });
  }
});

/**
 * Activar/Desactivar responsable
 */
router.post('/:id/toggle-estado', async (req, res) => {
  try {
    const db = req.db;
    const responsableManager = db.getResponsableManager();

    const responsable = await responsableManager.findById(req.params.id);
    
    if (!responsable) {
      return res.status(404).json({ 
        error: 'Responsable no encontrado' 
      });
    }

    const responsableActualizado = await responsableManager.update(req.params.id, {
      activo: !responsable.activo
    });

    logger.info(`Responsable ${req.params.id} ${responsable.activo ? 'desactivado' : 'activado'}`);
    res.json({ 
      message: `Responsable ${responsable.activo ? 'desactivado' : 'activado'} exitosamente`,
      responsable: responsableActualizado 
    });

  } catch (error) {
    logger.error('Error cambiando estado del responsable:', error);
    res.status(500).json({ error: 'Error cambiando estado del responsable' });
  }
});

/**
 * Eliminar responsable
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const responsableManager = db.getResponsableManager();
    const reservaManager = db.getReservaManager();

    // Verificar si el responsable tiene reservas
    const reservasExistentes = await reservaManager.count({
      idresponsable: req.params.id
    });

    if (reservasExistentes > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el responsable porque tiene reservas asociadas' 
      });
    }

    const eliminado = await responsableManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Responsable no encontrado' 
      });
    }

    logger.info(`Responsable ${req.params.id} eliminado`);
    res.json({ message: 'Responsable eliminado exitosamente' });

  } catch (error) {
    logger.error('Error eliminando responsable:', error);
    res.status(500).json({ error: 'Error eliminando responsable' });
  }
});

/**
 * API endpoint para buscar responsables (para autocompletado)
 */
router.get('/api/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const db = req.db;
    const responsableManager = db.getResponsableManager();

    const where = {
      activo: true,
      [db.sequelize?.Op?.or || 'OR']: [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } },
        { email: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } },
        { cargo: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } }
      ]
    };

    const responsables = await responsableManager.findAll({
      where,
      limit: 10,
      order: [['nombre', 'ASC']]
    });

    const resultado = responsables.map(responsable => ({
      id: responsable.idresponsable,
      nombre: responsable.nombre,
      email: responsable.email,
      telefono: responsable.telefono,
      cargo: responsable.cargo
    }));

    res.json(resultado);

  } catch (error) {
    logger.error('Error buscando responsables:', error);
    res.status(500).json({ error: 'Error buscando responsables' });
  }
});

/**
 * Asignar responsable a zona
 */
router.post('/:id/asignar-zona', [
  body('idzona')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar una zona válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Zona inválida',
        details: errors.array()
      });
    }

    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    // Verificar si ya existe la asignación
    const asignacionExistente = await zonaResponsableManager.findOne({
      idresponsable: req.params.id,
      idzona: req.body.idzona
    });

    if (asignacionExistente) {
      return res.status(400).json({ 
        error: 'El responsable ya está asignado a esta zona' 
      });
    }

    // Crear asignación
    const nuevaAsignacion = await zonaResponsableManager.create({
      idresponsable: req.params.id,
      idzona: req.body.idzona
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
 * Obtener zonas asignadas a un responsable
 */
router.get('/:id/zonas', async (req, res) => {
  try {
    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    const zonasAsignadas = await zonaResponsableManager.findAll({
      where: { idresponsable: req.params.id }
    });

    res.json(zonasAsignadas);

  } catch (error) {
    logger.error('Error obteniendo zonas del responsable:', error);
    res.status(500).json({ error: 'Error obteniendo zonas' });
  }
});

/**
 * Remover responsable de zona
 */
router.delete('/:id/zona/:zona_id', async (req, res) => {
  try {
    const db = req.db;
    const zonaResponsableManager = db.getZonaResponsableManager();

    const eliminado = await zonaResponsableManager.delete({
      idresponsable: req.params.id,
      idzona: req.params.zona_id
    });

    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Asignación no encontrada' 
      });
    }

    logger.info(`Responsable ${req.params.id} removido de zona ${req.params.zona_id}`);
    res.json({ message: 'Responsable removido de zona exitosamente' });

  } catch (error) {
    logger.error('Error removiendo responsable de zona:', error);
    res.status(500).json({ error: 'Error removiendo responsable de zona' });
  }
});

module.exports = router;
