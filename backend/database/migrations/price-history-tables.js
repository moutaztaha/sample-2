import { runStatement } from '../connection.js';

export const createPriceHistoryTables = async () => {
  const sql = `
    /*
      # Create price history table for tracking price changes

      1. New Tables
        - \`price_history\`
          - \`id\` (integer, primary key)
          - \`item_id\` (integer, foreign key to inventory_items)
          - \`price\` (decimal, the price at this point in time)
          - \`created_at\` (timestamp)
      2. Changes
        - Add price history tracking for last price and average price calculations
        - Will be used to show price trends and history
    */

    -- Price history table
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    );

    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at);

    -- Insert initial price history for existing items
    INSERT OR IGNORE INTO price_history (item_id, price, created_at)
    SELECT id, unit_price, created_at
    FROM inventory_items
    WHERE unit_price > 0;
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};