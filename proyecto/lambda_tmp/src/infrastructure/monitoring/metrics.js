const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

const region = process.env.AWS_REGION || 'us-east-1';
const namespace = process.env.RESILIENCE_METRICS_NAMESPACE || 'Proyecto/Resilience';

let cwClient = null;
try {
  cwClient = new CloudWatchClient({ region });
} catch (err) {
  logger.warn('CloudWatch client not initialized', err && err.message);
}

async function putMetric(name, value = 1, unit = 'Count', dimensions = []) {
  if (!cwClient) return;
  try {
    const params = {
      Namespace: namespace,
      MetricData: [
        {
          MetricName: name,
          Value: Number(value),
          Unit: unit,
          Dimensions: dimensions
        }
      ]
    };
    await cwClient.send(new PutMetricDataCommand(params));
  } catch (err) {
    logger.warn('Failed to put metric', name, err && err.message);
  }
}

module.exports = { putMetric };
