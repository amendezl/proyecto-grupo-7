const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { logger } = require('../../infrastructure/monitoring/logger');

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
  strict: false
});

addFormats(ajv);

// User
const userSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$',
      description: 'User identifier'
    },
    email: { 
      type: 'string', 
      format: 'email',
      maxLength: 255 
    },
    nombre: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      pattern: '^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$'
    },
    apellido: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      pattern: '^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$'
    },
    telefono: { 
      type: 'string', 
      pattern: '^\\+?[1-9]\\d{1,14}$'
    },
    rol: { 
      type: 'string', 
      enum: ['admin', 'usuario', 'responsable', 'super_admin'] 
    },
    empresa_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    estado: { 
      type: 'string', 
      enum: ['activo', 'inactivo', 'suspendido'],
      default: 'activo'
    },
    activo: {
      type: 'boolean'
    },
    departamento: {
      type: 'string',
      maxLength: 100
    },
    cargo: {
      type: 'string',
      maxLength: 100
    },
    fecha_creacion: { 
      type: 'string', 
      format: 'date-time' 
    },
    fecha_actualizacion: { 
      type: 'string', 
      format: 'date-time' 
    }
  },
  required: ['email', 'nombre', 'apellido', 'rol'],
  additionalProperties: false
};

// Espacio
const espacioSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    nombre: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 200 
    },
    descripcion: { 
      type: 'string', 
      maxLength: 1000 
    },
    tipo: { 
      type: 'string', 
      enum: ['sala_juntas', 'oficina', 'laboratorio', 'auditorio', 'sala_capacitacion', 'otro']
    },
    capacidad: { 
      type: 'integer', 
      minimum: 1, 
      maximum: 1000 
    },
    ubicacion: { 
      type: 'object',
      properties: {
        edificio: { type: 'string', maxLength: 100 },
        piso: { type: 'integer', minimum: -10, maximum: 100 },
        zona: { type: 'string', maxLength: 100 }
      },
      required: ['edificio'],
      additionalProperties: false
    },
    equipamiento: { 
      type: 'array',
      items: { 
        type: 'string',
        maxLength: 100
      },
      maxItems: 50
    },
    estado: { 
      type: 'string', 
      enum: ['disponible', 'ocupado', 'mantenimiento', 'inactivo'],
      default: 'disponible'
    },
    precio_por_hora: { 
      type: 'number', 
      minimum: 0,
      maximum: 10000
    },
    horarios_disponibles: {
      type: 'object',
      patternProperties: {
        '^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)$': {
          type: 'object',
          properties: {
            inicio: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            fin: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
          },
          required: ['inicio', 'fin'],
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    responsable_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    empresa_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    fecha_creacion: { 
      type: 'string', 
      format: 'date-time' 
    },
    fecha_actualizacion: { 
      type: 'string', 
      format: 'date-time' 
    }
  },
  required: ['nombre', 'tipo', 'capacidad', 'ubicacion'],
  additionalProperties: false
};

// Reserva
const reservaSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    usuario_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    espacio_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    empresa_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    fecha_inicio: { 
      type: 'string',
      minLength: 1
    },
    fecha_fin: { 
      type: 'string',
      minLength: 1
    },
    fecha_reserva: { 
      type: 'string',
      minLength: 1
    },
    hora_inicio: { 
      type: 'string', 
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' 
    },
    hora_fin: { 
      type: 'string', 
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' 
    },
    proposito: { 
      type: 'string', 
      minLength: 5,
      maxLength: 500 
    },
    numero_asistentes: { 
      type: 'integer', 
      minimum: 1,
      maximum: 1000
    },
    notas: { 
      type: 'string', 
      maxLength: 1000 
    },
    prioridad: {
      type: 'string',
      enum: ['baja', 'normal', 'alta', 'urgente']
    },
    estado: { 
      type: 'string', 
      enum: ['pendiente', 'confirmada', 'cancelada', 'completada'],
      default: 'pendiente'
    },
    equipamiento_solicitado: { 
      type: 'array',
      items: { 
        type: 'string',
        maxLength: 100
      },
      maxItems: 20
    },
    notas_adicionales: { 
      type: 'string', 
      maxLength: 1000 
    },
    costo_total: { 
      type: 'number', 
      minimum: 0,
      maximum: 100000
    },
    fecha_creacion: { 
      type: 'string', 
      format: 'date-time' 
    },
    fecha_actualizacion: { 
      type: 'string', 
      format: 'date-time' 
    }
  },
  required: ['espacio_id', 'fecha_inicio', 'fecha_fin', 'proposito'],
  additionalProperties: true
};

