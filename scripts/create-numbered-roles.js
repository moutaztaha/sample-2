import { runStatement, runQuery, initializeDatabase, closeDatabase } from '../backend/database/connection.js';

// Function to create numbered roles
async function createNumberedRoles() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Starting to create 20 numbered roles...');
    
    // Get all permissions to assign to roles
    const permissions = await runQuery('SELECT id, name FROM permissions');
    
    if (!permissions || permissions.length === 0) {
      console.error('No permissions found in the database');
      return;
    }
    
    console.log(`Found ${permissions.length} permissions in the database`);
    
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    try {
      // Create 20 numbered roles
      for (let i = 1; i <= 20; i++) {
        const roleName = `role${i}`;
        
        console.log(`Creating role: ${roleName}`);
        
        // Check if role already exists
        const existingRole = await runQuery(
          'SELECT role FROM role_permissions WHERE role = ? LIMIT 1',
          [roleName]
        );
        
        if (existingRole.length > 0) {
          console.log(`Role ${roleName} already exists, skipping...`);
          continue;
        }
        
        // Assign a random subset of permissions to each role
        // This creates varied permission sets for each role
        const permissionCount = Math.floor(Math.random() * permissions.length * 0.7) + 5; // At least 5 permissions
        const shuffledPermissions = [...permissions].sort(() => 0.5 - Math.random());
        const selectedPermissions = shuffledPermissions.slice(0, permissionCount);
        
        console.log(`Assigning ${selectedPermissions.length} permissions to ${roleName}`);
        
        // Insert role permissions
        for (const permission of selectedPermissions) {
          await runStatement(
            'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
            [roleName, permission.id]
          );
        }
        
        console.log(`✅ Role ${roleName} created successfully with ${selectedPermissions.length} permissions`);
      }
      
      // Commit the transaction
      await runStatement('COMMIT');
      console.log('✅ All 20 numbered roles created successfully');
      
    } catch (error) {
      // Rollback the transaction on error
      await runStatement('ROLLBACK');
      console.error('❌ Error creating roles:', error);
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
createNumberedRoles().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed with error:', error);
  process.exit(1);
});