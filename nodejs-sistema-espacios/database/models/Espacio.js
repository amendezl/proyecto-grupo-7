const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Espacio = sequelize.define('Espacio', {
    idespacio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idespacio'
    },
    idzona: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idzona',
      references: {
        model: 'zona',
        key: 'idzona'
      }
    },
    numeroespacio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'numeroespacio'
    },
    idestadoespacio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idestadoespacio',
      references: {
        model: 'estadoespacio',
        key: 'idestadoespacio'
      }
    },
    tipoactividadespacio: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'tipoactividadespacio'
    }
  }, {
    tableName: 'espacio',
    timestamps: false,
    underscored: true
  });

  return Espacio;
};
