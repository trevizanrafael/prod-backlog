const db = require('./database');

/**
 * Run all database migrations to create tables automatically
 */
async function runMigrations() {
  console.log('🔄 Running database migrations...');

  try {
    // Create scopes table
    await db.query(`
      CREATE TABLE IF NOT EXISTS scopes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "scopes" ready');

    // Create tasks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description_problem TEXT,
        description_solution TEXT,
        due_date DATE NOT NULL,
        complexity VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        scope_id INTEGER REFERENCES scopes(id) ON DELETE SET NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "tasks" ready');

    // Create task_screenshots table
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_screenshots (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "task_screenshots" ready');

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(scope_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
    `);
    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(scope_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
    `);
    console.log('✅ Indexes created');

    // Add new columns if they don't exist (for existing databases)
    try {
      await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;`);
      await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS resolution_notes TEXT;`);
      await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kanban_status VARCHAR(50) DEFAULT 'pending';`); // Kanban support
      await db.query(`ALTER TABLE task_screenshots ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'problem';`);
      console.log('✅ Schema updated with new columns');
    } catch (err) {
      console.log('⚠️ Error updating schema (might already exist):', err.message);
    }

    // Create roles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        permissions JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "roles" ready');

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "users" ready');

    // ==================== DRIVE MODULE TABLES ====================

    // Create folders table
    await db.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "folders" ready');

    // Create files table
    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        path VARCHAR(500) NOT NULL,
        size BIGINT NOT NULL,
        type VARCHAR(100),
        folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "files" ready');

    // Drive Indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);`);
    
    // =============================================================

    // Seed default roles if they don't exist
    const adminRole = await db.query(`
      INSERT INTO roles (name, permissions)
      VALUES ('Admin', '{"view_dashboard": true, "create_task": true, "edit_task": true, "set_priority": true, "manage_scopes": true, "archive_task": true, "delete_task": true, "system_settings": true, "manage_users": true}')
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `);

    const viewerRole = await db.query(`
      INSERT INTO roles (name, permissions)
      VALUES ('Visualizador', '{"view_dashboard": true, "create_task": false, "edit_task": false, "set_priority": false, "manage_scopes": false, "archive_task": false, "delete_task": false, "system_settings": false, "manage_users": false}')
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `);
    console.log('✅ Default roles seeded');

    // Seed default admin user if doesn't exist
    // Password: guassu324 (will be hashed by bcrypt in a separate step)
    const bcrypt = require('bcrypt');
    const defaultPassword = await bcrypt.hash('guassu324', 10);

    await db.query(`
      INSERT INTO users (username, password_hash, name, role_id)
      VALUES ('SuperUser', $1, 'Admin', (SELECT id FROM roles WHERE name = 'Admin'))
      ON CONFLICT (username) DO NOTHING
    `, [defaultPassword]);
    console.log('✅ Default admin user created');

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

module.exports = { runMigrations };
