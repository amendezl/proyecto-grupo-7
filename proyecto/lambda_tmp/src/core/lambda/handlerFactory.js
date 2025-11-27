const {
  metrics,
  MetricUnits,
  tracer,
  SERVICE_NAME,
  ENVIRONMENT
} = require('../../infrastructure/monitoring/telemetry');
const { logger } = require('../../infrastructure/monitoring/logger');
const { validateRequestBody } = require('../validation/middleware');

function wrapHandler(handler, options = {}) {
  const {
    entityType,
    validationOptions = {},
    metricName,
    operationName
  } = options;

  const validator = entityType ? validateRequestBody(entityType, validationOptions) : null;

  return async function instrumentedHandler(event = {}, context = {}) {
    const handlerName = operationName || handler.name || 'anonymous';
    const requestId = event?.requestContext?.requestId || context?.awsRequestId || 'unknown';
    const stage = process.env.STAGE || process.env.NODE_ENV || ENVIRONMENT || 'dev';
    const startedAt = Date.now();

    tracer.putAnnotation('Handler', handlerName);
    tracer.putAnnotation('Stage', stage);
    metrics.setDimensions({
      Service: SERVICE_NAME,
      Environment: stage,
      Handler: handlerName
    });

    if (validator) {
      const validationResponse = await validator(event, context);
      if (validationResponse) {
        metrics.addMetric('ValidationError', MetricUnits.Count, 1);
        logger.warn('Payload validation failed', {
          handler: handlerName,
          requestId,
          statusCode: validationResponse.statusCode
        });
        metrics.publishStoredMetrics();
        return validationResponse;
      }
    }

    let invocationError;
    let response;

    try {
      response = await handler(event, context);
      metrics.addMetric(metricName || `${handlerName}Success`, MetricUnits.Count, 1);
      return response;
    } catch (error) {
      invocationError = error;
      metrics.addMetric(`${handlerName}Failure`, MetricUnits.Count, 1);
      tracer.addErrorAsMetadata(error);
      logger.error('Handler execution failed', {
        handler: handlerName,
        requestId,
        errorMessage: error.message,
        errorType: error.constructor?.name || 'Error'
      });
      throw error;
    } finally {
      const durationMs = Date.now() - startedAt;
      metrics.addMetric(`${handlerName}Latency`, MetricUnits.Milliseconds, durationMs);
      logger.debug('Handler execution completed', {
        handler: handlerName,
        requestId,
        durationMs,
        status: invocationError ? 'FAILED' : 'SUCCESS'
      });
      metrics.publishStoredMetrics();
    }
  };
}

function registerHandlers(businessModule, mapping = {}) {
  return Object.entries(businessModule).reduce((accumulator, [exportName, handler]) => {
    if (typeof handler !== 'function') {
      accumulator[exportName] = handler;
      return accumulator;
    }

    const handlerOptions = {
      operationName: exportName,
      ...(mapping[exportName] || {})
    };

    accumulator[exportName] = wrapHandler(handler, handlerOptions);
    return accumulator;
  }, {});
}

module.exports = {
  wrapHandler,
  registerHandlers,
  MetricUnits
};
