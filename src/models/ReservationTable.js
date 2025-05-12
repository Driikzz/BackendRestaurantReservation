const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReservationTable = sequelize.define('ReservationTable', {
  ReservationId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Reservations',
      key: 'id'
    }
  },
  TableId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Tables',
      key: 'id'
    }
  }
}, {
  timestamps: false
});

module.exports = ReservationTable;
