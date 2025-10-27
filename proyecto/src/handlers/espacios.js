/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/business/espacios.js
 */

const businessLogic = require('../..\api\business\espacios.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
