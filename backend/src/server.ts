import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

import { authenticateJWT, requireRole } from './middleware/auth';
import { login, getProfile, seedInitialAdmin } from './controllers/authController';
import { createUser, getUsers, updateUser } from './controllers/userController';
import { createRoute, getRoutes, updateRoute, deleteRoute } from './controllers/routeController';
import { registerFarmer, getFarmers, getFarmerById, updateFarmer } from './controllers/farmerController';
import { assignVisit, getVisits, updateVisit } from './controllers/visitController';
import { recordCollection, getCollections } from './controllers/milkController';
import { getPendingPayments, processPayment, getPaymentHistory } from './controllers/paymentController';
import { clockIn, clockOut, getAttendance } from './controllers/attendanceController';
import { applyLeave, approveOrRejectLeave, getLeaves } from './controllers/leaveController';
import { getAdminDashboardStats, getManagerDashboardStats, getAuditLogs } from './controllers/reportController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON Parsing
app.use(cors());
app.use(express.json());

// Set up uploads directory
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- PUBLIC ROUTES ---
app.post('/api/auth/login', login);

// --- AUTHENTICATED ROUTES ---
app.get('/api/auth/profile', authenticateJWT, getProfile);

// File Upload Endpoint
app.post('/api/upload', authenticateJWT, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Users
app.post('/api/users', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), createUser);
app.get('/api/users', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), getUsers);
app.put('/api/users/:id', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), updateUser);

// Routes
app.post('/api/routes', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), createRoute);
app.get('/api/routes', authenticateJWT, getRoutes);
app.put('/api/routes/:id', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), updateRoute);
app.delete('/api/routes/:id', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), deleteRoute);

// Farmers
app.post('/api/farmers', authenticateJWT, requireRole(['EMPLOYEE', 'ADMIN']), registerFarmer);
app.get('/api/farmers', authenticateJWT, getFarmers);
app.get('/api/farmers/:id', authenticateJWT, getFarmerById);
app.put('/api/farmers/:id', authenticateJWT, updateFarmer);

// Visits
app.post('/api/visits', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), assignVisit);
app.get('/api/visits', authenticateJWT, getVisits);
app.put('/api/visits/:id', authenticateJWT, updateVisit);

// Milk Collections
app.post('/api/collections', authenticateJWT, requireRole(['EMPLOYEE', 'ADMIN']), recordCollection);
app.get('/api/collections', authenticateJWT, getCollections);

// Payments
app.get('/api/payments/pending', authenticateJWT, requireRole(['ADMIN']), getPendingPayments);
app.post('/api/payments', authenticateJWT, requireRole(['ADMIN']), processPayment);
app.get('/api/payments', authenticateJWT, getPaymentHistory);

// Attendance
app.post('/api/attendance/clock-in', authenticateJWT, clockIn);
app.post('/api/attendance/clock-out', authenticateJWT, clockOut);
app.get('/api/attendance', authenticateJWT, getAttendance);

// Leaves
app.post('/api/leaves', authenticateJWT, applyLeave);
app.put('/api/leaves/:id', authenticateJWT, requireRole(['ADMIN', 'MANAGER']), approveOrRejectLeave);
app.get('/api/leaves', authenticateJWT, getLeaves);

// Reports & Analytics
app.get('/api/reports/admin-dashboard', authenticateJWT, requireRole(['ADMIN']), getAdminDashboardStats);
app.get('/api/reports/manager-dashboard', authenticateJWT, requireRole(['MANAGER']), getManagerDashboardStats);
app.get('/api/reports/audit-logs', authenticateJWT, requireRole(['ADMIN']), getAuditLogs);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Seed the initial admin user
  await seedInitialAdmin();
});
