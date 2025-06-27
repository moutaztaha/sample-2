import { runStatement, runQuery } from '../connection.js';

export const removeUsersRoleConstraint = async () => {
  /*
    # Remove role constraint from users table

    1. Changes
      - Remove the CHECK constraint on the role column in the users table
      - This allows for dynamic roles beyond the hardcoded 'admin', 'manager', and 'user'
    
    2. Purpose
      - Enable dynamic role creation and assignment
      - Support custom roles with specific permission sets
  */

  try {
    console.log('Starting migration to remove role constraint from users table...');

    // First, check if the users table exists
    const tableExists = await runQuery(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='users'
    `);

    if (tableExists.length === 0) {
      console.log('Users table does not exist, skipping migration');
      return;
    }

    // Get the current table schema to check if constraint exists
    const tableSchema = await runQuery(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='users'
    `);

    // Check if the constraint still exists
    const hasConstraint = tableSchema[0]?.sql?.includes('CHECK (role IN');
    
    if (!hasConstraint) {
      console.log('Role constraint already removed, skipping migration');
      return;
    }

    // Start a transaction and disable foreign key checks
    await runStatement('PRAGMA foreign_keys = OFF');
    await runStatement('BEGIN TRANSACTION');

    try {
      // Get all current data from users table
      const userData = await runQuery('SELECT * FROM users');

      // Create a new table without the CHECK constraint
      await runStatement(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          failed_login_attempts INTEGER DEFAULT 0,
          lockout_until DATETIME DEFAULT NULL,
          password_reset_token TEXT DEFAULT NULL,
          password_reset_expires DATETIME DEFAULT NULL,
          last_login DATETIME DEFAULT NULL
        )
      `);

      // Copy data from the old table to the new one
      if (userData.length > 0) {
        const columns = Object.keys(userData[0]);
        const placeholders = columns.map(() => '?').join(',');
        const columnNames = columns.join(',');
        
        for (const row of userData) {
          const values = columns.map(col => row[col]);
          await runStatement(
            `INSERT INTO users_new (${columnNames}) VALUES (${placeholders})`,
            values
          );
        }
      }

      // Drop the old table
      await runStatement('DROP TABLE users');

      // Rename the new table to the original name
      await runStatement('ALTER TABLE users_new RENAME TO users');

      // Recreate indexes if they existed
      await runStatement('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await runStatement('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await runStatement('CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)');

      // Commit the transaction and re-enable foreign key checks
      await runStatement('COMMIT');
      await runStatement('PRAGMA foreign_keys = ON');
      
      console.log('✅ Successfully removed role constraint from users table');
    } catch (error) {
      // Rollback the transaction on error and re-enable foreign keys
      await runStatement('ROLLBACK');
      await runStatement('PRAGMA foreign_keys = ON');
      console.error('Error removing role constraint:', error);
      throw error;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};