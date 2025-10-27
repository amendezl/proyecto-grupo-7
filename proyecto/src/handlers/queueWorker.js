/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/queueWorker.js
 */

const businessLogic = require('../..\api\system\queueWorker.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
