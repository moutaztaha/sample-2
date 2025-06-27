import { runStatement } from '../connection.js';

export const createRequisitionTables = async () => {
  const sql = `
    -- Requisitions table
    CREATE TABLE IF NOT EXISTS requisitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'partially_approved', 'issued', 'partially_issued')),
      required_date DATE,
      department TEXT,
      requester_id INTEGER NOT NULL,
      approver_id INTEGER,
      approval_date DATETIME,
      approval_notes TEXT,
      issue_notes TEXT,
      issued_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );

    -- Requisition items table with all necessary columns
    CREATE TABLE IF NOT EXISTS requisition_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requisition_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      approved_quantity INTEGER DEFAULT 0,
      rejected_quantity INTEGER DEFAULT 0,
      issued_quantity INTEGER DEFAULT 0,
      estimated_cost DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      approval_notes TEXT,
      issue_notes TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'partially_approved')),
      issued_date DATETIME,
      issued_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (issued_by) REFERENCES users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
    CREATE INDEX IF NOT EXISTS idx_requisitions_requester ON requisitions(requester_id);
    CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON requisitions(created_at);
    CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition ON requisition_items(requisition_id);
  `;

  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await runStatement(statement.trim());
    }
  }
};