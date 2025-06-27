import { runStatement, runQuery } from '../connection.js';

export const addItemTypeToInventory = async () => {
  const sql = `
    /*
      # Add item_type column to inventory_items table

      1. Changes
        - Add \`item_type\` column to \`inventory_items\` table
        - This column categorizes items as raw_material, semi_finished_product, or finished_product
        - Default value is 'raw_material' for backward compatibility
        - Add CHECK constraint to ensure valid values
      
      2. Purpose
        - Explicitly categorize inventory items by their type
        - Support filtering and reporting by item type
        - Enable production workflows based on item type
    */

    -- Add item_type column to inventory_items table if it doesn't exist
    ALTER TABLE inventory_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'raw_material' 
      CHECK (item_type IN ('raw_material', 'semi_finished_product', 'finished_product'));

    -- Create index for better performance when filtering by item type
    CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items(item_type);
  `;

  // Check if column already exists before attempting to add it
  const checkColumnSql = `SELECT COUNT(*) as count FROM pragma_table_info('inventory_items') WHERE name = 'item_type'`;
  
  try {
    const result = await runQuery(checkColumnSql);

    // Only run the migration if the column doesn't exist
    if (result[0].count === 0) {
      const statements = sql.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('/*'));
      for (const statement of statements) {
        if (statement.trim()) {
          await runStatement(statement.trim());
        }
      }
    }
  } catch (error) {
    // If the column already exists, SQLite will throw an error, which we can safely ignore
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }
};