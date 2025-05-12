const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExceptionalDate = sequelize.define('ExceptionalDate', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_closed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = ExceptionalDate; 