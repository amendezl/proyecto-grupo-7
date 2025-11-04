/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/auth/cognitoAuth.js
 */

const businessLogic = require('../../api/auth/cognitoAuth.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
