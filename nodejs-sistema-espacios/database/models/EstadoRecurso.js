const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EstadoRecurso = sequelize.define('EstadoRecurso', {
    idestadorecurso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idestadorecurso'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'descripcion'
    }
  }, {
    tableName: 'estadorecurso',
    timestamps: false,
    underscored: true
  });

  return EstadoRecurso;
};
