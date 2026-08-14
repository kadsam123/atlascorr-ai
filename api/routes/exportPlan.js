'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Embedded databases ─────────────────────────────────────────────────────────
const TARIFF_TABLE = {
  textiles:    { UAE: 5, SGP: 0, JPN: 8.4,  IND: 20,  AUS: 10, GBR: 12, USA: 11.4, DEU: 12, HKG: 0, CAN: 14, DE: 12, US: 11.4 },
  food:        { UAE: 5, SGP: 0, JPN: 15.3, IND: 30,  AUS: 0,  GBR: 0,  USA: 5.6,  DEU: 15, HKG: 0, CAN: 0,  DE: 15, US: 5.6  },
  machinery:   { UAE: 5, SGP: 0, JPN: 0,    IND: 7.5, AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  DE: 0,  US: 0    },
  electronics: { UAE: 5, SGP: 0, JPN: 0,    IND: 15,  AUS: 5,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  DE: 0,  US: 0    },
  medical:     { UAE: 5, SGP: 0, JPN: 0,    IND: 12,  AUS: 0,  GBR: 0,  USA: 0,    DEU: 0,  HKG: 0, CAN: 0,  DE: 0,  US: 0    }
};

const MARKETS = {
  UAE: { name: 'United Arab Emirates', region: 'Middle East',    easeOfTrade: 88, importGrowth: 7.8, gdpGrowth: 4.2, strongCategories: ['textiles','electronics','food','medical'] },
  SGP: { name: 'Singapore',            region: 'Southeast Asia', easeOfTrade: 95, importGrowth: 6.1, gdpGrowth: 3.6, strongCategories: ['electronics','machinery','medical','food'] },
  JPN: { name: 'Japan',                region: 'East Asia',      easeOfTrade: 82, importGrowth: 3.2, gdpGrowth: 1.5, strongCategories: ['machinery','electronics','medical','food'] },
  IND: { name: 'India',                region: 'South Asia',     easeOfTrade: 67, importGrowth: 9.4, gdpGrowth: 6.8, strongCategories: ['electronics','machinery','textiles'] },
  AUS: { name: 'Australia',            region: 'Oceania',        easeOfTrade: 86, importGrowth: 5.1, gdpGrowth: 2.3, strongCategories: ['food','medical','machinery','textiles'] },
  GBR: { name: 'United Kingdom',       region: 'Europe',         easeOfTrade: 89, importGrowth: 2.8, gdpGrowth: 1.2, strongCategories: ['medical','electronics','food','textiles'] },
  DEU: { name: 'Germany',              region: 'Europe',         easeOfTrade: 91, importGrowth: 2.9, gdpGrowth: 0.9, strongCategories: ['machinery','electronics','medical','textiles'] },
  DE:  { name: 'Germany',              region: 'Europe',         easeOfTrade: 91, importGrowth: 2.9, gdpGrowth: 0.9, strongCategories: ['machinery','electronics','medical','textiles'] },
  US:  { name: 'United States',         region: 'North America',  easeOfTrade: 92, importGrowth: 3.0, gdpGrowth: 2.0, strongCategories: ['electronics','machinery','food','medical'] },
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

const HS_CATEGORY_MAP = {
  '51': 'textiles',  '52': 'textiles',  '61': 'textiles',  '62': 'textiles',
  '09': 'food',      '10': 'food',      '15': 'food',      '04': 'food',      '21': 'food',
  '73': 'machinery', '84': 'machinery', '85': 'electronics',
  '90': 'medical'
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(s) { return (s || '').toUpperCase().trim(); }

function inferCategoryFromHs(hsCode) {
  const clean = (hsCode || '').replace(/\D/g, '').substring(0, 4);
  const prefix2 = clean.substring(0, 2);
  return HS_CATEGORY_MAP[prefix2] || 'textiles';
}

function extractHsCode(desc) {
  const lower = (desc || '').toLowerCase();
  const keywords = {
    wool: '5101.11', merino: '6117.10', cotton: '6205.20', shirt: '6205.20',
    scarf: '6117.10', solar: '8541.40', battery: '8507.60', oil: '1509.10',
    olive: '1509.10', cheese: '0406.20', ultrasound: '9018.12', medical: '9018.90',
    surgical: '9018.90', turmeric: '0910.30', pepper: '0904.11', mounting: '7308.90'
  };
  for (const [kw, hs] of Object.entries(keywords)) {
    if (lower.includes(kw)) return hs;
  }
  return '6299.00';
}

function getRoute(origin, dest) {
  const o = norm(origin);
  const d = norm(dest);
  return CORRIDORS.find(c => c.origins && c.origins.includes(o)) || {
    name: `${origin} → ${dest}`, score: 62, transit_days: 28, cost_index: 2.0, ports: ['Varies']
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { product, origin_country, destination_country, incoterm } = req.body || {};

  if (!product || !origin_country || !destination_country) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`product` object description, `origin_country`, and `destination_country` are required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const queryText = `${product.name} ${product.description}`;
  const hsCode = product.hs_code_hint || extractHsCode(queryText);
  const category = inferCategoryFromHs(hsCode);
  
  const bestRoute = getRoute(origin_country, destination_country);
  const market = MARKETS[norm(destination_country)] || { name: destination_country, region: 'International', easeOfTrade: 70, importGrowth: 5.0, gdpGrowth: 2.0, strongCategories: [] };
  const compliance = COMPLIANCE_RULES[category] || COMPLIANCE_RULES.textiles;
  const tariffRate = TARIFF_TABLE[category] ? TARIFF_TABLE[category][norm(destination_country)] : 8.0;

  const executiveSummary = [
    `Export plan for ${product.name} from ${origin_country} to ${market.name} (${incoterm || 'FOB'}).`,
    `Recommended transit route: "${bestRoute.name}" (${bestRoute.transit_days} days).`,
    tariffRate != null
      ? `Applicable tariff for category ${category}: ${tariffRate}%.`
      : `Duties vary — consult local customs authority.`
  ].join(' ');

  // Autonomously detect orchestration gaps (Mode B)
  const { detectAndRouteGaps } = require('../middleware/gapDetector');
  const gapAnalysis = detectAndRouteGaps(req.body);

  return res.json({
    summary: executiveSummary,
    steps: [
      { step: 'Filing & Classification', description: `Finalize HS code classification (${hsCode}) for customs audit.` },
      { step: 'Logistics Booking', description: `Arrange freight shipment under ${incoterm || 'FOB'} terms via ${bestRoute.name}.` },
      { step: 'Compliance Filing', description: compliance.requiresLicense ? `Submit application for ${compliance.licenseType}.` : 'Prepare standard cargo customs declarations.' }
    ],
    compliance_notes: compliance.requiresLicense ? `Export licence required: ${compliance.licenseType}.` : 'No special licences required.'
  });
});

module.exports = router;
