'use strict';

// ── In-memory usage log ────────────────────────────────────────────────────────
const usageLogs = [];

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
