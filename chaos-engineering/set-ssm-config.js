#!/usr/bin/env node
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';

function usageAndExit() {
  console.log(`Usage: node set-ssm-config.js --name <param-name> --value '<json>' [--type String|SecureString] [--region REGION]`);
  process.exit(1);
}

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--name') opts.name = args[++i];
  else if (a === '--value') opts.value = args[++i];
  else if (a === '--type') opts.type = args[++i];
  else if (a === '--region') opts.region = args[++i];
  else if (a === '--key-id') opts.keyId = args[++i];
  else {
    console.error('Unknown arg', a);
    usageAndExit();
  }
}

if (!opts.name || !opts.value) usageAndExit();
opts.type = opts.type || 'String';
opts.region = opts.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

async function run() {
  const client = new SSMClient({ region: opts.region });
  const params = {
    Name: opts.name,
    Value: opts.value,
    Type: opts.type,
    Overwrite: true
  };
  if (opts.keyId) params.KeyId = opts.keyId;

  const cmd = new PutParameterCommand(params);
  const res = await client.send(cmd);
  console.log('PutParameter result:', JSON.stringify(res));
}

run().catch((err) => {
  console.error('Failed to put parameter:', err && err.message ? err.message : err);
  process.exit(2);
});
