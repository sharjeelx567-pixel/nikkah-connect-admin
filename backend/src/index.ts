import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeFirebase, db, admin } from './config/firebase';
import apiRoutes from './routes';
import * as bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
initializeFirebase();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://nikkah-connect-admin-panel.vercel.app',
      'https://nikkah-connect-admin-iota.vercel.app',
      'https://nikkah-connect-admin-knvx.vercel.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log('[HTTP] ' + req.method + ' ' + req.path);
  next();
});

// Mount Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ name: 'NikkahConnect Admin API', version: '1.0.0', status: 'online' });
});

// Auto-seed admin user if no admins exist
async function seedDefaultAdmin() {
  try {
    const adminSnapshot = await db.collection('admins').limit(1).get();
    if (adminSnapshot.empty) {
      console.log('[Seed] No admin accounts found. Seeding default Super Admin...');
      const defaultEmail = 'admin@nikkahconnect.com';
      const defaultPassword = 'AdminPassword123!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await db.collection('admins').add({
        email: defaultEmail,
        displayName: 'Super Admin',
        role: 'super_admin',
        passwordHash,
        isActive: true,
        createdAt: new Date(),
      });

      console.log('[Seed] Default Admin Created Successfully!');
      console.log('[Seed] Email: ' + defaultEmail);
      console.log('[Seed] Password: ' + defaultPassword);
      console.log('[Seed] IMPORTANT: Please change this password after your first login!');
    } else {
      console.log('[Seed] Admin accounts already exist. Skipping seed.');
    }
  } catch (error) {
    console.error('[Seed] Failed to seed default admin:', error);
  }
}

// Start Server
const server = app.listen(PORT as number, '0.0.0.0', async () => {
  console.log('[Server] Admin API is running on http://0.0.0.0:' + PORT);
  await seedDefaultAdmin();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error('[Server] ERROR: Port ' + PORT + ' is already in use. Kill the other process and restart.');
  } else {
    console.error('[Server] Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  server.close(() => process.exit(0));
});

export default app;

