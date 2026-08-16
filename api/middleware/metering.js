'use strict';

const fs = require('fs');
const path = require('path');

// ── Persistent logs configurations ─────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOGS_FILE = path.join(LOGS_DIR, 'usage.log');

// Ensure log directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.error('[Metering Middleware] Failed to create logs directory:', err.message);
}

// ── In-memory usage log ────────────────────────────────────────────────────────
const usageLogs = [];

const MARKETPLACE_AGENTS = {
  '/api/hs-code': {
    name: 'HS Code Agent',
    price_per_execution_usd: 0.10,
    domain_tags: ['export', 'compliance', 'trade', 'hs-code', 'classification'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/tariff': {
    name: 'Tariff Agent',
    price_per_execution_usd: 0.20,
    domain_tags: ['export', 'trade', 'tariff', 'taxes', 'landed-cost'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/route-score': {
    name: 'Route Agent',
    price_per_execution_usd: 0.50,
    domain_tags: ['export', 'logistics', 'trade', 'routing', 'shipping'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/compliance': {
    name: 'Compliance Agent',
    price_per_execution_usd: 0.75,
    domain_tags: ['export', 'compliance', 'trade', 'sanctions', 'dual-use'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/export-plan': {
    name: 'Export Plan Agent',
    price_per_execution_usd: 2.50,
    domain_tags: ['export', 'trade', 'strategy', 'logistics', 'compliance'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/pipeline': {
    name: 'Full Export Intelligence Pipeline',
    price_per_execution_usd: 5.00,
    domain_tags: ['export', 'compliance', 'logistics', 'trade', 'orchestration'],
    upsell: 'Upgrade to AtlasCorr AI (https://kadsam123.github.io/atlascorr-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  }
};

/**
 * Metering middleware.
 * Intercepts every response and appends a structured log entry.
 */
function metering(req, res, next) {
  const startTime = Date.now();

  // Intercept res.json to capture status at the point of response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const responseTimeMs = Date.now() - startTime;
    const apiKey = req.apiKey || req.headers['x-api-key'] || 'anonymous';
    const maskedKey = apiKey.length > 8 ? apiKey.slice(-8) : apiKey;

    const originalUrlPath = req.originalUrl.split('?')[0];
    const logEntry = {
      id: usageLogs.length + 1,
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: originalUrlPath,
      api_key_suffix: maskedKey,
      api_key_full: apiKey,
      response_time_ms: responseTimeMs,
      status_code: res.statusCode,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    };

    usageLogs.push(logEntry);

    // Write persistently to log file
    try {
      fs.appendFileSync(LOGS_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (err) {
      console.error('[Metering Middleware] Failed to write usage log to file:', err.message);
    }

    // Print to stdout
    console.log(
      `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.endpoint} ` +
      `key=***${logEntry.api_key_suffix} ${logEntry.status_code} ${logEntry.response_time_ms}ms`
    );

    // Augment body if it is an object and the endpoint matches
    if (body && typeof body === 'object' && MARKETPLACE_AGENTS[originalUrlPath]) {
      const agentMetadata = MARKETPLACE_AGENTS[originalUrlPath];
      body.marketplace_metadata = {
        agent_name: agentMetadata.name,
        price_per_execution_usd: agentMetadata.price_per_execution_usd,
        domain_tags: agentMetadata.domain_tags,
        usage_metering: {
          meter_id: `meter_${agentMetadata.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          charge_status: 'metered',
          billing_type: 'pay-per-use',
          cost_incurred_usd: agentMetadata.price_per_execution_usd
        },
        upsell: {
          message: agentMetadata.upsell,
          upgrade_url: 'https://kadsam123.github.io/atlascorr-ai/pricing.html'
        }
      };
    }

    return originalJson(body);
  };

  next();
}

/**
 * Returns a copy of all accumulated usage log entries.
 * @returns {Array<Object>} Array of log entry objects.
 */
function getUsageLogs() {
  return usageLogs.slice();
}

module.exports = { metering, getUsageLogs };
