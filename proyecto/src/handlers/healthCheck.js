/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/healthCheck.js
 */

const businessLogic = require('../../api/system/healthCheck.js');

// Main handler for /health endpoint
module.exports.handler = businessLogic.getResilienceHealth;

// Export all functions from business logic as Lambda handlers
module.exports = {
    ...module.exports,
    ...businessLogic
};
