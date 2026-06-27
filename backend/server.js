const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');

const { rateLimit } = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

dotenv.config();

const app = express();

// ── Database Connection ───────────────────────
const connectDB = require('./config/db');
connectDB();

// ── Security Middleware ───────────────────────
// Set security HTTP headers (with specific overrides to allow image rendering)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Rate limiting: 1000 requests per 15 minutes
// Trust proxy is required because we are behind Ngrok/Nginx
app.set('trust proxy', 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS (Cross Site Scripting)
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static file serving ───────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minute window
  max: 10,                       // maximum 10 attempts per window
  standardHeaders: true,         // return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on login endpoint`);
    res.status(429).json(options.message);
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/jobs',           require('./routes/jobRoutes'));
app.use('/api/equipment',      require('./routes/equipmentRoutes'));
app.use('/api/users',          require('./routes/userRoutes'));
app.use('/api/reports',        require('./routes/reportRoutes'));
app.use('/api/workdetails',    require('./routes/workDetailRoutes'));
app.use('/api/materials',      require('./routes/materialsRoutes'));
app.use('/api/photos',         require('./routes/photoRoutes'));
app.use('/api/admin',          require('./routes/adminRoutes'));
app.use('/api/technicians',    require('./routes/technicianRoutes'));
app.use('/api/upload',         require('./routes/uploadRoutes'));
app.use('/api/production-plans', require('./routes/productionPlanRoutes'));
app.use('/api/inventory',      require('./routes/inventoryRoutes'));
app.use('/api/templates',      require('./routes/templateRoutes'));
app.use('/api/ai',             require('./routes/aiRoutes'));

// ── Health check ──────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', message: 'Thriveni API Running', version: '2.0.0', timestamp: new Date().toISOString() })
);

// ── Serve React Frontend Build (production only) ──────────
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
const fs = require('fs');
const buildExists = fs.existsSync(path.join(frontendBuildPath, 'index.html'));

if (buildExists) {
  // Production: serve built React app and handle client-side routing
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Development: React dev server handles the UI — backend only serves API
  app.get('*', (req, res) => {
    // Only respond to non-websocket requests to avoid log noise
    if (!req.headers.upgrade) {
      res.status(404).json({
        status: 'dev-mode',
        message: 'Backend API running. Frontend served separately by React dev server on port 3000.',
        requestedUrl: req.originalUrl
      });
    }
  });
}

// ── Global error handler ──────────────────────
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Thriveni API running on port ${PORT}`));
