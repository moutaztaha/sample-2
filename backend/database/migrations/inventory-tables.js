import { runStatement } from '../connection.js';

export const createInventoryTables = async () => {
  const sql = `
    -- Inventory items table
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      description TEXT,
      category_id INTEGER,
      subcategory_id INTEGER,
      unit_id INTEGER,
      location_id INTEGER,
      supplier_id INTEGER,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 0,
      max_quantity INTEGER DEFAULT 1000,
      unit_price DECIMAL(10,2) DEFAULT 0,
      total_value DECIMAL(10,2) DEFAULT 0,
      item_type TEXT NOT NULL DEFAULT 'raw_material' CHECK (item_type IN ('raw_material', 'semi_finished_product', 'finished_product')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
      FOREIGN KEY (unit_id) REFERENCES units(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    
    -- Create index for item_type
    CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items(item_type);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};