const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstname: DataTypes.STRING,
  lastname: DataTypes.STRING,
  phone: DataTypes.STRING,
  role: {
    type: DataTypes.STRING,
    defaultValue: 'client'
  }
});

module.exports = User;
