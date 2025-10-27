/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/healthCheck.js
 */

const businessLogic = require('../..\api\system\healthCheck.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
