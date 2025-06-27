import { runStatement } from '../connection.js';

export const createDepartmentTables = async () => {
  const sql = `
    /*
      # Create departments table

      1. New Tables
        - \`departments\`
          - \`id\` (integer, primary key)
          - \`name\` (text, unique, not null)
          - \`description\` (text)
          - \`manager\` (text)
          - \`budget\` (decimal)
          - \`created_at\` (timestamp)
      2. Security
        - No RLS needed for departments table as it's master data
      3. Changes
        - Add departments table for organizational structure
        - Will be used in requisitions and user management
    */

    -- Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      manager TEXT,
      budget DECIMAL(12,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default departments
    INSERT OR IGNORE INTO departments (name, description, manager, budget) VALUES 
    ('Information Technology', 'IT department responsible for technology infrastructure', 'John Smith', 150000.00),
    ('Human Resources', 'HR department managing employee relations and policies', 'Sarah Johnson', 80000.00),
    ('Finance', 'Finance department handling accounting and budgets', 'Michael Brown', 120000.00),
    ('Operations', 'Operations department managing daily business activities', 'Lisa Davis', 200000.00),
    ('Marketing', 'Marketing department handling promotions and communications', 'David Wilson', 100000.00),
    ('Procurement', 'Procurement department managing purchasing and vendor relations', 'Emily Chen', 75000.00),
    ('Maintenance', 'Maintenance department responsible for facility upkeep', 'Robert Garcia', 60000.00),
    ('Quality Assurance', 'QA department ensuring product and service quality', 'Jennifer Martinez', 90000.00);

    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};