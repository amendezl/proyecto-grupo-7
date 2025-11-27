// Decoupled Sentry adapter implementing MonitoringPort
// Uses @sentry/serverless when available and DSN is provided.

let Sentry = null;
try {
  // Lazy optional dependency; won't crash if not installed
  Sentry = require('@sentry/serverless');
} catch (e) {
  Sentry = null;
}

const hasDsn = () => !!process.env.SENTRY_DSN && process.env.SENTRY_DSN !== '""' && process.env.SENTRY_DSN !== "''";

const monitoring = {
  init: (options = {}) => {
    if (!Sentry || !hasDsn()) return;
    if (Sentry.getCurrentHub && Sentry.getCurrentHub().getClient()) {
      return; // already initialized
    }
    Sentry.AWSLambda.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      environment: process.env.STAGE || process.env.NODE_ENV || 'dev',
      release: process.env.SENTRY_RELEASE || undefined,
      integrations: (integrations) => integrations,
      ...options
    });
  },
  captureException: (error, context = {}) => {
    if (!Sentry || !hasDsn()) return;
    Sentry.captureException(error, (scope) => {
      scope.setTags({ service: 'sistema-gestion-espacios' });
      if (context.functionName) scope.setTag('function', context.functionName);
      if (context.operationId) scope.setTag('operationId', context.operationId);
      scope.setContext('context', context);
      return scope;
    });
  },
  captureMessage: (message, level = 'info', context = {}) => {
    if (!Sentry || !hasDsn()) return;
    Sentry.captureMessage(message, level);
  },
  flush: async (timeoutMs = 2000) => {
    if (!Sentry || !hasDsn()) return;
    try { await Sentry.flush(timeoutMs); } catch (_) {}
  },
  /** Optional: wrap a handler to auto-capture errors in Lambda */
  withHandler: (handler) => {
    if (!Sentry || !hasDsn()) return handler;
    monitoring.init();
    return Sentry.AWSLambda.wrapHandler(async (event, context) => {
      try {
        return await handler(event, context);
      } catch (err) {
        monitoring.captureException(err, { functionName: context?.functionName });
        throw err;
      } finally {
        await monitoring.flush();
      }
    });
  }
};

module.exports = { monitoring };
