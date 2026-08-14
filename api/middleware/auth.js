'use strict';

// ── Demo API keys ──────────────────────────────────────────────────────────────
// Valid keys: hardcoded demo key OR key set via environment variable API_KEY
const DEMO_KEY = 'ct-demo-key-2026';

/**
 * API key authentication middleware.
 * Reads X-API-Key header and validates it against DEMO_KEY or process.env.API_KEY.
 * Returns HTTP 401 if key is missing or invalid.
 */
function auth(req, res, next) {
  // Skip auth for the monitoring/docs endpoints
  if (req.path === '/usage' || req.path === '/docs' || req.path === '/openapi.yaml') {
    return next();
  }

  const key = req.headers['x-api-key'];
  const validKeys = new Set([DEMO_KEY]);
  if (process.env.API_KEY) {
    validKeys.add(process.env.API_KEY);
  }

  if (!key) {
    return res.status(401).json({
      error: 'MISSING_API_KEY',
      message: 'Authentication required. Provide your API key via the X-API-Key header.',
      hint: 'For demo access use: X-API-Key: ct-demo-key-2026',
      timestamp: new Date().toISOString()
    });
  }

  if (!validKeys.has(key)) {
    return res.status(401).json({
      error: 'INVALID_API_KEY',
      message: 'The provided API key is not recognized.',
      timestamp: new Date().toISOString()
    });
  }

  // Attach key info to request for downstream middleware/logging
  req.apiKey = key;
  next();
}

module.exports = auth;

