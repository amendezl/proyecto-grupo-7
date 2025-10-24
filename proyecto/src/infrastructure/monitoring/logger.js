const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug'
};

const SENSITIVE_FIELDS = [
  'password', 'token', 'jwt', 'secret', 'key', 'auth', 'authorization',
  'refresh_token', 'access_token', 'id_token', 'private_key', 'api_key',
  'credentials', 'claims', 'sub', 'email', 'phone_number', 'address',
  'sensitive', 'sensitivedata', 'user_email', 'useremail', 'mail',
  'phone', 'ssn', 'social_security', 'credit_card', 'card_number'
];

/**
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (data.includes('.') && data.length > 100) {
      return '[JWT_TOKEN]';
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowercaseKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowercaseKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 * @returns {Object} - Structured log entry
 */
function createLogEntry(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedContext = sanitizeData(context);

  return {
    timestamp,
    level,
    message,
    service: 'sistema-gestion-espacios',
    stage: process.env.NODE_ENV || process.env.STAGE || 'dev',
    requestId: context.requestId || context.operationId || 'unknown',
    userId: sanitizedContext.userId || sanitizedContext.sub || 'anonymous',
    ...sanitizedContext
  };
}

class SecureLogger {
  constructor(serviceName = 'sistema-gestion-espacios') {
    this.serviceName = serviceName;
    this.isProduction = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  }

  /**
   * @param {string} message - Error message
   * @param {Object} context - Error context and metadata
   */
  error(message, context = {}) {
    const logEntry = createLogEntry(LOG_LEVELS.ERROR, message, {
      ...context,
      service: this.serviceName
    });
    
    console.error(JSON.stringify(logEntry, null, this.isProduction ? 0 : 2));
  }

  /**
   * @param {string} message - Warning message
   * @param {Object} context - Warning context and metadata
   */
  warn(message, context = {}) {
    const logEntry = createLogEntry(LOG_LEVELS.WARN, message, {
      ...context,
      service: this.serviceName
    });
    
    console.warn(JSON.stringify(logEntry, null, this.isProduction ? 0 : 2));
  }

  /**
   * @param {string} message - Info message
   * @param {Object} context - Info context and metadata
   */
  info(message, context = {}) {
    const logEntry = createLogEntry(LOG_LEVELS.INFO, message, {
      ...context,
      service: this.serviceName
    });
    
    console.log(JSON.stringify(logEntry, null, this.isProduction ? 0 : 2));
  }

  /**
   * @param {string} message - Debug message
   * @param {Object} context - Debug context and metadata
   */
  debug(message, context = {}) {
    if (this.isProduction) {
      return;
    }

    const logEntry = createLogEntry(LOG_LEVELS.DEBUG, message, {
      ...context,
      service: this.serviceName
    });
    
    console.log(JSON.stringify(logEntry, null, 2));
  }

  /**
   * @param {string} operation - Operation name
   * @param {Object} context - Operation context
   */
  operationStart(operation, context = {}) {
    this.info(`Operation started: ${operation}`, {
      ...context,
      operation,
      phase: 'start'
    });
  }

  /**
   * @param {string} operation - Operation name
   * @param {number} duration - Operation duration in ms
   * @param {Object} context - Operation context
   */
  operationEnd(operation, duration, context = {}) {
    this.info(`Operation completed: ${operation}`, {
      ...context,
      operation,
      phase: 'end',
      duration: `${duration}ms`
    });
  }

  /**
   * @param {string} event - Auth event type
   * @param {Object} context - Auth context
   */
  auth(event, context = {}) {
    const authContext = {
      ...context,
      token: '[REDACTED]',
      password: '[REDACTED]',
      claims: '[REDACTED]',
      jwt: '[REDACTED]',
      userId: context.userId || '[UNKNOWN]',
      userRole: context.userRole || '[UNKNOWN]'
    };

    this.info(`Auth event: ${event}`, {
      ...authContext,
      category: 'authentication',
      event
    });
  }

  /**
   * @param {string} event - WebSocket event type
   * @param {string} connectionId - Connection ID
   * @param {Object} context - WebSocket context
   */
  websocket(event, connectionId, context = {}) {
    this.info(`WebSocket event: ${event}`, {
      ...context,
      category: 'websocket',
      event,
      connectionId: connectionId || '[UNKNOWN]'
    });
  }

  /**
   * @param {string} operation - DB operation type
   * @param {string} table - Table name
   * @param {Object} context - DB context
   */
  database(operation, table, context = {}) {
    this.info(`Database operation: ${operation}`, {
      ...context,
      category: 'database',
      operation,
      table
    });
  }
}

const logger = new SecureLogger();

module.exports = {
  SecureLogger,
  logger,
  sanitizeData,
  LOG_LEVELS
};