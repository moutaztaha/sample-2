#!/usr/bin/env node

/**
 * WMS Application Startup Fix Script
 * 
 * This script diagnoses and fixes common startup issues for the WMS application.
 * Run this script when you encounter "Error loading application" or similar startup problems.
 * 
 * Usage: node scripts/fix-startup.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const runCommand = (command, description) => {
  try {
    log(`Running: ${description}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} completed successfully`, 'success');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    throw error;
  }
};

const checkFileExists = (filePath) => {
  return fs.existsSync(filePath);
};

const diagnoseIssues = () => {
  log('🔍 Diagnosing application startup issues...');
  
  const issues = [];
  
  // Check if dist directory exists
  if (!checkFileExists('dist')) {
    issues.push('Missing dist directory - frontend not built');
  }
  
  // Check if dist/index.html exists
  if (!checkFileExists('dist/index.html')) {
    issues.push('Missing dist/index.html - frontend build incomplete');
  }
  
  // Check if package.json exists
  if (!checkFileExists('package.json')) {
    issues.push('Missing package.json - project configuration missing');
  }
  
  // Check if backend server file exists
  if (!checkFileExists('backend/server.js')) {
    issues.push('Missing backend/server.js - backend server missing');
  }
  
  // Check if node_modules exists
  if (!checkFileExists('node_modules')) {
    issues.push('Missing node_modules - dependencies not installed');
  }
  
  return issues;
};

const fixIssues = async () => {
  log('🔧 Starting application startup fix process...');
  
  const issues = diagnoseIssues();
  
  if (issues.length === 0) {
    log('No issues detected. Application should be ready to start.', 'success');
    return;
  }
  
  log(`Found ${issues.length} issue(s):`);
  issues.forEach(issue => log(`  - ${issue}`));
  
  try {
    // Fix 1: Install dependencies if missing
    if (!checkFileExists('node_modules')) {
      runCommand('npm install', 'Installing dependencies');
    }
    
    // Fix 2: Build frontend if missing or incomplete
    if (!checkFileExists('dist') || !checkFileExists('dist/index.html')) {
      runCommand('npm run build', 'Building frontend application');
    }
    
    // Fix 3: Verify backend server exists
    if (!checkFileExists('backend/server.js')) {
      log('❌ Backend server file is missing. This requires manual intervention.', 'error');
      return;
    }
    
    // Fix 4: Create custom roles
    log('Creating custom roles...');
    try {
      runCommand('node scripts/create-custom-roles.js', 'Creating custom roles');
    } catch (error) {
      log('Warning: Failed to create custom roles. This is not critical.', 'warning');
    }
    
    log('🎉 All issues have been resolved!', 'success');
    log('You can now start the application with: npm run server', 'info');
    
  } catch (error) {
    log(`Failed to fix issues: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  fixIssues().catch(error => {
    log(`Script failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

export { diagnoseIssues, fixIssues };