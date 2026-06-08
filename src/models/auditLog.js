const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');
const Company = require('./company');
const User = require('./user');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for system or Super Admin actions
    references: {
      model: Company,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable if action is public or automated system
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
  module: {
    type: DataTypes.STRING,
    allowNull: false // e.g. Auth, Leads, Settings, Users
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  updatedAt: false // audit logs are insert-only
});

module.exports = AuditLog;
