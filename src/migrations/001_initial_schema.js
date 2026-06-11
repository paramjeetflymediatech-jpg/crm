/**
 * Migration: 001_initial_schema
 * 
 * Safely syncs all model columns to the live database.
 * Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS — safe to run multiple times.
 * 
 * Run with: node src/migrations/001_initial_schema.js
 */

require('dotenv').config();
const { sequelize, testConnection } = require('../lib/db');

async function runMigration() {
  await testConnection();
  const q = (sql) => sequelize.query(sql);

  console.log('\n🚀 Running migration: 001_initial_schema\n');

  try {
    // ─────────────────────────────────────────────
    // TABLE: companies
    // ─────────────────────────────────────────────
    console.log('  → companies');
    await q(`CREATE TABLE IF NOT EXISTS companies (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      company_name  VARCHAR(255) NOT NULL,
      website       VARCHAR(255),
      logo          VARCHAR(255),
      email         VARCHAR(255),
      phone         VARCHAR(255),
      api_key       VARCHAR(255) NOT NULL UNIQUE,
      facebook_page_id     VARCHAR(255),
      facebook_access_token TEXT,
      subscription_plan     VARCHAR(255) NOT NULL DEFAULT 'free',
      status        VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    // Add any new columns that might be missing on the live server
    const companyCols = [
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_page_id VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_access_token TEXT`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) NOT NULL DEFAULT 'free'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'active'`,
    ];
    for (const sql of companyCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: users
    // ─────────────────────────────────────────────
    console.log('  → users');
    await q(`CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) NOT NULL UNIQUE,
      password    VARCHAR(255) NOT NULL,
      role        ENUM('super_admin','company_admin','staff') NOT NULL DEFAULT 'staff',
      avatar      VARCHAR(255),
      phone       VARCHAR(255),
      status      VARCHAR(255) NOT NULL DEFAULT 'active',
      last_login  DATETIME,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const userCols = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'active'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME`,
    ];
    for (const sql of userCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: leads
    // ─────────────────────────────────────────────
    console.log('  → leads');
    await q(`CREATE TABLE IF NOT EXISTS leads (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT NOT NULL,
      assigned_to INT,
      source      VARCHAR(255),
      first_name  VARCHAR(255) NOT NULL,
      last_name   VARCHAR(255),
      email       VARCHAR(255),
      phone       VARCHAR(255),
      subject     VARCHAR(255),
      message     TEXT,
      status      VARCHAR(255) NOT NULL DEFAULT 'New',
      priority    ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
      lead_score  INT NOT NULL DEFAULT 0,
      follow_up_date DATETIME,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const leadCols = [
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(255)`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone VARCHAR(255)`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject VARCHAR(255)`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS message TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATETIME`,
    ];
    for (const sql of leadCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: lead_statuses
    // ─────────────────────────────────────────────
    console.log('  → lead_statuses');
    await q(`CREATE TABLE IF NOT EXISTS lead_statuses (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT NOT NULL,
      name        VARCHAR(255) NOT NULL,
      color       VARCHAR(255) NOT NULL DEFAULT '#cccccc',
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const leadStatusCols = [
      `ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS color VARCHAR(255) NOT NULL DEFAULT '#cccccc'`,
      `ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0`,
    ];
    for (const sql of leadStatusCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: lead_sources
    // ─────────────────────────────────────────────
    console.log('  → lead_sources');
    await q(`CREATE TABLE IF NOT EXISTS lead_sources (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT NOT NULL,
      source_name VARCHAR(255) NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    // ─────────────────────────────────────────────
    // TABLE: lead_notes
    // ─────────────────────────────────────────────
    console.log('  → lead_notes');
    await q(`CREATE TABLE IF NOT EXISTS lead_notes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      lead_id     INT NOT NULL,
      user_id     INT NOT NULL,
      note        TEXT NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    // ─────────────────────────────────────────────
    // TABLE: lead_activities
    // ─────────────────────────────────────────────
    console.log('  → lead_activities');
    await q(`CREATE TABLE IF NOT EXISTS lead_activities (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      lead_id     INT NOT NULL,
      user_id     INT,
      action      VARCHAR(255) NOT NULL,
      description TEXT,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const leadActivityCols = [
      `ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS description TEXT`,
    ];
    for (const sql of leadActivityCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: notifications
    // ─────────────────────────────────────────────
    console.log('  → notifications');
    await q(`CREATE TABLE IF NOT EXISTS notifications (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT NOT NULL,
      user_id     INT NOT NULL,
      lead_id     INT,
      title       VARCHAR(255) NOT NULL,
      message     TEXT NOT NULL,
      type        VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
      is_read     TINYINT(1) NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const notificationCols = [
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lead_id INT`,
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(255) NOT NULL DEFAULT 'SYSTEM'`,
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read TINYINT(1) NOT NULL DEFAULT 0`,
    ];
    for (const sql of notificationCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: tasks
    // ─────────────────────────────────────────────
    console.log('  → tasks');
    await q(`CREATE TABLE IF NOT EXISTS tasks (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT NOT NULL,
      lead_id     INT,
      assigned_to INT NOT NULL,
      title       VARCHAR(255) NOT NULL,
      description TEXT,
      due_date    DATETIME NOT NULL,
      status      VARCHAR(255) NOT NULL DEFAULT 'Pending',
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const taskCols = [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lead_id INT`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'Pending'`,
    ];
    for (const sql of taskCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    // ─────────────────────────────────────────────
    // TABLE: audit_logs
    // ─────────────────────────────────────────────
    console.log('  → audit_logs');
    await q(`CREATE TABLE IF NOT EXISTS audit_logs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      company_id  INT,
      user_id     INT,
      action      VARCHAR(255) NOT NULL,
      module      VARCHAR(255) NOT NULL,
      ip_address  VARCHAR(255),
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const auditLogCols = [
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(255)`,
    ];
    for (const sql of auditLogCols) {
      try { await q(sql); } catch (e) { /* column already exists */ }
    }

    console.log('\n✅ Migration 001_initial_schema completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message, '\n');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
