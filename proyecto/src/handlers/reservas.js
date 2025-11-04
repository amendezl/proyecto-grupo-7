/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/business/reservas.js
 */

const businessLogic = require('../../api/business/reservas.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
