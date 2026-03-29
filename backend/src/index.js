/**
 * AI Tester Agent - Backend Server Entry Point
 * 
 * Express server that powers the AI Tester Agent API.
 * Mounts all route modules and configures middleware.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import route modules
const requirementsRoutes = require('./routes/requirements');
const commitsRoutes = require('./routes/commits');
const testsRoutes = require('./routes/tests');
const riskRoutes = require('./routes/risk');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/project');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── API Routes ────────────────────────────────────────────────────────────────

app.use('/api', requirementsRoutes);
app.use('/api', commitsRoutes);
app.use('/api', testsRoutes);
app.use('/api', riskRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', projectRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Tester Agent API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? 'live' : 'simulation',
  });
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AI Tester Agent API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Mode: ${process.env.OPENAI_API_KEY ? 'Live AI' : 'Simulation'}\n`);
});

module.exports = app;
