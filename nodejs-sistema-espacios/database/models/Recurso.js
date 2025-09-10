const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recurso = sequelize.define('Recurso', {
    idrecurso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idrecurso'
    },
    nombrerecurso: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'nombrerecurso'
    }
  }, {
    tableName: 'recurso',
    timestamps: false,
    underscored: true
  });

  return Recurso;
};
