// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeFirebase, db } from './config/firebase';
import apiRoutes from './routes';
import * as bcrypt from 'bcryptjs';

// Initialize Firebase on cold start
initializeFirebase();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://nikkah-connect-admin-panel.vercel.app',
      'https://nikkah-connect-admin-iota.vercel.app',
      'https://nikkah-connect-admin-knvx.vercel.app',
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
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ name: 'NikkahConnect Admin API', version: '1.0.0', status: 'online' });
});

// Seed default admin if none exist
async function seedDefaultAdmin() {
  try {
    if (!db) return;
    const adminSnapshot = await db.collection('admins').limit(1).get();
    if (adminSnapshot.empty) {
      console.log('[Seed] No admin found. Creating default Super Admin...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('AdminPassword123!', salt);
      await db.collection('admins').add({
        email: 'admin@nikkahconnect.com',
        displayName: 'Super Admin',
        role: 'super_admin',
        passwordHash,
        isActive: true,
        createdAt: new Date(),
      });
      console.log('[Seed] Default admin created: admin@nikkahconnect.com / AdminPassword123!');
    } else {
      console.log('[Seed] Admin already exists. Skipping seed.');
    }
  } catch (error) {
    console.error('[Seed] Error:', error);
  }
}

// Run seed asynchronously (non-blocking)
seedDefaultAdmin();

// Local dev server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

// Required for Vercel serverless
module.exports = app;
