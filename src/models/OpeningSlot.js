const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OpeningSlot = sequelize.define('OpeningSlot', {
  day_of_week: {
    type: DataTypes.INTEGER, // 0 = Dimanche, 1 = Lundi, etc.
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    }
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Durée en minutes
    allowNull: false,
    defaultValue: 90
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

module.exports = OpeningSlot; 