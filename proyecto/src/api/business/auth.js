const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { success, badRequest, conflict, created } = require('../../shared/utils/responses');
const { logger } = require('../../infrastructure/monitoring/logger');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Registro público - Solo permite crear el primer usuario (propietario) de una empresa
 */
const register = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { email, password, nombre, apellido, empresa_id, empresa_nombre, departamento, telefono } = body;

        if (!email || !password || !empresa_id || !empresa_nombre) {
            return badRequest('Email, password, empresa_id y empresa_nombre son requeridos');
        }

        // Verificar si ya existe un propietario para esta empresa
        const queryCommand = new QueryCommand({
            TableName: process.env.DYNAMODB_TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': `EMPRESA#${empresa_id}`
            },
            Limit: 1
        });
        
        const empresaExistente = await docClient.send(queryCommand);

        if (empresaExistente.Items && empresaExistente.Items.length > 0) {
            return conflict('Ya existe un usuario propietario de esta empresa. Contacte al administrador para que le cree una cuenta.');
        }

        // Crear usuario en Cognito
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        
        try {
            // Construir atributos del usuario (solo los que Cognito soporta)
            const userAttributes = [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: nombre || email },
                { Name: 'family_name', Value: apellido || '' },
                { Name: 'custom:empresa_id', Value: empresa_id },
                { Name: 'custom:empresa_nombre', Value: empresa_nombre }
            ];

            // Crear usuario
            const createUserCommand = new AdminCreateUserCommand({
                UserPoolId: userPoolId,
                Username: email,
                UserAttributes: userAttributes,
                MessageAction: 'SUPPRESS' // No enviar email de bienvenida
            });

            const createResult = await cognitoClient.send(createUserCommand);
            const userId = createResult.User.Username;

            // Establecer password permanente
            const setPasswordCommand = new AdminSetUserPasswordCommand({
                UserPoolId: userPoolId,
                Username: email,
                Password: password,
                Permanent: true
            });

            await cognitoClient.send(setPasswordCommand);

            // Agregar a grupo admin (propietario de la empresa)
            const addToGroupCommand = new AdminAddUserToGroupCommand({
                UserPoolId: userPoolId,
                Username: email,
                GroupName: 'admin'
            });

            await cognitoClient.send(addToGroupCommand);

            // Guardar registro de empresa en DynamoDB
            const putEmpresaCommand = new PutCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {
                    PK: `EMPRESA#${empresa_id}`,
                    SK: `EMPRESA#${empresa_id}`,
                    GSI1PK: `EMPRESA#${empresa_id}`,
                    GSI1SK: `OWNER#${userId}`,
                    empresa_id,
                    empresa_nombre,
                    owner_id: userId,
                    owner_email: email,
                    created_at: new Date().toISOString(),
                    entity_type: 'empresa'
                }
            });
            
            await docClient.send(putEmpresaCommand);

            // Guardar registro del usuario en DynamoDB
            const putUsuarioCommand = new PutCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {
                    PK: `USER#${userId}`,
                    SK: `USER#${userId}`,
                    GSI1PK: `EMPRESA#${empresa_id}`,
                    GSI1SK: `USER#${userId}`,
                    id: userId,
                    email,
                    nombre: nombre || email,
                    apellido: apellido || '',
                    departamento: departamento || '',
                    telefono: telefono || '',
                    empresa_id,
                    rol: 'admin',
                    activo: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    entity_type: 'usuario'
                }
            });

            await docClient.send(putUsuarioCommand);

            logger.info('Usuario propietario de empresa creado exitosamente', {
                userId,
                email,
                empresa_id,
                empresa_nombre,
                nombre,
                apellido,
                departamento,
                telefono
            });

            return created({
                message: 'Usuario propietario creado exitosamente',
                userId,
                email,
                empresa_id,
                empresa_nombre,
                nombre,
                apellido,
                departamento,
                telefono,
                rol: 'admin'
            });

        } catch (cognitoError) {
            logger.error('Error al crear usuario en Cognito', {
                error: cognitoError.message,
                email
            });

            if (cognitoError.name === 'UsernameExistsException') {
                return conflict('Ya existe un usuario con este email');
            }

            throw cognitoError;
        }

    } catch (error) {
        logger.error('Error en registro de usuario', {
            error: error.message,
            stack: error.stack
        });

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ok: false,
                error: 'Error al registrar usuario',
                message: error.message
            })
        };
    }
};

module.exports = {
    register
};
