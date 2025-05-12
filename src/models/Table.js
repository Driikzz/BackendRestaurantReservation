const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Table = sequelize.define('Table', {
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = Table;
