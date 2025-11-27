const { getBulkheadStatus } = require('../src/api/system/healthCheck');

async function run() {
  const mockEvent = {
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-sub',
            email: 'test@example.com',
            name: 'Test User',
            'custom:role': 'admin',
            iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABCDEFG'
          }
        }
      }
    },
    headers: {},
    httpMethod: 'GET',
    path: '/health/bulkhead'
  };

  try {
    const result = await getBulkheadStatus(mockEvent, { functionName: 'local-test' });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error invoking getBulkheadStatus:', err.stack || err.message || err);
    process.exitCode = 1;
  }
}

run();
