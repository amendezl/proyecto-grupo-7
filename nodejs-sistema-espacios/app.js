const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { engine } = require('express-handlebars');

// Configurar dotenv PRIMERO
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Crear app de Express
const app = express();
// Importar dependencias después de cargar las variables de entorno
const config = require('./config/config');
const logger = require('./utils/logger');
const DatabaseManager = require('./database/DatabaseManager');

// Importar rutas
const zonasRoutes = require('./routes/zonas');
const espaciosRoutes = require('./routes/espacios');
const reservasRoutes = require('./routes/reservas');
const usuariosRoutes = require('./routes/usuarios');
const responsablesRoutes = require('./routes/responsables');
const recursosRoutes = require('./routes/recursos');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');

// Configuración de seguridad y middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com", "https://stackpath.bootstrapcdn.com"],
      fontSrc: ["'self'", "https://stackpath.bootstrapcdn.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Configuración del motor de plantillas Handlebars
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    gt: (a, b) => a > b,
    lt: (a, b) => a < b,
    and: (a, b) => a && b,
    or: (a, b) => a || b,
    formatDate: (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-ES');
    },
    formatTime: (time) => {
      if (!time) return '';
      return time.substring(0, 5);
    },
    json: (context) => JSON.stringify(context),
    inc: (value) => parseInt(value) + 1
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para manejo de base de datos
app.use(async (req, res, next) => {
  try {
    req.db = await DatabaseManager.getInstance();
    next();
  } catch (error) {
    logger.error('Error conectando a la base de datos:', error);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// Middleware para datos globales de las vistas
app.use((req, res, next) => {
  res.locals.appName = 'Sistema de Gestión de Espacios';
  res.locals.currentYear = new Date().getFullYear();
  res.locals.version = require('./package.json').version;
  res.locals.dbType = config.database.type;
  next();
});

// Rutas principales
app.use('/auth', authRoutes);
app.use('/zonas', zonasRoutes);
app.use('/espacios', espaciosRoutes);
app.use('/reservas', reservasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/responsables', responsablesRoutes);
app.use('/recursos', recursosRoutes);
app.use('/dashboard', dashboardRoutes);

// Ruta principal - redireccionar al dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Ruta de salud del sistema
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await req.db.testConnection();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'Connected' : 'Disconnected',
      version: require('./package.json').version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página no encontrada',
    error: {
      status: 404,
      message: 'La página que buscas no existe',
      stack: ''
    }
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  logger.error('Error en la aplicación:', error);
  
  const status = error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : error.message;
  
  res.status(status);
  
  // Si es una petición AJAX, devolver JSON
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    res.json({
      error: {
        status,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      }
    });
  } else {
    // Renderizar página de error
    res.render('error', {
      title: 'Error del Sistema',
      error: {
        status,
        message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : ''
      }
    });
  }
});

// Inicialización del servidor
const PORT = process.env.PORT || config.server.port || 3000;
const HOST = process.env.HOST || config.server.host || 'localhost';

async function startServer() {
  try {
    // Inicializar base de datos
    const db = await DatabaseManager.getInstance();
    await db.initialize();
    
    logger.info(`Base de datos inicializada (${config.database.type})`);
    
    // Iniciar servidor
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 Servidor iniciado en http://${HOST}:${PORT}`);
      logger.info(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Base de datos: ${config.database.type}`);
      logger.info(`📁 Archivos estáticos: ${path.join(__dirname, 'public')}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`🔍 Health check: http://${HOST}:${PORT}/health`);
        logger.info(`🏠 Dashboard: http://${HOST}:${PORT}/dashboard`);
      }
    });
    
  } catch (error) {
    logger.error('Error iniciando el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  logger.info('Recibida señal SIGTERM, cerrando servidor...');
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  logger.info('Recibida señal SIGINT, cerrando servidor...');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    const db = await DatabaseManager.getInstance();
    await db.close();
    logger.info('Base de datos cerrada correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('Error cerrando la base de datos:', error);
    process.exit(1);
  }
}

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor solo si es el archivo principal
if (require.main === module) {
  startServer();
}

module.exports = app;
