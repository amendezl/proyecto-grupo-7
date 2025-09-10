const path = require('path');

// Forzar la carga de dotenv si no se ha hecho aún
if (!process.env.NODE_ENV) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const config = {
  // Configuración del servidor
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Configuración de la base de datos
  database: {
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite' o 'dynamodb'
    
    // Configuración SQLite
    sqlite: {
      storage: process.env.SQLITE_DB || './database/espacios.db',
      logging: process.env.NODE_ENV !== 'production',
      dialect: 'sqlite',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },

    // Configuración DynamoDB
    dynamodb: {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || null, // Para DynamoDB local: http://localhost:8000
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || '',
      
      // Configuración de tablas
      tables: {
        zona: 'zona',
        tipoactividad: 'tipoactividad',
        estado: 'estado',
        estadoespacio: 'estadoespacio',
        estadorecurso: 'estadorecurso',
        recurso: 'recurso',
        responsable: 'responsable',
        usuario: 'usuario',
        espacio: 'espacio',
        tiporeserva: 'tiporeserva',
        reserva: 'reserva',
        tipoactividadresponsable: 'tipoactividadresponsable',
        tipoactividadespacio: 'tipoactividadespacio',
        espaciorecurso: 'espaciorecurso'
      }
    }
  },

  // Configuración de JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'sistema_espacios_secret_key_2025',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'sistema-espacios',
    audience: 'sistema-espacios-users'
  },

  // Configuración de logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '5',
    colorize: process.env.NODE_ENV !== 'production'
  },

  // Configuración de archivos
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '5mb',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  },

  // Configuración de Excel
  excel: {
    tempDir: process.env.EXCEL_TEMP_DIR || './temp',
    maxRows: process.env.EXCEL_MAX_ROWS || 10000
  },

  // Configuración de seguridad
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000, // 15 minutos
    sessionSecret: process.env.SESSION_SECRET || 'sistema_espacios_session_secret'
  },

  // Configuración de paginación
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT) || 10,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT) || 100
  },

  // Configuración de cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutos
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600 // 10 minutos
  },

  // Configuración de la aplicación
  app: {
    name: 'Sistema de Gestión de Espacios',
    version: require('../package.json').version,
    description: 'Sistema para gestión de espacios y reservas',
    author: 'VesperDevs',
    timezone: process.env.TZ || 'America/Santiago',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    datetimeFormat: 'YYYY-MM-DD HH:mm:ss'
  },

  // URLs y rutas
  urls: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    apiPrefix: '/api/v1',
    authRoutes: {
      login: '/auth/login',
      logout: '/auth/logout',
      register: '/auth/register'
    }
  },

  // Configuración de email (para futuras notificaciones)
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@sistema-espacios.com'
  }
};

// Validación de configuración crítica
function validateConfig() {
  const errors = [];

  // Validar configuración de base de datos
  if (!['sqlite', 'dynamodb'].includes(config.database.type)) {
    errors.push('DB_TYPE debe ser "sqlite" o "dynamodb"');
  }

  if (config.database.type === 'dynamodb') {
    if (!config.database.dynamodb.accessKeyId && !config.database.dynamodb.endpoint) {
      errors.push('AWS_ACCESS_KEY_ID es requerido para DynamoDB (excepto para DynamoDB local)');
    }
    if (!config.database.dynamodb.secretAccessKey && !config.database.dynamodb.endpoint) {
      errors.push('AWS_SECRET_ACCESS_KEY es requerido para DynamoDB (excepto para DynamoDB local)');
    }
  }

  // Validar JWT secret en producción
  if (config.server.env === 'production' && config.jwt.secret === 'sistema_espacios_secret_key_2025') {
    errors.push('JWT_SECRET debe ser cambiado en producción');
  }

  if (errors.length > 0) {
    console.error('❌ Errores de configuración:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
}

// Función para obtener configuración específica del entorno
function getEnvConfig() {
  const env = config.server.env;
  
  const envConfigs = {
    development: {
      database: {
        type: config.database.type, // Preservar el tipo
        sqlite: {
          logging: true
        }
      },
      logging: {
        level: 'debug',
        colorize: true
      }
    },
    
    test: {
      database: {
        type: config.database.type, // Preservar el tipo
        sqlite: {
          storage: ':memory:',
          logging: false
        }
      },
      logging: {
        level: 'error'
      }
    },
    
    production: {
      database: {
        type: config.database.type, // Preservar el tipo
        sqlite: {
          logging: false
        }
      },
      logging: {
        level: 'warn',
        colorize: false
      }
    }
  };

  // Función para hacer merge profundo
  function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  return deepMerge(config, envConfigs[env] || {});
}

// Ejecutar validación al cargar el módulo
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = getEnvConfig();
