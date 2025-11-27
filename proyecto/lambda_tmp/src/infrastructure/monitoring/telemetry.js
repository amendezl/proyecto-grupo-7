const { Logger } = require('@aws-lambda-powertools/logger');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { Tracer } = require('@aws-lambda-powertools/tracer');

const SERVICE_NAME = 'sistema-gestion-espacios';
const ENVIRONMENT = process.env.STAGE || process.env.NODE_ENV || 'dev';
const LOG_LEVEL = (process.env.LOG_LEVEL || process.env.POWERTOOLS_LOG_LEVEL || 'INFO').toUpperCase();

const powertoolsLogger = new Logger({
  serviceName: SERVICE_NAME,
  logLevel: LOG_LEVEL,
  persistentLogAttributes: {
    service: SERVICE_NAME,
    environment: ENVIRONMENT
  }
});

const metrics = new Metrics({
  namespace: 'SistemaGestionEspacios',
  serviceName: SERVICE_NAME
});

metrics.addDimension('Service', SERVICE_NAME);
metrics.addDimension('Environment', ENVIRONMENT);
metrics.captureColdStartMetric = true;

const tracer = new Tracer({ serviceName: SERVICE_NAME });

module.exports = {
  powertoolsLogger,
  metrics,
  MetricUnits,
  tracer,
  SERVICE_NAME,
  ENVIRONMENT
};
