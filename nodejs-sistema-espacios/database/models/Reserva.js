const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reserva = sequelize.define('Reserva', {
    idreserva: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idreserva'
    },
    idespacio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idespacio',
      references: {
        model: 'espacio',
        key: 'idespacio'
      }
    },
    rutusuario: {
      type: DataTypes.STRING(11),
      allowNull: true,
      field: 'rutusuario',
      references: {
        model: 'usuario',
        key: 'rutusuario'
      }
    },
    rutresponsable: {
      type: DataTypes.STRING(11),
      allowNull: true,
      field: 'rutresponsable',
      references: {
        model: 'responsable',
        key: 'rutresponsable'
      }
    },
    idestado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idestado',
      references: {
        model: 'estado',
        key: 'idestado'
      }
    },
    fechareserva: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fechareserva'
    },
    horainicio: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'horainicio'
    },
    horafin: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'horafin'
    },
    idtiporeserva: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idtiporeserva',
      references: {
        model: 'tiporeserva',
        key: 'idtiporeserva'
      }
    }
  }, {
    tableName: 'reserva',
    timestamps: false,
    underscored: true
  });

  return Reserva;
};
