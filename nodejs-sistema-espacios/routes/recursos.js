const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todos los recursos
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tipo = req.query.tipo;
    const disponible = req.query.disponible;
    const search = req.query.search;

    // Construir filtros
    const where = {};
    if (tipo) where.tiporecurso = tipo;
    if (disponible !== undefined) where.disponible = disponible === 'true';
    if (search) {
      where[db.sequelize?.Op?.or || 'OR'] = [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } },
        { descripcion: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } },
        { tiporecurso: { [db.sequelize?.Op?.like || 'LIKE']: `%${search}%` } }
      ];
    }

    // Obtener recursos con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['nombre', 'ASC']]
    };

    const resultado = await recursoManager.findAndCountAll(options);
    const recursos = resultado.rows || resultado;
    const total = resultado.count || recursos.length;

    // Obtener tipos de recursos únicos para el filtro
    const tiposRecursos = await recursoManager.getDistinctValues('tiporecurso');

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('recursos/index', {
      title: 'Gestión de Recursos',
      recursos,
      tiposRecursos,
      pagination,
      filters: { tipo, disponible, search },
      currentPage: 'recursos'
    });

  } catch (error) {
    logger.error('Error listando recursos:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando recursos' }
    });
  }
});

/**
 * Mostrar formulario para crear recurso
 */
router.get('/crear', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    
    // Obtener tipos de recursos existentes para sugerir
    const tiposRecursos = await recursoManager.getDistinctValues('tiporecurso');

    res.render('recursos/crear', {
      title: 'Crear Recurso',
      tiposRecursos,
      currentPage: 'recursos'
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
 * Crear nuevo recurso
 */
router.post('/crear', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('tiporecurso')
    .isLength({ min: 2, max: 50 })
    .withMessage('El tipo de recurso debe tener entre 2 y 50 caracteres'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('disponible')
    .optional()
    .isBoolean()
    .withMessage('El estado disponible debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const recursoManager = db.getRecursoManager();
      const tiposRecursos = await recursoManager.getDistinctValues('tiporecurso');
      
      return res.status(400).render('recursos/crear', {
        title: 'Crear Recurso',
        tiposRecursos,
        errors: errors.array(),
        formData: req.body,
        currentPage: 'recursos'
      });
    }

    const db = req.db;
    const recursoManager = db.getRecursoManager();

    // Crear recurso
    const nuevoRecurso = await recursoManager.create({
      nombre: req.body.nombre,
      tiporecurso: req.body.tiporecurso,
      descripcion: req.body.descripcion || null,
      cantidad: req.body.cantidad,
      disponible: req.body.disponible !== undefined ? req.body.disponible : true
    });

    logger.info('Recurso creado:', nuevoRecurso);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Recurso creado exitosamente');
    
    res.redirect('/recursos');

  } catch (error) {
    logger.error('Error creando recurso:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando recurso' }
    });
  }
});

/**
 * Ver detalles de un recurso específico
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    const espacioRecursoManager = db.getEspacioRecursoManager();
    const reservaRecursoManager = db.getReservaRecursoManager();

    const recurso = await recursoManager.findById(req.params.id);
    
    if (!recurso) {
      return res.status(404).render('error', {
        title: 'Recurso no encontrado',
        error: { status: 404, message: 'El recurso solicitado no existe' }
      });
    }

    // Obtener espacios que tienen este recurso
    const espaciosConRecurso = await espacioRecursoManager.findAll({
      where: { idrecurso: req.params.id },
      limit: 20
    });

    // Obtener reservas que usan este recurso
    const reservasConRecurso = await reservaRecursoManager.findAll({
      where: { idrecurso: req.params.id },
      order: [['fechareserva', 'DESC']],
      limit: 20
    });

    // Estadísticas del recurso
    const estadisticas = {
      totalEspacios: espaciosConRecurso.length,
      totalReservas: reservasConRecurso.length,
      cantidadDisponible: recurso.cantidad - espaciosConRecurso.reduce((sum, er) => sum + er.cantidad, 0)
    };

    res.render('recursos/detalle', {
      title: `Recurso: ${recurso.nombre}`,
      recurso,
      espaciosConRecurso,
      reservasConRecurso,
      estadisticas,
      currentPage: 'recursos'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles del recurso:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles del recurso' }
    });
  }
});

/**
 * Editar recurso
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    
    const recurso = await recursoManager.findById(req.params.id);
    
    if (!recurso) {
      return res.status(404).render('error', {
        title: 'Recurso no encontrado',
        error: { status: 404, message: 'El recurso solicitado no existe' }
      });
    }

    const tiposRecursos = await recursoManager.getDistinctValues('tiporecurso');

    res.render('recursos/editar', {
      title: `Editar Recurso: ${recurso.nombre}`,
      recurso,
      tiposRecursos,
      currentPage: 'recursos'
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
 * Actualizar recurso
 */
