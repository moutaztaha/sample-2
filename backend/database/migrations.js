import { runStatement, runQuery } from './connection.js';
import bcrypt from 'bcryptjs';
import { addAllSampleData } from './sample-data.js';
import { createInitialSchema } from './migrations/initial-schema.js';
import { createInventoryTables } from './migrations/inventory-tables.js';
import { createAuditTables } from './migrations/audit-tables.js';
import { createDefaultData } from './migrations/default-data.js';
import { createSubcategoriesData } from './migrations/subcategories-data.js';
import { createRequisitionTables } from './migrations/requisition-tables.js';
import { createDepartmentTables } from './migrations/department-tables.js';
import { createPriceHistoryTables } from './migrations/price-history-tables.js';
import { createPurchaseOrderTables } from './migrations/purchase-order-tables.js';
import { createBOMTables } from './migrations/create-bom-tables.js';
import { createStockMovementsTable } from './migrations/stock-movements-table.js';
import { createProductionOrdersTables } from './migrations/production-orders-tables.js';
import { createUserPreferencesIndex } from './migrations/user-preferences-index.js';
import { addItemTypeToInventory } from './migrations/add-item-type-to-inventory.js';
import { addImageUrlToInventory } from './migrations/add-image-url-to-inventory.js';
import { addUserSecurityEnhancements } from './migrations/user-security-enhancements.js';
import { addPermissionsTables } from './migrations/add-permissions-tables.js';
import { removeUsersRoleConstraint } from './migrations/remove-users-role-constraint.js';
import { addUserSpecificPermissionsTable } from './migrations/add-user-specific-permissions-table.js';

const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    execute: createInitialSchema
  },
  {
    version: 2,
    name: 'inventory_items',
    execute: createInventoryTables
  },
  {
    version: 3,
    name: 'audit_trail',
    execute: createAuditTables
  },
  {
    version: 4,
    name: 'default_data',
    execute: createDefaultData
  },
  {
    version: 5,
    name: 'subcategories_data',
    execute: createSubcategoriesData
  },
  {
    version: 6,
    name: 'requisitions_tables',
    execute: createRequisitionTables
  },
  {
    version: 7,
    name: 'departments_table',
    execute: createDepartmentTables
  },
  {
    version: 8,
    name: 'price_history_table',
    execute: createPriceHistoryTables
  },
  {
    version: 12,
    name: 'purchase_orders_tables',
    execute: createPurchaseOrderTables
  },
  {
    version: 13,
    name: 'bom_tables',
    execute: createBOMTables
  },
  {
    version: 14,
    name: 'stock_movements_table',
    execute: createStockMovementsTable
  },
  {
    version: 15,
    name: 'production_orders_tables',
    execute: createProductionOrdersTables
  },
  {
    version: 16,
    name: 'user_preferences_index',
    execute: createUserPreferencesIndex
  },
  {
    version: 17,
    name: 'add_item_type_to_inventory',
    execute: addItemTypeToInventory
  },
  {
    version: 18,
    name: 'add_image_url_to_inventory',
    execute: addImageUrlToInventory
  },
  {
    version: 19,
    name: 'add_user_security_enhancements',
    execute: addUserSecurityEnhancements
  },
  {
    version: 20,
    name: 'add_permissions_tables',
    execute: addPermissionsTables
  },
  {
    version: 21,
    name: 'remove_users_role_constraint',
    execute: removeUsersRoleConstraint
  },
  {
    version: 22,
    name: 'add_user_specific_permissions_table',
    execute: addUserSpecificPermissionsTable
  }
];

export const runMigrations = async () => {
  try {
    // Create migrations table if it doesn't exist
    await runStatement(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const executedMigrations = await runQuery('SELECT version FROM migrations ORDER BY version');
    const executedVersions = executedMigrations.map(m => m.version);

    // Run pending migrations
    for (const migration of migrations) {
      if (!executedVersions.includes(migration.version)) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.execute();
        } catch (error) {
          console.error(`Error executing migration ${migration.version}:`, error);
          throw error;
        }

        // Record migration as executed
        await runStatement(
          'INSERT INTO migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );

        console.log(`Migration ${migration.version} completed`);
      }
    }

    // Create default admin user AFTER migrations have run to ensure users table exists
    const existingAdmin = await runQuery('SELECT * FROM users WHERE username = ?', ['admin']);
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await runStatement(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@wms.local', hashedPassword, 'admin']
      );
      console.log('Default admin user created');
      
      // Create a regular user for testing
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      await runStatement(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['user', 'user@wms.local', hashedUserPassword, 'user']
      );
      console.log('Default regular user created');
      
      // Create a manager user for testing
      const hashedManagerPassword = await bcrypt.hash('manager123', 10);
      await runStatement(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['manager', 'manager@wms.local', hashedManagerPassword, 'manager']
      );
      console.log('Default manager user created');
    }

    // Add comprehensive sample data
    await addAllSampleData();

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};