// Responsable
const responsableSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    usuario_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    area_responsabilidad: { 
      type: 'string', 
      minLength: 1,
      maxLength: 200 
    },
    nivel_acceso: { 
      type: 'integer', 
      minimum: 1, 
      maximum: 10 
    },
    espacios_asignados: { 
      type: 'array',
      items: { 
        type: 'string', 
        pattern: '^[a-zA-Z0-9_-]{1,50}$' 
      },
      maxItems: 100
    },
    estado: { 
      type: 'string', 
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    fecha_asignacion: { 
      type: 'string', 
      format: 'date-time' 
    },
    fecha_actualizacion: { 
      type: 'string', 
      format: 'date-time' 
    }
  },
  required: ['usuario_id', 'area_responsabilidad', 'nivel_acceso'],
  additionalProperties: false
};

// Zona
const zonaSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    nombre: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 200 
    },
    descripcion: { 
      type: 'string', 
      maxLength: 1000 
    },
    edificio: { 
      type: 'string', 
      minLength: 1,
      maxLength: 100 
    },
    piso: { 
      type: 'integer', 
      minimum: -10, 
      maximum: 100 
    },
    empresa_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    capacidad_total: { 
      type: 'integer', 
      minimum: 0,
      maximum: 10000
    },
    tipo_zona: { 
      type: 'string', 
      enum: ['administrativa', 'academica', 'laboratorios', 'servicios', 'recreativa']
    },
    estado: { 
      type: 'string', 
      enum: ['activa', 'inactiva', 'en_construccion'],
      default: 'activa'
    },
    responsable_id: { 
      type: 'string', 
      pattern: '^[a-zA-Z0-9_-]{1,50}$' 
    },
    fecha_creacion: { 
      type: 'string', 
      format: 'date-time' 
    },
    fecha_actualizacion: { 
      type: 'string', 
      format: 'date-time' 
    }
  },
  required: ['nombre', 'edificio', 'piso'],
  additionalProperties: false
};

// WebSocket Connection
const connectionSchema = {
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    connectionId: {
      type: 'string',
      minLength: 1,
      maxLength: 128
    },
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 128
    },
    userEmail: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    userRole: {
      type: 'string',
      enum: ['admin', 'usuario', 'responsable', 'super_admin']
    },
    domain: {
      type: 'string',
      maxLength: 255
    },
    stage: {
      type: 'string',
      maxLength: 50
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'disconnected'],
      default: 'active'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    tokenIssuer: {
      type: 'string',
      maxLength: 255
    },
    tokenAudience: {
      oneOf: [
        { type: 'string', maxLength: 255 },
        { type: 'array', items: { type: 'string', maxLength: 255 } }
      ]
    }
  },
  required: ['clientId', 'connectionId', 'userId', 'userRole', 'status'],
  additionalProperties: false
};

// Idempotency Record
const idempotencySchema = {
  type: 'object',
  properties: {
    idempotencyKey: {
      type: 'string',
      minLength: 1,
      maxLength: 512
    },
    operationId: {
      type: 'string',
      minLength: 1,
      maxLength: 128
    },
    status: {
      type: 'string',
      enum: ['processing', 'success', 'error', 'SUCCESS', 'FAILED']
    },
    statusCode: {
      type: 'number',
      minimum: 100,
      maximum: 599
    },
    response: {
      type: 'object'
    },
    result: {
      type: 'object'
    },
    metadata: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        operation: { type: 'string' },
        clientInfo: { type: 'object' }
      }
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    expiresAt: {
      type: 'string',
      format: 'date-time'
    },
    ttl: {
      type: 'number',
      minimum: 0
    }
  },
  required: ['idempotencyKey', 'operationId', 'status', 'createdAt', 'ttl'],
  additionalProperties: true
};

// Circuit Breaker State
const circuitStateSchema = {
  type: 'object',
  properties: {
    serviceName: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    state: {
      type: 'string',
      enum: ['CLOSED', 'OPEN', 'HALF_OPEN']
    },
    lastUpdated: {
      type: 'number',
      minimum: 0
    }
  },
  required: ['serviceName', 'state', 'lastUpdated'],
  additionalProperties: true
};

const validators = {
  user: ajv.compile(userSchema),
  espacio: ajv.compile(espacioSchema),
  reserva: ajv.compile(reservaSchema),
  responsable: ajv.compile(responsableSchema),
  zona: ajv.compile(zonaSchema),
  connection: ajv.compile(connectionSchema),
  idempotency: ajv.compile(idempotencySchema),
  circuitState: ajv.compile(circuitStateSchema)
};

/**
 * @param {string} schemaName - Name of the schema to validate against
 * @param {object} data - Data to validate
 * @returns {object} - {valid: boolean, errors: array, sanitizedData: object}
 */
