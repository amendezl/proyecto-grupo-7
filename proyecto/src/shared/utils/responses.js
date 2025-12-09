const createResponse = (statusCode, data, headers = {}) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            // CORS headers MUST be included for API Gateway HTTP API with PayloadFormatVersion 2.0
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Api-Version',
            'Access-Control-Max-Age': '3600',
            ...headers
        },
        body: JSON.stringify(data)
    };
};

const success = (data, statusCode = 200) => {
    return createResponse(statusCode, {
        success: true,
        status: 'SUCCESS',
        data
    });
};

const error = (message, statusCode = 400, details = null) => {
    const errorResponse = {
        success: false,
        status: 'FAILED',
        error: {
            message,
            ...(details && { details })
        }
    };
    
    return createResponse(statusCode, errorResponse);
};

const badRequest = (message, details = null) => {
    return error(message, 400, details);
};

const unauthorized = (message = 'No autorizado') => {
    return error(message, 401);
};

const forbidden = (message = 'Acceso prohibido') => {
    return error(message, 403);
};

const notFound = (message = 'Elemento no encontrado') => {
    return error(message, 404);
};

const conflict = (message, details = null) => {
    return error(message, 409, details);
};

const internalError = (message = 'Error interno del servidor', details = null) => {
    return error(message, 500, details);
};

const created = (data) => {
    return success(data, 201);
};

const noContent = () => {
    return {
        statusCode: 204,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Api-Version',
            'Access-Control-Max-Age': '3600'
        },
        body: ''
    };
};

module.exports = {
    createResponse,
    success,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    internalError,
    created,
    noContent
};
