require('dotenv').config();
const { validateEnv } = require('./config/env');

// Validate critical environment configuration before anything else boots.
// In production this hard-stops on an insecure/default JWT_SECRET.
validateEnv();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { corsOptions } = require('./config/cors');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/auth');
const instituteRoutes = require('./routes/institute');
const enrollmentRoutes = require('./routes/enrollment');
const batchRoutes = require('./routes/batch');
const courseRoutes = require('./routes/course');
const feeRoutes = require('./routes/fee');
const attendanceRoutes = require('./routes/attendance');
const questionRoutes = require('./routes/question');
const testRoutes = require('./routes/test');
const plannerRoutes = require('./routes/planner');
const timetableRoutes = require('./routes/timetable');
const notificationRoutes = require('./routes/notification');
const paymentRoutes = require('./routes/payment');
const announcementRoutes = require('./routes/announcement');
const dashboardRoutes = require('./routes/dashboard');
const publicRoutes = require('./routes/public');
const materialRoutes = require('./routes/material');
const parentReportRoutes = require('./routes/parentReport');

const app = express();

// Trust the first proxy hop (load balancer / reverse proxy) so req.ip reflects
// the real client address for rate limiting, not the proxy's.
app.set('trust proxy', 1);

// Security response headers (CSP, HSTS, X-Frame-Options, etc.).
app.use(helmet());
app.use(cors(corsOptions));
// Capture the raw body so the Razorpay webhook can verify its HMAC signature
// against the exact bytes received (a re-serialized JSON body would not match).
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// Request logging — concise in dev, Apache-combined in production. Health
// checks are skipped to keep logs signal-rich.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/api/health' || process.env.NODE_ENV === 'test',
}));

// General per-user (falls back to per-IP) limiter across the API surface.
app.use('/api/', apiLimiter);

// Stricter limiter on credential endpoints to blunt brute-force attempts.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot', authLimiter);
app.use('/api/auth/reset', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/teachers', require('./routes/teacher'));
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/parent-reports', parentReportRoutes);
app.use('/api/superadmin', require('./routes/superadmin'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Unknown API route -> clean 404 (instead of falling through to a generic 500).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve frontend static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);

// Only start listening when run directly (`node src/server.js`). When imported
// by tests (supertest) the app is used without binding a port.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Apni Vidya API running on port ${PORT}`);
  });
}

module.exports = app;
