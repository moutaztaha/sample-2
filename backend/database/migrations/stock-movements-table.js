import { runStatement } from '../connection.js';

export const createStockMovementsTable = async () => {
  const sql = `
    /*
      # Create stock movements tracking table

      1. New Tables
        - \`stock_movements\`
          - \`id\` (integer, primary key)
          - \`item_id\` (integer, foreign key to inventory_items)
          - \`movement_type\` (text, 'in' or 'out' or 'adjustment')
          - \`quantity\` (integer, the quantity moved)
          - \`reference_type\` (text, e.g., 'requisition', 'purchase_order', 'adjustment')
          - \`reference_id\` (integer, ID of the reference document)
          - \`reference_number\` (text, reference document number)
          - \`notes\` (text, additional information)
          - \`created_by\` (integer, foreign key to users)
          - \`created_at\` (timestamp)
      2. Security
        - No RLS needed as this is an internal tracking table
      3. Changes
        - Add stock movement tracking for inventory items
        - Will be used to show stock history and generate reports
    */

    -- Stock movements table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
      quantity INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id INTEGER,
      reference_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

    -- User preferences table for storing UI preferences
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      preference_type TEXT NOT NULL,
      preference_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, preference_type)
    );

    -- Create index for user preferences
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};