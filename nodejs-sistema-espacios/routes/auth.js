const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Mostrar página de login
 */
router.get('/login', (req, res) => {
  // Si ya está autenticado, redirigir al dashboard
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('auth/login', {
    title: 'Iniciar Sesión',
    layout: 'auth', // Layout específico para autenticación
    errors: req.flash ? req.flash('error') : []
  });
});

/**
 * Procesar login
 */
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login', {
        title: 'Iniciar Sesión',
        layout: 'auth',
        errors: errors.array().map(err => err.msg),
        formData: req.body
      });
    }

    const { email, password, remember } = req.body;

    // Por ahora, autenticación simple (deberías usar una base de datos de usuarios)
    const usuarios = [
      {
        id: 1,
        email: 'admin@sistema.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiPJQlVE0aG2', // "admin123"
        nombre: 'Administrador',
        rol: 'admin'
      },
      {
        id: 2,
        email: 'usuario@sistema.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiPJQlVE0aG2', // "admin123"
        nombre: 'Usuario',
        rol: 'usuario'
      }
    ];

    const usuario = usuarios.find(u => u.email === email);

    if (!usuario) {
      return res.status(401).render('auth/login', {
        title: 'Iniciar Sesión',
        layout: 'auth',
        errors: ['Email o contraseña incorrectos'],
        formData: req.body
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValida) {
      return res.status(401).render('auth/login', {
        title: 'Iniciar Sesión',
        layout: 'auth',
        errors: ['Email o contraseña incorrectos'],
        formData: req.body
      });
    }

    // Crear JWT token
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol: usuario.rol 
      },
      config.jwt.secret,
      { expiresIn: remember ? config.jwt.expiresInRemember : config.jwt.expiresIn }
    );

    // Guardar en sesión
    req.session.user = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    };

    // Guardar token en cookie si "recordar"
    if (remember) {
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });
    }

    logger.info(`Usuario ${email} ha iniciado sesión`);
    
    res.redirect('/dashboard');

  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).render('auth/login', {
      title: 'Iniciar Sesión',
      layout: 'auth',
      errors: ['Error interno del servidor']
    });
  }
});

/**
 * Cerrar sesión
 */
router.post('/logout', (req, res) => {
  try {
    const userEmail = req.session?.user?.email;

    // Destruir sesión
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destruyendo sesión:', err);
      }
    });

    // Limpiar cookie de autenticación
    res.clearCookie('auth_token');
    res.clearCookie('connect.sid'); // Cookie de sesión por defecto

    logger.info(`Usuario ${userEmail || 'desconocido'} ha cerrado sesión`);
    
    res.redirect('/auth/login');

  } catch (error) {
    logger.error('Error en logout:', error);
    res.redirect('/auth/login');
  }
});

/**
 * Página de registro (opcional)
 */
router.get('/registro', (req, res) => {
  // Si ya está autenticado, redirigir al dashboard
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('auth/registro', {
    title: 'Registrarse',
    layout: 'auth',
    errors: req.flash ? req.flash('error') : []
  });
});

/**
 * Procesar registro
 */
router.post('/registro', [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/registro', {
        title: 'Registrarse',
        layout: 'auth',
        errors: errors.array().map(err => err.msg),
        formData: req.body
      });
    }

    const { nombre, email, password } = req.body;

    // Verificar si el email ya existe (en una implementación real)
    // const usuarioExistente = await usuarioManager.findOne({ email });
    
    // Por ahora, simular que el registro es exitoso
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Aquí guardarías el usuario en la base de datos
    const nuevoUsuario = {
      id: Date.now(), // ID temporal
      nombre,
      email,
      password: hashedPassword,
      rol: 'usuario'
    };

    logger.info('Nuevo usuario registrado:', { email, nombre });

    // Crear JWT token
    const token = jwt.sign(
      { 
        id: nuevoUsuario.id, 
        email: nuevoUsuario.email, 
        rol: nuevoUsuario.rol 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Guardar en sesión
    req.session.user = {
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre,
      rol: nuevoUsuario.rol
    };

    res.redirect('/dashboard');

  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).render('auth/registro', {
      title: 'Registrarse',
      layout: 'auth',
      errors: ['Error interno del servidor']
    });
  }
});

/**
 * Página de recuperación de contraseña
 */
router.get('/recuperar', (req, res) => {
  res.render('auth/recuperar', {
    title: 'Recuperar Contraseña',
    layout: 'auth',
    errors: req.flash ? req.flash('error') : [],
    success: req.flash ? req.flash('success') : []
  });
});

/**
 * Procesar recuperación de contraseña
 */
router.post('/recuperar', [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/recuperar', {
        title: 'Recuperar Contraseña',
        layout: 'auth',
        errors: errors.array().map(err => err.msg),
        formData: req.body
      });
    }

    const { email } = req.body;

    // Aquí implementarías la lógica de envío de email
    // Por ahora, solo log
    logger.info(`Solicitud de recuperación de contraseña para: ${email}`);

    res.render('auth/recuperar', {
      title: 'Recuperar Contraseña',
      layout: 'auth',
      success: ['Se ha enviado un enlace de recuperación a su email'],
      formData: {}
    });

  } catch (error) {
    logger.error('Error en recuperación:', error);
    res.status(500).render('auth/recuperar', {
      title: 'Recuperar Contraseña',
      layout: 'auth',
      errors: ['Error interno del servidor']
    });
  }
});

/**
 * Middleware de autenticación
 */
const requireAuth = (req, res, next) => {
  // Verificar sesión
  if (req.session && req.session.user) {
    return next();
  }

  // Verificar JWT token en cookies
  const token = req.cookies.auth_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Recrear sesión desde token
      req.session.user = {
        id: decoded.id,
        email: decoded.email,
        nombre: decoded.nombre || 'Usuario',
        rol: decoded.rol || 'usuario'
      };
      
      return next();
    } catch (error) {
      logger.warn('Token JWT inválido:', error.message);
      res.clearCookie('auth_token');
    }
  }

  // No autenticado
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  res.redirect('/auth/login');
};

/**
 * Middleware para verificar rol de administrador
 */
const requireAdmin = (req, res, next) => {
  if (!req.session?.user || req.session.user.rol !== 'admin') {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    return res.status(403).render('error', {
      title: 'Acceso Denegado',
      error: { status: 403, message: 'No tiene permisos para acceder a esta página' }
    });
  }
  
  next();
};

/**
 * API endpoint para verificar autenticación
 */
router.get('/api/verify', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.session.user.id,
      email: req.session.user.email,
      nombre: req.session.user.nombre,
      rol: req.session.user.rol
    }
  });
});

/**
 * Cambiar contraseña
 */
router.post('/cambiar-password', requireAuth, [
  body('current_password')
    .isLength({ min: 1 })
    .withMessage('Debe proporcionar la contraseña actual'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    // Aquí verificarías la contraseña actual y actualizarías
    // Por ahora, solo simulamos el éxito
    logger.info(`Usuario ${req.session.user.email} cambió su contraseña`);

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    logger.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error cambiando contraseña' });
  }
});

// Exportar middlewares junto con el router
router.requireAuth = requireAuth;
router.requireAdmin = requireAdmin;

module.exports = router;
