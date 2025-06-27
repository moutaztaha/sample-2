import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database/connection.js';
import { runMigrations } from './database/migrations.js';
import { startBackupScheduler } from './utils/backup.js';
import { startImageBackupScheduler } from './utils/imageStorage.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import inventoryRoutes from './routes/inventory.js';
import masterDataRoutes from './routes/masterData.js';
import requisitionRoutes from './routes/requisitions.js';
import requisitionEditRoutes from './routes/requisitionsEdit.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import purchaseOrderStatusRoutes from './routes/purchaseOrdersStatus.js';
import purchaseOrderReceivingRoutes from './routes/purchaseOrdersReceiving.js';
import purchaseOrderRequisitionRoutes from './routes/purchaseOrdersRequisition.js';
import purchaseOrderStatsRoutes from './routes/purchaseOrdersStats.js';
import bomRoutes from './routes/boms.js';
import productionOrderRoutes from './routes/productionOrders.js';
import backupRoutes from './routes/backup.js';
import imagesRoutes from './routes/images.js';
import cabinetCatalogRoutes from './routes/cabinetCatalog.js';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Global rate limiter for all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(globalLimiter); // Apply rate limiting to all routes

// Store io instance for use in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join rooms for real-time updates
  socket.join('inventory_updates');
  socket.join('requisition_updates');
  socket.join('po_updates');
  socket.join('bom_updates');
  socket.join('production_updates');
  socket.join('cabinet_updates');
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/requisitions', requisitionEditRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/purchase-orders', purchaseOrderStatusRoutes);
app.use('/api/purchase-orders', purchaseOrderReceivingRoutes);
app.use('/api/purchase-orders', purchaseOrderRequisitionRoutes);
app.use('/api/purchase-orders', purchaseOrderStatsRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/production-orders', productionOrderRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/cabinet-catalog', cabinetCatalogRoutes);

// Serve static files - Always serve in this environment
app.use(express.static(path.join(__dirname, '../dist')));

// Catch all handler for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
initializeDatabase()
  .then(() => {
    console.log('Database initialized, running migrations...');
    return runMigrations();
  })
  .then(async () => {
    console.log('Migrations completed successfully');
    // Start backup scheduler and wait for initial backup to complete
    await startBackupScheduler();
    // Start image backup scheduler (monthly)
    startImageBackupScheduler();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database or run migrations:', error);
    process.exit(1);
  });