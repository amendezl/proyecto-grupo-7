const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    rutusuario: {
      type: DataTypes.STRING(11),
      primaryKey: true,
      field: 'rutusuario'
    },
    nombreusuario: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'nombreusuario'
    },
    apellidousuario: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'apellidousuario'
    },
    fechanacimientousuario: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fechanacimientousuario'
    }
  }, {
    tableName: 'usuario',
    timestamps: false,
    underscored: true
  });

  return Usuario;
};
