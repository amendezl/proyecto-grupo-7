const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Estado = sequelize.define('Estado', {
    idestado: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idestado'
    },
    descripcionestado: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'descripcionestado'
    }
  }, {
    tableName: 'estado',
    timestamps: false,
    underscored: true
  });

  return Estado;
};
