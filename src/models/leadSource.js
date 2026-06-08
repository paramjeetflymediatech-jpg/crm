const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');
const Company = require('./company');

const LeadSource = sequelize.define('LeadSource', {
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
  source_name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'lead_sources',
  underscored: true
});

module.exports = LeadSource;
