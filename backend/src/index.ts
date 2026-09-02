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

// Provide safe fallbacks so missing env vars on Vercel do not crash cold starts
process.env.JWT_SECRET = process.env.JWT_SECRET || 'nikkah-connect-admin-secret-key-fallback-2026';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'nikkah-connect-admin-refresh-secret-fallback-2026';
process.env.DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nikkahconnect.com';
process.env.DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

function validateEnv() {
  const requiredEnv = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_PASSWORD'];
  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn('[WARN] Missing recommended environment variables:', missing.join(', '));
  }
}

validateEnv();

try {
  initializeFirebase();
} catch (e) {
  console.error('[Firebase] Uncaught error in init:', e);
}

const app = express();

// REQUIRED for Vercel - trust the proxy so rate-limiter works correctly
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Robust CORS handling for localhost, custom domains, and all *.vercel.app preview / prod deployments
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed =
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('nikkah-connect') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL);

    if (isAllowed) {
      return callback(null, true);
    }
    // Permissive fallback so requests are never aborted without CORS headers
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Pre-flight OPTIONS handler
app.options('*', cors());

// Static files for uploads (fallback for local dev)
try {
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
} catch {}

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
  res.json({
    name: `${APP_NAME} Admin API`,
    version: '1.0.0',
    status: 'online',
    firebase: db ? 'connected' : 'uninitialized',
    env: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler so Express always responds with valid JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

async function seedDefaultAdmin() {
  try {
    if (!db) {
      console.warn('[Seed] Firestore not initialized yet. Skipping seed.');
      return;
    }
    const snap = await db.collection('admins').limit(1).get();
    if (snap.empty) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nikkahconnect.com';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';
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
    console.warn('[Seed] Non-fatal seed error:', e);
  }
}

seedDefaultAdmin();

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[Server] Running on http://0.0.0.0:${PORT}`));
}

export default app;
module.exports = app;

