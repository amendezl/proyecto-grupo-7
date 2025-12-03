const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { resilienceManager } = require('../../shared/utils/resilienceManager');
const { validateForDynamoDB } = require('../../core/validation/validator');
const { logger } = require('../monitoring/logger');

class DynamoDBManager {
    constructor() {
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = process.env.DYNAMODB_TABLE;
    }

    async executeCommand(command, context = {}) {
        return resilienceManager.executeDatabase(
            () => this.docClient.send(command),
            {
                ...context,
                table: this.tableName,
                commandType: command.constructor.name
            }
        );
    }

    async createEspacio(espacioData) {
        // Validate data with AJV before writing to DynamoDB
        const validatedData = validateForDynamoDB('espacio', espacioData);
        
        const item = {
            PK: `ESPACIO#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'ESPACIO',
            GSI1SK: validatedData.nombre,
            entityType: 'espacio',
            id: validatedData.id || uuidv4(),
            nombre: validatedData.nombre,
            tipo: validatedData.tipo,
            capacidad: validatedData.capacidad,
            ubicacion: validatedData.ubicacion,
            descripcion: validatedData.descripcion,
            estado: validatedData.estado || 'disponible',
            zona_id: validatedData.zona_id,
            responsable_id: validatedData.responsable_id,
            createdAt: validatedData.fecha_creacion || new Date().toISOString(),
            updatedAt: validatedData.fecha_actualizacion
        };

        logger.info('Creating espacio with validated data', { espacioId: item.id });

        const command = new PutCommand({
            TableName: this.tableName,
            Item: item
        });

        await this.executeCommand(command, { 
            operation: 'createEspacio', 
            espacioId: item.id,
            priority: 'standard'
        });
        return item;
    }

    async getEspacios(filters = {}) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': 'ESPACIO'
            }
        });

        const result = await this.executeCommand(command, { 
            operation: 'getEspacios', 
            filtersCount: Object.keys(filters).length 
        });
        let items = result.Items || [];

        // MULTITENANCY: Filtrar por empresa_id si se proporciona
        if (filters.empresa_id) {
            items = items.filter(item => item.empresa_id === filters.empresa_id);
        }
        
        if (filters.tipo) {
            items = items.filter(item => item.tipo === filters.tipo);
        }
        if (filters.estado) {
            items = items.filter(item => item.estado === filters.estado);
        }
        if (filters.zona_id) {
            items = items.filter(item => item.zona_id === filters.zona_id);
        }

        return items;
    }

    async getEspacioById(id) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: {
                ':pk': 'ESPACIO',
                ':id': id
            }
        });

        const result = await this.docClient.send(command);
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }

    async updateEspacio(id, updateData) {
        const existingItem = await this.getEspacioById(id);
        if (!existingItem) {
            throw new Error('Espacio no encontrado');
        }

        // Validate partial update data with AJV
        const validatedData = validateForDynamoDB('espacio', updateData, { allowPartial: true });
        
        logger.info('Updating espacio with validated data', { espacioId: id });

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(validatedData).forEach(key => {
            if (key !== 'id' && key !== 'PK' && key !== 'SK' && key !== 'fecha_creacion') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = validatedData[key];
                expressionAttributeNames[`#${key}`] = key;
            }
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = validatedData.fecha_actualizacion;
        expressionAttributeNames['#updatedAt'] = 'updatedAt';

        const command = new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: existingItem.PK,
                SK: existingItem.SK
            },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: 'ALL_NEW'
        });

        const result = await this.docClient.send(command);
        return result.Attributes;
    }

    async deleteEspacio(id) {
        const existingItem = await this.getEspacioById(id);
        if (!existingItem) {
            throw new Error('Espacio no encontrado');
        }

        const command = new DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: existingItem.PK,
                SK: existingItem.SK
            }
        });

        await this.docClient.send(command);
        return { success: true };
    }

    async createReserva(reservaData) {
        // Validate data with AJV before writing to DynamoDB
        const validatedData = validateForDynamoDB('reserva', reservaData);
        
        const item = {
            PK: `RESERVA#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'RESERVA',
            GSI1SK: `${validatedData.fecha_inicio}#${validatedData.espacio_id}`,
            entityType: 'reserva',
            id: validatedData.id || uuidv4(),
            espacio_id: validatedData.espacio_id,
            usuario_id: validatedData.usuario_id,
            fecha_inicio: validatedData.fecha_inicio,
            fecha_fin: validatedData.fecha_fin,
            proposito: validatedData.proposito,
            estado: validatedData.estado || 'pendiente',
            notas: validatedData.notas,
            createdAt: validatedData.fecha_creacion || new Date().toISOString(),
            updatedAt: validatedData.fecha_actualizacion
        };

        logger.info('Creating reserva with validated data', { reservaId: item.id });

        const command = new PutCommand({
            TableName: this.tableName,
            Item: item
        });

        await this.docClient.send(command);
        return item;
    }

    async getReservas(filters = {}) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': 'RESERVA'
            }
        });

        const result = await this.docClient.send(command);
        let items = result.Items || [];

        // MULTITENANCY: Filtrar por empresa_id si se proporciona
        if (filters.empresa_id) {
            items = items.filter(item => item.empresa_id === filters.empresa_id);
        }
        
        if (filters.espacio_id) {
            items = items.filter(item => item.espacio_id === filters.espacio_id);
        }
        if (filters.usuario_id) {
            items = items.filter(item => item.usuario_id === filters.usuario_id);
        }
        if (filters.estado) {
            items = items.filter(item => item.estado === filters.estado);
        }

        return items;
    }

    async getReservaById(id) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: {
                ':pk': 'RESERVA',
                ':id': id
            }
        });

        const result = await this.docClient.send(command);
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }

    async createUsuario(usuarioData) {
        // Validate data with AJV before writing to DynamoDB
        const validatedData = validateForDynamoDB('user', usuarioData);
        
        const item = {
            PK: `USUARIO#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'USUARIO',
            GSI1SK: validatedData.email,
            entityType: 'usuario',
            id: validatedData.id || uuidv4(),
            nombre: validatedData.nombre,
            apellido: validatedData.apellido,
            email: validatedData.email,
            password: usuarioData.password, // Password no se valida con schema
            rol: validatedData.rol || 'usuario',
            activo: usuarioData.activo !== false,
            telefono: validatedData.telefono,
            cargo: usuarioData.cargo,
            departamento: usuarioData.departamento,
            empresa_id: validatedData.empresa_id || 'empresa-default',
            createdAt: validatedData.fecha_creacion || new Date().toISOString(),
            updatedAt: validatedData.fecha_actualizacion
        };

        logger.info('Creating usuario with validated data', { usuarioId: item.id });

        const command = new PutCommand({
            TableName: this.tableName,
            Item: item
        });

        await this.docClient.send(command);
        return item;
    }

    async getUsuarios(filters = {}) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': 'USUARIO'
            }
        });

        const result = await this.docClient.send(command);
        let items = result.Items || [];

        if (filters.rol) {
            items = items.filter(item => item.rol === filters.rol);
        }
        if (filters.activo !== undefined) {
            items = items.filter(item => item.activo === filters.activo);
        }

        return items;
    }

    async getUsuarioById(id) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: {
                ':pk': 'USUARIO',
                ':id': id
            }
        });

        const result = await this.docClient.send(command);
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }

    async getUsuarioByEmail(email) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :email',
            ExpressionAttributeValues: {
                ':pk': 'USUARIO',
                ':email': email
            }
        });

        const result = await this.docClient.send(command);
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }

    async createEntity(entityType, data) {
        // Map entity types to validation schemas
        const schemaMap = {
            'zona': 'zona',
            'responsable': 'responsable',
            'espacio': 'espacio',
            'reserva': 'reserva',
            'usuario': 'user',
            'user': 'user'
        };
        
        const schemaName = schemaMap[entityType.toLowerCase()];
        
        let validatedData;
        if (schemaName) {
            // Validate data with AJV before writing to DynamoDB
            validatedData = validateForDynamoDB(schemaName, data);
            logger.info('Creating entity with validated data', { entityType, entityId: validatedData.id || 'new' });
        } else {
            // For entity types without specific schema, pass through with timestamps
            validatedData = {
                ...data,
                fecha_creacion: new Date().toISOString(),
                fecha_actualizacion: new Date().toISOString()
            };
            logger.warn('Creating entity without validation schema', { entityType });
        }
        
        const item = {
            PK: `${entityType.toUpperCase()}#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: entityType.toUpperCase(),
            GSI1SK: validatedData.nombre || validatedData.titulo || uuidv4(),
            entityType: entityType.toLowerCase(),
            id: validatedData.id || uuidv4(),
            ...validatedData,
            createdAt: validatedData.fecha_creacion || new Date().toISOString(),
            updatedAt: validatedData.fecha_actualizacion
        };

        const command = new PutCommand({
            TableName: this.tableName,
            Item: item
        });

        await this.docClient.send(command);
        return item;
    }

    async getEntities(entityType, filters = {}) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': entityType.toUpperCase()
            }
        });

        const result = await this.docClient.send(command);
        return result.Items || [];
    }

    async getEntityById(entityType, id) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: {
                ':pk': entityType.toUpperCase(),
                ':id': id
            }
        });

        const result = await this.docClient.send(command);
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }

    async updateEntity(entityType, id, updateData) {
        const existingItem = await this.getEntityById(entityType, id);
        if (!existingItem) {
            throw new Error(`${entityType} no encontrado`);
        }

        // Map entity types to validation schemas
        const schemaMap = {
            'zona': 'zona',
            'responsable': 'responsable',
            'espacio': 'espacio',
            'reserva': 'reserva',
            'usuario': 'user',
            'user': 'user'
        };
        
        const schemaName = schemaMap[entityType.toLowerCase()];
        
        let validatedData;
        if (schemaName) {
            // Validate partial update data with AJV
            validatedData = validateForDynamoDB(schemaName, updateData, { allowPartial: true });
            logger.info('Updating entity with validated data', { entityType, entityId: id });
        } else {
            // For entity types without specific schema, add timestamp
            validatedData = {
                ...updateData,
                fecha_actualizacion: new Date().toISOString()
            };
            logger.warn('Updating entity without validation schema', { entityType });
        }

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(validatedData).forEach(key => {
            if (key !== 'id' && key !== 'PK' && key !== 'SK' && key !== 'fecha_creacion') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = validatedData[key];
                expressionAttributeNames[`#${key}`] = key;
            }
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = validatedData.fecha_actualizacion;
        expressionAttributeNames['#updatedAt'] = 'updatedAt';

        const command = new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: existingItem.PK,
                SK: existingItem.SK
            },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: 'ALL_NEW'
        });

        const result = await this.docClient.send(command);
        return result.Attributes;
    }

    async deleteEntity(entityType, id) {
        const existingItem = await this.getEntityById(entityType, id);
        if (!existingItem) {
            throw new Error(`${entityType} no encontrado`);
        }

        const command = new DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: existingItem.PK,
                SK: existingItem.SK
            }
        });

        await this.docClient.send(command);
        return { success: true };
    }
}

module.exports = DynamoDBManager;
