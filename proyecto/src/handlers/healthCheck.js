/** 
 * Lambda Handler Wrapper
 * Wraps business logic from src/api/system/healthCheck.js
 */

const businessLogic = require('../api/system/healthCheck.js');
const { withChaos } = require('../../chaos/serverless/middleware.js');

// SSM parameter name is provided via environment variable at deploy time
const ssmParam = process.env.CHAOS_SSM_PARAM || '/proyecto-grupo-7/dev/chaos';

// Main handler for /health endpoint wrapped with chaos middleware
module.exports.handler = withChaos(businessLogic.getResilienceHealth, { ssmParamName: ssmParam });

// Export all functions from business logic as Lambda handlers
module.exports = {
    ...module.exports,
    ...businessLogic
};
