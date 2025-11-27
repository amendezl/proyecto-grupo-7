/**
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/dynamoStreamProcessor.js
 */

const businessLogic = require('../../api/system/dynamoStreamProcessor.js');

// Export all functions from business logic as Lambda handlers
module.exports = businessLogic;
