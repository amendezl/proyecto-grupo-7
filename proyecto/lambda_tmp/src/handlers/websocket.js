/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/integrations/websocket.js
 */

const businessLogic = require('../../api/integrations/websocket.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
