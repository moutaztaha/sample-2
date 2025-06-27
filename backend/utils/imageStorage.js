import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define image storage directory
const imagesDir = path.join(__dirname, '../images');
const imageBackupsDir = path.join(__dirname, '../image_backups');

// Ensure directories exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

if (!fs.existsSync(imageBackupsDir)) {
  fs.mkdirSync(imageBackupsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const filename = `item_${timestamp}_${uniqueId}${fileExt}`;
    cb(null, filename);
  }
});

// Create multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Function to get image URL from filename
export const getImageUrl = (filename) => {
  if (!filename) return null;
  return `/api/images/${filename}`;
};

// Function to get image path from filename
export const getImagePath = (filename) => {
  if (!filename) return null;
  return path.join(imagesDir, filename);
};

// Function to delete an image
export const deleteImage = (filename) => {
  if (!filename) return;
  
  try {
    const imagePath = getImagePath(filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

// Function to create a backup of all images
export const backupImages = () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(imageBackupsDir, `images_backup_${timestamp}`);
    
    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copy all images to backup directory
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        try {
          const srcPath = path.join(imagesDir, file);
          const destPath = path.join(backupPath, file);
          fs.copyFileSync(srcPath, destPath);
        } catch (err) {
          console.error(`Error copying file ${file}:`, err);
        }
      }
    }
    
    console.log(`Image backup created: ${backupPath}`);
    
    // Clean old image backups (keep last 3)
    cleanOldImageBackups();
    
    return backupPath;
  } catch (error) {
    console.error('Error creating image backup:', error);
    return null;
  }
};

// Function to clean old image backups
export const cleanOldImageBackups = () => {
  try {
    if (!fs.existsSync(imageBackupsDir)) return;
    
    const dirs = fs.readdirSync(imageBackupsDir)
      .filter(dir => dir.startsWith('images_backup_'))
      .map(dir => ({
        name: dir,
        path: path.join(imageBackupsDir, dir),
        time: fs.statSync(path.join(imageBackupsDir, dir)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the 3 most recent backups
    if (dirs.length > 3) {
      dirs.slice(3).forEach(dir => {
        try {
          fs.rmSync(dir.path, { recursive: true, force: true });
          console.log(`Deleted old image backup: ${dir.name}`);
        } catch (err) {
          console.error(`Error deleting backup ${dir.name}:`, err);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning old image backups:', error);
  }
};

// Function to schedule the next backup
let backupTimeout = null;

const scheduleNextBackup = () => {
  // Clear any existing timeout
  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }
  
  // Schedule next backup in 30 days (in milliseconds)
  // Use a reasonable timeout value that fits in a 32-bit integer
  // 7 days is a good compromise (604800000 ms)
  backupTimeout = setTimeout(() => {
    backupImages();
    scheduleNextBackup(); // Schedule the next backup after this one completes
  }, 7 * 24 * 60 * 60 * 1000);
};

// Function to start monthly image backup scheduler
export const startImageBackupScheduler = () => {
  // Create initial backup
  backupImages();
  
  // Schedule recurring backups
  scheduleNextBackup();
  
  console.log('Image backup scheduler started (monthly)');
};

// Extract filename from image URL
export const getFilenameFromUrl = (url) => {
  if (!url) return null;
  
  // For local images stored in our system
  if (url.startsWith('/api/images/')) {
    return url.replace('/api/images/', '');
  }
  
  return null;
};