const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoActividadResponsable = sequelize.define('TipoActividadResponsable', {
    idtipoactividad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idtipoactividad',
      references: {
        model: 'tipoactividad',
        key: 'idtipoactividad'
      }
    },
    rutresponsable: {
      type: DataTypes.STRING(11),
      primaryKey: true,
      field: 'rutresponsable',
      references: {
        model: 'responsable',
        key: 'rutresponsable'
      }
    }
  }, {
    tableName: 'tipoactividadresponsable',
    timestamps: false,
    underscored: true
  });

  return TipoActividadResponsable;
};
