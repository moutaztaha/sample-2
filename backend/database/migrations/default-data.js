import { runStatement } from '../connection.js';

export const createDefaultData = async () => {
  const sql = `
    -- Insert default categories if they don't exist
    INSERT OR IGNORE INTO categories (name, description) VALUES 
    ('Electronics', 'Electronic components and devices'),
    ('Office Supplies', 'General office supplies and stationery'),
    ('Tools', 'Hand tools and equipment'),
    ('Raw Materials', 'Raw materials for production'),
    ('Safety Equipment', 'Personal protective equipment and safety gear'),
    ('Furniture', 'Office and warehouse furniture'),
    ('Cleaning Supplies', 'Cleaning and maintenance supplies');

    -- Insert default units if they don't exist
    INSERT OR IGNORE INTO units (name, abbreviation) VALUES 
    ('Pieces', 'pcs'),
    ('Kilograms', 'kg'),
    ('Liters', 'L'),
    ('Meters', 'm'),
    ('Boxes', 'box'),
    ('Rolls', 'roll'),
    ('Sheets', 'sheet'),
    ('Bottles', 'btl'),
    ('Pairs', 'pair');

    -- Insert default locations if they don't exist
    INSERT OR IGNORE INTO locations (name, description) VALUES 
    ('Warehouse A', 'Main warehouse storage area'),
    ('Warehouse B', 'Secondary storage area'),
    ('Office Storage', 'Office supply storage'),
    ('Production Floor', 'Production area storage'),
    ('Loading Dock', 'Receiving and shipping area'),
    ('Cold Storage', 'Temperature controlled storage'),
    ('Cabinet Shop', 'Cabinet manufacturing area');
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};