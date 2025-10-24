const { validateForDynamoDB, validateBusinessRules } = require('./validator');
const { logger } = require('../../infrastructure/monitoring/logger');

/**
 * @param {string} entityType - Type of entity being validated
 * @param {object} options - Validation options
 * @returns {function} - Express-like middleware function
 */
function validateRequestBody(entityType, options = {}) {
  return async (event, context, next) => {
    try {

      let requestData;
      try {
        requestData = typeof event.body === 'string' 
          ? JSON.parse(event.body) 
          : event.body || {};
      } catch (parseError) {
        logger.warn('Invalid JSON in request body', {
          requestId: context?.awsRequestId,
          parseError: parseError.message
        });
        
        return {
          statusCode: 400,
          body: JSON.stringify({
            status: 'FAILED',
            error: 'Invalid JSON format in request body',
            code: 'INVALID_JSON'
          })
        };
      }
      
      try {
        const validatedData = validateForDynamoDB(entityType, requestData, options);
        
        const businessRulesResult = validateBusinessRules(entityType, validatedData);
        if (!businessRulesResult.valid) {
          logger.warn('Business rules validation failed', {
            entityType,
            requestId: context?.awsRequestId,
            errors: businessRulesResult.errors
          });
          
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: 'Business rules validation failed',
              code: 'BUSINESS_RULES_ERROR',
              details: businessRulesResult.errors
            })
          };
        }
        
        event.validatedData = validatedData;
        
        logger.debug('Request validation successful', {
          entityType,
          requestId: context?.awsRequestId,
          dataFields: Object.keys(validatedData)
        });
        
        if (next) {
          return await next(event, context);
        }
        
      } catch (validationError) {
        logger.warn('Data validation failed', {
          entityType,
          requestId: context?.awsRequestId,
          errorMessage: validationError.message,
          validationErrors: validationError.validationErrors
        });
        
        return {
          statusCode: 400,
          body: JSON.stringify({
            status: 'FAILED',
            error: 'Data validation failed',
            code: 'VALIDATION_ERROR',
            details: validationError.validationErrors || []
          })
        };
      }
      
    } catch (error) {
      logger.error('Validation middleware error', {
        entityType,
        requestId: context?.awsRequestId,
        errorMessage: error.message,
        errorType: error.constructor.name
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'FAILED',
          error: 'Internal validation error',
          code: 'VALIDATION_SYSTEM_ERROR'
        })
      };
    }
  };
}

/**
 * @param {object} pathSchema - Schema for path parameters
 * @returns {function} - Middleware function
 */
function validatePathParameters(pathSchema) {
  return async (event, context, next) => {
    try {
      const pathParams = event.pathParameters || {};
      
      for (const [key, schema] of Object.entries(pathSchema)) {
        const value = pathParams[key];
        
        if (schema.required && !value) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: `Missing required path parameter: ${key}`,
              code: 'MISSING_PATH_PARAMETER'
            })
          };
        }
        
        if (value && schema.pattern && !new RegExp(schema.pattern).test(value)) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: `Invalid format for path parameter: ${key}`,
              code: 'INVALID_PATH_PARAMETER'
            })
          };
        }
      }
      
      logger.debug('Path parameters validated', {
        requestId: context?.awsRequestId,
        pathParams: Object.keys(pathParams)
      });
      
      if (next) {
        return await next(event, context);
      }
      
    } catch (error) {
      logger.error('Path validation error', {
        requestId: context?.awsRequestId,
        errorMessage: error.message
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'FAILED',
          error: 'Path validation error',
          code: 'PATH_VALIDATION_ERROR'
        })
      };
    }
  };
}

/**
 * @param {object} querySchema - Schema for query parameters
 * @returns {function} - Middleware function
 */
function validateQueryParameters(querySchema = {}) {
  return async (event, context, next) => {
    try {
      const queryParams = event.queryStringParameters || {};
      
      if (queryParams.limit) {
        const limit = parseInt(queryParams.limit);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: 'Invalid limit parameter. Must be between 1 and 1000',
              code: 'INVALID_LIMIT'
            })
          };
        }
      }
      
      if (queryParams.offset) {
        const offset = parseInt(queryParams.offset);
        if (isNaN(offset) || offset < 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: 'Invalid offset parameter. Must be >= 0',
              code: 'INVALID_OFFSET'
            })
          };
        }
      }
      
      if (queryParams.estado && querySchema.allowedStates) {
        if (!querySchema.allowedStates.includes(queryParams.estado)) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              status: 'FAILED',
              error: `Invalid estado value. Allowed: ${querySchema.allowedStates.join(', ')}`,
              code: 'INVALID_FILTER_VALUE'
            })
          };
        }
      }
      
      logger.debug('Query parameters validated', {
        requestId: context?.awsRequestId,
        queryCount: Object.keys(queryParams).length
      });
      
      if (next) {
        return await next(event, context);
      }
      
    } catch (error) {
      logger.error('Query validation error', {
        requestId: context?.awsRequestId,
        errorMessage: error.message
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'FAILED',
          error: 'Query validation error',
          code: 'QUERY_VALIDATION_ERROR'
        })
      };
    }
  };
}

/**
 * @param {function} handler - The original handler function
 * @param {string} entityType - Entity type for validation
 * @param {object} options - Validation options
 * @returns {function} - Wrapped handler with validation
 */
function withValidation(handler, entityType, options = {}) {
  return async (event, context) => {
    const validator = validateRequestBody(entityType, options);
    
    const validationResult = await validator(event, context);
    
    if (validationResult && validationResult.statusCode) {
      return validationResult;
    }
    
    return await handler(event, context);
  };
}

/**
 * @param {...function} middlewares - Validation middlewares to compose
 * @returns {function} - Composed middleware function
 */
function composeValidations(...middlewares) {
  return async (event, context) => {
    for (const middleware of middlewares) {
      const result = await middleware(event, context);
      if (result && result.statusCode) {
        return result;
      }
    }
    return null;
  };
}

module.exports = {
  validateRequestBody,
  validatePathParameters,
  validateQueryParameters,
  withValidation,
  composeValidations
};