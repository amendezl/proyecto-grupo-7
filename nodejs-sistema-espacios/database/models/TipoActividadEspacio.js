const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoActividadEspacio = sequelize.define('TipoActividadEspacio', {
    idtipoactividad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idtipoactividad',
      references: {
        model: 'tipoactividad',
        key: 'idtipoactividad'
      }
    },
    idespacio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idespacio',
      references: {
        model: 'espacio',
        key: 'idespacio'
      }
    }
  }, {
    tableName: 'tipoactividadespacio',
    timestamps: false,
    underscored: true
  });

  return TipoActividadEspacio;
};
