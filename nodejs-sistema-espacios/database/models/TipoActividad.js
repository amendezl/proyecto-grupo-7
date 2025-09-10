const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoActividad = sequelize.define('TipoActividad', {
    idtipoactividad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idtipoactividad'
    },
    nombretipoactividad: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'nombretipoactividad'
    }
  }, {
    tableName: 'tipoactividad',
    timestamps: false,
    underscored: true
  });

  return TipoActividad;
};