router.post('/:id/editar', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('tiporecurso')
    .isLength({ min: 2, max: 50 })
    .withMessage('El tipo de recurso debe tener entre 2 y 50 caracteres'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('disponible')
    .optional()
    .isBoolean()
    .withMessage('El estado disponible debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = req.db;
      const recursoManager = db.getRecursoManager();
      const recurso = await recursoManager.findById(req.params.id);
      const tiposRecursos = await recursoManager.getDistinctValues('tiporecurso');
      
      return res.status(400).render('recursos/editar', {
        title: `Editar Recurso: ${recurso.nombre}`,
        recurso: { ...recurso, ...req.body },
        tiposRecursos,
        errors: errors.array(),
        currentPage: 'recursos'
      });
    }

    const db = req.db;
    const recursoManager = db.getRecursoManager();

    // Actualizar recurso
    const recursoActualizado = await recursoManager.update(req.params.id, {
      nombre: req.body.nombre,
      tiporecurso: req.body.tiporecurso,
      descripcion: req.body.descripcion || null,
      cantidad: req.body.cantidad,
      disponible: req.body.disponible !== undefined ? req.body.disponible : true
    });

    if (!recursoActualizado) {
      return res.status(404).render('error', {
        title: 'Recurso no encontrado',
        error: { status: 404, message: 'El recurso solicitado no existe' }
      });
    }

    logger.info('Recurso actualizado:', recursoActualizado);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Recurso actualizado exitosamente');
    
    res.redirect(`/recursos/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando recurso:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando recurso' }
    });
  }
});

/**
 * Activar/Desactivar recurso
 */
router.post('/:id/toggle-disponibilidad', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();

    const recurso = await recursoManager.findById(req.params.id);
    
    if (!recurso) {
      return res.status(404).json({ 
        error: 'Recurso no encontrado' 
      });
    }

    const recursoActualizado = await recursoManager.update(req.params.id, {
      disponible: !recurso.disponible
    });

    logger.info(`Recurso ${req.params.id} ${recurso.disponible ? 'desactivado' : 'activado'}`);
    res.json({ 
      message: `Recurso ${recurso.disponible ? 'desactivado' : 'activado'} exitosamente`,
      recurso: recursoActualizado 
    });

  } catch (error) {
    logger.error('Error cambiando disponibilidad del recurso:', error);
    res.status(500).json({ error: 'Error cambiando disponibilidad del recurso' });
  }
});

/**
 * Eliminar recurso
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    const espacioRecursoManager = db.getEspacioRecursoManager();
    const reservaRecursoManager = db.getReservaRecursoManager();

    // Verificar si el recurso está siendo usado
    const [espaciosConRecurso, reservasConRecurso] = await Promise.all([
      espacioRecursoManager.count({ idrecurso: req.params.id }),
      reservaRecursoManager.count({ idrecurso: req.params.id })
    ]);

    if (espaciosConRecurso > 0 || reservasConRecurso > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el recurso porque está siendo utilizado en espacios o reservas' 
      });
    }

    const eliminado = await recursoManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Recurso no encontrado' 
      });
    }

    logger.info(`Recurso ${req.params.id} eliminado`);
    res.json({ message: 'Recurso eliminado exitosamente' });

  } catch (error) {
    logger.error('Error eliminando recurso:', error);
    res.status(500).json({ error: 'Error eliminando recurso' });
  }
});

/**
 * API endpoint para buscar recursos (para autocompletado)
 */
router.get('/api/buscar', async (req, res) => {
  try {
    const { q, tipo } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const db = req.db;
    const recursoManager = db.getRecursoManager();

    const where = {
      disponible: true,
      [db.sequelize?.Op?.or || 'OR']: [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } },
        { descripcion: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } }
      ]
    };

    if (tipo) {
      where.tiporecurso = tipo;
    }

    const recursos = await recursoManager.findAll({
      where,
      limit: 10,
      order: [['nombre', 'ASC']]
    });

    const resultado = recursos.map(recurso => ({
      id: recurso.idrecurso,
      nombre: recurso.nombre,
      tipo: recurso.tiporecurso,
      descripcion: recurso.descripcion,
      cantidad: recurso.cantidad,
      disponible: recurso.disponible
    }));

    res.json(resultado);

  } catch (error) {
    logger.error('Error buscando recursos:', error);
    res.status(500).json({ error: 'Error buscando recursos' });
  }
});

/**
 * Asignar recurso a espacio
 */
router.post('/:id/asignar-espacio', [
  body('idespacio')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un espacio válido'),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const db = req.db;
    const espacioRecursoManager = db.getEspacioRecursoManager();
    const recursoManager = db.getRecursoManager();

    // Verificar cantidad disponible
    const recurso = await recursoManager.findById(req.params.id);
    if (!recurso) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    // Verificar si ya existe la asignación
    const asignacionExistente = await espacioRecursoManager.findOne({
      idrecurso: req.params.id,
      idespacio: req.body.idespacio
    });

    if (asignacionExistente) {
      // Actualizar cantidad
      const asignacionActualizada = await espacioRecursoManager.update(asignacionExistente.id, {
        cantidad: req.body.cantidad
      });

      return res.json({ 
        message: 'Cantidad actualizada exitosamente',
        asignacion: asignacionActualizada 
      });
    }

    // Crear nueva asignación
    const nuevaAsignacion = await espacioRecursoManager.create({
      idrecurso: req.params.id,
      idespacio: req.body.idespacio,
      cantidad: req.body.cantidad
    });

    logger.info('Recurso asignado a espacio:', nuevaAsignacion);
    res.json({ 
      message: 'Recurso asignado a espacio exitosamente',
      asignacion: nuevaAsignacion 
    });

  } catch (error) {
    logger.error('Error asignando recurso a espacio:', error);
    res.status(500).json({ error: 'Error asignando recurso a espacio' });
  }
});

/**
 * Obtener disponibilidad de recurso
 */
router.get('/:id/disponibilidad', async (req, res) => {
  try {
    const { fecha } = req.query;
    
    const db = req.db;
    const recursoManager = db.getRecursoManager();
    const espacioRecursoManager = db.getEspacioRecursoManager();
    const reservaRecursoManager = db.getReservaRecursoManager();

    const recurso = await recursoManager.findById(req.params.id);
    if (!recurso) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    // Cantidad asignada a espacios
    const asignacionesEspacios = await espacioRecursoManager.findAll({
      where: { idrecurso: req.params.id }
    });
    const cantidadEnEspacios = asignacionesEspacios.reduce((sum, asignacion) => sum + asignacion.cantidad, 0);

    // Cantidad reservada para una fecha específica
    let cantidadReservada = 0;
    if (fecha) {
      const reservasDelDia = await reservaRecursoManager.findAll({
        where: { 
          idrecurso: req.params.id,
          fechareserva: fecha 
        }
      });
      cantidadReservada = reservasDelDia.reduce((sum, reserva) => sum + reserva.cantidad, 0);
    }

    const disponible = recurso.cantidad - cantidadEnEspacios - cantidadReservada;

    res.json({
      recurso_id: req.params.id,
      cantidad_total: recurso.cantidad,
      cantidad_en_espacios: cantidadEnEspacios,
      cantidad_reservada: cantidadReservada,
      cantidad_disponible: Math.max(0, disponible),
      fecha: fecha || null
    });

  } catch (error) {
    logger.error('Error verificando disponibilidad del recurso:', error);
    res.status(500).json({ error: 'Error verificando disponibilidad del recurso' });
  }
});

/**
 * Obtener estadísticas de recursos
 */
router.get('/api/estadisticas', async (req, res) => {
  try {
    const db = req.db;
    const recursoManager = db.getRecursoManager();

    const [total, disponibles, noDisponibles] = await Promise.all([
      recursoManager.count(),
      recursoManager.count({ disponible: true }),
      recursoManager.count({ disponible: false })
    ]);

    // Recursos por tipo
    const recursosPorTipo = await recursoManager.getCountByType();

    res.json({
      total,
      disponibles,
      noDisponibles,
      recursosPorTipo
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de recursos:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
