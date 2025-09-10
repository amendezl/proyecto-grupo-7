const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Manager para SQLite usando Sequelize
 */
class SQLiteManager {
  constructor() {
    this.sequelize = null;
    this.models = {};
    this.initialized = false;
  }

  /**
   * Inicializa la conexión a SQLite
   */
  async initialize() {
    try {
      // Debug: verificar configuración
      console.log('DEBUG SQLiteManager - config.database:', JSON.stringify(config.database, null, 2));
      
      // Crear directorio de base de datos si no existe
      const dbPath = config.database.sqlite.storage;
      if (dbPath !== ':memory:') {
        const dbDir = path.dirname(dbPath);
        await fs.mkdir(dbDir, { recursive: true });
      }

      // Configurar Sequelize
      this.sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: config.database.sqlite.logging ? 
          (msg) => logger.debug('SQL:', msg) : false,
        pool: config.database.sqlite.pool,
        define: {
          timestamps: true,
          underscored: true,
          paranoid: false
        }
      });

      // Importar modelos
      await this._importModels();

      // Definir asociaciones
      this._defineAssociations();

      // Sincronizar base de datos
      await this.sequelize.sync({ alter: config.server.env === 'development' });

      // Insertar datos iniciales si es necesario
      await this._insertInitialData();

      this.initialized = true;
      logger.info('✅ SQLite inicializado correctamente');

    } catch (error) {
      logger.error('❌ Error inicializando SQLite:', error);
      throw error;
    }
  }

  /**
   * Importa todos los modelos
   */
  async _importModels() {
    const modelFiles = [
      'Zona', 'TipoActividad', 'Estado', 'EstadoEspacio', 'EstadoRecurso',
      'Recurso', 'Responsable', 'Usuario', 'Espacio', 'TipoReserva', 'Reserva',
      'TipoActividadResponsable', 'TipoActividadEspacio', 'EspacioRecurso'
    ];

    for (const modelFile of modelFiles) {
      try {
        const ModelClass = require(`./models/${modelFile}`);
        this.models[modelFile] = ModelClass(this.sequelize);
        logger.debug(`Modelo ${modelFile} importado`);
      } catch (error) {
        logger.error(`Error importando modelo ${modelFile}:`, error);
        throw error;
      }
    }
  }

  /**
   * Define las asociaciones entre modelos
   */
  _defineAssociations() {
    const { 
      Zona, TipoActividad, Estado, EstadoEspacio, EstadoRecurso,
      Recurso, Responsable, Usuario, Espacio, TipoReserva, Reserva,
      TipoActividadResponsable, TipoActividadEspacio, EspacioRecurso
    } = this.models;

    // Espacio pertenece a Zona
    Espacio.belongsTo(Zona, { foreignKey: 'idzona', as: 'zona' });
    Zona.hasMany(Espacio, { foreignKey: 'idzona', as: 'espacios' });

    // Espacio pertenece a EstadoEspacio
    Espacio.belongsTo(EstadoEspacio, { foreignKey: 'idestadoespacio', as: 'estadoEspacio' });
    EstadoEspacio.hasMany(Espacio, { foreignKey: 'idestadoespacio', as: 'espacios' });

    // Responsable pertenece a TipoActividad
    Responsable.belongsTo(TipoActividad, { foreignKey: 'idtipoactividad', as: 'tipoActividad' });
    TipoActividad.hasMany(Responsable, { foreignKey: 'idtipoactividad', as: 'responsables' });

    // Reserva pertenece a múltiples entidades
    Reserva.belongsTo(Espacio, { foreignKey: 'idespacio', as: 'espacio' });
    Espacio.hasMany(Reserva, { foreignKey: 'idespacio', as: 'reservas' });

    Reserva.belongsTo(Usuario, { foreignKey: 'rutusuario', as: 'usuario' });
    Usuario.hasMany(Reserva, { foreignKey: 'rutusuario', as: 'reservas' });

    Reserva.belongsTo(Responsable, { foreignKey: 'rutresponsable', as: 'responsable' });
    Responsable.hasMany(Reserva, { foreignKey: 'rutresponsable', as: 'reservas' });

    Reserva.belongsTo(Estado, { foreignKey: 'idestado', as: 'estado' });
    Estado.hasMany(Reserva, { foreignKey: 'idestado', as: 'reservas' });

    Reserva.belongsTo(TipoReserva, { foreignKey: 'idtiporeserva', as: 'tipoReserva' });
    TipoReserva.hasMany(Reserva, { foreignKey: 'idtiporeserva', as: 'reservas' });

    // Relaciones Many-to-Many

    // TipoActividadResponsable
    TipoActividad.belongsToMany(Responsable, { 
      through: TipoActividadResponsable,
      foreignKey: 'idtipoactividad',
      otherKey: 'rutresponsable',
      as: 'responsablesAsociados'
    });
    Responsable.belongsToMany(TipoActividad, { 
      through: TipoActividadResponsable,
      foreignKey: 'rutresponsable',
      otherKey: 'idtipoactividad',
      as: 'tiposActividadAsociadas'
    });

    // TipoActividadEspacio
    TipoActividad.belongsToMany(Espacio, { 
      through: TipoActividadEspacio,
      foreignKey: 'idtipoactividad',
      otherKey: 'idespacio',
      as: 'espaciosAsociados'
    });
    Espacio.belongsToMany(TipoActividad, { 
      through: TipoActividadEspacio,
      foreignKey: 'idespacio',
      otherKey: 'idtipoactividad',
      as: 'tiposActividadAsociadas'
    });

    // EspacioRecurso
    Espacio.belongsToMany(Recurso, { 
      through: EspacioRecurso,
      foreignKey: 'idespacio',
      otherKey: 'idrecurso',
      as: 'recursosAsociados'
    });
    Recurso.belongsToMany(Espacio, { 
      through: EspacioRecurso,
      foreignKey: 'idrecurso',
      otherKey: 'idespacio',
      as: 'espaciosAsociados'
    });

    // EspacioRecurso con EstadoRecurso
    EspacioRecurso.belongsTo(EstadoRecurso, { foreignKey: 'idestadorecurso', as: 'estadoRecurso' });
    EstadoRecurso.hasMany(EspacioRecurso, { foreignKey: 'idestadorecurso', as: 'espaciosRecursos' });

    logger.debug('Asociaciones de modelos definidas');
  }

  /**
   * Inserta datos iniciales en la base de datos
   */
  async _insertInitialData() {
    try {
      const { 
        Zona, TipoActividad, Estado, EstadoEspacio, EstadoRecurso, TipoReserva
      } = this.models;

      // Datos para Zona
      const zonas = [
        { idzona: 1, nombrezona: 'Zona Norte' },
        { idzona: 2, nombrezona: 'Zona Sur' },
        { idzona: 3, nombrezona: 'Zona Este' },
        { idzona: 4, nombrezona: 'Zona Oeste' },
        { idzona: 5, nombrezona: 'Zona Central' }
      ];

      for (const zona of zonas) {
        await Zona.findOrCreate({ where: { idzona: zona.idzona }, defaults: zona });
      }

      // Datos para TipoActividad
      const tiposActividad = [
        { idtipoactividad: 1, nombretipoactividad: 'Reuniones' },
        { idtipoactividad: 2, nombretipoactividad: 'Capacitación' },
        { idtipoactividad: 3, nombretipoactividad: 'Eventos' },
        { idtipoactividad: 4, nombretipoactividad: 'Conferencias' },
        { idtipoactividad: 5, nombretipoactividad: 'Talleres' }
      ];

      for (const tipo of tiposActividad) {
        await TipoActividad.findOrCreate({ 
          where: { idtipoactividad: tipo.idtipoactividad }, 
          defaults: tipo 
        });
      }

      // Datos para Estado
      const estados = [
        { idestado: 1, descripcionestado: 'Confirmada' },
        { idestado: 2, descripcionestado: 'Pendiente' },
        { idestado: 3, descripcionestado: 'Cancelada' },
        { idestado: 4, descripcionestado: 'Completada' }
      ];

      for (const estado of estados) {
        await Estado.findOrCreate({ 
          where: { idestado: estado.idestado }, 
          defaults: estado 
        });
      }

      // Datos para EstadoEspacio
      const estadosEspacio = [
        { idestadoespacio: 1, descripcionestadoespacio: 'Disponible' },
        { idestadoespacio: 2, descripcionestadoespacio: 'Ocupado' },
        { idestadoespacio: 3, descripcionestadoespacio: 'En Mantenimiento' },
        { idestadoespacio: 4, descripcionestadoespacio: 'Fuera de Servicio' }
      ];

      for (const estado of estadosEspacio) {
        await EstadoEspacio.findOrCreate({ 
          where: { idestadoespacio: estado.idestadoespacio }, 
          defaults: estado 
        });
      }

      // Datos para EstadoRecurso
      const estadosRecurso = [
        { idestadorecurso: 1, descripcion: 'Disponible' },
        { idestadorecurso: 2, descripcion: 'En Uso' },
        { idestadorecurso: 3, descripcion: 'No Disponible' },
        { idestadorecurso: 4, descripcion: 'En Reparación' }
      ];

      for (const estado of estadosRecurso) {
        await EstadoRecurso.findOrCreate({ 
          where: { idestadorecurso: estado.idestadorecurso }, 
          defaults: estado 
        });
      }

      // Datos para TipoReserva
      const tiposReserva = [
        { idtiporeserva: 1, tiporeserva: 'Reserva General' },
        { idtiporeserva: 2, tiporeserva: 'Reserva Especial' },
        { idtiporeserva: 3, tiporeserva: 'Reserva VIP' },
        { idtiporeserva: 4, tiporeserva: 'Reserva de Mantenimiento' }
      ];

      for (const tipo of tiposReserva) {
        await TipoReserva.findOrCreate({ 
          where: { idtiporeserva: tipo.idtiporeserva }, 
          defaults: tipo 
        });
      }

      logger.info('✅ Datos iniciales insertados en SQLite');

    } catch (error) {
      logger.error('❌ Error insertando datos iniciales:', error);
      throw error;
    }
  }

  /**
   * Prueba la conexión a la base de datos
   */
  async testConnection() {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      logger.error('Error de conexión SQLite:', error);
      return false;
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      logger.info('Conexión SQLite cerrada');
    }
  }

  // Métodos para obtener managers de cada tabla

  getZonaManager() {
    return new SQLiteTableManager(this.models.Zona);
  }

  getEspacioManager() {
    return new SQLiteTableManager(this.models.Espacio, {
      include: ['zona', 'estadoEspacio', 'reservas', 'recursosAsociados', 'tiposActividadAsociadas']
    });
  }

  getReservaManager() {
    return new SQLiteTableManager(this.models.Reserva, {
      include: ['espacio', 'usuario', 'responsable', 'estado', 'tipoReserva']
    });
  }

  getUsuarioManager() {
    return new SQLiteTableManager(this.models.Usuario, {
      include: ['reservas']
    });
  }

  getResponsableManager() {
    return new SQLiteTableManager(this.models.Responsable, {
      include: ['tipoActividad', 'reservas', 'tiposActividadAsociadas']
    });
  }

  getRecursoManager() {
    return new SQLiteTableManager(this.models.Recurso, {
      include: ['espaciosAsociados']
    });
  }

  getTipoActividadManager() {
    return new SQLiteTableManager(this.models.TipoActividad, {
      include: ['responsables', 'espaciosAsociados', 'responsablesAsociados']
    });
  }

  getEstadoManager() {
    return new SQLiteTableManager(this.models.Estado);
  }

  getEstadoEspacioManager() {
    return new SQLiteTableManager(this.models.EstadoEspacio);
  }

  getEstadoRecursoManager() {
    return new SQLiteTableManager(this.models.EstadoRecurso);
  }

  getTipoReservaManager() {
    return new SQLiteTableManager(this.models.TipoReserva);
  }

  getEspacioRecursoManager() {
    return new SQLiteTableManager(this.models.EspacioRecurso, {
      include: ['estadoRecurso']
    });
  }

  getTipoActividadEspacioManager() {
    return new SQLiteTableManager(this.models.TipoActividadEspacio);
  }

  getTipoActividadResponsableManager() {
    return new SQLiteTableManager(this.models.TipoActividadResponsable);
  }

  /**
   * Ejecuta una transacción
   */
  async transaction(callback) {
    return this.sequelize.transaction(callback);
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getStats() {
    const stats = {};
    
    for (const [modelName, model] of Object.entries(this.models)) {
      try {
        stats[modelName] = await model.count();
      } catch (error) {
        stats[modelName] = 0;
      }
    }

    return {
      tables: stats,
      totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
      databaseSize: 'N/A', // SQLite no proporciona fácilmente el tamaño
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Optimiza la base de datos
   */
  async optimize() {
    try {
      await this.sequelize.query('VACUUM');
      await this.sequelize.query('ANALYZE');
      logger.info('Base de datos SQLite optimizada');
    } catch (error) {
      logger.error('Error optimizando SQLite:', error);
    }
  }
}

/**
 * Manager genérico para tablas SQLite
 */
class SQLiteTableManager {
  constructor(model, options = {}) {
    this.model = model;
    this.defaultIncludes = options.include || [];
  }

  async create(data) {
    return this.model.create(data);
  }

  async findById(id, options = {}) {
    return this.model.findByPk(id, {
      include: options.include || this.defaultIncludes,
      ...options
    });
  }

  async findOne(where, options = {}) {
    return this.model.findOne({
      where,
      include: options.include || this.defaultIncludes,
      ...options
    });
  }

  async findAll(options = {}) {
    return this.model.findAll({
      include: options.include || this.defaultIncludes,
      ...options
    });
  }

  async update(id, data) {
    const [updatedRowsCount] = await this.model.update(data, {
      where: { [this.model.primaryKeyField]: id }
    });
    
    if (updatedRowsCount > 0) {
      return this.findById(id);
    }
    return null;
  }

  async delete(id) {
    const deletedRowsCount = await this.model.destroy({
      where: { [this.model.primaryKeyField]: id }
    });
    return deletedRowsCount > 0;
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async findAndCountAll(options = {}) {
    return this.model.findAndCountAll({
      include: options.include || this.defaultIncludes,
      ...options
    });
  }

  // Métodos específicos para el sistema

  async checkConflicts(espacio_id, fecha, hora_inicio, hora_fin) {
    if (this.model.name !== 'Reserva') {
      throw new Error('checkConflicts solo está disponible para ReservaManager');
    }

    const { Op } = require('sequelize');
    
    const conflicts = await this.model.findAll({
      where: {
        idespacio: espacio_id,
        fechareserva: fecha,
        [Op.or]: [
          {
            horainicio: {
              [Op.lt]: hora_fin
            },
            horafin: {
              [Op.gt]: hora_inicio
            }
          }
        ]
      }
    });

    return conflicts.length > 0;
  }

  async findByDateRange(startDate, endDate, options = {}) {
    const { Op } = require('sequelize');
    
    return this.findAll({
      where: {
        fechareserva: {
          [Op.between]: [startDate, endDate]
        }
      },
      ...options
    });
  }

  async findByZona(zona_id, options = {}) {
    if (this.model.name !== 'Espacio') {
      throw new Error('findByZona solo está disponible para EspacioManager');
    }

    return this.findAll({
      where: { idzona: zona_id },
      ...options
    });
  }
}

module.exports = SQLiteManager;
