/**
 * Lambda Function for Admin Theme Management
 * 
 * Handles CRUD operations for website themes in DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const THEMES_TABLE = process.env.THEMES_TABLE || `${process.env.SERVICE_NAME}-${process.env.STAGE}-themes`;

// Helper function to create CORS headers
const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
});

// Helper function to create response
const createResponse = (statusCode, body) => ({
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
});

// Create a new theme
const createTheme = async (themeData, userId) => {
    const themeId = uuidv4();
    const timestamp = Date.now();
    
    const item = {
        themeId,
        createdBy: userId,
        isActive: 'false', // New themes start as inactive
        createdAt: timestamp,
        updatedAt: timestamp,
        name: themeData.name,
        description: themeData.description || '',
        config: themeData.config || {},
        version: '1.0.0'
    };
    
    const command = new PutCommand({
        TableName: THEMES_TABLE,
        Item: item
    });
    
    await docClient.send(command);
    return item;
};

// Get a theme by ID
const getTheme = async (themeId) => {
    const command = new GetCommand({
        TableName: THEMES_TABLE,
        Key: { themeId }
    });
    
    const response = await docClient.send(command);
    return response.Item;
};

// List themes by creator
const listThemesByCreator = async (userId) => {
    const command = new QueryCommand({
        TableName: THEMES_TABLE,
        IndexName: 'CreatedByIndex',
        KeyConditionExpression: 'createdBy = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        },
        ScanIndexForward: false // Sort by createdAt descending
    });
    
    const response = await docClient.send(command);
    return response.Items || [];
};

// List active themes
const listActiveThemes = async () => {
    const command = new QueryCommand({
        TableName: THEMES_TABLE,
        IndexName: 'ActiveThemesIndex',
        KeyConditionExpression: 'isActive = :active',
        ExpressionAttributeValues: {
            ':active': 'true'
        },
        ScanIndexForward: false
    });
    
    const response = await docClient.send(command);
    return response.Items || [];
};

// Update a theme
const updateTheme = async (themeId, updates, userId) => {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
        ':updatedAt': Date.now(),
        ':userId': userId
    };
    
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    
    if (updates.name !== undefined) {
        updateExpression.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updates.name;
    }
    
    if (updates.description !== undefined) {
        updateExpression.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = updates.description;
    }
    
    if (updates.config !== undefined) {
        updateExpression.push('#config = :config');
        expressionAttributeNames['#config'] = 'config';
        expressionAttributeValues[':config'] = updates.config;
    }
    
    if (updates.isActive !== undefined) {
        updateExpression.push('#isActive = :isActive');
        expressionAttributeNames['#isActive'] = 'isActive';
        expressionAttributeValues[':isActive'] = updates.isActive ? 'true' : 'false';
    }
    
    const command = new UpdateCommand({
        TableName: THEMES_TABLE,
        Key: { themeId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'createdBy = :userId', // Only creator can update
        ReturnValues: 'ALL_NEW'
    });
    
    const response = await docClient.send(command);
    return response.Attributes;
};

// Delete a theme
const deleteTheme = async (themeId, userId) => {
    const command = new DeleteCommand({
        TableName: THEMES_TABLE,
        Key: { themeId },
        ConditionExpression: 'createdBy = :userId', // Only creator can delete
        ExpressionAttributeValues: {
            ':userId': userId
        }
    });
    
    await docClient.send(command);
    return { themeId, deleted: true };
};

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        // Handle OPTIONS for CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return createResponse(200, { message: 'OK' });
        }
        
        // Parse body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { action, data } = body || {};
        
        // Extract user ID from Cognito authorizer
        const userId = event.requestContext?.authorizer?.claims?.sub || 'SYSTEM';
        
        // Route to appropriate handler
        let result;
        
        switch (action) {
            case 'createTheme':
                if (!data || !data.name) {
                    return createResponse(400, { error: 'Theme name is required' });
                }
                result = await createTheme(data, userId);
                return createResponse(201, {
                    message: 'Theme created successfully',
                    theme: result
                });
            
            case 'getTheme':
                if (!data || !data.themeId) {
                    return createResponse(400, { error: 'Theme ID is required' });
                }
                result = await getTheme(data.themeId);
                if (!result) {
                    return createResponse(404, { error: 'Theme not found' });
                }
                return createResponse(200, { theme: result });
            
            case 'listMyThemes':
                result = await listThemesByCreator(userId);
                return createResponse(200, {
                    themes: result,
                    count: result.length
                });
            
            case 'listActiveThemes':
                result = await listActiveThemes();
                return createResponse(200, {
                    themes: result,
                    count: result.length
                });
            
            case 'updateTheme':
                if (!data || !data.themeId) {
                    return createResponse(400, { error: 'Theme ID is required' });
                }
                result = await updateTheme(data.themeId, data.updates || {}, userId);
                return createResponse(200, {
                    message: 'Theme updated successfully',
                    theme: result
                });
            
            case 'deleteTheme':
                if (!data || !data.themeId) {
                    return createResponse(400, { error: 'Theme ID is required' });
                }
                result = await deleteTheme(data.themeId, userId);
                return createResponse(200, {
                    message: 'Theme deleted successfully',
                    result
                });
            
            default:
                return createResponse(400, {
                    error: 'Invalid action',
                    validActions: ['createTheme', 'getTheme', 'listMyThemes', 'listActiveThemes', 'updateTheme', 'deleteTheme']
                });
        }
        
    } catch (error) {
        console.error('Error in Lambda:', error);
        
        // Handle conditional check failures (unauthorized updates/deletes)
        if (error.name === 'ConditionalCheckFailedException') {
            return createResponse(403, {
                error: 'Unauthorized: You can only modify themes you created'
            });
        }
        
        return createResponse(500, {
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Ejemplo de uso desde el frontend:
 * 
 * const callAdminLambda = async (action, data) => {
 *   const response = await fetch('YOUR_LAMBDA_URL', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${token}`
 *     },
 *     body: JSON.stringify({ action, data })
 *   });
 *   
 *   return response.json();
 * };
 * 
 * // Llamar a la función
 * const result = await callAdminLambda('test', { message: 'Hello' });
 */
