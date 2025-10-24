const stage = process.env.STAGE || process.env.SLS_STAGE || 'dev';

const basePlugins = [
  'serverless-dotenv-plugin',
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
  console.log(`[serverless-plugins] Stage: ${stage}, Plugins:`, allPlugins);
}

module.exports = allPlugins;