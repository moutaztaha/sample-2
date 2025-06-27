import { runStatement, runQuery, initializeDatabase, closeDatabase } from '../backend/database/connection.js';

// Function to create a custom role with specific permissions
async function createCustomRole() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Starting to create custom role...');
    
    // Define the role name
    const roleName = 'supervisor'; // Change this to your desired role name
    
    // Get all permissions to assign to the role
    const permissions = await runQuery('SELECT id, name FROM permissions');
    
    if (!permissions || permissions.length === 0) {
      console.error('No permissions found in the database');
      return;
    }
    
    console.log(`Found ${permissions.length} permissions in the database`);
    
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    try {
      // Check if role already exists
      const existingRole = await runQuery(
        'SELECT role FROM role_permissions WHERE role = ? LIMIT 1',
        [roleName]
      );
      
      if (existingRole.length > 0) {
        console.log(`Role ${roleName} already exists, deleting existing permissions...`);
        await runStatement('DELETE FROM role_permissions WHERE role = ?', [roleName]);
      }
      
      // Define the permissions you want to assign to this role
      // This example gives inventory viewing and requisition creation permissions
      const permissionsToAssign = [
        'inventory.view',
        'inventory.view_stock_movements',
        'requisition.view',
        'requisition.create',
        'purchase_order.view',
        'report.view'
      ];
      
      console.log(`Assigning ${permissionsToAssign.length} permissions to ${roleName}`);
      
      // Insert role permissions
      for (const permName of permissionsToAssign) {
        const permission = permissions.find(p => p.name === permName);
        if (permission) {
          await runStatement(
            'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
            [roleName, permission.id]
          );
          console.log(`Assigned permission: ${permName}`);
        } else {
          console.warn(`Permission not found: ${permName}`);
        }
      }
      
      // Commit the transaction
      await runStatement('COMMIT');
      console.log(`✅ Role ${roleName} created successfully with ${permissionsToAssign.length} permissions`);
      
    } catch (error) {
      // Rollback the transaction on error
      await runStatement('ROLLBACK');
      console.error('❌ Error creating role:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run the function
createCustomRole().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed with error:', error);
  process.exit(1);
});