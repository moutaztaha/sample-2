#!/usr/bin/env node

/**
 * WMS Application Auto-Fix Script
 * 
 * This script automatically detects and fixes common application issues
 * to prevent "Error loading application" problems.
 * 
 * Usage: node scripts/auto-fix.js
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

const autoFix = async () => {
  log('🔧 Starting WMS Application Auto-Fix...');
  
  let issuesFixed = 0;
  
  try {
    // Check 1: Node modules
    if (!checkFileExists('node_modules')) {
      log('Fixing: Missing node_modules', 'warning');
      runCommand('npm install', 'Installing dependencies');
      issuesFixed++;
    }
    
    // Check 2: Package lock
    if (!checkFileExists('package-lock.json')) {
      log('Fixing: Missing package-lock.json', 'warning');
      runCommand('npm install', 'Regenerating package-lock.json');
      issuesFixed++;
    }
    
    // Check 3: Dist directory
    if (!checkFileExists('dist')) {
      log('Fixing: Missing dist directory', 'warning');
      runCommand('npm run build', 'Building frontend');
      issuesFixed++;
    }
    
    // Check 4: Index.html
    if (!checkFileExists('dist/index.html')) {
      log('Fixing: Missing dist/index.html', 'warning');
      runCommand('npm run build', 'Rebuilding frontend');
      issuesFixed++;
    }
    
    // Check 5: Assets directory
    if (!checkFileExists('dist/assets')) {
      log('Fixing: Missing dist/assets', 'warning');
      runCommand('npm run build', 'Rebuilding frontend assets');
      issuesFixed++;
    }
    
    // Check 6: Backend server
    if (!checkFileExists('backend/server.js')) {
      log('Critical: Missing backend/server.js', 'error');
      throw new Error('Backend server file is missing - this requires manual intervention');
    }
    
    // Check 7: Database directory
    if (!checkFileExists('backend/data')) {
      log('Fixing: Creating database directory', 'warning');
      fs.mkdirSync('backend/data', { recursive: true });
      issuesFixed++;
    }
    
    // Final verification
    const criticalFiles = [
      'package.json',
      'backend/server.js',
      'dist/index.html',
      'node_modules'
    ];
    
    let allGood = true;
    for (const file of criticalFiles) {
      if (!checkFileExists(file)) {
        log(`Critical file missing: ${file}`, 'error');
        allGood = false;
      }
    }
    
    if (allGood) {
      log(`🎉 Auto-fix completed! Fixed ${issuesFixed} issue(s)`, 'success');
      log('Application is ready to start with: npm run server', 'success');
    } else {
      log('❌ Some critical issues remain - manual intervention required', 'error');
    }
    
    return allGood;
    
  } catch (error) {
    log(`Auto-fix failed: ${error.message}`, 'error');
    return false;
  }
};

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  autoFix().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { autoFix };