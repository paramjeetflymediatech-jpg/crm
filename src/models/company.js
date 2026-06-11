const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/db');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  api_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  facebook_page_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  facebook_access_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subscription_plan: {
    type: DataTypes.STRING,
    defaultValue: 'free', // e.g. free, professional, enterprise
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active', // active, suspended
    allowNull: false
  }
}, {
  tableName: 'companies',
  underscored: true
});

module.exports = Company;