function validateData(schemaName, data) {
  const startTime = Date.now();
  
  if (!validators[schemaName]) {
    logger.error('Validation schema not found', {
      schemaName,
      availableSchemas: Object.keys(validators)
    });
    throw new Error(`Validation schema "${schemaName}" not found`);
  }

  const dataCopy = JSON.parse(JSON.stringify(data));
  
  const validator = validators[schemaName];
  const valid = validator(dataCopy);
  
  const validationTime = Date.now() - startTime;
  
  if (valid) {
    logger.debug('Data validation successful', {
      schemaName,
      validationTime: `${validationTime}ms`,
      dataSize: JSON.stringify(data).length
    });
    
    return {
      valid: true,
      errors: null,
      sanitizedData: dataCopy
    };
  } else {
    const errors = validator.errors.map(error => ({
      field: error.instancePath || error.schemaPath,
      message: error.message,
      rejectedValue: error.data,
      allowedValues: error.schema
    }));
    
    logger.warn('Data validation failed', {
      schemaName,
      validationTime: `${validationTime}ms`,
      errorCount: errors.length,
      errors: errors.map(e => `${e.field}: ${e.message}`)
    });
    
    return {
      valid: false,
      errors,
      sanitizedData: null
    };
  }
}

/**
 * @param {string} entityType - Type of entity (user, espacio, reserva, etc.)
 * @param {object} data - Data to validate
 * @param {object} options - Validation options
 * @returns {object} - Sanitized and validated data
 * @throws {Error} - If validation fails
 */
function validateForDynamoDB(entityType, data, options = {}) {
  const { 
    allowPartial = false,
    strictMode = true
  } = options;
  
  const now = new Date().toISOString();
  const dataWithTimestamps = {
    ...data,
    fecha_actualizacion: now
  };
  
  if (!data.id && !data.fecha_creacion) {
    dataWithTimestamps.fecha_creacion = now;
  }
  
  let schemaName = entityType;
  if (allowPartial) {
    const originalSchema = getSchema(entityType);
    const partialSchema = {
      ...originalSchema,
      required: []
    };
    
    const tempValidatorKey = `${entityType}_partial`;
    validators[tempValidatorKey] = ajv.compile(partialSchema);
    schemaName = tempValidatorKey;
  }
  
  const result = validateData(schemaName, dataWithTimestamps);
  
  if (!result.valid) {
    const error = new Error(`Validation failed for ${entityType}`);
    error.validationErrors = result.errors;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  
  return result.sanitizedData;
}

/**
 * @param {string} entityType - Entity type
 * @returns {object} - Schema definition
 */
function getSchema(entityType) {
  const schemas = {
    user: userSchema,
    espacio: espacioSchema,
    reserva: reservaSchema,
    responsable: responsableSchema,
    zona: zonaSchema,
    connection: connectionSchema,
    idempotency: idempotencySchema,
    circuitState: circuitStateSchema
  };
  
  return schemas[entityType];
}

/**
 * @param {string} entityType - Entity type
 * @param {array} dataArray - Array of data to validate
 * @returns {object} - {validItems: array, invalidItems: array}
 */
function validateBatch(entityType, dataArray) {
  const results = {
    validItems: [],
    invalidItems: []
  };
  
  dataArray.forEach((item, index) => {
    try {
      const validated = validateForDynamoDB(entityType, item);
      results.validItems.push({
        index,
        data: validated
      });
    } catch (error) {
      results.invalidItems.push({
        index,
        data: item,
        errors: error.validationErrors || [{ message: error.message }]
      });
    }
  });
  
  logger.info('Batch validation completed', {
    entityType,
    totalItems: dataArray.length,
    validItems: results.validItems.length,
    invalidItems: results.invalidItems.length
  });
  
  return results;
}

/**
 * @param {string} entityType - Entity type
 * @param {object} data - Data to validate
 * @returns {object} - {valid: boolean, errors: array}
 */
function validateBusinessRules(entityType, data) {
  const errors = [];
  
  switch (entityType) {
    case 'reserva':
      if (data.hora_inicio && data.hora_fin) {
        const inicio = new Date(`2000-01-01T${data.hora_inicio}`);
        const fin = new Date(`2000-01-01T${data.hora_fin}`);
        
        if (inicio >= fin) {
          errors.push({
            field: 'hora_fin',
            message: 'End time must be after start time',
            code: 'INVALID_TIME_RANGE'
          });
        }
      }
      
      if (data.fecha_reserva) {
        const reservaDate = new Date(data.fecha_reserva);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (reservaDate < today) {
          errors.push({
            field: 'fecha_reserva',
            message: 'Reservation date cannot be in the past',
            code: 'PAST_DATE_NOT_ALLOWED'
          });
        }
      }
      break;
      
    case 'espacio':
      if (data.capacidad && data.equipamiento) {
        if (data.capacidad > 100 && !data.equipamiento.includes('sistema_audio')) {
          errors.push({
            field: 'equipamiento',
            message: 'Large spaces (>100 people) should include audio system',
            code: 'MISSING_REQUIRED_EQUIPMENT'
          });
        }
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateData,
  validateForDynamoDB,
  validateBatch,
  validateBusinessRules,
  getSchema,
  validators
};