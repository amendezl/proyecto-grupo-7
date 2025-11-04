/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/integrations/websocket.disconnect.js
 */

const businessLogic = require('../../api/integrations/websocket.disconnect.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
