/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/auth/auth.js
 */

const businessLogic = require('../..\api\auth\auth.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
