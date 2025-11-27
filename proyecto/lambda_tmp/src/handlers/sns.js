/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/integrations/sns.js
 */

const businessLogic = require('../../api/integrations/sns.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
