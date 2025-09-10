const config = require('../config/config');
const logger = require('../utils/logger');
const SQLiteManager = require('./SQLiteManager');
// const DynamoDBManager = require('./DynamoDBManager'); // TODO: Implementar

/**
 * Gestor unificado de base de datos que abstrae SQLite y DynamoDB
 */
class DatabaseManager {
  constructor() {
    this.instance = null;
    this.dbType = config.database.type;
  }

  /**
   * Obtiene la instancia singleton del gestor de base de datos
   */
  static async getInstance() {
    if (!DatabaseManager._instance) {
      DatabaseManager._instance = new DatabaseManager();
      await DatabaseManager._instance._initialize();
    }
    return DatabaseManager._instance;
  }

  /**
   * Inicializa la conexión a la base de datos según el tipo configurado
   */
  async _initialize() {
    try {
      if (this.dbType === 'sqlite') {
        const SQLiteManager = require('./SQLiteManager');
        this.instance = new SQLiteManager();
      } else if (this.dbType === 'dynamodb') {
        const DynamoDBManager = require('./DynamoDBManager');
        this.instance = new DynamoDBManager();
      } else {
        throw new Error(`Tipo de base de datos no soportado: ${this.dbType}`);
      }

      await this.instance.initialize();
      logger.info(`✅ Base de datos ${this.dbType.toUpperCase()} inicializada correctamente`);
      
    } catch (error) {
      logger.error(`❌ Error inicializando base de datos ${this.dbType}:`, error);
      throw error;
    }
  }

  /**
   * Inicializa la base de datos (crear tablas, etc.)
   */
  async initialize() {
    if (!this.instance) {
      await this._initialize();
    }
    return this.instance.initialize();
  }

  /**
   * Prueba la conexión a la base de datos
   */
  async testConnection() {
    if (!this.instance) {
      await this._initialize();
    }
    return this.instance.testConnection();
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async close() {
    if (this.instance && this.instance.close) {
      await this.instance.close();
    }
  }

  // Métodos de acceso a los managers de cada tabla

  /**
   * Obtiene el manager para la tabla zona
   */
  getZonaManager() {
    return this.instance.getZonaManager();
  }

  /**
   * Obtiene el manager para la tabla espacio
   */
  getEspacioManager() {
    return this.instance.getEspacioManager();
  }

  /**
   * Obtiene el manager para la tabla reserva
   */
  getReservaManager() {
    return this.instance.getReservaManager();
  }

  /**
   * Obtiene el manager para la tabla usuario
   */
  getUsuarioManager() {
    return this.instance.getUsuarioManager();
  }

  /**
   * Obtiene el manager para la tabla responsable
   */
  getResponsableManager() {
    return this.instance.getResponsableManager();
  }

  /**
   * Obtiene el manager para la tabla recurso
   */
  getRecursoManager() {
    return this.instance.getRecursoManager();
  }

  /**
   * Obtiene el manager para la tabla tipo actividad
   */
  getTipoActividadManager() {
    return this.instance.getTipoActividadManager();
  }

  /**
   * Obtiene el manager para la tabla estado
   */
  getEstadoManager() {
    return this.instance.getEstadoManager();
  }

  /**
   * Obtiene el manager para la tabla estado espacio
   */
  getEstadoEspacioManager() {
    return this.instance.getEstadoEspacioManager();
  }

  /**
   * Obtiene el manager para la tabla estado recurso
   */
  getEstadoRecursoManager() {
    return this.instance.getEstadoRecursoManager();
  }

  /**
   * Obtiene el manager para la tabla tipo reserva
   */
  getTipoReservaManager() {
    return this.instance.getTipoReservaManager();
  }

  /**
   * Obtiene el manager para la tabla espaciorecurso
   */
  getEspacioRecursoManager() {
    return this.instance.getEspacioRecursoManager();
  }

  /**
   * Obtiene el manager para la tabla tipoactividadespacio
   */
  getTipoActividadEspacioManager() {
    return this.instance.getTipoActividadEspacioManager();
  }

  /**
   * Obtiene el manager para la tabla tipoactividadresponsable
   */
  getTipoActividadResponsableManager() {
    return this.instance.getTipoActividadResponsableManager();
  }

  // Métodos de utilidad

  /**
   * Ejecuta una transacción (si está soportada)
   */
  async transaction(callback) {
    if (this.instance.transaction) {
      return this.instance.transaction(callback);
    } else {
      // Para bases de datos sin soporte de transacciones, ejecutar directamente
      return callback();
    }
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getStats() {
    if (this.instance.getStats) {
      return this.instance.getStats();
    }
    return null;
  }

  /**
   * Ejecuta migración de datos
   */
  async migrate() {
    if (this.instance.migrate) {
      return this.instance.migrate();
    }
    throw new Error('Migración no soportada para este tipo de base de datos');
  }

  /**
   * Crea respaldo de la base de datos
   */
  async backup(options = {}) {
    if (this.instance.backup) {
      return this.instance.backup(options);
    }
    throw new Error('Respaldo no soportado para este tipo de base de datos');
  }

  /**
   * Restaura respaldo de la base de datos
   */
  async restore(backupPath) {
    if (this.instance.restore) {
      return this.instance.restore(backupPath);
    }
    throw new Error('Restauración no soportada para este tipo de base de datos');
  }

  // Métodos de información

  /**
   * Obtiene el tipo de base de datos activa
   */
  getType() {
    return this.dbType;
  }

  /**
   * Verifica si la base de datos está inicializada
   */
  isInitialized() {
    return this.instance !== null;
  }

  /**
   * Obtiene información de configuración de la base de datos
   */
  getConfig() {
    return {
      type: this.dbType,
      config: config.database[this.dbType],
      initialized: this.isInitialized()
    };
  }

  /**
   * Obtiene métricas de rendimiento (si están disponibles)
   */
  async getMetrics() {
    if (this.instance.getMetrics) {
      return this.instance.getMetrics();
    }
    return null;
  }

  /**
   * Limpia cache y optimiza la base de datos
   */
  async optimize() {
    if (this.instance.optimize) {
      return this.instance.optimize();
    }
    logger.info('Optimización no disponible para este tipo de base de datos');
  }
}

// Resetear instancia singleton (útil para tests)
DatabaseManager.reset = () => {
  DatabaseManager._instance = null;
};

module.exports = DatabaseManager;
