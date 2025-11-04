/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/business/usuarios.js
 */

const businessLogic = require('../../api/business/usuarios.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
