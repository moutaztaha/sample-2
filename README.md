# Factory Management System (FMS)

A comprehensive, production-ready factory management system built with React, Node.js, and SQLite.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- NPM

### Installation & Startup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm run server
   ```

4. **Access the application:**
   Open your browser to `http://localhost:3000`

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

## 🛠️ Troubleshooting

### Quick Fix for Startup Issues
If you encounter "Error loading application" or similar issues:

```bash
# Automated fix
npm run fix-startup

# Or manual fix
npm run build && npm run server
```

### Health Check
Run a comprehensive health check:

```bash
npm run health-check
```

### Complete Reset
If all else fails:

```bash
npm run reset
```

## 📁 Project Structure

```
├── backend/                 # Backend server and API
│   ├── server.js           # Main server file
│   ├── database/           # Database configuration and migrations
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication and other middleware
│   └── utils/              # Utility functions
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── contexts/           # React contexts (Auth, Socket)
│   ├── services/           # API service functions
│   └── App.tsx             # Main App component
├── scripts/                # Utility scripts
│   ├── fix-startup.js      # Startup issue resolver
│   └── health-check.js     # Application health checker
├── dist/                   # Built frontend (generated)
└── package.json            # Project configuration
```

## 🔧 Available Scripts

- `npm run server` - Start the production server
- `npm run build` - Build the frontend for production
- `npm run dev` - Start development server (alias for server)
- `npm run fix-startup` - Fix common startup issues
- `npm run health-check` - Run application health check
- `npm run reset` - Complete reset and rebuild
- `npm run lint` - Run ESLint

## 🌟 Features

### Core Functionality
- **Inventory Management** - Track items, quantities, locations
- **Requisition System** - Request and approve inventory items
- **User Management** - Role-based access control
- **Master Data** - Manage categories, suppliers, locations
- **Real-time Updates** - Live notifications via WebSocket
- **Import/Export** - CSV and PDF support

### Technical Features
- **Responsive Design** - Works on desktop and mobile
- **Real-time Communication** - Socket.io integration
- **Secure Authentication** - JWT-based auth system
- **Database Backups** - Automatic SQLite backups
- **Audit Trail** - Track all data changes
- **Production Ready** - Optimized builds and error handling

## 🔒 Security

- JWT-based authentication
- Role-based access control (Admin, Manager, User)
- Password hashing with bcrypt
- SQL injection protection
- CORS configuration

## 📊 Database

- **SQLite** database for simplicity and portability
- **Automatic migrations** on startup
- **Sample data** included for testing
- **Backup system** with automatic cleanup

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Inventory
- `GET /api/inventory/items` - List inventory items
- `POST /api/inventory/items` - Create new item
- `PUT /api/inventory/items/:id` - Update item
- `DELETE /api/inventory/items/:id` - Delete item

### Requisitions
- `GET /api/requisitions` - List requisitions
- `POST /api/requisitions` - Create requisition
- `PUT /api/requisitions/:id/status` - Approve/reject requisition

### Master Data
- `GET /api/master-data/categories` - List categories
- `GET /api/master-data/suppliers` - List suppliers
- `GET /api/master-data/locations` - List locations

## 🚨 Common Issues & Solutions

### "Error loading application"
**Cause:** Frontend not built or server not running
**Solution:** `npm run build && npm run server`

### Port 3000 already in use
**Cause:** Another process using port 3000
**Solution:** Kill the process or restart your system

### Database errors
**Cause:** Database file permissions or corruption
**Solution:** Restart server to reinitialize database

### Module not found errors
**Cause:** Missing dependencies
**Solution:** `rm -rf node_modules && npm install`

## 📝 Development Notes

- Application **must** run on port 3000
- Frontend build is required before starting server
- Database initializes automatically on first run
- Real-time features require WebSocket connection

## 🤝 Contributing

1. Ensure all tests pass: `npm run health-check`
2. Build successfully: `npm run build`
3. Follow the existing code structure
4. Update documentation as needed

## 📄 License

This project is private and proprietary.

---

For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)