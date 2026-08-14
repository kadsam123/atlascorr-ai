'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Embedded data (self-contained) ────────────────────────────────────────────

const TARIFF_TABLE = {
  textiles:    { UAE: 5, SGP: 0, JPN: 8.4,  IND: 20,  AUS: 10, GBR: 12, USA: 11.4, DEU: 12, HKG: 0, CAN: 14, ZAF: 30, BRA: 35, VNM: 12 },
  food:        { UAE: 5, SGP: 0, JPN: 15.3, IND: 30,  AUS: 0,  GBR: 0,  USA: 5.6,  DEU: 15, HKG: 0, CAN: 0,  ZAF: 30, BRA: 55, VNM: 10 },
  machinery:   { UAE: 5, SGP: 0, JPN: 0,    IND: 7.5, AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  ZAF: 10, BRA: 14, VNM: 5  },
  electronics: { UAE: 5, SGP: 0, JPN: 0,    IND: 15,  AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  ZAF: 10, BRA: 16, VNM: 0  },
  medical:     { UAE: 5, SGP: 0, JPN: 0,    IND: 12,  AUS: 0,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  ZAF: 15, BRA: 14, VNM: 5  }
};

const MARKETS = {
  UAE: { name: 'United Arab Emirates', region: 'Middle East',    easeOfTrade: 88, importGrowth: 7.8, gdpGrowth: 4.2, strongCategories: ['textiles','electronics','food','medical'] },
  SGP: { name: 'Singapore',            region: 'Southeast Asia', easeOfTrade: 95, importGrowth: 6.1, gdpGrowth: 3.6, strongCategories: ['electronics','machinery','medical','food'] },
  JPN: { name: 'Japan',                region: 'East Asia',      easeOfTrade: 82, importGrowth: 3.2, gdpGrowth: 1.5, strongCategories: ['machinery','electronics','medical','food'] },
  IND: { name: 'India',                region: 'South Asia',     easeOfTrade: 67, importGrowth: 9.4, gdpGrowth: 6.8, strongCategories: ['electronics','machinery','textiles'] },
  AUS: { name: 'Australia',            region: 'Oceania',        easeOfTrade: 86, importGrowth: 5.1, gdpGrowth: 2.3, strongCategories: ['food','medical','machinery','textiles'] },
  GBR: { name: 'United Kingdom',       region: 'Europe',         easeOfTrade: 89, importGrowth: 2.8, gdpGrowth: 1.2, strongCategories: ['medical','electronics','food','textiles'] },
  DEU: { name: 'Germany',              region: 'Europe',         easeOfTrade: 91, importGrowth: 2.9, gdpGrowth: 0.9, strongCategories: ['machinery','electronics','medical','textiles'] },
  HKG: { name: 'Hong Kong SAR',        region: 'East Asia',      easeOfTrade: 94, importGrowth: 4.8, gdpGrowth: 3.1, strongCategories: ['electronics','textiles','food','medical'] },
  CAN: { name: 'Canada',               region: 'North America',  easeOfTrade: 87, importGrowth: 3.7, gdpGrowth: 1.8, strongCategories: ['food','medical','machinery','electronics'] },
  VNM: { name: 'Vietnam',              region: 'Southeast Asia', easeOfTrade: 70, importGrowth:11.2, gdpGrowth: 6.5, strongCategories: ['textiles','electronics','machinery'] }
};

const CORRIDORS = [
  { name: 'UK → UAE',          origins: ['GB','GBR','UK'],       destinations: ['AE','UAE'], score: 87, transit_days: 9,  cost_index: 3.2 },
  { name: 'EU → SE Asia',      origins: ['EU','DEU','DE','FR','IT','NL'], destinations: ['SGP','SG','VNM','TH','ID','MY'], score: 82, transit_days: 18, cost_index: 2.8 },
  { name: 'USA → EU',          origins: ['US','USA'],            destinations: ['EU','DEU','DE','FR','GBR','GB'], score: 79, transit_days: 12, cost_index: 2.5 },
  { name: 'India → USA',       origins: ['IN','IND'],            destinations: ['US','USA'], score: 75, transit_days: 21, cost_index: 2.1 },
  { name: 'Germany → India',   origins: ['DE','DEU'],            destinations: ['IN','IND'], score: 73, transit_days: 20, cost_index: 2.3 },
  { name: 'Italy → Singapore', origins: ['IT','ITA'],            destinations: ['SG','SGP'], score: 88, transit_days: 22, cost_index: 3.0 }
];

const SANCTIONED = new Set(['IRAN','IRN','NORTH KOREA','PRK','DPRK','SYRIA','SYR','CUBA','CUB','VENEZUELA','VEN','BELARUS','BLR','MYANMAR','MMR','BURMA']);

