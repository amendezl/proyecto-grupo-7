const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { resilienceManager } = require('../../shared/utils/resilienceManager');
// FIXED: Import secure logger for structured logging
const { logger } = require('../monitoring/logger');

const client = new CognitoIdentityProviderClient({});

const login = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return response(400, { ok: false, error: "username y password son obligatorios" });
    }

    const authResult = await resilienceManager.executeAuth(
      async () => {
        const cmd = new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: process.env.USER_POOL_CLIENT_ID,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password
          }
        });

        return await client.send(cmd);
      },
      {
        operation: 'cognitoLogin',
        username: username.substring(0, 3) + '***',
        priority: 'critical'
      }
    );

    if (authResult.ChallengeName) {
      return response(403, { ok: false, challenge: authResult.ChallengeName });
    }

    const auth = authResult.AuthenticationResult || {};
    return response(200, {
      ok: true,
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn
    });
    
  } catch (error) {
    logger.error('[COGNITO_LOGIN] Error:', { errorMessage: error.message, errorType: error.constructor.name });
    
    if (error.name === 'CircuitOpenError') {
      return response(503, { 
        ok: false, 
        error: "Servicio de autenticación temporalmente no disponible",
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    if (error.name === 'RetryExhaustedError') {
      return response(503, { 
        ok: false, 
        error: "Servicio de autenticación sobrecargado, intente más tarde"
      });
    }
    
    return response(401, { ok: false, error: "Credenciales inválidas o usuario no confirmado" });
  }
};

const refresh = async (event) => {
  try {
    const { refreshToken } = JSON.parse(event.body || "{}");

    if (!refreshToken) {
      return response(400, { ok: false, error: "refreshToken es obligatorio" });
    }

    const authResult = await resilienceManager.executeAuth(
      async () => {
        const cmd = new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: process.env.USER_POOL_CLIENT_ID,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken
          }
        });

        return await client.send(cmd);
      },
      {
        operation: 'cognitoRefresh',
        hasRefreshToken: !!refreshToken,
        priority: 'standard'
      }
    );

    const auth = authResult.AuthenticationResult || {};

    return response(200, {
      ok: true,
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      expiresIn: auth.ExpiresIn
    });
    
  } catch (error) {
    logger.error('[COGNITO_REFRESH] Error:', { errorMessage: error.message, errorType: error.constructor.name });
    
    if (error.name === 'CircuitOpenError') {
      return response(503, { 
        ok: false, 
        error: "Servicio de autenticación temporalmente no disponible" 
      });
    }
    
    return response(401, { ok: false, error: "Refresh token inválido o expirado" });
  }
};

const me = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    
    return response(200, {
      ok: true,
      user: {
        sub: claims.sub,
        email: claims.email,
        email_verified: claims.email_verified,
        cognito_username: claims['cognito:username'],
        token_use: claims.token_use,
        aud: claims.aud,
        iss: claims.iss,
        exp: claims.exp,
        iat: claims.iat
      }
    });
  } catch (err) {
    console.error(err);
    return response(500, { ok: false, error: "Error interno del servidor" });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  login,
  refresh,
  me
};
