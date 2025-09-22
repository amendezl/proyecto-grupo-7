const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { resilienceManager } = require('../utils/resilienceManager');

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
        const item = {
            PK: `ESPACIO#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'ESPACIO',
            GSI1SK: espacioData.nombre,
            entityType: 'espacio',
            id: espacioData.id || uuidv4(),
            nombre: espacioData.nombre,
            tipo: espacioData.tipo,
            capacidad: espacioData.capacidad,
            ubicacion: espacioData.ubicacion,
            descripcion: espacioData.descripcion,
            estado: espacioData.estado || 'disponible',
            zona_id: espacioData.zona_id,
            responsable_id: espacioData.responsable_id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

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

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'PK' && key !== 'SK') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = updateData[key];
                expressionAttributeNames[`#${key}`] = key;
            }
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
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
        const item = {
            PK: `RESERVA#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'RESERVA',
            GSI1SK: `${reservaData.fecha_inicio}#${reservaData.espacio_id}`,
            entityType: 'reserva',
            id: reservaData.id || uuidv4(),
            espacio_id: reservaData.espacio_id,
            usuario_id: reservaData.usuario_id,
            fecha_inicio: reservaData.fecha_inicio,
            fecha_fin: reservaData.fecha_fin,
            proposito: reservaData.proposito,
            estado: reservaData.estado || 'pendiente',
            notas: reservaData.notas,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

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
        const item = {
            PK: `USUARIO#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: 'USUARIO',
            GSI1SK: usuarioData.email,
            entityType: 'usuario',
            id: usuarioData.id || uuidv4(),
            nombre: usuarioData.nombre,
            apellido: usuarioData.apellido,
            email: usuarioData.email,
            password: usuarioData.password,
            rol: usuarioData.rol || 'usuario',
            activo: usuarioData.activo !== false,
            telefono: usuarioData.telefono,
            cargo: usuarioData.cargo,
            departamento: usuarioData.departamento,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

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
        const item = {
            PK: `${entityType.toUpperCase()}#${uuidv4()}`,
            SK: 'METADATA',
            GSI1PK: entityType.toUpperCase(),
            GSI1SK: data.nombre || data.titulo || uuidv4(),
            entityType: entityType.toLowerCase(),
            id: data.id || uuidv4(),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
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

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'PK' && key !== 'SK') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = updateData[key];
                expressionAttributeNames[`#${key}`] = key;
            }
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
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
