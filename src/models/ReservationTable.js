const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReservationTable = sequelize.define('ReservationTable', {}, { timestamps: false });

module.exports = ReservationTable;
