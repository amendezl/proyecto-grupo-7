const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const DynamoDBManager = require('../../infrastructure/database/DynamoDBManager');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { withPermissions, extractQueryParams, extractPathParams, parseBody, hashPassword } = require('../../core/auth/auth');
const { PERMISSIONS } = require('../../core/auth/permissions');
const { success, badRequest, notFound, created, unauthorized } = require('../../shared/utils/responses');
const { validateForDynamoDB, validateBusinessRules } = require('../../core/validation/validator');
const { withValidation } = require('../../core/validation/middleware');
const { logger } = require('../../infrastructure/monitoring/logger');

const db = new DynamoDBManager();
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const getUsuarios = withPermissions(async (event) => {
    const queryParams = extractQueryParams(event);
    const user = event.user;
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const filters = {
                    empresa_id: user.empresa_id // MULTITENANCY: Filtrar por empresa
                };
                if (queryParams.rol) filters.rol = queryParams.rol;
                if (queryParams.activo !== undefined) filters.activo = queryParams.activo === 'true';
                
                const usuarios = await db.getUsuarios(filters);
                const usuariosSinPassword = usuarios.map(({ password, ...usuario }) => usuario);
                
                return {
                    usuarios: usuariosSinPassword,
                    total: usuariosSinPassword.length,
                    filtros_aplicados: Object.keys(filters).length > 0 ? filters : null
                };
            },
            {
                operation: 'getUsuarios',
                priority: 'standard',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(result);
        
    } catch (error) {
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        usuarios: [],
                        total: 0,
                        warning: 'Datos de usuarios no disponibles temporalmente'
                    }
                })
            };
        }
        
        logger.error('[GET_USUARIOS] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.USUARIOS_READ]);

const getUsuario = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    if (user.rol === 'usuario' && user.id !== id) {
        return notFound('Usuario no encontrado');
    }
    
    try {
        const usuario = await resilienceManager.executeDatabase(
            async () => {
                const resultado = await db.getUsuarioById(id);
                if (!resultado) {
                    throw new Error('Usuario no encontrado');
                }
                
                const { password, ...usuarioSinPassword } = resultado;
                return usuarioSinPassword;
            },
            {
                operation: 'getUsuario',
                priority: 'standard',
                usuarioId: id,
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(usuario);
        
    } catch (error) {
        if (error.message === 'Usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de usuarios temporalmente sobrecargado'
                })
            };
        }
        
        logger.error('[GET_USUARIO] Error:', { errorMessage: error.message, errorType: error.constructor.name });
        throw error;
    }
}, [PERMISSIONS.USUARIOS_READ]);

