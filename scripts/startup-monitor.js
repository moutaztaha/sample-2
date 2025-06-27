#!/usr/bin/env node

/**
 * WMS Application Startup Monitor
 * 
 * This script monitors the application startup process and automatically
 * fixes common issues to prevent "Error loading application" problems.
 * 
 * Usage: This runs automatically when starting the server
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const runCommand = (command, description) => {
  try {
    log(`Running: ${description}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`${description} completed successfully`, 'success');
    return output;
  } catch (error) {
    log(`${description} failed: ${error.message}`, 'error');
    throw error;
  }
};

const checkFileExists = (filePath) => {
  return fs.existsSync(filePath);
};

const ensureApplicationReady = () => {
  log('🔍 Checking application readiness...');
  
  let needsBuild = false;
  let needsInstall = false;
  
  // Check if node_modules exists
  if (!checkFileExists('node_modules')) {
    log('Missing node_modules directory', 'warning');
    needsInstall = true;
  }
  
  // Check if dist directory exists
  if (!checkFileExists('dist')) {
    log('Missing dist directory', 'warning');
    needsBuild = true;
  }
  
  // Check if dist/index.html exists
  if (!checkFileExists('dist/index.html')) {
    log('Missing dist/index.html', 'warning');
    needsBuild = true;
  }
  
  // Check if backend server exists
  if (!checkFileExists('backend/server.js')) {
    log('Missing backend/server.js', 'error');
    throw new Error('Backend server file is missing');
  }
  
  // Install dependencies if needed
  if (needsInstall) {
    runCommand('npm install', 'Installing dependencies');
  }
  
  // Build frontend if needed
  if (needsBuild) {
    runCommand('npm run build', 'Building frontend application');
  }
  
  // Create custom roles
  try {
    log('Creating custom roles...');
    runCommand('node scripts/create-custom-roles.js', 'Creating custom roles');
  } catch (error) {
    log('Warning: Failed to create custom roles. This is not critical.', 'warning');
  }
  
  // Verify everything is ready
  if (!checkFileExists('dist/index.html')) {
    throw new Error('Frontend build failed - index.html not found');
  }
  
  log('Application is ready to start!', 'success');
};

const monitorStartup = () => {
  try {
    ensureApplicationReady();
    return true;
  } catch (error) {
    log(`Startup check failed: ${error.message}`, 'error');
    return false;
  }
};

// Export for use in other scripts
export { monitorStartup, ensureApplicationReady };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = monitorStartup();
  process.exit(success ? 0 : 1);
}