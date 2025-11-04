/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/business/responsables.js
 */

const businessLogic = require('../../api/business/responsables.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
