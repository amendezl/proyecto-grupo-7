const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Listar todos los usuarios
 */
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();
    
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

    // Obtener usuarios con paginación
    const options = {
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['nombre', 'ASC']]
    };

    const resultado = await usuarioManager.findAndCountAll(options);
    const usuarios = resultado.rows || resultado;
    const total = resultado.count || usuarios.length;

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.render('usuarios/index', {
      title: 'Gestión de Usuarios',
      usuarios,
      pagination,
      filters: { activo, search },
      currentPage: 'usuarios'
    });

  } catch (error) {
    logger.error('Error listando usuarios:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando usuarios' }
    });
  }
});

/**
 * Mostrar formulario para crear usuario
 */
router.get('/crear', async (req, res) => {
  try {
    res.render('usuarios/crear', {
      title: 'Crear Usuario',
      currentPage: 'usuarios'
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
 * Crear nuevo usuario
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
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('usuarios/crear', {
        title: 'Crear Usuario',
        errors: errors.array(),
        formData: req.body,
        currentPage: 'usuarios'
      });
    }

    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    // Verificar que el email no exista
    const usuarioExistente = await usuarioManager.findOne({
      email: req.body.email
    });

    if (usuarioExistente) {
      return res.status(400).render('usuarios/crear', {
        title: 'Crear Usuario',
        errors: [{ msg: 'Ya existe un usuario con ese email' }],
        formData: req.body,
        currentPage: 'usuarios'
      });
    }

    // Crear usuario
    const nuevoUsuario = await usuarioManager.create({
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    logger.info('Usuario creado:', nuevoUsuario);
    
    req.flash = req.flash || ((type, message) => {}); // Fallback si no hay flash
    req.flash('success', 'Usuario creado exitosamente');
    
    res.redirect('/usuarios');

  } catch (error) {
    logger.error('Error creando usuario:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error creando usuario' }
    });
  }
});

/**
 * Ver detalles de un usuario específico
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();
    const reservaManager = db.getReservaManager();

    const usuario = await usuarioManager.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).render('error', {
        title: 'Usuario no encontrado',
        error: { status: 404, message: 'El usuario solicitado no existe' }
      });
    }

    // Obtener reservas del usuario
    const reservas = await reservaManager.findAll({
      where: { idusuario: req.params.id },
      order: [['fechareserva', 'DESC'], ['horainicio', 'DESC']],
      limit: 20
    });

    // Estadísticas del usuario
    const estadisticas = {
      totalReservas: reservas.length,
      reservasActivas: reservas.filter(r => r.idestadoreserva === 1).length, // Asumiendo que 1 es activa
      reservasCanceladas: reservas.filter(r => r.idestadoreserva === 3).length // Asumiendo que 3 es cancelada
    };

    res.render('usuarios/detalle', {
      title: `Usuario: ${usuario.nombre}`,
      usuario,
      reservas,
      estadisticas,
      currentPage: 'usuarios'
    });

  } catch (error) {
    logger.error('Error obteniendo detalles del usuario:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error cargando detalles del usuario' }
    });
  }
});

/**
 * Editar usuario
 */
router.get('/:id/editar', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();
    
    const usuario = await usuarioManager.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).render('error', {
        title: 'Usuario no encontrado',
        error: { status: 404, message: 'El usuario solicitado no existe' }
      });
    }

    res.render('usuarios/editar', {
      title: `Editar Usuario: ${usuario.nombre}`,
      usuario,
      currentPage: 'usuarios'
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
 * Actualizar usuario
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
      const usuarioManager = db.getUsuarioManager();
      const usuario = await usuarioManager.findById(req.params.id);
      
      return res.status(400).render('usuarios/editar', {
        title: `Editar Usuario: ${usuario.nombre}`,
        usuario: { ...usuario, ...req.body },
        errors: errors.array(),
        currentPage: 'usuarios'
      });
    }

    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    // Verificar que el email no exista en otro usuario
    const usuarioExistente = await usuarioManager.findOne({
      email: req.body.email
    });

    if (usuarioExistente && usuarioExistente.idusuario != req.params.id) {
      const usuario = await usuarioManager.findById(req.params.id);
      
      return res.status(400).render('usuarios/editar', {
        title: `Editar Usuario: ${usuario.nombre}`,
        usuario: { ...usuario, ...req.body },
        errors: [{ msg: 'Ya existe otro usuario con ese email' }],
        currentPage: 'usuarios'
      });
    }

    // Actualizar usuario
    const usuarioActualizado = await usuarioManager.update(req.params.id, {
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono || null,
      activo: req.body.activo !== undefined ? req.body.activo : true
    });

    if (!usuarioActualizado) {
      return res.status(404).render('error', {
        title: 'Usuario no encontrado',
        error: { status: 404, message: 'El usuario solicitado no existe' }
      });
    }

    logger.info('Usuario actualizado:', usuarioActualizado);
    
    req.flash = req.flash || ((type, message) => {});
    req.flash('success', 'Usuario actualizado exitosamente');
    
    res.redirect(`/usuarios/${req.params.id}`);

  } catch (error) {
    logger.error('Error actualizando usuario:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error actualizando usuario' }
    });
  }
});