const createUsuario = withPermissions(async (event) => {
    try {
        const userData = parseBody(event);
        const user = event.user;
        
        const { email, password, nombre, apellido, rol, departamento, telefono, activo } = userData;
        
        // Validaciones básicas
        if (!email || !password || !nombre || !apellido || !rol) {
            return badRequest('Email, password, nombre, apellido y rol son requeridos');
        }
        
        // El nuevo usuario hereda el empresa_id del admin que lo crea
        const empresa_id = user.empresa_id || 'empresa-default';
        
        // Verificar si ya existe un usuario con ese email
        const existingUser = await db.getUsuarioByEmail(email);
        if (existingUser) {
            return badRequest('Ya existe un usuario con ese email');
        }
        
        // Crear usuario en Cognito primero
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        
        try {
            // Construir atributos del usuario para Cognito
            const userAttributes = [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: nombre },
                { Name: 'family_name', Value: apellido },
                { Name: 'custom:empresa_id', Value: empresa_id }
            ];

            // Crear usuario en Cognito
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

            // Agregar a grupo según el rol
            const groupName = rol; // admin, responsable, o usuario
            const addToGroupCommand = new AdminAddUserToGroupCommand({
                UserPoolId: userPoolId,
                Username: email,
                GroupName: groupName
            });

            await cognitoClient.send(addToGroupCommand);

            logger.info('User created in Cognito successfully', {
                userId,
                email,
                grupo: groupName,
                empresa_id
            });

            // Guardar registro del usuario en DynamoDB (sin validación estricta)
            const putUsuarioCommand = new PutCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {
                    PK: `USER#${userId}`,
                    SK: `USER#${userId}`,
                    GSI1PK: `EMPRESA#${empresa_id}`,
                    GSI1SK: `USER#${userId}`,
                    id: userId,
                    email,
                    nombre,
                    apellido,
                    departamento: departamento || '',
                    telefono: telefono || '',
                    empresa_id,
                    rol,
                    activo: activo !== false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    entity_type: 'usuario'
                }
            });

            await docClient.send(putUsuarioCommand);

            logger.info('User created successfully in DynamoDB', {
                userId,
                email,
                rol,
                empresa_id
            });

            return created({
                message: 'Usuario creado exitosamente',
                id: userId,
                email,
                nombre,
                apellido,
                departamento: departamento || '',
                telefono: telefono || '',
                rol,
                activo: activo !== false,
                empresa_id
            });

        } catch (cognitoError) {
            logger.error('Error creating user in Cognito', {
                error: cognitoError.message,
                errorName: cognitoError.name,
                email
            });

            if (cognitoError.name === 'UsernameExistsException') {
                return badRequest('Ya existe un usuario en Cognito con este email');
            }

            return badRequest(`Error al crear usuario en Cognito: ${cognitoError.message}`);
        }
        
    } catch (error) {
        logger.error('Error creating user', {
            error: error.message,
            stack: error.stack,
            requestId: event.requestContext?.requestId
        });
        
        return badRequest(`Error al crear usuario: ${error.message}`);
    }
}, [PERMISSIONS.USUARIOS_CREATE]);

const updateUsuario = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    if (user.rol === 'usuario' && user.id !== id) {
        return notFound('Usuario no encontrado');
    }
    
    try {
        let dataToUpdate = updateData;
        
        if (user.rol === 'usuario') {
            const allowedFields = ['nombre', 'apellido', 'telefono'];
            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });
            dataToUpdate = filteredData;
        }
        
        if (Object.keys(dataToUpdate).length > 0) {
            const validatedData = validateForDynamoDB('user', dataToUpdate, { 
                allowPartial: true 
            });
            
            const businessRulesResult = validateBusinessRules('user', validatedData);
            if (!businessRulesResult.valid) {
                logger.warn('User update business rules failed', {
                    userId: id,
                    errors: businessRulesResult.errors,
                    requestId: event.requestContext?.requestId
                });
                return badRequest('Business rules validation failed', businessRulesResult.errors);
            }
            
            dataToUpdate = validatedData;
        }
        
        if (dataToUpdate.password) {
            dataToUpdate.password = await hashPassword(updateData.password);
        }
        
        const usuarioActualizado = await db.updateEntity('usuario', id, dataToUpdate);
        
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        logger.info('User updated successfully', {
            userId: id,
            updatedFields: Object.keys(dataToUpdate),
            requestId: event.requestContext?.requestId
        });
        
        return success(usuarioSinPassword);
        
    } catch (validationError) {
        if (validationError.code === 'VALIDATION_ERROR') {
            logger.warn('User update validation failed', {
                userId: id,
                errors: validationError.validationErrors,
                requestId: event.requestContext?.requestId
            });
            return badRequest('Datos de actualización inválidos', validationError.validationErrors);
        } else if (validationError.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw validationError;
    }
}, [PERMISSIONS.USUARIOS_UPDATE]);

