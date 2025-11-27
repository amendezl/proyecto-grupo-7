const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Cache for SSM parameters (30 second TTL)
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Fetch chaos configuration from AWS Systems Manager Parameter Store
 * @param {string} paramName - The SSM parameter name
 * @returns {Promise<Object>} Parsed chaos configuration
 */
async function getChaosConfig(paramName) {
  if (!paramName) {
    throw new Error('SSM parameter name is required');
  }

  // Check cache first
  const cached = cache.get(paramName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetParameterCommand({
      Name: paramName,
      WithDecryption: false,
    });

    const response = await ssmClient.send(command);
    const paramValue = response.Parameter.Value;

    // Parse JSON value
    let config;
    try {
      config = JSON.parse(paramValue);
    } catch (parseError) {
      console.warn(`chaos: failed to parse SSM parameter as JSON, using raw value`, parseError.message);
      config = { raw: paramValue };
    }

    // Cache the result
    cache.set(paramName, {
      value: config,
      timestamp: Date.now(),
    });

    return config;
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.warn(`chaos: SSM parameter not found: ${paramName}`);
      return {
        enabled: false,
        latency: 0,
        errorRate: 0,
        errorStatus: 503,
      };
    }
    throw error;
  }
}

/**
 * Clear the SSM parameter cache (useful for testing)
 */
function clearCache() {
  cache.clear();
}

module.exports = { getChaosConfig, clearCache };
module.exports.default = getChaosConfig;
