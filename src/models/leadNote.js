const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');
const Lead = require('./lead');
const User = require('./user');

const LeadNote = sequelize.define('LeadNote', {
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
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'lead_notes',
  underscored: true,
  updatedAt: false // notes don't typically need updated_at, just created_at
});

module.exports = LeadNote;
