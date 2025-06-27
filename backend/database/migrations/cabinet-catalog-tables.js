import { runStatement } from '../connection.js';

export const createCabinetCatalogTables = async () => {
  const sql = `
    /*
      # Create Cabinet Catalog System

      1. New Tables
        - \`cabinet_categories\` - Categories of cabinets (base, wall, tall, etc.)
        - \`cabinet_models\` - Cabinet model templates
        - \`cabinet_materials\` - Materials used for cabinet construction
        - \`cabinet_hardware\` - Hardware items (hinges, handles, etc.)
        - \`cabinet_projects\` - User cabinet projects
        - \`cabinet_project_items\` - Cabinets in a project
        - \`cabinet_parts\` - Generated parts for cabinet construction
      2. Features
        - Full cabinet catalog system
        - Parametric cabinet generation
        - Cost calculation
        - Cutting optimization
    */

    -- Cabinet Categories table
    CREATE TABLE IF NOT EXISTS cabinet_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cabinet Models table
    CREATE TABLE IF NOT EXISTS cabinet_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT,
      default_width INTEGER NOT NULL,
      default_height INTEGER NOT NULL,
      default_depth INTEGER NOT NULL,
      min_width INTEGER NOT NULL,
      max_width INTEGER NOT NULL,
      min_height INTEGER NOT NULL,
      max_height INTEGER NOT NULL,
      min_depth INTEGER NOT NULL,
      max_depth INTEGER NOT NULL,
      image_url TEXT,
      construction_notes TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES cabinet_categories(id)
    );

    -- Cabinet Materials table
    CREATE TABLE IF NOT EXISTS cabinet_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('panel', 'edge_banding', 'back_panel', 'hardware')),
      thickness DECIMAL(10,2),
      width DECIMAL(10,2),
      height DECIMAL(10,2),
      unit TEXT NOT NULL,
      cost_per_unit DECIMAL(10,2) NOT NULL,
      color TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cabinet Hardware table
    CREATE TABLE IF NOT EXISTS cabinet_hardware (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      supplier_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Cabinet Projects table
    CREATE TABLE IF NOT EXISTS cabinet_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'quoted', 'approved', 'in_production', 'completed', 'cancelled')),
      total_cost DECIMAL(12,2) DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Cabinet Project Items table
    CREATE TABLE IF NOT EXISTS cabinet_project_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      model_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      depth INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      panel_material_id INTEGER,
      edge_material_id INTEGER,
      back_material_id INTEGER,
      door_material_id INTEGER,
      hardware_config TEXT, -- JSON string with hardware selections
      custom_options TEXT, -- JSON string with custom options
      unit_cost DECIMAL(12,2) DEFAULT 0,
      total_cost DECIMAL(12,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES cabinet_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES cabinet_models(id),
      FOREIGN KEY (panel_material_id) REFERENCES cabinet_materials(id),
      FOREIGN KEY (edge_material_id) REFERENCES cabinet_materials(id),
      FOREIGN KEY (back_material_id) REFERENCES cabinet_materials(id),
      FOREIGN KEY (door_material_id) REFERENCES cabinet_materials(id)
    );

    -- Cabinet Parts table
    CREATE TABLE IF NOT EXISTS cabinet_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      project_item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      part_type TEXT NOT NULL,
      material_id INTEGER NOT NULL,
      width DECIMAL(10,2) NOT NULL,
      height DECIMAL(10,2) NOT NULL,
      thickness DECIMAL(10,2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      edge_banding_top BOOLEAN DEFAULT 0,
      edge_banding_bottom BOOLEAN DEFAULT 0,
      edge_banding_left BOOLEAN DEFAULT 0,
      edge_banding_right BOOLEAN DEFAULT 0,
      edge_material_id INTEGER,
      notes TEXT,
      unit_cost DECIMAL(12,2) DEFAULT 0,
      total_cost DECIMAL(12,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES cabinet_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (project_item_id) REFERENCES cabinet_project_items(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES cabinet_materials(id),
      FOREIGN KEY (edge_material_id) REFERENCES cabinet_materials(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_cabinet_models_category ON cabinet_models(category_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_models_active ON cabinet_models(is_active);
    CREATE INDEX IF NOT EXISTS idx_cabinet_materials_type ON cabinet_materials(type);
    CREATE INDEX IF NOT EXISTS idx_cabinet_materials_active ON cabinet_materials(is_active);
    CREATE INDEX IF NOT EXISTS idx_cabinet_projects_status ON cabinet_projects(status);
    CREATE INDEX IF NOT EXISTS idx_cabinet_projects_created_by ON cabinet_projects(created_by);
    CREATE INDEX IF NOT EXISTS idx_cabinet_project_items_project ON cabinet_project_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_project_items_model ON cabinet_project_items(model_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_parts_project ON cabinet_parts(project_id);
    CREATE INDEX IF NOT EXISTS idx_cabinet_parts_project_item ON cabinet_parts(project_item_id);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};