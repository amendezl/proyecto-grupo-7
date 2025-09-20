const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const url = require('url');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const { resilienceManager } = require('../utils/resilienceManager');

// Simple JWKS cache by issuer
const jwksCache = new Map();

const getJwks = (issuer) => {
  if (jwksCache.has(issuer)) return jwksCache.get(issuer);
  const jwksUri = new url.URL('.well-known/jwks.json', issuer).toString();
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  // Cache the function (createRemoteJWKSet handles caching internally too)
  jwksCache.set(issuer, jwks);
  return jwks;
};

module.exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  // Attempt to extract token from queryStringParameters or headers
  const token = (event.queryStringParameters && event.queryStringParameters.token) ||
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || null;

  // Enforce token presence
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized: token required' };
  }

  let clientId = 'anonymous';
  let userId = null;

  // Normalize token value
  const raw = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

  // Try Cognito JWKS verification if we have USER_POOL_ID configured
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const userPoolId = process.env.USER_POOL_ID || process.env.COGNITO_USER_POOL_ID || null;

  try {
    if (userPoolId) {
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      const jwks = getJwks(issuer);
      const { payload } = await jwtVerify(raw, jwks, { issuer, audience: process.env.USER_POOL_CLIENT_ID || undefined });
      clientId = payload['custom:clientId'] || payload.clientId || payload.iss || clientId;
      userId = payload.sub || payload.userId || null;
    } else if (process.env.JWT_SECRET) {
      // Fallback to HMAC verification if a shared secret is configured
      const jwtLib = require('jsonwebtoken');
      const verified = jwtLib.verify(raw, process.env.JWT_SECRET);
      clientId = verified['custom:clientId'] || verified.clientId || verified.iss || clientId;
      userId = verified.sub || verified.userId || null;
    } else {
      console.warn('No USER_POOL_ID or JWT_SECRET configured for verification');
      return { statusCode: 401, body: 'Unauthorized: verification not configured' };
    }
  } catch (err) {
    console.warn('Token verification failed on websocket connect', err && err.message ? err.message : err);
    return { statusCode: 401, body: 'Unauthorized: invalid token' };
  }

  const item = {
    clientId,
    connectionId,
    userId,
    domain,
    stage,
    createdAt: new Date().toISOString()
  };

  await resilienceManager.executeDatabase(
    () => docClient.send(new PutCommand({ TableName: process.env.CONNECTIONS_TABLE, Item: item })),
    { operation: 'websocket.connect.putConnection', priority: 'auth' }
  );

  return {
    statusCode: 200,
    body: 'Connected'
  };
};
