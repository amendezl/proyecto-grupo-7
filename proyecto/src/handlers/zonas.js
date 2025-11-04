/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/business/zonas.js
 */

const businessLogic = require('../../api/business/zonas.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
