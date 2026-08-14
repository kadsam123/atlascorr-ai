'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Embedded data (self-contained) ────────────────────────────────────────────

const TARIFF_TABLE = {
  textiles:    { UAE: 5, SGP: 0, JPN: 8.4,  IND: 20,  AUS: 10, GBR: 12, USA: 11.4, DEU: 12, HKG: 0, CAN: 14 },
  food:        { UAE: 5, SGP: 0, JPN: 15.3, IND: 30,  AUS: 0,  GBR: 0,  USA: 5.6,  DEU: 15, HKG: 0, CAN: 0  },
  machinery:   { UAE: 5, SGP: 0, JPN: 0,    IND: 7.5, AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0  },
  electronics: { UAE: 5, SGP: 0, JPN: 0,    IND: 15,  AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0  },
  medical:     { UAE: 5, SGP: 0, JPN: 0,    IND: 12,  AUS: 0,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0  }
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
  CAN: { name: 'Canada',               region: 'North America',  easeOfTrade: 87, importGrowth: 3.7, gdpGrowth: 1.8, strongCategories: ['food','medical','machinery','electronics'] }
};

const CORRIDORS = [
  { name:'UK → UAE',          origins:['GB','GBR','UK'],       destinations:['AE','UAE'], score:87, transit_days:9,  cost_index:3.2, ports:['Port of London','Jebel Ali'] },
  { name:'EU → SE Asia',      origins:['EU','DEU','DE','FR','IT','NL'], destinations:['SGP','SG','VNM','TH'], score:82, transit_days:18, cost_index:2.8, ports:['Rotterdam','Singapore'] },
  { name:'USA → EU',          origins:['US','USA'],            destinations:['EU','DEU','DE','GBR','GB'], score:79, transit_days:12, cost_index:2.5, ports:['NY/NJ','Hamburg'] },
  { name:'India → USA',       origins:['IN','IND'],            destinations:['US','USA'], score:75, transit_days:21, cost_index:2.1, ports:['JNPT Mumbai','Los Angeles'] },
  { name:'Germany → India',   origins:['DE','DEU'],            destinations:['IN','IND'], score:73, transit_days:20, cost_index:2.3, ports:['Hamburg','Mundra'] },
  { name:'Italy → Singapore', origins:['IT','ITA'],            destinations:['SG','SGP'], score:88, transit_days:22, cost_index:3.0, ports:['Genoa','Singapore'] }
];

const COMPLIANCE_RULES = {
  medical:     { requiresLicense:true,  licenseType:'FDA Export Permit / CE Mark', dualUse:false, certRequired:'ISO 13485 / CE Mark', checkBody:'FDA / EMA' },
  electronics: { requiresLicense:false, licenseType:null, dualUse:true,  certRequired:null, checkBody:'BIS / ECCN' },
  machinery:   { requiresLicense:false, licenseType:null, dualUse:true,  certRequired:'CE Marking (EU)', checkBody:'BIS / Wassenaar' },
  food:        { requiresLicense:false, licenseType:null, dualUse:false, certRequired:'Phytosanitary / Food Safety Certificate', checkBody:'CODEX / FDA' },
  textiles:    { requiresLicense:false, licenseType:null, dualUse:false, certRequired:null, checkBody:null }
};

