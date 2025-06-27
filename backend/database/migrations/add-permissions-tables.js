import { runStatement, runQuery } from '../connection.js';

export const addPermissionsTables = async () => {
  try {
    console.log('Adding permissions tables and data...');

    // Create permissions table
    await runStatement(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create role_permissions table
    await runStatement(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role, permission_id)
      )
    `);

    // Define all permissions
    const permissionsList = [
      // Inventory permissions
      { name: 'inventory.view', description: 'View inventory items' },
      { name: 'inventory.create', description: 'Create new inventory items' },
      { name: 'inventory.edit', description: 'Edit existing inventory items' },
      { name: 'inventory.delete', description: 'Delete inventory items' },
      { name: 'inventory.adjust_stock', description: 'Adjust inventory stock levels' },
      { name: 'inventory.view_stock_movements', description: 'View stock movement history' },
      { name: 'inventory.export', description: 'Export inventory data' },
      { name: 'inventory.import', description: 'Import inventory data' },
      
      // Requisition permissions
      { name: 'requisition.view', description: 'View requisitions' },
      { name: 'requisition.create', description: 'Create new requisitions' },
      { name: 'requisition.edit', description: 'Edit existing requisitions' },
      { name: 'requisition.delete', description: 'Delete requisitions' },
      { name: 'requisition.approve', description: 'Approve or reject requisitions' },
      { name: 'requisition.issue', description: 'Issue items for approved requisitions' },
      
      // Purchase Order permissions
      { name: 'purchase_order.view', description: 'View purchase orders' },
      { name: 'purchase_order.create', description: 'Create new purchase orders' },
      { name: 'purchase_order.edit', description: 'Edit existing purchase orders' },
      { name: 'purchase_order.delete', description: 'Delete purchase orders' },
      { name: 'purchase_order.approve', description: 'Approve purchase orders' },
      { name: 'purchase_order.send', description: 'Mark purchase orders as sent' },
      { name: 'purchase_order.receive', description: 'Receive items for purchase orders' },
      { name: 'purchase_order.create_from_requisition', description: 'Create purchase orders from requisitions' },
      
      // Production permissions
      { name: 'production.view', description: 'View production orders' },
      { name: 'production.create', description: 'Create new production orders' },
      { name: 'production.edit', description: 'Edit existing production orders' },
      { name: 'production.delete', description: 'Delete production orders' },
      { name: 'production.issue_materials', description: 'Issue materials for production' },
      { name: 'production.complete', description: 'Complete production orders' },
      { name: 'production.update_status', description: 'Update production order status' },
      
      // BOM permissions
      { name: 'bom.view', description: 'View bills of materials' },
      { name: 'bom.create', description: 'Create new bills of materials' },
      { name: 'bom.edit', description: 'Edit existing bills of materials' },
      { name: 'bom.delete', description: 'Delete bills of materials' },
      
      // Master Data permissions
      { name: 'master_data.view', description: 'View master data' },
      { name: 'master_data.manage_categories', description: 'Manage categories' },
      { name: 'master_data.manage_subcategories', description: 'Manage subcategories' },
      { name: 'master_data.manage_units', description: 'Manage units of measurement' },
      { name: 'master_data.manage_locations', description: 'Manage storage locations' },
      { name: 'master_data.manage_suppliers', description: 'Manage suppliers' },
      { name: 'master_data.manage_departments', description: 'Manage departments' },
      
      // User permissions
      { name: 'user.view', description: 'View users' },
      { name: 'user.create', description: 'Create new users' },
      { name: 'user.edit', description: 'Edit existing users' },
      { name: 'user.delete', description: 'Delete users' },
      { name: 'user.manage_permissions', description: 'Manage user permissions' },
      
      // Report permissions
      { name: 'report.view', description: 'View reports' },
      { name: 'report.create', description: 'Create custom reports' },
      { name: 'report.export', description: 'Export reports' },
      
      // Settings permissions
      { name: 'settings.view', description: 'View system settings' },
      { name: 'settings.manage_backup', description: 'Manage database backups' },
      { name: 'settings.restore_backup', description: 'Restore database from backup' },
      { name: 'settings.system_settings', description: 'Modify system settings' }
    ];

    // Insert permissions
    for (const permission of permissionsList) {
      try {
        await runStatement(
          'INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)',
          [permission.name, permission.description]
        );
      } catch (error) {
        console.error(`Error inserting permission ${permission.name}:`, error);
      }
    }

    // Get all permission IDs
    const permissions = await runQuery('SELECT id, name FROM permissions');
    const permissionMap = new Map(permissions.map(p => [p.name, p.id]));

    // Define role permissions
    const rolePermissions = {
      admin: permissionsList.map(p => p.name), // Admin gets all permissions
      
      manager: [
        // Inventory permissions for managers
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust_stock', 
        'inventory.view_stock_movements', 'inventory.export',
        
        // Requisition permissions for managers
        'requisition.view', 'requisition.create', 'requisition.edit', 'requisition.approve', 'requisition.issue',
        
        // Purchase Order permissions for managers
        'purchase_order.view', 'purchase_order.create', 'purchase_order.edit', 'purchase_order.approve',
        'purchase_order.send', 'purchase_order.receive', 'purchase_order.create_from_requisition',
        
        // Production permissions for managers
        'production.view', 'production.create', 'production.edit', 'production.issue_materials',
        'production.complete', 'production.update_status',
        
        // BOM permissions for managers
        'bom.view', 'bom.create', 'bom.edit',
        
        // Master Data permissions for managers
        'master_data.view',
        
        // Report permissions for managers
        'report.view', 'report.create', 'report.export',
        
        // Limited settings permissions
        'settings.view'
      ],
      
      user: [
        // Basic inventory permissions for users
        'inventory.view',
        
        // Basic requisition permissions for users
        'requisition.view', 'requisition.create',
        
        // View-only permissions for other modules
        'purchase_order.view',
        'production.view',
        'bom.view',
        'master_data.view',
        'report.view'
      ],
      
      // Add supervisor role with specific permissions
      supervisor: [
        // Inventory permissions
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust_stock', 
        'inventory.view_stock_movements', 'inventory.export',
        
        // Requisition permissions
        'requisition.view', 'requisition.create', 'requisition.edit', 'requisition.approve',
        
        // Purchase Order permissions
        'purchase_order.view', 'purchase_order.create',
        
        // Production permissions
        'production.view',
        
        // BOM permissions
        'bom.view',
        
        // Master Data permissions
        'master_data.view',
        
        // Report permissions
        'report.view', 'report.create',
        
        // Settings permissions
        'settings.view'
      ]
    };

    // Clear existing role permissions
    await runStatement('DELETE FROM role_permissions');

    // Insert role permissions
    for (const [role, permissionNames] of Object.entries(rolePermissions)) {
      for (const permissionName of permissionNames) {
        const permissionId = permissionMap.get(permissionName);
        if (permissionId) {
          try {
            await runStatement(
              'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
              [role, permissionId]
            );
          } catch (error) {
            console.error(`Error inserting role permission ${role}:${permissionName}:`, error);
          }
        } else {
          console.warn(`Permission not found: ${permissionName}`);
        }
      }
    }

    // Create indexes for better performance
    await runStatement('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)');
    await runStatement('CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)');

    console.log('✅ Permissions tables and data created successfully');
  } catch (error) {
    console.error('Error creating permissions tables:', error);
    throw error;
  }
};