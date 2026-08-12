'use strict';

// ── In-memory usage log ────────────────────────────────────────────────────────
const usageLogs = [];

const MARKETPLACE_AGENTS = {
  '/api/hs-code': {
    name: 'HS Code Agent',
    price_per_execution_usd: 0.10,
    domain_tags: ['export', 'compliance', 'trade', 'hs-code', 'classification'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/tariff': {
    name: 'Tariff Agent',
    price_per_execution_usd: 0.20,
    domain_tags: ['export', 'trade', 'tariff', 'taxes', 'landed-cost'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/route': {
    name: 'Route Agent',
    price_per_execution_usd: 0.50,
    domain_tags: ['export', 'logistics', 'trade', 'routing', 'shipping'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/market': {
    name: 'Market Match Agent',
    price_per_execution_usd: 0.50,
    domain_tags: ['export', 'trade', 'market-match', 'opportunities', 'sales'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/opportunity': {
    name: 'Opportunity Scan Agent',
    price_per_execution_usd: 1.00,
    domain_tags: ['export', 'trade', 'opportunity-scan', 'growth', 'globalization'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/compliance': {
    name: 'Compliance Agent',
    price_per_execution_usd: 0.75,
    domain_tags: ['export', 'compliance', 'trade', 'sanctions', 'dual-use'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/export-plan': {
    name: 'Export Plan Agent',
    price_per_execution_usd: 2.50,
    domain_tags: ['export', 'trade', 'strategy', 'logistics', 'compliance'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  },
  '/api/pipeline': {
    name: 'Full Export Intelligence Pipeline',
    price_per_execution_usd: 5.00,
    domain_tags: ['export', 'compliance', 'logistics', 'trade', 'orchestration'],
    upsell: 'Upgrade to CircleTrade AI (https://kadsam123.github.io/circletrade-ai/pricing.html) for unlimited daily pipeline runs and proactive monitoring.'
  }
};

/**
 * Metering middleware.
 * Intercepts every response and appends a structured log entry containing:
 *   timestamp, endpoint, api_key (last 8 chars), response_time_ms, status_code
 */
function metering(req, res, next) {
  const startTime = Date.now();

  // Intercept res.json to capture status at the point of response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const responseTimeMs = Date.now() - startTime;
    const apiKey = req.apiKey || req.headers['x-api-key'] || 'anonymous';
    const maskedKey = apiKey.length > 8 ? apiKey.slice(-8) : apiKey;

    const logEntry = {
      id: usageLogs.length + 1,
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: req.path,
      api_key_suffix: maskedKey,
      response_time_ms: responseTimeMs,
      status_code: res.statusCode,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    };

    usageLogs.push(logEntry);

    // Also print to stdout for easy monitoring
    console.log(
      `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.endpoint} ` +
      `key=***${logEntry.api_key_suffix} ${logEntry.status_code} ${logEntry.response_time_ms}ms`
    );

    // Augment body if it is an object and the endpoint matches
    if (body && typeof body === 'object' && MARKETPLACE_AGENTS[req.path]) {
      const agentMetadata = MARKETPLACE_AGENTS[req.path];
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
          upgrade_url: 'https://kadsam123.github.io/circletrade-ai/pricing.html'
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
