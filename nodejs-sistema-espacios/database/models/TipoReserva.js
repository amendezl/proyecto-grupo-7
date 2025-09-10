const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoReserva = sequelize.define('TipoReserva', {
    idtiporeserva: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idtiporeserva'
    },
    tiporeserva: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'tiporeserva'
    }
  }, {
    tableName: 'tiporeserva',
    timestamps: false,
    underscored: true
  });

  return TipoReserva;
};
