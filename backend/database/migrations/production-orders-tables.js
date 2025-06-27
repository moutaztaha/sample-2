import { runStatement } from '../connection.js';

export const createProductionOrdersTables = async () => {
  const sql = `
    /*
      # Create Production Orders System

      1. New Tables
        - \`production_orders\` - Main production order table
        - \`production_order_items\` - Raw materials needed for production
        - \`production_order_operations\` - Manufacturing operations to perform
      2. Features
        - Full production workflow
        - Integration with BOM system
        - Raw material issuance
        - Finished product receipt
        - Operation tracking
    */

    -- Production Orders table
    CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      bom_id INTEGER,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'in_progress', 'completed', 'cancelled')),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      quantity INTEGER NOT NULL DEFAULT 1,
      start_date DATE,
      due_date DATE,
      completion_date DATE,
      finished_product_id INTEGER,
      finished_product_name TEXT,
      finished_product_sku TEXT,
      planned_cost DECIMAL(12,2) DEFAULT 0,
      actual_cost DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id),
      FOREIGN KEY (finished_product_id) REFERENCES inventory_items(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Production Order Items table (materials needed)
    CREATE TABLE IF NOT EXISTS production_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_order_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      item_sku TEXT,
      component_type TEXT DEFAULT 'item' CHECK (component_type IN ('item', 'bom')),
      component_bom_id INTEGER,
      required_quantity DECIMAL(10,4) NOT NULL,
      issued_quantity DECIMAL(10,4) DEFAULT 0,
      unit_id INTEGER,
      unit_name TEXT,
      unit_cost DECIMAL(10,4) DEFAULT 0,
      total_cost DECIMAL(12,4) DEFAULT 0,
      waste_factor DECIMAL(5,4) DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'issued', 'returned')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (component_bom_id) REFERENCES bill_of_materials(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    -- Production Order Operations table
    CREATE TABLE IF NOT EXISTS production_order_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_order_id INTEGER NOT NULL,
      operation_name TEXT NOT NULL,
      description TEXT,
      sequence_number INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
      planned_start_date DATETIME,
      planned_end_date DATETIME,
      actual_start_date DATETIME,
      actual_end_date DATETIME,
      estimated_time_minutes INTEGER DEFAULT 0,
      actual_time_minutes INTEGER DEFAULT 0,
      labor_rate DECIMAL(8,2) DEFAULT 0,
      machine_required TEXT,
      assigned_to INTEGER,
      skill_level TEXT DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'advanced', 'expert')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Production Order Issues table (for tracking material issuance)
    CREATE TABLE IF NOT EXISTS production_order_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_order_id INTEGER NOT NULL,
      production_order_item_id INTEGER NOT NULL,
      quantity DECIMAL(10,4) NOT NULL,
      issued_by INTEGER NOT NULL,
      issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (production_order_item_id) REFERENCES production_order_items(id) ON DELETE CASCADE,
      FOREIGN KEY (issued_by) REFERENCES users(id)
    );

    -- Production Order Completions table (for tracking finished goods)
    CREATE TABLE IF NOT EXISTS production_order_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_order_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      completed_by INTEGER NOT NULL,
      completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      quality_check_passed BOOLEAN DEFAULT 1,
      batch_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (completed_by) REFERENCES users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
    CREATE INDEX IF NOT EXISTS idx_production_orders_bom ON production_orders(bom_id);
    CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(finished_product_id);
    CREATE INDEX IF NOT EXISTS idx_production_orders_created_by ON production_orders(created_by);
    CREATE INDEX IF NOT EXISTS idx_production_orders_order_number ON production_orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_production_order_items_order ON production_order_items(production_order_id);
    CREATE INDEX IF NOT EXISTS idx_production_order_items_item ON production_order_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_production_order_items_status ON production_order_items(status);
    CREATE INDEX IF NOT EXISTS idx_production_order_operations_order ON production_order_operations(production_order_id);
    CREATE INDEX IF NOT EXISTS idx_production_order_operations_status ON production_order_operations(status);
    CREATE INDEX IF NOT EXISTS idx_production_order_issues_order ON production_order_issues(production_order_id);
    CREATE INDEX IF NOT EXISTS idx_production_order_completions_order ON production_order_completions(production_order_id);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};