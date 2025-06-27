import { runStatement } from '../connection.js';

export const createAccessoriesTables = async () => {
  const sql = `
    /*
      # Create Accessories System for Cabinet Catalog

      1. New Tables
        - \`cabinet_accessories\` - Defines hardware and accessories for cabinets
        - \`cabinet_model_accessories\` - Links cabinet models to accessories with quantity formulas
        - \`cabinet_project_accessories\` - Tracks accessories used in specific cabinet projects
      
      2. Features
        - Dynamic accessory calculation based on formulas
        - Support for different accessory types (hinges, handles, slides, etc.)
        - Quantity formulas for automatic calculation
        - Project-specific accessory tracking
    */

    -- Cabinet Accessories table for defining hardware and accessories
    CREATE TABLE IF NOT EXISTS cabinet_accessories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('hinge', 'handle', 'drawer_slide', 'shelf_pin', 'connector', 'other')),
      unit_cost DECIMAL(10,2) NOT NULL,
      default_quantity_formula TEXT DEFAULT '1',
      supplier_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Cabinet Model Accessories table to link cabinet models to accessories
    CREATE TABLE IF NOT EXISTS cabinet_model_accessories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      accessory_id INTEGER NOT NULL,
      quantity_formula TEXT,
      is_required BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES cabinet_models(id) ON DELETE CASCADE,
      FOREIGN KEY (accessory_id) REFERENCES cabinet_accessories(id) ON DELETE CASCADE,
      UNIQUE(model_id, accessory_id)
    );

    -- Cabinet Project Accessories table to track accessories used in projects
    CREATE TABLE IF NOT EXISTS cabinet_project_accessories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      project_item_id INTEGER NOT NULL,
      accessory_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(12,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES cabinet_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (project_item_id) REFERENCES cabinet_project_items(id) ON DELETE CASCADE,
      FOREIGN KEY (accessory_id) REFERENCES cabinet_accessories(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_cabinet_accessories_type ON cabinet_accessories(type);
    CREATE INDEX IF NOT EXISTS idx_cabinet_accessories_active ON cabinet_accessories(is_active);
    CREATE INDEX IF NOT EXISTS idx_cabinet_model_accessories_model ON cabinet_model_accessories(model_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_project_accessories_project ON cabinet_project_accessories(project_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_project_accessories_item ON cabinet_project_accessories(project_item_id);

    -- Insert standard accessories with default formulas
    INSERT OR IGNORE INTO cabinet_accessories (name, description, type, unit_cost, default_quantity_formula) VALUES
    ('Concealed Hinge', '110° opening angle concealed hinge', 'hinge', 2.50, 'door_count * 2'),
    ('Drawer Slide', '450mm full extension drawer slide', 'drawer_slide', 8.99, 'drawer_count * 2'),
    ('Cabinet Handle', '128mm stainless steel bar handle', 'handle', 3.75, 'door_count + drawer_count'),
    ('Shelf Pin', '5mm shelf support pin', 'shelf_pin', 0.15, 'shelf_count * 4'),
    ('Cabinet Connector', 'Cabinet connecting bolt and nut', 'connector', 0.45, '4');
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};