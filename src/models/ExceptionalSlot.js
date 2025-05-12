const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExceptionalSlot = sequelize.define('ExceptionalSlot', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Durée en minutes
    allowNull: false,
    defaultValue: 90
  }
});

module.exports = ExceptionalSlot; 