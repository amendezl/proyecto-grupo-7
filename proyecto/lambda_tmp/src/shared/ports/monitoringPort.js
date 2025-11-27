/**
 * MonitoringPort defines a minimal interface for external monitoring/telemetry providers (SaaS).
 * Implementations should be technology-agnostic and swapped via environment configuration.
 *
 * Methods:
 * - init(options): Initialize provider SDK (noop if not configured)
 * - captureException(error, context): Report an exception with optional context
 * - captureMessage(message, level, context): Report a message with optional level and context
 * - flush(timeoutMs): Ensure buffered events are sent (best-effort)
 */

module.exports = {
  /** @param {object} _options */
  init: (_options = {}) => {},
  /** @param {Error} _error @param {object} _context */
  captureException: (_error, _context = {}) => {},
  /** @param {string} _message @param {('debug'|'info'|'warning'|'error'|'fatal')} _level @param {object} _context */
  captureMessage: (_message, _level = 'info', _context = {}) => {},
  /** @param {number} _timeoutMs */
  flush: async (_timeoutMs = 2000) => {}
};
