import { runStatement, runQuery } from '../connection.js';

export const addUserSecurityEnhancements = async () => {
  /*
    # Add security enhancements to users table

    1. Changes
      - Add `failed_login_attempts` column to `users` table to track consecutive failed login attempts
      - Add `lockout_until` column to `users` table to store account lockout expiration time
      - Add `password_reset_token` column to `users` table for password reset functionality
      - Add `password_reset_expires` column to `users` table to store token expiration time
      - Add `last_login` column to `users` table to track user login activity
    
    2. Purpose
      - Enhance security by implementing account lockout after multiple failed login attempts
      - Enable secure password reset functionality
      - Track user login activity for security auditing
  */

  const columns = [
    { name: 'failed_login_attempts', definition: 'INTEGER DEFAULT 0' },
    { name: 'lockout_until', definition: 'DATETIME DEFAULT NULL' },
    { name: 'password_reset_token', definition: 'TEXT DEFAULT NULL' },
    { name: 'password_reset_expires', definition: 'DATETIME DEFAULT NULL' },
    { name: 'last_login', definition: 'DATETIME DEFAULT NULL' }
  ];

  try {
    // Check and add each column individually
    for (const column of columns) {
      const checkColumnSql = `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name = '${column.name}'`;
      const result = await runQuery(checkColumnSql);
      
      if (result[0].count === 0) {
        const addColumnSql = `ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`;
        await runStatement(addColumnSql);
        console.log(`✅ Added column '${column.name}' to users table`);
      } else {
        console.log(`Column '${column.name}' already exists in users table`);
      }
    }

    // Create index for password reset token lookups if it doesn't exist
    const createIndexSql = `CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)`;
    await runStatement(createIndexSql);
    console.log('✅ Password reset token index created/verified');

    console.log('✅ User security enhancements migration completed successfully');
  } catch (error) {
    console.error('Error adding user security enhancements:', error);
    throw error;
  }
};