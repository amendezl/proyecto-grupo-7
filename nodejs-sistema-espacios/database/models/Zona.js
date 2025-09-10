const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Zona = sequelize.define('Zona', {
    idzona: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idzona'
    },
    nombrezona: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'nombrezona'
    }
  }, {
    tableName: 'zona',
    timestamps: false,
    underscored: true
  });

  return Zona;
};
