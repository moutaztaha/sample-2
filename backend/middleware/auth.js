import jwt from 'jsonwebtoken';
import { runQuery } from '../database/connection.js';

// Use environment variable for JWT secret with no fallback
const JWT_SECRET = process.env.JWT_SECRET || 'wms-secret-key-change-in-production';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    
    // Fetch role-based permissions
    const rolePermissions = await runQuery(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
    `, [req.user.role]);
    
    // Fetch user-specific permissions
    const userSpecificPermissions = await runQuery(`
      SELECT p.name, usp.grant_type
      FROM user_specific_permissions usp
      JOIN permissions p ON usp.permission_id = p.id
      WHERE usp.user_id = ?
    `, [req.user.id]);
    
    // Start with role-based permissions
    const permissions = new Set(rolePermissions.map(p => p.name));
    
    // Apply user-specific permissions (overrides)
    userSpecificPermissions.forEach(p => {
      if (p.grant_type === 'allow') {
        permissions.add(p.name);
      } else if (p.grant_type === 'deny') {
        permissions.delete(p.name);
      }
    });
    
    // Add permissions to user object
    req.user.permissions = Array.from(permissions);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (req.user.permissions.includes(requiredPermission)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Permission denied', 
      requiredPermission: requiredPermission 
    });
  };
};

// Allow checking multiple permissions (any one of them is sufficient)
export const checkAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const hasPermission = requiredPermissions.some(permission => 
      req.user.permissions.includes(permission)
    );
    
    if (hasPermission) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Permission denied', 
      requiredPermissions: requiredPermissions 
    });
  };
};

// Require all specified permissions
export const checkAllPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const hasAllPermissions = requiredPermissions.every(permission => 
      req.user.permissions.includes(permission)
    );
    
    if (hasAllPermissions) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Permission denied', 
      requiredPermissions: requiredPermissions 
    });
  };
};

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return next(new Error('Authentication error'));
    }

    socket.user = users[0];
    
    // Fetch role-based permissions
    const rolePermissions = await runQuery(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
    `, [socket.user.role]);
    
    // Fetch user-specific permissions
    const userSpecificPermissions = await runQuery(`
      SELECT p.name, usp.grant_type
      FROM user_specific_permissions usp
      JOIN permissions p ON usp.permission_id = p.id
      WHERE usp.user_id = ?
    `, [socket.user.id]);
    
    // Start with role-based permissions
    const permissions = new Set(rolePermissions.map(p => p.name));
    
    // Apply user-specific permissions (overrides)
    userSpecificPermissions.forEach(p => {
      if (p.grant_type === 'allow') {
        permissions.add(p.name);
      } else if (p.grant_type === 'deny') {
        permissions.delete(p.name);
      }
    });
    
    // Add permissions to user object
    socket.user.permissions = Array.from(permissions);
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
};

export { JWT_SECRET };