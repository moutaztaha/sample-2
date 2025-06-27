import bcrypt from 'bcryptjs';
import validator from 'validator';
import zxcvbn from 'zxcvbn';

// Password policy configuration
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minStrength: 3 // zxcvbn strength score (0-4)
};

// Account lockout configuration
const LOCKOUT_POLICY = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000 // 15 minutes in milliseconds
};

/**
 * Validates a password against the password policy
 * @param {string} password - The password to validate
 * @returns {Object} - Object with isValid flag and error message if invalid
 */
export const validatePassword = (password) => {
  const errors = [];

  // Check minimum length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  // Check for uppercase letters
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check password strength using zxcvbn
  const strength = zxcvbn(password);
  if (strength.score < PASSWORD_POLICY.minStrength) {
    errors.push('Password is too weak. Please choose a stronger password.');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: strength.score
  };
};

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
export const validateEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validates a username
 * @param {string} username - The username to validate
 * @returns {boolean} - True if username is valid, false otherwise
 */
export const validateUsername = (username) => {
  // Username should be 3-30 characters and contain only alphanumeric characters, underscores, and hyphens
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

/**
 * Hashes a password using bcrypt
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

/**
 * Compares a password with a hash
 * @param {string} password - The password to compare
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} - True if password matches hash, false otherwise
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Get lockout policy configuration
 * @returns {Object} - The lockout policy configuration
 */
export const getLockoutPolicy = () => {
  return { ...LOCKOUT_POLICY };
};

/**
 * Get password policy configuration
 * @returns {Object} - The password policy configuration
 */
export const getPasswordPolicy = () => {
  return { ...PASSWORD_POLICY };
};