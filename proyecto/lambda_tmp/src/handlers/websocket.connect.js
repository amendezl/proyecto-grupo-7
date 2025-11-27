/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/integrations/websocket.connect.js
 */

const businessLogic = require('../../api/integrations/websocket.connect.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