const COMPLIANCE_RULES = {
  medical:     { requiresLicense: true,  licenseType: 'FDA Export Permit / CE Mark', dualUse: false, checkBody: 'FDA / EMA' },
  electronics: { requiresLicense: false, licenseType: null, dualUse: true,  checkBody: 'BIS / ECCN' },
  machinery:   { requiresLicense: false, licenseType: null, dualUse: true,  checkBody: 'BIS / ECCN / Wassenaar' },
  food:        { requiresLicense: false, licenseType: null, dualUse: false, checkBody: 'CODEX / FDA', certRequired: 'Phytosanitary / Food Safety Certificate' },
  textiles:    { requiresLicense: false, licenseType: null, dualUse: false, checkBody: null }
};

const HS_KEYWORDS = {
  wool:'5101.11', merino:'6117.10', cotton:'6205.20', shirt:'6205.20', scarf:'6117.10',
  solar:'8541.40', battery:'8507.60', oil:'1509.10', olive:'1509.10', cheese:'0406.20',
  ultrasound:'9018.12', medical:'9018.90', surgical:'9018.90', turmeric:'0910.30',
  pepper:'0904.11', mounting:'7308.90'
};

// ── Internal helpers ───────────────────────────────────────────────────────────
function norm(s) { return (s || '').toUpperCase().trim(); }

function getCategory(products) {
  if (!Array.isArray(products) || products.length === 0) return 'textiles';
  const cats = products.map(p => (p.category || '').toLowerCase()).filter(Boolean);
  return cats[0] || 'textiles';
}

function resolveBestRoute(originCountry) {
  const o = norm(originCountry);
  const match = CORRIDORS.find(c => c.origins.includes(o));
  if (match) return match;
  return { name: `${originCountry} → International`, score: 62, transit_days: 28, cost_index: 2.0 };
}

function resolveBestMarket(category, targetMarkets) {
  const codes = Array.isArray(targetMarkets) && targetMarkets.length > 0
    ? targetMarkets.map(norm).filter(c => MARKETS[c])
    : Object.keys(MARKETS);

  let best = null;
  let bestScore = -1;
  for (const code of codes) {
    const m = MARKETS[code];
    if (!m) continue;
    const tariff = (TARIFF_TABLE[category] || {})[code] || 10;
    const score = Math.round(m.importGrowth * 5 + m.easeOfTrade * 0.3 + (m.strongCategories.includes(category) ? 15 : 5) - tariff * 0.4);
    if (score > bestScore) { bestScore = score; best = { code, market: m, tariff, score: Math.min(score, 99) }; }
  }
  return best;
}

function resolveTariff(category, marketCode) {
  return (TARIFF_TABLE[category] || {})[marketCode] !== undefined
    ? TARIFF_TABLE[category][marketCode]
    : null;
}

function resolveCompliance(products, destination) {
  const cat = getCategory(products);
  const rules = COMPLIANCE_RULES[cat] || COMPLIANCE_RULES.textiles;
  const sanctioned = SANCTIONED.has(norm(destination));
  const riskScore = (sanctioned ? 100 : 0) + (rules.requiresLicense ? 25 : 0) + (rules.dualUse ? 20 : 0);
  return {
    category: cat,
    license_required: rules.requiresLicense,
    license_type: rules.licenseType,
    dual_use: rules.dualUse,
    check_body: rules.checkBody,
    sanctioned,
    risk_score: Math.min(riskScore, 100)
  };
}

function getHsCode(productName) {
  const lower = (productName || '').toLowerCase();
  for (const [kw, hs] of Object.entries(HS_KEYWORDS)) {
    if (lower.includes(kw)) return hs;
  }
  return '9999.99';
}

function computeOpportunityScore(category, targetMarkets) {
  const codes = Array.isArray(targetMarkets) && targetMarkets.length > 0
    ? targetMarkets.map(norm).filter(c => MARKETS[c])
    : Object.keys(MARKETS);

  return codes.map(code => {
    const m = MARKETS[code];
    const tariff = (TARIFF_TABLE[category] || {})[code] || 10;
    const score = Math.min(Math.round(m.importGrowth * 5 + m.easeOfTrade * 0.3 + (m.strongCategories.includes(category) ? 15 : 5) - tariff * 0.4), 99);
    return { market: m.name, market_code: code, score, tariff, import_growth: m.importGrowth, region: m.region };
  }).sort((a, b) => b.score - a.score);
}

