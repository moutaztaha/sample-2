import { runStatement } from '../connection.js';

export const createPartTypesTable = async () => {
  const sql = `
    /*
      # Create Part Types System for Cabinet Catalog

      1. New Tables
        - \`part_types\` - Defines generic cabinet parts with parametric formulas
        - \`cabinet_model_parts\` - Links cabinet models to part types with model-specific overrides
      
      2. Features
        - Parametric part generation based on formulas
        - Support for custom width/height calculations per model
        - Default material type hints
        - Quantity formulas for dynamic part counts
    */

    -- Part Types table for defining generic cabinet parts
    CREATE TABLE IF NOT EXISTS part_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      default_formula_width TEXT NOT NULL,
      default_formula_height TEXT NOT NULL,
      default_thickness INTEGER NOT NULL DEFAULT 18,
      default_material_type TEXT DEFAULT 'panel',
      default_edge_material_type TEXT DEFAULT 'edge_banding',
      is_standard_part BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cabinet Model Parts table to link cabinet models to part types
    CREATE TABLE IF NOT EXISTS cabinet_model_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      part_type_id INTEGER NOT NULL,
      quantity_formula TEXT NOT NULL DEFAULT '1',
      custom_formula_width TEXT,
      custom_formula_height TEXT,
      default_edge_top BOOLEAN DEFAULT 0,
      default_edge_bottom BOOLEAN DEFAULT 0,
      default_edge_left BOOLEAN DEFAULT 0,
      default_edge_right BOOLEAN DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES cabinet_models(id) ON DELETE CASCADE,
      FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE CASCADE,
      UNIQUE(model_id, part_type_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_part_types_name ON part_types(name);
    CREATE INDEX IF NOT EXISTS idx_cabinet_model_parts_model ON cabinet_model_parts(model_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_model_parts_part_type ON cabinet_model_parts(part_type_id);

    -- Insert standard part types with default formulas
    INSERT OR IGNORE INTO part_types (name, description, default_formula_width, default_formula_height, default_thickness, default_material_type) VALUES
    ('Side Panel', 'Cabinet side panel', 'cabinet_depth', 'cabinet_height', 18, 'panel'),
    ('Bottom Panel', 'Cabinet bottom panel', 'cabinet_width - (2 * panel_thickness)', 'cabinet_depth', 18, 'panel'),
    ('Top Panel', 'Cabinet top panel', 'cabinet_width - (2 * panel_thickness)', 'cabinet_depth', 18, 'panel'),
    ('Back Panel', 'Cabinet back panel', 'cabinet_width - (2 * panel_thickness)', 'cabinet_height - (2 * panel_thickness)', 6, 'back_panel'),
    ('Shelf', 'Adjustable shelf', 'cabinet_width - (2 * panel_thickness) - 2', 'cabinet_depth - 20', 18, 'panel'),
    ('Door', 'Cabinet door', 'cabinet_width - 10', 'cabinet_height - 10', 18, 'panel'),
    ('Drawer Front', 'Drawer front panel', 'cabinet_width - 10', '150', 18, 'panel'),
    ('Drawer Side', 'Drawer side panel', 'cabinet_depth - 40', '150', 15, 'panel'),
    ('Drawer Back', 'Drawer back panel', 'cabinet_width - (2 * drawer_side_thickness) - 10', '150', 15, 'panel'),
    ('Drawer Bottom', 'Drawer bottom panel', 'cabinet_width - (2 * drawer_side_thickness) - 10', 'cabinet_depth - 40', 6, 'back_panel'),
    ('Upright', 'Vertical divider panel', 'cabinet_depth', 'cabinet_height - (2 * panel_thickness)', 18, 'panel'),
    ('Horizontal Divider', 'Horizontal divider panel', 'cabinet_width - (2 * panel_thickness)', 'cabinet_depth', 18, 'panel');
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};