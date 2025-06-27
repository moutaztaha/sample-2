import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabase, getDatabase, initializeDatabase } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/wms.db');
const backupDir = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

export const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `wms_backup_${timestamp}.db`);
    
    // Close the database connection to ensure all data is written and file is unlocked
    await closeDatabase();
    
    // Wait a bit to ensure the file is fully released
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a backup by copying the database file
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(dbPath);
      const writeStream = fs.createWriteStream(backupPath);
      
      readStream.on('error', (err) => {
        console.error('Error reading database file:', err);
        reject(err);
      });
      
      writeStream.on('error', (err) => {
        console.error('Error writing backup file:', err);
        reject(err);
      });
      
      writeStream.on('finish', () => {
        console.log(`Backup created: ${backupPath}`);
        resolve(backupPath);
      });
      
      readStream.pipe(writeStream);
    });
    
    // Reinitialize the database connection
    await initializeDatabase();
    
    // Clean old backups (keep last 10)
    cleanOldBackups();
    
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    // Ensure database is reinitialized even if backup fails
    try {
      await initializeDatabase();
    } catch (reinitError) {
      console.error('Error reinitializing database after backup failure:', reinitError);
    }
    throw error;
  }
};

export const cleanOldBackups = () => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('wms_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the 10 most recent backups
    if (files.length > 10) {
      files.slice(10).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
};

export const startBackupScheduler = async () => {
  // Create initial backup
  await createBackup();
  
  // Schedule backups every 6 hours
  setInterval(async () => {
    try {
      await createBackup();
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  }, 6 * 60 * 60 * 1000);
  
  console.log('Backup scheduler started (every 6 hours)');
};

export const restoreBackup = async (backupPath) => {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }
    
    // Create a backup of current database before restore
    const currentBackupPath = await createBackup();
    console.log(`Current database backed up to: ${currentBackupPath}`);
    
    // Close the database connection before restoring
    await closeDatabase();
    
    // Wait a bit to ensure the file is fully released
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restore from backup
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(backupPath);
      const writeStream = fs.createWriteStream(dbPath);
      
      readStream.on('error', (err) => {
        console.error('Error reading backup file:', err);
        reject(err);
      });
      
      writeStream.on('error', (err) => {
        console.error('Error writing to database file:', err);
        reject(err);
      });
      
      writeStream.on('finish', () => {
        console.log(`Database restored from: ${backupPath}`);
        resolve(true);
      });
      
      readStream.pipe(writeStream);
    });
    
    // Reinitialize the database connection
    await initializeDatabase();
    
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    // Ensure database is reinitialized even if restore fails
    try {
      await initializeDatabase();
    } catch (reinitError) {
      console.error('Error reinitializing database after restore failure:', reinitError);
    }
    throw error;
  }
};

export const listBackups = () => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('wms_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    return files;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
};