function buildRecommendation({ bestRoute, bestMarket, compliance, tariffRate, riskTolerance }) {
  const tol = (riskTolerance || 'medium').toLowerCase();
  if (compliance.sanctioned) {
    return 'HALT: Destination is sanctioned. Export is prohibited.';
  }
  if (compliance.risk_score >= 50 && tol === 'low') {
    return `Risk score ${compliance.risk_score} exceeds low risk tolerance. Obtain ${compliance.license_type || 'compliance certification'} before proceeding.`;
  }
  const tariffNote = tariffRate === 0 ? 'duty-free entry' : `${tariffRate}% import tariff`;
  return `Proceed via ${bestRoute.name} to ${bestMarket.market.name}. ${tariffNote}. Transit ~${bestRoute.transit_days} days. ${compliance.license_required ? 'Licence required: ' + compliance.license_type + '.' : 'No export licence required.'}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
const { detectAndRouteGaps } = require('../middleware/gapDetector');

router.post('/', (req, res) => {
  const {
    customer_name,
    origin_country,
    products,
    target_markets,
    budget,
    risk_tolerance
  } = req.body || {};

  if (!customer_name || !origin_country || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`customer_name`, `origin_country`, and `products` (non-empty array) are required.',
      example: {
        customer_name: 'Acme Exports Ltd',
        origin_country: 'UK',
        products: [{ name: 'merino wool scarf', category: 'textiles', hs_code: '6117.10' }],
        target_markets: ['UAE', 'SGP'],
        budget: 75000,
        risk_tolerance: 'medium'
      },
      timestamp: new Date().toISOString()
    });
  }

  const category = getCategory(products);
  const pipelineSteps = [];

  // Step 1: HS Code resolution
  const hsResults = products.map(p => ({
    product: p.name,
    hs_code: p.hs_code || getHsCode(p.name),
    category: p.category || category
  }));
  pipelineSteps.push({ module: 'DDTRS:HSCode', output: { resolved: hsResults } });

  // Step 2: Route optimisation
  const bestRoute = resolveBestRoute(origin_country);
  pipelineSteps.push({
    module: 'MeridianFlow:Route',
    output: { best_route: bestRoute.name, score: bestRoute.score, transit_days: bestRoute.transit_days }
  });

  // Step 3: Market match
  const bestMarketResult = resolveBestMarket(category, target_markets);
  if (!bestMarketResult) {
    return res.status(422).json({
      error: 'NO_MARKETS_RESOLVED',
      message: 'Could not resolve any target markets. Check target_markets values.',
      timestamp: new Date().toISOString()
    });
  }
  pipelineSteps.push({
    module: 'TradeMatch:Market',
    output: { best_market: bestMarketResult.market.name, score: bestMarketResult.score, tariff: bestMarketResult.tariff }
  });

  // Step 4: Tariff lookup
  const tariffRate = resolveTariff(category, bestMarketResult.code);
  pipelineSteps.push({
    module: 'TradeMatch:Tariff',
    output: { category, destination: bestMarketResult.code, tariff_rate: tariffRate, currency: 'percent' }
  });

  // Step 5: Compliance check
  const compliance = resolveCompliance(products, bestMarketResult.market.name);
  pipelineSteps.push({
    module: 'DDTRS:Compliance',
    output: {
      sanctioned: compliance.sanctioned,
      license_required: compliance.license_required,
      risk_score: compliance.risk_score,
      check_body: compliance.check_body
    }
  });

  // Step 6: Opportunity scoring
  const opportunities = computeOpportunityScore(category, target_markets);
  const opportunityScore = opportunities[0] ? opportunities[0].score : 50;
  pipelineSteps.push({
    module: 'TradeMatch:Opportunity',
    output: { top_opportunity: opportunities[0] || null, total_evaluated: opportunities.length }
  });

  // Build final recommendation
  const recommendation = buildRecommendation({
    bestRoute, bestMarket: bestMarketResult, compliance, tariffRate, riskTolerance: risk_tolerance
  });

  const nextAction = compliance.sanctioned
    ? 'ABORT — consult legal counsel immediately.'
    : compliance.license_required
      ? `Apply for ${compliance.license_type} through ${compliance.check_body}.`
      : `Book freight via ${bestRoute.name} corridor and prepare ${category} shipment documentation.`;

  // Autonomously detect orchestration gaps (Mode B)
  const gapAnalysis = detectAndRouteGaps(req.body);

  return res.json({
    request_id: uuidv4(),
    customer: customer_name,
    origin_country,
    category,
    budget: budget || null,
    risk_tolerance: risk_tolerance || 'medium',
    best_route: {
      name: bestRoute.name,
      score: bestRoute.score,
      transit_days: bestRoute.transit_days,
      cost_index: bestRoute.cost_index
    },
    best_market: {
      name: bestMarketResult.market.name,
      code: bestMarketResult.code,
      region: bestMarketResult.market.region,
      score: bestMarketResult.score
    },
    tariff_rate: tariffRate,
    risk_score: compliance.risk_score,
    opportunity_score: opportunityScore,
    license_required: compliance.license_required,
    license_type: compliance.license_type,
    sanctioned_destination: compliance.sanctioned,
    recommendation,
    next_action: nextAction,
    dispatched_gaps: gapAnalysis.dispatched_gaps,
    orchestration_ledger: gapAnalysis.orchestration_ledger,
    pipeline_steps: pipelineSteps,
    timestamp: new Date().toISOString(),
    source: 'CircleTrade Pipeline v1'
  });
});

module.exports = router;
