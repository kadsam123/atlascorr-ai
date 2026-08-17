'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Chapter mappings for category inference ──────────────────────────────────
const HS_CATEGORY_MAP = {
  '51': 'textiles',  '52': 'textiles',  '61': 'textiles',  '62': 'textiles',
  '09': 'food',      '10': 'food',      '15': 'food',      '04': 'food',      '21': 'food',
  '17': 'food',      '12': 'food',      '03': 'food',
  '73': 'machinery', '84': 'machinery', '85': 'electronics',
  '90': 'medical'
};

function inferCategoryFromHs(hsCode) {
  const clean = (hsCode || '').replace(/\D/g, '').substring(0, 4);
  const prefix2 = clean.substring(0, 2);
  const prefixInt = parseInt(prefix2, 10);
  if (prefixInt >= 1 && prefixInt <= 24) return 'food';
  if (prefixInt >= 50 && prefixInt <= 63) return 'textiles';
  return HS_CATEGORY_MAP[prefix2] || 'textiles';
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper to query local loopback endpoints
async function queryAgent(endpoint, payload, apiKey, port, paymentVerified = false) {
  try {
    const url = `http://localhost:${port}${endpoint}`;
    const isGet = endpoint.includes('?');
    const res = await fetch(url, {
      method: isGet ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || 'ct-demo-key-2026',
        'X-Payment-Verified': paymentVerified ? 'true' : 'false'
      },
      body: isGet ? undefined : JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Agent query returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[Dossier Batch] Internal loopback call to ${endpoint} failed:`, err.message);
    return null;
  }
}

// ── Batch Dossier Route ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body || {};
  const { origin_country, corridors, hs_codes, mode, min_cargo_value, payment_tx_hash } = body;

  if (!origin_country || !corridors || !Array.isArray(corridors) || !hs_codes || !Array.isArray(hs_codes)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`origin_country`, and arrays of `corridors` and `hs_codes` are required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const selectedMode = mode || 'sea';
  const cargoValue = min_cargo_value || 25000;
  const apiKey = req.headers['x-api-key'] || 'ct-demo-key-2026';
  const port = process.env.PORT || 3000;

  // Verify USDC Payment hash on-chain (or simulated)
  let paymentVerified = false;
  if (payment_tx_hash) {
    const proof = await queryAgent(`/api/ledger/proof?tx=${payment_tx_hash}`, {}, apiKey, port, false);
    if (proof && proof.confirmed) {
      paymentVerified = true;
    }
  }

  const dossiers = [];
  let fullyEnrichedCount = 0;
  let degradedCount = 0;
  let highRiskCount = 0;

  for (const hs of hs_codes) {
    const category = inferCategoryFromHs(hs);

    for (const dest of corridors) {
      const destination = dest.toUpperCase().trim();

      // Throttling delay to prevent DuckDuckGo search rate limits
      await sleep(150);

      // 1. Fetch Tariff Agent Details
      const tariffResponse = await queryAgent('/api/tariff', {
        hs_code: hs,
        origin_country,
        destination_country: destination
      }, apiKey, port, paymentVerified);

      // 2. Fetch Compliance Agent Details
      const complianceResponse = await queryAgent('/api/compliance', {
        hs_code: hs,
        origin_country,
        destination_country: destination,
        cargo_value: cargoValue
      }, apiKey, port, paymentVerified);

      // 3. Fetch Route Scoring Agent Details
      const routeResponse = await queryAgent('/api/route-score', {
        origin_country,
        destination_country: destination,
        mode: selectedMode,
        cargo_value: cargoValue
      }, apiKey, port, paymentVerified);

      // 4. Fetch Export Plan Agent Details
      const exportResponse = await queryAgent('/api/export-plan', {
        hs_code: hs,
        origin_country,
        destination_country: destination,
        mode: selectedMode,
        cargo_value: cargoValue
      }, apiKey, port, paymentVerified);

      // Check validation flags for supervisor states
      const tariffQA = tariffResponse ? tariffResponse.qa_supervisor.status : 'FAILED';
      const complianceQA = complianceResponse ? complianceResponse.qa_supervisor.status : 'FAILED';
      const routeQA = routeResponse ? routeResponse.qa_supervisor.status : 'FAILED';
      const exportQA = exportResponse ? exportResponse.qa_supervisor.status : 'FAILED';

      const isEnriched = (tariffQA === 'APPROVED_WITH_ENRICHMENT' &&
                          complianceQA === 'APPROVED_WITH_ENRICHMENT' &&
                          routeQA === 'APPROVED_WITH_ENRICHMENT' &&
                          exportQA === 'APPROVED_WITH_ENRICHMENT');

      if (isEnriched) {
        fullyEnrichedCount++;
      } else {
        degradedCount++;
      }

      // Calculate portfolio metrics
      const rawRisk = complianceResponse ? complianceResponse.enrichment.risk_score || 0.15 : 0.50;
      const rawRouteRisk = routeResponse ? routeResponse.enrichment.live_delay_risk || 0.20 : 0.40;
      const overallRisk = parseFloat(((rawRisk + rawRouteRisk) / 2).toFixed(2));

      if (overallRisk > 0.70) {
        highRiskCount++;
      }

      const docsCount = complianceResponse ? complianceResponse.required_documents.length : 3;
      const stepsCount = exportResponse ? exportResponse.core_steps.length : 4;
      const overallComplexity = parseFloat((Math.min(1.0, (docsCount + stepsCount) / 12)).toFixed(2));

      // Suitability rating
      const dutyRate = tariffResponse ? tariffResponse.duty_rate_pct || 0 : 10;
      let suitability = 'MEDIUM';
      if (overallRisk < 0.35 && dutyRate < 12) {
        suitability = 'HIGH';
      } else if (overallRisk > 0.65 || dutyRate > 25) {
        suitability = 'LOW';
      }

      dossiers.push({
        hs_code: hs,
        destination_country: destination,
        category,
        tariff: {
          duty_rate: dutyRate,
          qa_status: tariffQA
        },
        compliance: {
          risk_score: rawRisk,
          mandatory_docs: complianceResponse ? complianceResponse.required_documents : [],
          qa_status: complianceQA
        },
        route: {
          transit_days: routeResponse ? routeResponse.base_transit_time_days : 24,
          cost_usd: routeResponse ? routeResponse.base_cost_estimate_usd : 3200,
          route_score: routeResponse ? routeResponse.route_score : 0.65,
          qa_status: routeQA
        },
        export_plan: {
          steps_count: stepsCount,
          documents_count: docsCount,
          qa_status: exportQA
        },
        summary: {
          overall_risk: overallRisk,
          overall_complexity: overallComplexity,
          suitability
        }
      });
    }
  }

  return res.json({
    request_id: uuidv4(),
    origin_country,
    mode: selectedMode,
    portfolio_summary: {
      fully_enriched_count: fullyEnrichedCount,
      degraded_count: degradedCount,
      high_risk_count: highRiskCount,
      total_dossiers: dossiers.length
    },
    dossiers,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
