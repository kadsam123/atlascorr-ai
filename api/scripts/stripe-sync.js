'use strict';

const fs = require('fs');
const path = require('path');

// Load environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
if (!STRIPE_SECRET_KEY && require.main === module) {
  console.warn('[WARNING] STRIPE_SECRET_KEY env variable is missing. Running in simulation mode.');
}
const stripe = require('stripe')(STRIPE_SECRET_KEY || 'sk_test_mock_key');

const LOGS_FILE = path.join(__dirname, '..', 'logs', 'usage.log');
const SYNC_TRACKER_FILE = path.join(__dirname, '..', 'logs', 'last-sync-timestamp.txt');
const CUSTOMERS_FILE = path.join(__dirname, '..', 'config', 'stripe-customers.json');

async function syncStripeUsage() {
  console.log(`\n=============================================`);
  console.log(`🌀 Circle Agent Stack — Stripe Usage Sync`);
  console.log(`=============================================`);

  if (!fs.existsSync(LOGS_FILE)) {
    console.log(`[INFO] No usage logs found. Nothing to sync.`);
    return { status: 'idle', count: 0 };
  }

  // Load customer configurations
  let customers = {};
  if (fs.existsSync(CUSTOMERS_FILE)) {
    try {
      customers = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
    } catch (err) {
      console.error(`[ERROR] Failed to read stripe-customers.json:`, err.message);
      return { status: 'error', message: err.message };
    }
  }

  // Load last synced timestamp
  let lastSyncTime = 0;
  if (fs.existsSync(SYNC_TRACKER_FILE)) {
    const timeStr = fs.readFileSync(SYNC_TRACKER_FILE, 'utf8').trim();
    lastSyncTime = timeStr ? new Date(timeStr).getTime() : 0;
  }
  console.log(`[INFO] Last synced timestamp: ${lastSyncTime ? new Date(lastSyncTime).toISOString() : 'beginning'}`);

  // Read log entries line-by-line
  const logLines = fs.readFileSync(LOGS_FILE, 'utf8').split('\n');
  const newLogs = [];
  let latestTimestamp = 0;

  for (const line of logLines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime > lastSyncTime) {
        newLogs.push(entry);
        if (entryTime > latestTimestamp) {
          latestTimestamp = entryTime;
        }
      }
    } catch (err) {
      // Skip malformed lines
    }
  }

  console.log(`[INFO] Found ${newLogs.length} new usage events since last sync.`);
  if (newLogs.length === 0) {
    return { status: 'success', synced_events: 0 };
  }

  // Group events by: API Key -> Endpoint -> Count
  const aggregatedUsage = {};
  newLogs.forEach(log => {
    const key = log.api_key_full || 'anonymous';
    const endpoint = log.endpoint;
    
    // Ignore health check and usage dashboard logs from charging
    if (endpoint === '/' || endpoint === '/api/usage' || endpoint === '/api/docs') return;

    if (!aggregatedUsage[key]) {
      aggregatedUsage[key] = {};
    }
    if (!aggregatedUsage[key][endpoint]) {
      aggregatedUsage[key][endpoint] = 0;
    }
    aggregatedUsage[key][endpoint]++;
  });

  let successCount = 0;
  let skippedCount = 0;

  for (const [apiKey, endpoints] of Object.entries(aggregatedUsage)) {
    const customerConfig = customers[apiKey];
    
    if (!customerConfig) {
      console.log(`[WARNING] No Stripe customer mapping found for API key prefix: ***${apiKey.slice(-8)}. Logs marked as skipped.`);
      skippedCount += Object.values(endpoints).reduce((a, b) => a + b, 0);
      continue;
    }

    console.log(`[INFO] Syncing usage for: ${customerConfig.customer_name} (${customerConfig.customer_email})`);

    for (const [endpoint, count] of Object.entries(endpoints)) {
      const subItemId = customerConfig.subscription_items[endpoint];

      if (!subItemId) {
        console.log(`  └─ [WARNING] No metered subscription item mapped for endpoint: ${endpoint}`);
        continue;
      }

      console.log(`  └─ Sending ${count} call(s) for ${endpoint} to Stripe Sub Item ID: ${subItemId}...`);

      if (subItemId.startsWith('si_test_')) {
        // Simulation mode for dummy IDs (avoids Stripe API crash)
        console.log(`     [SIMULATION] Stripe payload matched sandbox placeholder. Simulated OK.`);
        successCount += count;
      } else {
        // Real Stripe API sync call
        try {
          await stripe.subscriptionItems.createUsageRecord(
            subItemId,
            {
              quantity: count,
              timestamp: Math.floor(Date.now() / 1000),
              action: 'increment'
            }
          );
          console.log(`     ✅ Successfully reported.`);
          successCount += count;
        } catch (err) {
          console.error(`     ❌ Stripe API Error:`, err.message);
          skippedCount += count;
        }
      }
    }
  }

  // Write new sync tracker timestamp
  if (latestTimestamp > 0) {
    fs.writeFileSync(SYNC_TRACKER_FILE, new Date(latestTimestamp).toISOString(), 'utf8');
  }

  console.log(`\n=============================================`);
  console.log(`🎉 Sync complete. Synced: ${successCount} | Skipped: ${skippedCount}`);
  console.log(`=============================================`);

  return {
    status: 'success',
    synced_events: successCount,
    skipped_events: skippedCount,
    timestamp: new Date().toISOString()
  };
}

// Allow script execution directly via CLI
if (require.main === module) {
  syncStripeUsage()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = syncStripeUsage;
