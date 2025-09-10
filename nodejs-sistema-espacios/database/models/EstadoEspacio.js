const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EstadoEspacio = sequelize.define('EstadoEspacio', {
    idestadoespacio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idestadoespacio'
    },
    descripcionestadoespacio: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'descripcionestadoespacio'
    }
  }, {
    tableName: 'estadoespacio',
    timestamps: false,
    underscored: true
  });

  return EstadoEspacio;
};
