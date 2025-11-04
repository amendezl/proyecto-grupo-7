/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/dashboard.js
 */

const businessLogic = require('../../api/system/dashboard.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
