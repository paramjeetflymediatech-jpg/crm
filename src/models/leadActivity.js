const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');
const Lead = require('./lead');
const User = require('./user');

const LeadActivity = sequelize.define('LeadActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lead_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Lead,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // system actions can have null user
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'lead_activities',
  underscored: true,
  updatedAt: false
});

module.exports = LeadActivity;
