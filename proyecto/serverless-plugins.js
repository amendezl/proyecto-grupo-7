const fs = require('fs');
const stage = process.env.STAGE || process.env.SLS_STAGE || 'dev';

// Allow disabling dotenv loading explicitly (workaround for malformed .env or circular refs)
const disableDotenv = process.env.DISABLE_DOTENV === '1' || process.env.DISABLE_DOTENV === 'true';
const hasDotenvFile = fs.existsSync('.env');
const shouldLoadDotenv = !disableDotenv && hasDotenvFile;

const basePlugins = [
  // Load dotenv only if explicitly allowed and file exists
  ...(shouldLoadDotenv ? ['serverless-dotenv-plugin'] : []),
  'serverless-scriptable-plugin',
  'serverless-plugin-split-stacks',
  'serverless-finch'
];

const conditionalPlugins = [
  'serverless-offline',
  'serverless-offline-sqs'
];

const isDevelopment = ['dev', 'test', 'local', 'development'].includes(stage);
const allPlugins = isDevelopment ? [...basePlugins, ...conditionalPlugins] : basePlugins;

if (process.env.SLS_DEBUG) {
  console.log(`[serverless-plugins] Stage: ${stage}, dotenv: ${shouldLoadDotenv ? 'on' : 'off'}, Plugins:`, allPlugins);
}

module.exports = allPlugins;