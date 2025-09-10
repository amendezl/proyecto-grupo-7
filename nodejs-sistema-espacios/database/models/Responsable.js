const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Responsable = sequelize.define('Responsable', {
    rutresponsable: {
      type: DataTypes.STRING(11),
      primaryKey: true,
      field: 'rutresponsable'
    },
    idtipoactividad: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idtipoactividad',
      references: {
        model: 'tipoactividad',
        key: 'idtipoactividad'
      }
    },
    nombreresponsable: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'nombreresponsable'
    },
    apellidoresponsable: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'apellidoresponsable'
    },
    fechanacimientoresponsable: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fechanacimientoresponsable'
    }
  }, {
    tableName: 'responsable',
    timestamps: false,
    underscored: true
  });

  return Responsable;
};
