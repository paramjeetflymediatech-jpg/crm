const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');
const Company = require('./company');
const Lead = require('./lead');
const User = require('./user');

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Company,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  lead_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Lead,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  call_sid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  from_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  to_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direction: {
    type: DataTypes.STRING,
    defaultValue: 'outbound'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'initiated'
  },
  recording_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'call_logs',
  underscored: true
});

module.exports = CallLog;
