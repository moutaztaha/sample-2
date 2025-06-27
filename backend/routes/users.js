import express from 'express';
import bcrypt from 'bcryptjs';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken, requireAdmin, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Static routes MUST come before parameterized routes
// Get all permissions
router.get('/permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const permissions = await runQuery(`
      SELECT id, name, description
      FROM permissions
      ORDER BY name
    `);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get role permissions
router.get('/role-permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    // Get all unique roles from the database
    const roles = await runQuery(`
      SELECT DISTINCT role FROM role_permissions
      UNION
      SELECT DISTINCT role FROM users
    `);
    
    const rolePermissions = [];
    
    for (const { role } of roles) {
      const permissions = await runQuery(`
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = ?
        ORDER BY p.name
      `, [role]);
      
      rolePermissions.push({
        role,
        permissions: permissions.map(p => p.name)
      });
    }
    
    res.json(rolePermissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Update role permissions
router.put('/role-permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const { rolePermissions } = req.body;
    
    if (!Array.isArray(rolePermissions)) {
      return res.status(400).json({ error: 'Invalid role permissions data' });
    }
    
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    try {
      // Get all permissions
      const permissions = await runQuery('SELECT id, name FROM permissions');
      const permissionMap = new Map(permissions.map(p => [p.name, p.id]));
      
      // Process each role
      for (const rolePermission of rolePermissions) {
        const { role, permissions } = rolePermission;
        
        // Skip admin role - admins always have all permissions
        if (role === 'admin') continue;
        
        // Delete existing role permissions
        await runStatement('DELETE FROM role_permissions WHERE role = ?', [role]);
        
        // Insert new role permissions
        for (const permissionName of permissions) {
          const permissionId = permissionMap.get(permissionName);
          if (permissionId) {
            await runStatement(
              'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
              [role, permissionId]
            );
          }
        }
      }
      
      // Commit the transaction
      await runStatement('COMMIT');
      
      res.json({ message: 'Role permissions updated successfully' });
    } catch (error) {
      // Rollback the transaction on error
      await runStatement('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// Get all available roles
router.get('/roles', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    // Get all unique roles from the database
    const roles = await runQuery(`
      SELECT DISTINCT role FROM role_permissions
      UNION
      SELECT DISTINCT role FROM users
      ORDER BY role
    `);
    
    res.json(roles.map(r => r.role));
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create a new role
router.post('/roles', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const { role, permissions = [] } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check if role already exists
    const existingRoles = await runQuery(`
      SELECT DISTINCT role FROM role_permissions WHERE role = ?
      UNION
      SELECT DISTINCT role FROM users WHERE role = ?
    `, [role, role]);
    
    if (existingRoles.length > 0) {
      return res.status(400).json({ error: 'Role already exists' });
    }
    
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    try {
      // Get permission IDs
      const permissionIds = [];
      if (permissions.length > 0) {
        const permissionRows = await runQuery(`
          SELECT id FROM permissions WHERE name IN (${permissions.map(() => '?').join(',')})
        `, permissions);
        
        permissionIds.push(...permissionRows.map(p => p.id));
      }
      
      // Insert role permissions
      for (const permissionId of permissionIds) {
        await runStatement(
          'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
          [role, permissionId]
        );
      }
      
      // Commit the transaction
      await runStatement('COMMIT');
      
      res.status(201).json({ 
        message: 'Role created successfully',
        role
      });
    } catch (error) {
      // Rollback the transaction on error
      await runStatement('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Delete a role - this needs to come before /:id routes
router.delete('/roles/:role', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const { role } = req.params;
    
    // Check if role is in use
    const usersWithRole = await runQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    
    if (usersWithRole[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role that is assigned to users',
        count: usersWithRole[0].count
      });
    }
    
    // Delete role permissions
    await runStatement('DELETE FROM role_permissions WHERE role = ?', [role]);
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Parameterized routes come AFTER static routes
// Get all users (admin only)
router.get('/', checkPermission('user.view'), async (req, res) => {
  try {
    const users = await runQuery(`
      SELECT id, username, email, role, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
router.post('/', checkPermission('user.create'), async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    const existingUsers = await runQuery(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runStatement(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user permissions
router.get('/:id/permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get user
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Get permissions for user's role
    const permissions = await runQuery(`
      SELECT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
      ORDER BY p.name
    `, [user.role]);
    
    res.json(permissions.map(p => p.name));
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// Get user-specific permissions
router.get('/:id/specific-permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get user
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user-specific permissions
    const userPermissions = await runQuery(`
      SELECT p.id, p.name, p.description, usp.grant_type
      FROM user_specific_permissions usp
      JOIN permissions p ON usp.permission_id = p.id
      WHERE usp.user_id = ?
      ORDER BY p.name
    `, [userId]);
    
    res.json(userPermissions);
  } catch (error) {
    console.error('Error fetching user-specific permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user-specific permissions' });
  }
});

// Update user-specific permissions
router.put('/:id/specific-permissions', checkPermission('user.manage_permissions'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { permissions } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }
    
    // Get user
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    try {
      // Delete existing user-specific permissions
      await runStatement('DELETE FROM user_specific_permissions WHERE user_id = ?', [userId]);
      
      // Insert new user-specific permissions
      for (const perm of permissions) {
        if (!perm.permission_id || !perm.grant_type) continue;
        
        await runStatement(`
          INSERT INTO user_specific_permissions (user_id, permission_id, grant_type)
          VALUES (?, ?, ?)
        `, [userId, perm.permission_id, perm.grant_type]);
      }
      
      // Commit the transaction
      await runStatement('COMMIT');
      
      res.json({ message: 'User-specific permissions updated successfully' });
    } catch (error) {
      // Rollback the transaction on error
      await runStatement('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating user-specific permissions:', error);
    res.status(500).json({ error: 'Failed to update user-specific permissions' });
  }
});

// Update user (admin only)
router.put('/:id', checkPermission('user.edit'), async (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    const userId = req.params.id;

    // Validate userId is a number
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (password !== undefined && password !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) { // Only timestamp field
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add the user ID to the end of the values array
    updateValues.push(userIdNum);

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    await runStatement(sql, updateValues);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', checkPermission('user.delete'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent deleting the last admin
    const adminCount = await runQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    const userToDelete = await runQuery('SELECT role FROM users WHERE id = ?', [userId]);

    if (userToDelete[0]?.role === 'admin' && adminCount[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }

    await runStatement('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;