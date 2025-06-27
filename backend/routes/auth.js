import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, runStatement } from '../database/connection.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { 
  validatePassword, 
  validateEmail, 
  validateUsername, 
  getLockoutPolicy 
} from '../utils/passwordUtils.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Add logging middleware for auth routes
router.use((req, res, next) => {
  console.log(`Auth route: ${req.method} ${req.path}`);
  next();
});

// Rate limiting middleware for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

// Apply rate limiting to login and register routes
router.use('/login', authLimiter);
router.use('/register', authLimiter);

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    const users = await runQuery('SELECT * FROM users WHERE username = ?', [username]);
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    
    // Check if account is locked
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const lockoutRemaining = Math.ceil((new Date(user.lockout_until).getTime() - new Date().getTime()) / 60000);
      return res.status(401).json({ 
        error: `Account is temporarily locked. Please try again in ${lockoutRemaining} minutes.` 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log('Invalid password');
      
      // Increment failed login attempts
      const lockoutPolicy = getLockoutPolicy();
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      
      // Check if account should be locked
      if (failedAttempts >= lockoutPolicy.maxAttempts) {
        const lockoutUntil = new Date(Date.now() + lockoutPolicy.lockoutDuration);
        await runStatement(
          'UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?',
          [failedAttempts, lockoutUntil.toISOString(), user.id]
        );
        return res.status(401).json({ 
          error: `Too many failed login attempts. Account locked for ${lockoutPolicy.lockoutDuration / 60000} minutes.` 
        });
      } else {
        await runStatement(
          'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
          [failedAttempts, user.id]
        );
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts and lockout on successful login
    await runStatement(
      'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Fetch user permissions
    const permissions = await runQuery(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
    `, [user.role]);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: permissions.map(p => p.name)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register (admin only in production, open for demo)
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', { username: req.body.username, email: req.body.email });
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Validate username
    if (!validateUsername(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens' 
      });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
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

    console.log('User registered successfully:', username);
    res.status(201).json({
      message: 'User created successfully',
      userId: result.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = users[0];
    
    // Fetch user permissions
    const permissions = await runQuery(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
    `, [user.role]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: permissions.map(p => p.name)
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const users = await runQuery('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Don't reveal that the email doesn't exist for security reasons
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    const user = users[0];
    
    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save token to database
    await runStatement(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, resetExpires.toISOString(), user.id]
    );
    
    // In a real application, you would send an email with the reset link
    // For this demo, we'll just return the token in the response
    res.json({ 
      message: 'If your email is registered, you will receive a password reset link',
      // The following would normally not be included in the response
      // It's included here for demonstration purposes only
      resetToken,
      resetExpires
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }
    
    // Find user with this token and check if token is expired
    const users = await runQuery(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?',
      [token, new Date().toISOString()]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }
    
    const user = users[0];
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user's password and clear reset token
    await runStatement(
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (requires authentication)
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }
    
    // Get user
    const users = await runQuery('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await runStatement(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;