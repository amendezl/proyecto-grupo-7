#!/usr/bin/env node

// Configure CloudWatch alarms for the unified deployment.

const { CloudWatchClient, PutMetricAlarmCommand } = require('@aws-sdk/client-cloudwatch');

const args = process.argv.slice(2);
const stage = getArg('--stage', args, process.env.STAGE || 'prod');
const region = getArg('--region', args, process.env.AWS_REGION || 'us-east-1');
const snsTopicArn = process.env.SYSTEM_ALERTS_TOPIC_ARN || process.env.SYSTEM_ALERTS_TOPIC || '';

if (!snsTopicArn) {
  console.warn('⚠ SYSTEM_ALERTS_TOPIC_ARN not provided; alarms will be created without notifications');
}

const servicePrefix = `sistema-gestion-espacios-${stage}`;
const client = new CloudWatchClient({ region });

const alarms = [
  {
    AlarmName: `${servicePrefix}-lambda-devops-errors`,
    Namespace: 'AWS/Lambda',
    MetricName: 'Errors',
    Dimensions: [{ Name: 'FunctionName', Value: `${servicePrefix}-devopsAutomation` }],
    Statistic: 'Sum',
    Period: 300,
    EvaluationPeriods: 1,
    Threshold: 1,
    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    TreatMissingData: 'notBreaching',
    AlarmDescription: 'DevOps automation Lambda is failing'
  },
  {
    AlarmName: `${servicePrefix}-lambda-health-errors`,
    Namespace: 'AWS/Lambda',
    MetricName: 'Errors',
    Dimensions: [{ Name: 'FunctionName', Value: `${servicePrefix}-healthCheck` }],
    Statistic: 'Sum',
    Period: 300,
    EvaluationPeriods: 1,
    Threshold: 1,
    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    TreatMissingData: 'notBreaching',
    AlarmDescription: 'HTTP health check Lambda is returning errors'
  },
  {
    AlarmName: `${servicePrefix}-sqs-backlog`,
    Namespace: 'AWS/SQS',
    MetricName: 'ApproximateNumberOfMessagesVisible',
    Dimensions: [{ Name: 'QueueName', Value: `${servicePrefix}-main-queue` }],
    Statistic: 'Average',
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 50,
    ComparisonOperator: 'GreaterThanThreshold',
    TreatMissingData: 'notBreaching',
    AlarmDescription: 'Main SQS queue backlog exceeds 50 messages'
  },
  {
    AlarmName: `${servicePrefix}-devops-healthcheck-failures`,
    Namespace: 'DevOps/HealthChecks',
    MetricName: 'HealthCheck_database',
    Statistic: 'Average',
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 0.5,
    ComparisonOperator: 'LessThanThreshold',
    TreatMissingData: 'breaching',
    AlarmDescription: 'DevOps health checks report database failures'
  }
];

async function run() {
  console.log(`📈 Configurando alarmas CloudWatch para ${servicePrefix} en ${region}`);

  for (const alarm of alarms) {
    const input = {
      ...alarm,
      AlarmActions: snsTopicArn ? [snsTopicArn] : []
    };

    await client.send(new PutMetricAlarmCommand(input));
    console.log(`   • ${alarm.AlarmName}`);
  }

  console.log('✅ Alarmas configuradas');
}

run().catch(error => {
  console.error('❌ No se pudieron configurar las alarmas:', error);
  process.exit(1);
});

function getArg(flag, argv, fallback) {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1]) {
    return argv[idx + 1];
  }
  return fallback;
}
