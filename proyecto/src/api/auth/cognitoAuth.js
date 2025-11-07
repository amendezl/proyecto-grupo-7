const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { logger } = require('../../infrastructure/monitoring/logger');

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

const logout = async (event) => {
  try {
    // Use claims from JWT authorizer (consistent with 'me' endpoint)
    // API Gateway already validated the token, we just need the claims
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    
    if (!claims) {
      logger.warn('[COGNITO_LOGOUT] No claims found in request context');
      return response(401, {
        ok: false,
        error: 'Token de autenticación no encontrado'
      });
    }

    // Note: GlobalSignOut requires AccessToken, but we only have claims here
    // Since API Gateway already validated the JWT, we log the user out conceptually
    // The actual token invalidation happens client-side by removing the token
    logger.info('[COGNITO_LOGOUT] User logged out', { userId: claims.sub });

    return response(200, {
      ok: true,
      message: 'Sesión finalizada'
    });
  } catch (error) {
    logger.warn('[COGNITO_LOGOUT] Error:', { errorMessage: error.message, errorType: error.constructor.name });
    return response(200, {
      ok: true,
      message: 'Sesión finalizada'
    });
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
  } catch (error) {
    logger.error('[COGNITO_ME] Error retrieving user info', { 
      errorMessage: error.message, 
      errorType: error.constructor.name 
    });
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
  me,
  logout
};
