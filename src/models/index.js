const { sequelize, Sequelize, testConnection } = require('../lib/db');

// Import Models
const Company = require('./company');
const User = require('./user');
const Lead = require('./lead');
const LeadStatus = require('./leadStatus');
const LeadSource = require('./leadSource');
const LeadNote = require('./leadNote');
const LeadActivity = require('./leadActivity');
const Notification = require('./notification');
const Task = require('./task');
const AuditLog = require('./auditLog');

// 1. Company Relationships
Company.hasMany(User, { foreignKey: 'company_id', onDelete: 'CASCADE' });
User.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(Lead, { foreignKey: 'company_id', onDelete: 'CASCADE' });
Lead.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(LeadStatus, { foreignKey: 'company_id', onDelete: 'CASCADE' });
LeadStatus.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(LeadSource, { foreignKey: 'company_id', onDelete: 'CASCADE' });
LeadSource.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(Notification, { foreignKey: 'company_id', onDelete: 'CASCADE' });
Notification.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(Task, { foreignKey: 'company_id', onDelete: 'CASCADE' });
Task.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(AuditLog, { foreignKey: 'company_id', onDelete: 'CASCADE' });
AuditLog.belongsTo(Company, { foreignKey: 'company_id' });

// 2. User Relationships
User.hasMany(Lead, { foreignKey: 'assigned_to', as: 'AssignedLeads', onDelete: 'SET NULL' });
Lead.belongsTo(User, { foreignKey: 'assigned_to', as: 'AssignedUser' });

User.hasMany(LeadNote, { foreignKey: 'user_id', onDelete: 'CASCADE' });
LeadNote.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(LeadActivity, { foreignKey: 'user_id', onDelete: 'SET NULL' });
LeadActivity.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Task, { foreignKey: 'assigned_to', as: 'AssignedTasks', onDelete: 'CASCADE' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'AssignedUser' });

User.hasMany(AuditLog, { foreignKey: 'user_id', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// 3. Lead Relationships
Lead.hasMany(LeadNote, { foreignKey: 'lead_id', as: 'Notes', onDelete: 'CASCADE' });
LeadNote.belongsTo(Lead, { foreignKey: 'lead_id' });

Lead.hasMany(LeadActivity, { foreignKey: 'lead_id', as: 'Activities', onDelete: 'CASCADE' });
LeadActivity.belongsTo(Lead, { foreignKey: 'lead_id' });

Lead.hasMany(Notification, { foreignKey: 'lead_id', onDelete: 'SET NULL' });
Notification.belongsTo(Lead, { foreignKey: 'lead_id' });

Lead.hasMany(Task, { foreignKey: 'lead_id', as: 'Tasks', onDelete: 'CASCADE' });
Task.belongsTo(Lead, { foreignKey: 'lead_id' });


// Sync database schema & Seed Defaults
async function syncDatabase(force = false) {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    // Seed default entities if table is empty
    const companyCount = await Company.count();
    if (companyCount === 0) {
      console.log('Seeding initial default tenant data...');
      const bcrypt = require('bcryptjs');

      // Create main Company
      const defaultCompany = await Company.create({
        company_name: 'Acme Corporates',
        website: 'https://acme.com',
        email: 'info@acme.com',
        phone: '+1 555 123 456',
        api_key: 'acme_wp_integration_key_xyz_2026',
        subscription_plan: 'enterprise',
        status: 'active'
      });

      // Create Lead Statuses
      const defaultStatuses = [
        { name: 'New', color: '#3b82f6', sort_order: 1 },
        { name: 'Contacted', color: '#eab308', sort_order: 2 },
        { name: 'Qualified', color: '#10b981', sort_order: 3 },
        { name: 'Follow Up', color: '#a855f7', sort_order: 4 },
        { name: 'Proposal Sent', color: '#f97316', sort_order: 5 },
        { name: 'Converted', color: '#22c55e', sort_order: 6 },
        { name: 'Lost', color: '#ef4444', sort_order: 7 }
      ];

      for (const status of defaultStatuses) {
        await LeadStatus.create({
          ...status,
          company_id: defaultCompany.id
        });
      }

      // Create Lead Sources
      const defaultSources = [
        'Contact Form',
        'Facebook Ads',
        'Google Ads',
        'Organic Search',
        'Referral'
      ];

      for (const source of defaultSources) {
        await LeadSource.create({
          source_name: source,
          company_id: defaultCompany.id
        });
      }

      // Create default passwords
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      const hashedStaffPassword = await bcrypt.hash('staff123', 10);
      const hashedSuperPassword = await bcrypt.hash('super123', 10);

      // Create users
      // Super admin (no company bounds)
      await User.create({
        name: 'Super Administrator',
        email: 'super@crm.com',
        password: hashedSuperPassword,
        role: 'super_admin',
        status: 'active'
      });

      // Company Admin
      const companyAdmin = await User.create({
        company_id: defaultCompany.id,
        name: 'Acme Admin',
        email: 'admin@acme.com',
        password: hashedAdminPassword,
        role: 'company_admin',
        status: 'active'
      });

      // Staff User
      const staffUser = await User.create({
        company_id: defaultCompany.id,
        name: 'Acme Representative',
        email: 'staff@acme.com',
        password: hashedStaffPassword,
        role: 'staff',
        status: 'active'
      });

      // Seed mock leads
      const mockLeads = [
        {
          company_id: defaultCompany.id,
          assigned_to: staffUser.id,
          source: 'Contact Form',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 415 555 2671',
          subject: 'Roof Repair Inquiry',
          message: 'Hi, I need a quick quote for repairing a roof leak on my residential building.',
          status: 'New',
          priority: 'High',
          lead_score: 80
        },
        {
          company_id: defaultCompany.id,
          assigned_to: companyAdmin.id,
          source: 'Google Ads',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice.smith@example.com',
          phone: '+1 650 555 8891',
          subject: 'Enterprise CRM Consultation',
          message: 'Interested in scheduling a professional demo session for my company of 50 members.',
          status: 'Qualified',
          priority: 'Medium',
          lead_score: 65
        }
      ];

      for (const leadData of mockLeads) {
        const createdLead = await Lead.create(leadData);
        // Create initial activity logs
        await LeadActivity.create({
          lead_id: createdLead.id,
          user_id: null,
          action: 'Lead Created',
          description: `Lead registered via ${createdLead.source}.`
        });
      }

      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error('Error synchronizing database schema:', error);
  }
}

module.exports = {
  sequelize,
  Sequelize,
  Company,
  User,
  Lead,
  LeadStatus,
  LeadSource,
  LeadNote,
  LeadActivity,
  Notification,
  Task,
  AuditLog,
  syncDatabase
};
