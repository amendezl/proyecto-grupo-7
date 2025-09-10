const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EspacioRecurso = sequelize.define('EspacioRecurso', {
    idrecurso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idrecurso',
      references: {
        model: 'recurso',
        key: 'idrecurso'
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
    },
    idestadorecurso: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idestadorecurso',
      references: {
        model: 'estadorecurso',
        key: 'idestadorecurso'
      }
    }
  }, {
    tableName: 'espaciorecurso',
    timestamps: false,
    underscored: true
  });

  return EspacioRecurso;
};
