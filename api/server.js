'use strict';

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const auth = require('./middleware/auth');
const { metering, getUsageLogs } = require('./middleware/metering');

const hsCodeRouter = require('./routes/hsCode');
const tariffRouter = require('./routes/tariff');
const routeRouter = require('./routes/route');
const marketRouter = require('./routes/market');
const complianceRouter = require('./routes/compliance');
const opportunityRouter = require('./routes/opportunity');
const pipelineRouter = require('./routes/pipeline');
const exportPlanRouter = require('./routes/exportPlan');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(metering);

// ── Health check (no auth required) ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'CircleTrade Agent Stack API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/hs-code',
      'POST /api/tariff',
      'POST /api/route',
      'POST /api/market',
      'POST /api/compliance',
      'POST /api/opportunity',
      'POST /api/pipeline',
      'POST /api/export-plan',
      'GET  /api/usage'
    ],
    docs: 'GET /api/docs'
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    message: 'OpenAPI spec is available at api/docs/openapi.yaml',
    authentication: 'Pass X-API-Key: ct-demo-key-2026 header with every request',
    base_url: `http://localhost:${PORT}`
  });
});

// ── Internal usage log (no auth — internal monitoring) ─────────────────────────
app.get('/api/usage', (req, res) => {
  const logs = getUsageLogs();
  res.json({
    total_calls: logs.length,
    logs: logs.slice(-100) // last 100 entries
  });
});

// ── Protected API routes ───────────────────────────────────────────────────────
app.use('/api', auth);

const syncStripeUsage = require('./scripts/stripe-sync');
app.post('/api/admin/sync-stripe', async (req, res, next) => {
  try {
    const result = await syncStripeUsage();
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use('/api/hs-code', hsCodeRouter);
app.use('/api/tariff', tariffRouter);
app.use('/api/route', routeRouter);
app.use('/api/market', marketRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/opportunity', opportunityRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/export-plan', exportPlanRouter);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `No route found for ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[CircleTrade API Error]', err);
  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    request_id: uuidv4(),
    timestamp: new Date().toISOString()
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  CircleTrade Agent Stack API           ║`);
  console.log(`║  http://localhost:${PORT}                 ║`);
  console.log(`║  Auth: X-API-Key: ct-demo-key-2026     ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});

module.exports = app;