/**
 * Activar/Desactivar usuario
 */
router.post('/:id/toggle-estado', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    const usuario = await usuarioManager.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    const usuarioActualizado = await usuarioManager.update(req.params.id, {
      activo: !usuario.activo
    });

    logger.info(`Usuario ${req.params.id} ${usuario.activo ? 'desactivado' : 'activado'}`);
    res.json({ 
      message: `Usuario ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`,
      usuario: usuarioActualizado 
    });

  } catch (error) {
    logger.error('Error cambiando estado del usuario:', error);
    res.status(500).json({ error: 'Error cambiando estado del usuario' });
  }
});

/**
 * Eliminar usuario (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();
    const reservaManager = db.getReservaManager();

    // Verificar si el usuario tiene reservas
    const reservasExistentes = await reservaManager.count({
      idusuario: req.params.id
    });

    if (reservasExistentes > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el usuario porque tiene reservas asociadas' 
      });
    }

    const eliminado = await usuarioManager.delete(req.params.id);
    
    if (!eliminado) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    logger.info(`Usuario ${req.params.id} eliminado`);
    res.json({ message: 'Usuario eliminado exitosamente' });

  } catch (error) {
    logger.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

/**
 * API endpoint para buscar usuarios (para autocompletado)
 */
router.get('/api/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    const where = {
      activo: true,
      [db.sequelize?.Op?.or || 'OR']: [
        { nombre: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } },
        { email: { [db.sequelize?.Op?.like || 'LIKE']: `%${q}%` } }
      ]
    };

    const usuarios = await usuarioManager.findAll({
      where,
      limit: 10,
      order: [['nombre', 'ASC']]
    });

    const resultado = usuarios.map(usuario => ({
      id: usuario.idusuario,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono
    }));

    res.json(resultado);

  } catch (error) {
    logger.error('Error buscando usuarios:', error);
    res.status(500).json({ error: 'Error buscando usuarios' });
  }
});

/**
 * Exportar usuarios a Excel
 */
router.get('/exportar', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    const usuarios = await usuarioManager.findAll({
      order: [['nombre', 'ASC']]
    });

    // Aquí implementarías la lógica de exportación a Excel
    // Por ahora, devolvemos JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.json');
    res.json(usuarios);

  } catch (error) {
    logger.error('Error exportando usuarios:', error);
    res.status(500).json({ error: 'Error exportando usuarios' });
  }
});

/**
 * Obtener estadísticas de usuarios
 */
router.get('/api/estadisticas', async (req, res) => {
  try {
    const db = req.db;
    const usuarioManager = db.getUsuarioManager();

    const [total, activos, inactivos] = await Promise.all([
      usuarioManager.count(),
      usuarioManager.count({ activo: true }),
      usuarioManager.count({ activo: false })
    ]);

    // Usuarios registrados por mes (últimos 6 meses)
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 6);

    const usuariosPorMes = await usuarioManager.getUsersByMonth(fechaInicio);

    res.json({
      total,
      activos,
      inactivos,
      usuariosPorMes
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