const HS_KEYWORDS = {
  wool:'5101.11', merino:'6117.10', cotton:'6205.20', shirt:'6205.20', scarf:'6117.10',
  solar:'8541.40', battery:'8507.60', oil:'1509.10', olive:'1509.10', cheese:'0406.20',
  ultrasound:'9018.12', medical:'9018.90', surgical:'9018.90', turmeric:'0910.30',
  pepper:'0904.11', mounting:'7308.90'
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(s) { return (s || '').toUpperCase().trim(); }

function getHsCode(product) {
  const lower = (product || '').toLowerCase();
  for (const [kw, hs] of Object.entries(HS_KEYWORDS)) {
    if (lower.includes(kw)) return hs;
  }
  return '9999.99';
}

function getRoute(origin) {
  const o = norm(origin);
  return CORRIDORS.find(c => c.origins.includes(o)) || {
    name: `${origin} → International`, score: 62, transit_days: 28, cost_index: 2.0, ports: ['Varies']
  };
}

function getMarket(marketCode) {
  return MARKETS[norm(marketCode)];
}

function getTariff(category, marketCode) {
  const cat = (category || 'textiles').toLowerCase();
  const code = norm(marketCode);
  return (TARIFF_TABLE[cat] || {})[code];
}

function getCompliance(category) {
  return COMPLIANCE_RULES[(category || 'textiles').toLowerCase()] || COMPLIANCE_RULES.textiles;
}

// ── Phase definitions ─────────────────────────────────────────────────────────
function buildTimeline(compliance, bestRoute, category) {
  const phases = [
    {
      phase: 'Phase 1: Market Validation & Preparation',
      weeks: '1-2',
      actions: [
        `Confirm HS code classification for ${category} products`,
        'Obtain market entry feasibility report',
        'Verify buyer/distributor credentials in target market',
        'Open trade finance facility if required'
      ]
    },
    {
      phase: 'Phase 2: Compliance & Documentation',
      weeks: '3-5',
      actions: [
        compliance.requiresLicense
          ? `Apply for ${compliance.licenseType} through ${compliance.checkBody}`
          : 'Complete standard export declaration (EX-1 / AES)',
        compliance.certRequired
          ? `Obtain ${compliance.certRequired}`
          : 'Prepare Certificate of Origin',
        'Arrange cargo insurance',
        'Book freight via preferred freight forwarder'
      ]
    },
    {
      phase: 'Phase 3: Logistics Execution',
      weeks: `6-${6 + Math.ceil(bestRoute.transit_days / 7)}`,
      actions: [
        `Ship via ${bestRoute.name} corridor`,
        'Track cargo with real-time monitoring',
        'Submit customs pre-arrival notification to destination port',
        `Estimated transit: ${bestRoute.transit_days} days`
      ]
    },
    {
      phase: 'Phase 4: Market Entry & Post-Shipment',
      weeks: `${7 + Math.ceil(bestRoute.transit_days / 7)}-${10 + Math.ceil(bestRoute.transit_days / 7)}`,
      actions: [
        'Customs clearance at destination port',
        'Last-mile delivery to buyer / distribution centre',
        'Invoice and payment settlement',
        'Performance review & repeat order planning'
      ]
    }
  ];
  return phases;
}

function buildComplianceChecklist(compliance, category) {
  const items = [];

  items.push({
    item: 'HS Code Classification',
    status: 'REQUIRED',
    action: `Verify HS classification under ${category} chapter. Use /api/hs-code endpoint.`
  });
  items.push({
    item: 'Certificate of Origin',
    status: 'REQUIRED',
    action: 'Obtain from local Chamber of Commerce or authorised trade body.'
  });
  items.push({
    item: 'Commercial Invoice',
    status: 'REQUIRED',
    action: 'Prepare in English and destination country language if required.'
  });
  items.push({
    item: 'Packing List',
    status: 'REQUIRED',
    action: 'Include gross/net weight, dimensions, and HS codes per line item.'
  });

  if (compliance.requiresLicense) {
    items.push({
      item: `Export Licence — ${compliance.licenseType}`,
      status: 'REQUIRED',
      action: `Apply through ${compliance.checkBody}. Allow 4-8 weeks processing time.`
    });
  }
  if (compliance.certRequired) {
    items.push({
      item: `Product Certification — ${compliance.certRequired}`,
      status: 'REQUIRED',
      action: 'Engage an accredited certification body. Costs vary by product and jurisdiction.'
    });
  }
  if (compliance.dualUse) {
    items.push({
      item: 'Dual-Use Export Control Review',
      status: 'REQUIRED',
      action: `Obtain ECCN classification. Consult ${compliance.checkBody} for licence exception or authorisation.`
    });
  }
  items.push({
    item: 'Cargo Insurance',
    status: 'RECOMMENDED',
    action: 'Arrange all-risk marine cargo insurance (minimum CIF value × 1.1).'
  });
  items.push({
    item: 'Incoterms Selection',
    status: 'RECOMMENDED',
    action: 'Agree Incoterms 2020 with buyer (DDP or DAP recommended for new markets).'
  });
  return items;
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { company_name, product, origin, target_market, budget } = req.body || {};

  if (!company_name || !product || !origin || !target_market) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`company_name`, `product`, `origin`, and `target_market` are all required.',
      example: {
        company_name: 'Meridian Exports Ltd',
        product: 'merino wool scarves',
        origin: 'UK',
        target_market: 'UAE',
        budget: 50000
      },
      timestamp: new Date().toISOString()
    });
  }

  // Infer category from product description
  const lower = product.toLowerCase();
  let category = 'textiles';
  if (['solar','battery','chip','circuit','electronic','sensor'].some(k => lower.includes(k))) category = 'electronics';
  else if (['oil','food','cheese','spice','grain','fruit','pepper','turmeric','olive'].some(k => lower.includes(k))) category = 'food';
  else if (['machine','pump','engine','compressor','turbine','mounting'].some(k => lower.includes(k))) category = 'machinery';
  else if (['ultrasound','surgical','medical','implant','diagnostic'].some(k => lower.includes(k))) category = 'medical';

  const hsCode    = getHsCode(product);
  const bestRoute = getRoute(origin);
  const market    = getMarket(target_market);
  const compliance = getCompliance(category);
  const tariffRate = getTariff(category, target_market);

  if (!market) {
    return res.status(404).json({
      error: 'MARKET_NOT_FOUND',
      message: `Target market "${target_market}" not found. Supported: ${Object.keys(MARKETS).join(', ')}.`,
      timestamp: new Date().toISOString()
    });
  }

  const budgetNum = typeof budget === 'number' && budget > 0 ? budget : 50000;

  // Estimated costs
  const logisticsCost  = Math.round(budgetNum * 0.18);
  const complianceCost = compliance.requiresLicense ? Math.round(budgetNum * 0.08) : Math.round(budgetNum * 0.03);
  const tariffCost     = tariffRate != null ? Math.round(budgetNum * (tariffRate / 100)) : Math.round(budgetNum * 0.08);
  const totalCost      = logisticsCost + complianceCost + tariffCost;

  const timeline = buildTimeline(compliance, bestRoute, category);
  const checklist = buildComplianceChecklist(compliance, category);

  // Risk assessment
  const riskScore = (compliance.requiresLicense ? 30 : 0) + (compliance.dualUse ? 20 : 0) + (tariffRate > 15 ? 15 : 0);
  const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MODERATE' : 'LOW';

  const executiveSummary = [
    `${company_name} is positioned to export ${product} from ${origin} to ${market.name}.`,
    `The recommended trade corridor is "${bestRoute.name}" with an estimated transit of ${bestRoute.transit_days} days.`,
    tariffRate != null
      ? `Import tariff for ${category} products into ${market.name}: ${tariffRate}%.`
      : `Tariff data for this market/category combination is not available — consult local customs authority.`,
    compliance.requiresLicense
      ? `An export licence (${compliance.licenseType}) is required before shipment.`
      : `No export licence is required for this product category.`,
    `Overall compliance risk: ${riskLevel}. Budget estimate: USD ${totalCost.toLocaleString()}.`
  ].join(' ');

  // Autonomously detect orchestration gaps (Mode B)
  const { detectAndRouteGaps } = require('../middleware/gapDetector');
  const gapAnalysis = detectAndRouteGaps(req.body);

  return res.json({
    request_id: uuidv4(),
    plan_id: `EP-${Date.now()}`,
    company_name,
    product,
    origin,
    target_market: market.name,
    target_market_code: norm(target_market),
    category,
    hs_code: hsCode,
    executive_summary: executiveSummary,
    recommended_route: {
      name: bestRoute.name,
      score: bestRoute.score,
      transit_days: bestRoute.transit_days,
      cost_index: bestRoute.cost_index,
      primary_ports: bestRoute.ports
    },
    market_analysis: {
      market: market.name,
      region: market.region,
      ease_of_trade: market.easeOfTrade,
      import_growth_pct: market.importGrowth,
      gdp_growth_pct: market.gdpGrowth,
      category_fit: market.strongCategories.includes(category) ? 'HIGH' : 'MODERATE',
      tariff_rate_pct: tariffRate !== undefined ? tariffRate : null
    },
    compliance_checklist: checklist,
    tariff_breakdown: {
      category,
      destination_code: norm(target_market),
      tariff_rate_pct: tariffRate !== undefined ? tariffRate : null,
      tariff_label: tariffRate === 0 ? 'DUTY_FREE' : tariffRate <= 5 ? 'LOW' : tariffRate <= 15 ? 'MODERATE' : 'HIGH',
      estimated_duty_usd: tariffCost,
      source: 'TradeMatch'
    },
    risk_assessment: {
      risk_score: riskScore,
      risk_level: riskLevel,
      license_required: compliance.requiresLicense,
      license_type: compliance.licenseType,
      dual_use: compliance.dualUse,
      check_body: compliance.checkBody,
      cert_required: compliance.certRequired,
      key_risks: [
        tariffRate > 15 ? `High import tariff (${tariffRate}%) may erode margin — consider duty drawback or FTA eligibility.` : null,
        compliance.requiresLicense ? `Export licence (${compliance.licenseType}) adds 4-8 weeks to timeline.` : null,
        compliance.dualUse ? `Dual-use classification requires ECCN review with ${compliance.checkBody}.` : null,
        `Currency risk: transactions in ${market.name} may be subject to FX volatility.`
      ].filter(Boolean)
    },
    timeline,
    estimated_costs: {
      budget_input_usd: budgetNum,
      logistics_usd: logisticsCost,
      compliance_usd: complianceCost,
      tariffs_usd: tariffCost,
      total_estimated_usd: totalCost,
      notes: 'Estimates are indicative. Engage freight forwarder and customs broker for precise quotations.'
    },
    dispatched_gaps: gapAnalysis.dispatched_gaps,
    orchestration_ledger: gapAnalysis.orchestration_ledger,
    source: 'CircleTrade Export Plan Engine v1',
    generated_at: new Date().toISOString()
  });
});

module.exports = router;
