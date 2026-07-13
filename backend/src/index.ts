import dotenv from 'dotenv';
// Load environment variables first
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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per window (increased for Admin polling)
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
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

      console.log('─────────────────────────────────────────────────────────────────');
      console.log(`[Seed] Default Admin Created Successfully!`);
      console.log(`[Seed] Email: ${defaultEmail}`);
      console.log(`[Seed] Password: ${defaultPassword}`);
      console.log('⚠️ IMPORTANT: Please change this password after your first login!');
      console.log('─────────────────────────────────────────────────────────────────');
    } else {
      console.log('[Seed] Admin accounts already exist. Skipping seed.');
    }
  } catch (error) {
    console.error('[Seed] Failed to seed default admin:', error);
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] Admin API is running on http://localhost:${PORT}`);
  await seedDefaultAdmin();
});
