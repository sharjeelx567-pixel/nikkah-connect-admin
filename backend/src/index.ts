import 'dotenv/config';
// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { initializeFirebase, db } from './config/firebase';
import apiRoutes from './routes';
import * as bcrypt from 'bcryptjs';
import { APP_NAME } from './config/branding';

function validateEnv() {
  const requiredEnv = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_PASSWORD'];
  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('[FATAL] Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

validateEnv();
initializeFirebase();

const app = express();

// REQUIRED for Vercel - trust the proxy so rate-limiter works correctly
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

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

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ name: `${APP_NAME} Admin API`, version: '1.0.0', status: 'online' });
});

async function seedDefaultAdmin() {
  try {
    if (!db) return;
    const snap = await db.collection('admins').limit(1).get();
    if (snap.empty) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL!;
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD!;
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
      console.log('[Seed] Admin created: ', defaultEmail);
    }
  } catch (e) {
    console.error('[Seed] Error:', e);
  }
}

seedDefaultAdmin();

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[Server] Running on http://0.0.0.0:${PORT}`));
}

module.exports = app;
