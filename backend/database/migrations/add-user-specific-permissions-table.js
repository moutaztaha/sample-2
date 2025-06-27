import { runStatement } from '../connection.js';

export const addUserSpecificPermissionsTable = async () => {
  /*
    # Add user-specific permissions table

    1. New Tables
      - `user_specific_permissions`
        - `id` (integer, primary key)
        - `user_id` (integer, foreign key to users)
        - `permission_id` (integer, foreign key to permissions)
        - `grant_type` (text, 'allow' or 'deny')
        - `created_at` (timestamp)
    
    2. Purpose
      - Enable per-user permission customization
      - Allow overriding role-based permissions for specific users
      - Support fine-grained access control at the user level
  */

  const sql = `
    -- Create user-specific permissions table
    CREATE TABLE IF NOT EXISTS user_specific_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      grant_type TEXT NOT NULL CHECK (grant_type IN ('allow', 'deny')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(user_id, permission_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_user_specific_permissions_user_id ON user_specific_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_specific_permissions_permission_id ON user_specific_permissions(permission_id);
  `;

  try {
    console.log('Creating user-specific permissions table...');
    
    const statements = sql.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await runStatement(statement.trim());
      }
    }
    
    console.log('✅ User-specific permissions table created successfully');
  } catch (error) {
    console.error('Error creating user-specific permissions table:', error);
    throw error;
  }
};