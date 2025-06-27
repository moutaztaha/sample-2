import express from 'express';
import { createBackup, restoreBackup, listBackups } from '../utils/backup.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(__dirname, '../backups');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
// Require admin for all backup operations
router.use(requireAdmin);

// Create a new backup
router.post('/create', async (req, res) => {
  try {
    const backupPath = await createBackup();
    const backupName = path.basename(backupPath);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        name: backupName,
        path: backupPath,
        time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// List all backups
router.get('/list', async (req, res) => {
  try {
    const backups = await listBackups();
    
    // Format the response
    const formattedBackups = backups.map(backup => ({
      name: backup.name,
      size: formatFileSize(backup.size),
      time: backup.time.toISOString(),
      date: backup.time.toLocaleDateString(),
      timestamp: backup.time.getTime()
    }));
    
    res.json({
      success: true,
      backups: formattedBackups
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Restore from a backup
router.post('/restore', async (req, res) => {
  try {
    const { backupName } = req.body;
    
    if (!backupName) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    await restoreBackup(backupPath);
    
    res.json({
      success: true,
      message: 'Database restored successfully',
      backup: backupName
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Delete a backup
router.delete('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    fs.unlinkSync(backupPath);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
      backup: backupName
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// Download a backup
router.get('/download/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    res.download(backupPath);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
}

export default router;