const deleteUsuario = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    try {
        await db.deleteEntity('usuario', id);
        return success({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
}, [PERMISSIONS.USUARIOS_DELETE]);

const toggleUsuarioEstado = withPermissions(async (event) => {
    const { id } = extractPathParams(event);
    const { activo } = parseBody(event);
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    if (typeof activo !== 'boolean') {
        return badRequest('El estado activo debe ser true o false');
    }
    
    try {
        const usuarioActualizado = await db.updateEntity('usuario', id, { activo });
        
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        return success(usuarioSinPassword);
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
}, [PERMISSIONS.USUARIOS_TOGGLE_STATUS]);

const getPerfilActual = withPermissions(async (event) => {
    const user = event.user;
    
    const usuario = await db.getUsuarioById(user.id);
    
    if (!usuario) {
        return notFound('Usuario no encontrado');
    }
    
    const { password, ...usuarioSinPassword } = usuario;
    
    return success(usuarioSinPassword);
}, [PERMISSIONS.USUARIOS_READ_PROFILE]);

const updatePerfilActual = withPermissions(async (event) => {
    const user = event.user;
    const updateData = parseBody(event);
    
    const allowedFields = ['nombre', 'apellido', 'telefono', 'departamento'];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
            filteredData[key] = updateData[key];
        }
    });
    
    try {
        const usuarioActualizado = await db.updateEntity('usuario', user.id, filteredData);
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        return success(usuarioSinPassword);
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
}, [PERMISSIONS.USUARIOS_UPDATE_PROFILE]);

const cambiarPassword = withPermissions(async (event) => {
    const user = event.user;
    const { passwordActual, passwordNuevo } = parseBody(event);
    
    if (!passwordActual || !passwordNuevo) {
        return badRequest('Contraseña actual y nueva contraseña son requeridas');
    }
    
    if (passwordNuevo.length < 6) {
        return badRequest('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    try {
        const usuario = await db.getUsuarioById(user.id);
        if (!usuario) {
            return notFound('Usuario no encontrado');
        }
        
        const bcrypt = require('bcryptjs');
        
const { logger } = require('../monitoring/logger');
        const isValidPassword = await bcrypt.compare(passwordActual, usuario.password);
        if (!isValidPassword) {
            return badRequest('La contraseña actual es incorrecta');
        }
        
        const hashedPassword = await hashPassword(passwordNuevo);
        
        await db.updateEntity('usuario', user.id, { password: hashedPassword });
        
        return success({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        throw error;
    }
}, [PERMISSIONS.USUARIOS_CHANGE_PASSWORD]);

const getSettingsActual = withPermissions(async (event) => {
    const user = event.user;
    
    try {
        const settings = await db.getUserSettings(user.id);
        
        if (!settings) {
            // Crear settings por defecto si no existen
            const defaultSettings = {
                theme: 'light',
                language: 'es',
                fontSize: 16,
                fontFamily: 'inter',
                accentColor: '#3b82f6'
            };
            
            // Guardar en BD para que persistan
            await db.updateUserSettings(user.id, defaultSettings);
            
            logger.info('Default settings created for user', { userId: user.id });
            
            return success(defaultSettings);
        }
        
        return success(settings);
    } catch (error) {
        logger.error('Error obteniendo settings del usuario:', { error: error.message, userId: user.id });
        throw error;
    }
}, [PERMISSIONS.USUARIOS_READ_PROFILE]);

const updateSettingsActual = withPermissions(async (event) => {
    const user = event.user;
    const settingsData = parseBody(event);
    
    // Validar que los settings sean válidos
    const allowedSettings = ['theme', 'language', 'fontSize', 'fontFamily', 'accentColor'];
    const filteredSettings = {};
    
    Object.keys(settingsData).forEach(key => {
        if (allowedSettings.includes(key)) {
            filteredSettings[key] = settingsData[key];
        }
    });
    
    if (Object.keys(filteredSettings).length === 0) {
        return badRequest('No se proporcionaron settings válidos');
    }
    
    try {
        const updatedSettings = await db.updateUserSettings(user.id, filteredSettings);
        
        logger.info('Settings actualizados correctamente', { 
            userId: user.id,
            settingsUpdated: Object.keys(filteredSettings)
        });
        
        return success(updatedSettings);
    } catch (error) {
        logger.error('Error actualizando settings del usuario:', { error: error.message, userId: user.id });
        throw error;
    }
}, [PERMISSIONS.USUARIOS_UPDATE_PROFILE]);

module.exports = {
    getUsuarios,
    getUsuario,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioEstado,
    getPerfilActual,
    updatePerfilActual,
    cambiarPassword,
    getSettingsActual,
    updateSettingsActual
};
