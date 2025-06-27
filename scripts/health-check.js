#!/usr/bin/env node

/**
 * WMS Application Health Check Script
 * 
 * This script performs a comprehensive health check of the WMS application
 * and reports any issues that might prevent proper startup or operation.
 * 
 * Usage: node scripts/health-check.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const checkFile = (filePath, description) => {
  const exists = fs.existsSync(filePath);
  log(`${description}: ${exists ? 'Found' : 'Missing'}`, exists ? 'success' : 'error');
  return exists;
};

const checkDirectory = (dirPath, description) => {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  log(`${description}: ${exists ? 'Found' : 'Missing'}`, exists ? 'success' : 'error');
  return exists;
};

const checkCommand = (command, description) => {
  try {
    execSync(command, { stdio: 'pipe' });
    log(`${description}: Available`, 'success');
    return true;
  } catch (error) {
    log(`${description}: Not available`, 'error');
    return false;
  }
};

const checkPort = (port) => {
  try {
    // Try to connect to the port
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`, { 
      stdio: 'pipe',
      timeout: 5000 
    }).toString().trim();
    
    if (result === '200' || result === '404') {
      log(`Port ${port}: In use (application running)`, 'warning');
      return 'in-use';
    } else {
      log(`Port ${port}: Available`, 'success');
      return 'available';
    }
  } catch (error) {
    log(`Port ${port}: Available`, 'success');
    return 'available';
  }
};

const performHealthCheck = () => {
  log('🏥 Starting WMS Application Health Check...');
  
  let issues = 0;
  let warnings = 0;
  
  // Check essential files
  log('\n📁 Checking Essential Files:');
  if (!checkFile('package.json', 'Package configuration')) issues++;
  if (!checkFile('backend/server.js', 'Backend server')) issues++;
  if (!checkFile('src/App.tsx', 'Frontend application')) issues++;
  if (!checkFile('src/main.tsx', 'Frontend entry point')) issues++;
  if (!checkFile('index.html', 'HTML template')) issues++;
  
  // Check directories
  log('\n📂 Checking Directories:');
  if (!checkDirectory('backend', 'Backend directory')) issues++;
  if (!checkDirectory('src', 'Source directory')) issues++;
  if (!checkDirectory('backend/database', 'Database directory')) issues++;
  if (!checkDirectory('backend/routes', 'Routes directory')) issues++;
  
  // Check build output
  log('\n🏗️ Checking Build Output:');
  const distExists = checkDirectory('dist', 'Build output directory');
  if (!distExists) {
    issues++;
  } else {
    if (!checkFile('dist/index.html', 'Built HTML file')) issues++;
    if (!checkDirectory('dist/assets', 'Built assets directory')) issues++;
  }
  
  // Check dependencies
  log('\n📦 Checking Dependencies:');
  const nodeModulesExists = checkDirectory('node_modules', 'Node modules');
  if (!nodeModulesExists) {
    issues++;
  } else {
    // Check for key dependencies
    if (!checkDirectory('node_modules/react', 'React dependency')) warnings++;
    if (!checkDirectory('node_modules/express', 'Express dependency')) warnings++;
    if (!checkDirectory('node_modules/sqlite3', 'SQLite3 dependency')) warnings++;
  }
  
  // Check system requirements
  log('\n🖥️ Checking System Requirements:');
  if (!checkCommand('node --version', 'Node.js')) issues++;
  if (!checkCommand('npm --version', 'NPM')) issues++;
  
  // Check port availability
  log('\n🌐 Checking Network:');
  const portStatus = checkPort(3000);
  if (portStatus === 'in-use') {
    warnings++;
  }
  
  // Check database
  log('\n🗄️ Checking Database:');
  if (!checkDirectory('backend/data', 'Database directory')) {
    log('Creating database directory...', 'info');
    try {
      fs.mkdirSync('backend/data', { recursive: true });
      log('Database directory created', 'success');
    } catch (error) {
      log('Failed to create database directory', 'error');
      issues++;
    }
  }
  
  // Summary
  log('\n📊 Health Check Summary:');
  log(`Total Issues: ${issues}`, issues > 0 ? 'error' : 'success');
  log(`Total Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'success');
  
  if (issues === 0 && warnings === 0) {
    log('🎉 Application is healthy and ready to start!', 'success');
    log('Run: npm run server', 'info');
  } else if (issues === 0) {
    log('⚠️ Application should work but has some warnings', 'warning');
    log('Run: npm run server', 'info');
  } else {
    log('❌ Application has critical issues that need to be fixed', 'error');
    log('Run: node scripts/fix-startup.js', 'info');
  }
  
  return { issues, warnings };
};

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = performHealthCheck();
  process.exit(result.issues > 0 ? 1 : 0);
}

export { performHealthCheck };