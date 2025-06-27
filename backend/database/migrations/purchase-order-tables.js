import { runStatement } from '../connection.js';

export const createPurchaseOrderTables = async () => {
  const sql = `
    /*
      # Create purchase orders system

      1. New Tables
        - \`purchase_orders\` - Main purchase order table
        - \`purchase_order_items\` - Items in each purchase order
      2. Features
        - Full purchase order workflow
        - Integration with requisitions
        - Supplier management
        - Status tracking
        - Receiving functionality
    */

    -- Purchase Orders table
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      supplier_id INTEGER NOT NULL,
      requisition_id INTEGER,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      order_date DATE,
      expected_delivery_date DATE,
      actual_delivery_date DATE,
      subtotal DECIMAL(12,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      shipping_cost DECIMAL(12,2) DEFAULT 0,
      total_amount DECIMAL(12,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      payment_terms TEXT,
      shipping_address TEXT,
      billing_address TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL,
      approved_by INTEGER,
      approval_date DATETIME,
      approval_notes TEXT,
      sent_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (requisition_id) REFERENCES requisitions(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    -- Purchase Order Items table
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      item_description TEXT,
      sku TEXT,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(12,2) NOT NULL,
      received_quantity INTEGER DEFAULT 0,
      unit_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    -- Purchase Order Receiving table
    CREATE TABLE IF NOT EXISTS po_receiving (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      po_item_id INTEGER NOT NULL,
      received_quantity INTEGER NOT NULL,
      received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      received_by INTEGER NOT NULL,
      notes TEXT,
      batch_number TEXT,
      expiry_date DATE,
      quality_check_passed BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id),
      FOREIGN KEY (received_by) REFERENCES users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);
    CREATE INDEX IF NOT EXISTS idx_po_receiving_po ON po_receiving(po_id);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};