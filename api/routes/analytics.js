'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory cache for saved analytics runs
const ANALYTICS_CACHE = new Map();

// Helper to query local loopback endpoints
async function queryBatchDossier(payload, apiKey, port) {
  try {
    const url = `http://localhost:${port}/api/dossier-batch`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || 'ct-demo-key-2026'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Dossier batch engine returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[Analytics Loopback Error]', err.message);
    return null;
  }
}

// ── GET Saved Run ────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const data = ANALYTICS_CACHE.get(id);

  if (!data) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `No saved analytics run found with ID ${id}.`,
      timestamp: new Date().toISOString()
    });
  }

  return res.json(data);
});

// ── POST Run Portfolio Analytics ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body || {};
  const { origin_country, corridors, hs_codes, mode, min_cargo_value } = body;

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

  // 1. Fetch comparative dossiers via Loopback
  const batchResponse = await queryBatchDossier({
    origin_country,
    corridors,
    hs_codes,
    mode: selectedMode,
    min_cargo_value: cargoValue
  }, apiKey, port);

  if (!batchResponse || !batchResponse.dossiers) {
    return res.status(500).json({
      error: 'ORCHESTRATION_ERROR',
      message: 'Failed to aggregate target comparative dossiers from batch engine.',
      timestamp: new Date().toISOString()
    });
  }

  const rawDossiers = batchResponse.dossiers;
  const N = rawDossiers.length;

  if (N === 0) {
    return res.status(200).json({
      run_id: uuidv4(),
      origin_country,
      portfolio_summary: { total_dossiers: 0 },
      metrics: {},
      rankings: { top_opportunities: [], high_risk_products: [], high_cost_corridors: [], low_complexity_products: [] },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Compute Portfolio Baseline Averages
  let sumDuty = 0;
  let sumRisk = 0;
  let sumCost = 0;
  let sumTransit = 0;
  let sumComplexity = 0;

  rawDossiers.forEach(d => {
    sumDuty += d.tariff.duty_rate || 0;
    sumRisk += d.compliance.risk_score || 0;
    sumCost += d.route.cost_usd || 0;
    sumTransit += d.route.transit_days || 0;
    sumComplexity += d.summary.overall_complexity || 0;
  });

  const avgDuty = parseFloat((sumDuty / N).toFixed(2));
  const avgRisk = parseFloat((sumRisk / N).toFixed(2));
  const avgCost = parseFloat((sumCost / N).toFixed(2));
  const avgTransit = parseFloat((sumTransit / N).toFixed(2));
  const avgComplexity = parseFloat((sumComplexity / N).toFixed(2));

  // 3. Compute normalized scores and suitability indexes
  const scoredDossiers = rawDossiers.map(d => {
    const dutyScore = 1 - Math.min((d.tariff.duty_rate || 0) / 30, 1);
    const complianceScore = 1 - (d.compliance.risk_score || 0);
    
    // Normalize cost vs avg portfolio baseline (default to average if average is 0 to avoid division by zero)
    const costBaseline = avgCost > 0 ? avgCost : 3000;
    const costScore = 1 - Math.min((d.route.cost_usd || 0) / costBaseline, 2) / 2;
    
    const complexityScore = 1 - Math.min(((d.export_plan.steps_count || 0) + (d.export_plan.documents_count || 0)) / 20, 1);

    const suitability = parseFloat((
      0.3 * dutyScore + 
      0.3 * complianceScore + 
      0.2 * costScore + 
      0.2 * complexityScore
    ).toFixed(2));

    let suitabilityLabel = 'MEDIUM';
    if (suitability >= 0.70) {
      suitabilityLabel = 'HIGH';
    } else if (suitability < 0.40) {
      suitabilityLabel = 'LOW';
    }

    return {
      hs_code: d.hs_code,
      destination_country: d.destination_country,
      category: d.category,
      suitability_score: suitability,
      suitability_rating: suitabilityLabel,
      overall_risk: d.summary.overall_risk,
      overall_complexity: d.summary.overall_complexity,
      cost_usd: d.route.cost_usd,
      duty_rate: d.tariff.duty_rate,
      transit_days: d.route.transit_days,
      qa_status: d.route.qa_status,
      compliance: d.compliance,
      export_plan: d.export_plan
    };
  });

  // 4. Generate rankings
  const topOpportunities = [...scoredDossiers].sort((a, b) => b.suitability_score - a.suitability_score);
  const highRiskProducts = [...scoredDossiers].sort((a, b) => b.overall_risk - a.overall_risk);
  const lowComplexity = [...scoredDossiers].sort((a, b) => a.overall_complexity - b.overall_complexity);

  // Group costs by corridor destination to sort highest cost corridors
  const corridorCostMap = {};
  scoredDossiers.forEach(d => {
    if (!corridorCostMap[d.destination_country]) {
      corridorCostMap[d.destination_country] = { sum: 0, count: 0 };
    }
    corridorCostMap[d.destination_country].sum += d.cost_usd;
    corridorCostMap[d.destination_country].count += 1;
  });

  const highCostCorridors = Object.entries(corridorCostMap).map(([dest, info]) => ({
    destination_country: dest,
    average_cost_usd: parseFloat((info.sum / info.count).toFixed(2))
  })).sort((a, b) => b.average_cost_usd - a.average_cost_usd);

  // 5. Package output
  const runId = uuidv4();
  const result = {
    run_id: runId,
    origin_country,
    mode: selectedMode,
    metrics: {
      avg_duty_rate: avgDuty,
      avg_compliance_risk: avgRisk,
      avg_route_cost_usd: avgCost,
      avg_transit_days: avgTransit,
      avg_complexity: avgComplexity
    },
    rankings: {
      top_opportunities: topOpportunities,
      high_risk_products: highRiskProducts,
      high_cost_corridors: highCostCorridors,
      low_complexity_products: lowComplexity
    },
    timestamp: new Date().toISOString()
  };

  ANALYTICS_CACHE.set(runId, result);

  return res.json(result);
});

module.exports = router;
