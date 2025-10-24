const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middlewares de seguridad y performance
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Variables de configuración del entorno
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.sistema-espacios.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sistema-espacios.com';

// Estado del sistema
let systemStatus = {
  backend: 'unknown',
  frontend: 'unknown',
  database: 'unknown',
  lastCheck: new Date(),
  version: '2.0.0'
};

// Función para verificar el estado del backend serverless
async function checkBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    systemStatus.backend = response.status === 200 ? 'healthy' : 'unhealthy';
    logger.info('Backend health check: OK');
  } catch (error) {
    systemStatus.backend = 'unhealthy';
    logger.error('Backend health check failed:', error.message);
  }
}

// Función para verificar el estado del frontend
async function checkFrontendHealth() {
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    systemStatus.frontend = response.status === 200 ? 'healthy' : 'unhealthy';
    logger.info('Frontend health check: OK');
  } catch (error) {
    systemStatus.frontend = 'unhealthy';
    logger.error('Frontend health check failed:', error.message);
  }
}

// Función para verificar el estado de DynamoDB (a través del backend)
async function checkDatabaseHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/system/health/database`, { timeout: 5000 });
    systemStatus.database = response.data.status === 'OK' ? 'healthy' : 'unhealthy';
    logger.info('Database health check: OK');
  } catch (error) {
    systemStatus.database = 'unhealthy';
    logger.error('Database health check failed:', error.message);
  }
}

// Ejecutar checks de salud cada 30 segundos
setInterval(async () => {
  await Promise.all([
    checkBackendHealth(),
    checkFrontendHealth(), 
    checkDatabaseHealth()
  ]);
  systemStatus.lastCheck = new Date();
}, 30000);

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    service: 'Sistema de Gestión de Espacios - Monitor DevOps',
    version: systemStatus.version,
    description: 'Servicio de monitoreo y health checks para el Sistema de Gestión de Espacios',
    endpoints: {
      health: '/health',
      status: '/status',
      metrics: '/metrics',
      logs: '/logs'
    }
  });
});

app.get('/health', (req, res) => {
  const isHealthy = systemStatus.backend === 'healthy' && 
                   systemStatus.frontend === 'healthy' && 
                   systemStatus.database === 'healthy';
                   
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks: {
      service: 'OK',
      uptime: process.uptime()
    }
  });
});

app.get('/status', (req, res) => {
  res.json({
    ...systemStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/metrics', (req, res) => {
  res.json({
    service: 'sistema-gestion-espacios-monitor',
    timestamp: new Date().toISOString(),
    metrics: {
      uptime_seconds: process.uptime(),
      memory_usage: process.memoryUsage(),
      backend_status: systemStatus.backend,
      frontend_status: systemStatus.frontend,
      database_status: systemStatus.database,
      last_health_check: systemStatus.lastCheck
    }
  });
});

app.get('/logs', (req, res) => {
  res.json({
    message: 'Logs disponibles en /logs/combined.log y /logs/error.log',
    logLevel: logger.level,
    transports: logger.transports.length
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint no encontrado en el sistema de monitoreo',
    availableEndpoints: ['/', '/health', '/status', '/metrics', '/logs']
  });
});

// Inicializar el servidor
app.listen(port, async () => {
  logger.info(`Sistema de Monitoreo de Espacios iniciado en puerto ${port}`);
  logger.info(`Monitoreando: Backend (${API_BASE_URL}) | Frontend (${FRONTEND_URL})`);
  
  // Ejecutar check inicial
  await Promise.all([
    checkBackendHealth(),
    checkFrontendHealth(),
    checkDatabaseHealth()
  ]);
  
  console.log(`🚀 Sistema de Gestión de Espacios - Monitor DevOps v${systemStatus.version}`);
  console.log(`📊 Dashboard disponible en http://localhost:${port}`);
});

module.exports = app;
