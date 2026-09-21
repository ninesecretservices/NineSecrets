import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './utils/db.js';
import router from './router.js';
import { logError } from './methods.js';
import { validateEnv } from './utils/validateEnv.js';
import { startAbandonedCartJob } from './jobs/abandonedCart.js';

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

validateEnv(isProd);

// Connect to MongoDB
connectDB();

// Abandoned-cart reminder emails (see jobs/abandonedCart.js) — Mongoose queues
// queries until the connection above is ready, so no need to wait for it here.
startAbandonedCartJob();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow images to be served cross-origin

// CORS: comma-separated ALLOWED_ORIGINS restricts which frontend(s) may call the
// API (e.g. "https://ninesecrets.com,https://admin.ninesecrets.com"). Left unset,
// every origin is allowed — fine for local dev, never for production.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(
  allowedOrigins.length > 0
    ? { origin: allowedOrigins }
    : {}
));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// General API rate limit + a stricter one for auth endpoints (brute-force protection)
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

// Serve static files if needed (e.g. temporary uploads)
app.use('/public', express.static('public'));
app.use('/temp', express.static('temp'));

// Health check — for uptime monitors / PaaS deploy checks. Not under /api so it
// isn't subject to the API rate limiter or requires no auth.
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// SEO: sitemap.xml, always generated fresh from the live catalog (see comment
// in controller/sitemap.js on why this isn't under /api).
import { sitemapXml } from './controller/sitemap.js';
app.get('/sitemap.xml', (req, res, next) => sitemapXml(req, res).catch(next));

// Routes
app.use('/api', router);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: isProd ? {} : err.stack
  });

  logError({
    route: req.originalUrl,
    backend_route: req.path,
    payload: req.body || {},
    error_message: err.message,
    http_status: statusCode,
    ip_address: req.ip || req.socket?.remoteAddress || '',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
