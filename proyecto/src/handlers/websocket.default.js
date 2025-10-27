/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/integrations/websocket.default.js
 */

const businessLogic = require('../..\api\integrations\websocket.default.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
