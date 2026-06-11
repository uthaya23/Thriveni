const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ── Database Connection ───────────────────────
const connectDB = require('./config/db');
connectDB();

// ── Middleware ────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); // Allow images to be loaded
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static file serving ───────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/jobs',           require('./routes/jobRoutes'));
app.use('/api/equipment',      require('./routes/equipmentRoutes'));
app.use('/api/users',          require('./routes/userRoutes'));
app.use('/api/reports',        require('./routes/reportRoutes'));
app.use('/api/dismantling',    require('./routes/dismantlingRoutes'));
app.use('/api/workdetails',    require('./routes/workDetailRoutes'));
app.use('/api/inspection',     require('./routes/inspectionRoutes'));
app.use('/api/materials',      require('./routes/materialsRoutes'));
app.use('/api/assembly',       require('./routes/assemblyRoutes'));
app.use('/api/testing',        require('./routes/testingRoutes'));
app.use('/api/dispatch',       require('./routes/dispatchRoutes'));
app.use('/api/photos',         require('./routes/photoRoutes'));
app.use('/api/admin',          require('./routes/adminRoutes'));
app.use('/api/technicians',    require('./routes/technicianRoutes'));
app.use('/api/upload',         require('./routes/uploadRoutes'));
app.use('/api/production-plans', require('./routes/productionPlanRoutes'));
app.use('/api/inventory',      require('./routes/inventoryRoutes'));

// ── Serve React Frontend Build ────────────────
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// ── Health check ──────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', message: 'Thriveni API Running', version: '2.0.0', timestamp: new Date().toISOString() })
);

// ── Catch-all: serve React app for client-side routing ──
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ── Global error handler ──────────────────────
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Thriveni API running on port ${PORT}`));
