const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Cargar configuración de forma segura
let config;
try {
  config = require('../config/config');
} catch (error) {
  // Configuración por defecto si no se puede cargar la configuración
  config = {
    logging: {
      level: 'info',
      file: './logs/app.log',
      maxSize: '10m',
      maxFiles: '5',
      colorize: true
    }
  };
}

// Crear directorio de logs si no existe
const logFile = config.logging?.file || './logs/app.log';
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuración de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Configuración de transports
const transports = [
  // Archivo de logs
  new winston.transports.File({
    filename: logFile,
    level: config.logging?.level || 'info',
    format: logFormat,
    maxsize: parseSize(config.logging?.maxSize || '10m'),
    maxFiles: parseInt(config.logging?.maxFiles || '5'),
    tailable: true
  }),

  // Archivo separado para errores
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: parseSize(config.logging?.maxSize || '10m'),
    maxFiles: parseInt(config.logging?.maxFiles || '5'),
    tailable: true
  })
];

// Agregar consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: config.logging?.level || 'info',
      format: config.logging?.colorize ? consoleFormat : logFormat
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
  silent: config.server.env === 'test'
});

// Función para parsear tamaños
function parseSize(size) {
  const units = { b: 1, k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
  const match = size.toString().toLowerCase().match(/^(\d+)([kmg]?)b?$/);
  if (!match) return 5 * 1024 * 1024; // 5MB por defecto
  return parseInt(match[1]) * (units[match[2]] || 1);
}

// Métodos de conveniencia
logger.request = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, `${method} ${url} ${statusCode} ${duration}ms - ${ip} "${userAgent}"`);
  });
  
  next();
};

logger.database = (operation, table, data = {}) => {
  logger.debug(`DB ${operation.toUpperCase()} on ${table}:`, data);
};

logger.auth = (action, user, details = {}) => {
  logger.info(`AUTH ${action.toUpperCase()} for user ${user}:`, details);
};

logger.security = (event, details = {}) => {
  logger.warn(`SECURITY ${event.toUpperCase()}:`, details);
};

logger.performance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, `PERFORMANCE ${operation} took ${duration}ms:`, details);
};

// Stream para Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Manejo de excepciones no capturadas
if (config.server.env !== 'test') {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      format: logFormat
    })
  );

  logger.rejections.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      format: logFormat
    })
  );
}

module.exports = logger;
