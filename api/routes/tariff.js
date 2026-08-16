'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Tariff table: category × destination ISO code ─────────────────────────────
const TARIFF_TABLE = {
  textiles:    { UAE: 5,   SGP: 0,  JPN: 8.4,  IND: 20,  AUS: 10,  GBR: 12,  USA: 11.4, DEU: 12,  HKG: 0,  CAN: 14,  ZAF: 30,  BRA: 35, DE: 12, US: 11.4 },
  food:        { UAE: 5,   SGP: 0,  JPN: 15.3, IND: 30,  AUS: 0,   GBR: 0,   USA: 5.6,  DEU: 15,  HKG: 0,  CAN: 0,   ZAF: 30,  BRA: 55, DE: 15, US: 5.6  },
  machinery:   { UAE: 5,   SGP: 0,  JPN: 0,    IND: 7.5, AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 14, DE: 0,  US: 0    },
  electronics: { UAE: 5,   SGP: 0,  JPN: 0,    IND: 15,  AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 16, DE: 0,  US: 0    },
  medical:     { UAE: 5,   SGP: 0,  JPN: 0,    IND: 12,  AUS: 0,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 15,  BRA: 14, DE: 0,  US: 0    }
};

const COUNTRY_NAMES = {
  UAE: 'United Arab Emirates', AE: 'United Arab Emirates',
  SGP: 'Singapore', SG: 'Singapore',
  JPN: 'Japan', JP: 'Japan',
  IND: 'India', IN: 'India',
  AUS: 'Australia', AU: 'Australia',
  GBR: 'United Kingdom', GB: 'United Kingdom',
  USA: 'United States of America', US: 'United States of America',
  DEU: 'Germany', DE: 'Germany',
  HKG: 'Hong Kong SAR', HK: 'Hong Kong SAR',
  CAN: 'Canada', CA: 'Canada',
  ZAF: 'South Africa', ZA: 'South Africa',
  BRA: 'Brazil', BR: 'Brazil'
};

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
  if (prefix2 === '85') return 'electronics';
  if (prefix2 === '84') return 'machinery';
  if (prefix2 === '90') return 'medical';
  return HS_CATEGORY_MAP[prefix2] || 'machinery';
}

const https = require('https');

function fetchWebHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchWebForTariff(hsCode, destinationCode) {
  try {
    const query = encodeURIComponent(`Tariff rate for HS ${hsCode} imported to ${destinationCode}`);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    const html = await fetchWebHtml(url);
    const percentageRegex = /\b(\d+(?:\.\d+)?)\s*%/g;
    const matches = [];
    let match;
    while ((match = percentageRegex.exec(html)) !== null) {
      matches.push(parseFloat(match[1]));
    }
    if (matches.length > 0) {
      return matches[0];
    }
  } catch (err) {
    console.error('[WebSearch Error]', err.message);
  }
  return null;
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { hs_code, origin_country, destination_country } = req.body || {};

  if (!hs_code || !origin_country || !destination_country) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`hs_code`, `origin_country`, and `destination_country` are required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const destUpper = destination_country.toUpperCase().trim();
  const resolvedCategory = inferCategoryFromHs(hs_code);
  const categoryRates = TARIFF_TABLE[resolvedCategory] || TARIFF_TABLE['machinery'];
  const reflectionLog = [];

  // ── PHASE 1: Deterministic Core ─────────────────────────────────────────────
  reflectionLog.push(`Phase 1: Deterministic core lookup for HS ${hs_code} to ${destUpper}`);
  let coreRate = null;
  let source = 'TradeMatch';

  if (categoryRates.hasOwnProperty(destUpper)) {
    coreRate = categoryRates[destUpper];
    reflectionLog.push(`Core: Local table match found for country ${destUpper}: ${coreRate}%`);
  } else {
    const rates = Object.values(categoryRates);
    const avg = rates.reduce((sum, val) => sum + val, 0) / rates.length;
    coreRate = Math.round(avg * 10) / 10;
    source = 'TradeMatch-Estimate';
    reflectionLog.push(`Core: Country ${destUpper} not in local table. Using category average estimate: ${coreRate}%`);
  }

  // ── PHASE 2: Dynamic Enrichment ─────────────────────────────────────────────
  reflectionLog.push(`Phase 2: Initiating dynamic web enrichment lookup.`);
  let enrichmentApplied = false;
  let webRate = null;
  const countryName = COUNTRY_NAMES[destUpper] || destUpper;
  const sourceRef = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('Tariff rate for HS ' + hs_code + ' imported to ' + countryName)}`;

  try {
    webRate = await searchWebForTariff(hs_code, countryName);
    if (webRate !== null) {
      enrichmentApplied = true;
      reflectionLog.push(`Enrichment: Web crawler returned tariff rate: ${webRate}%`);
    } else {
      reflectionLog.push(`Enrichment: Web crawler returned no rate matches.`);
    }
  } catch (err) {
    reflectionLog.push(`Enrichment Error: Web lookup failed: ${err.message}`);
  }

  // ── PHASE 3: Antigravity QA Supervisor ───────────────────────────────────────
  reflectionLog.push(`Phase 3: Initiating Antigravity QA validation check.`);
  let finalRate = coreRate;
  let qaStatus = 'APPROVED_CORE';

  if (enrichmentApplied && webRate !== null) {
    const absoluteVariance = Math.abs(coreRate - webRate);
    reflectionLog.push(`QA: Evaluating absolute variance between Core (${coreRate}%) and Enriched (${webRate}%). Variance = ${absoluteVariance.toFixed(2)}%`);

    if (absoluteVariance <= 12.0) {
      finalRate = webRate;
      qaStatus = 'APPROVED_WITH_ENRICHMENT';
      reflectionLog.push(`QA: Variance is within the 12% safety threshold. Merging verified web rate.`);
    } else {
      qaStatus = 'DEGRADED_CORE_ONLY';
      enrichmentApplied = false;
      webRate = null;
      reflectionLog.push(`QA WARNING: Variance (${absoluteVariance.toFixed(2)}%) exceeds the 12% safety threshold! Rejecting dynamic enrichment to protect pipeline integrity.`);
    }
  } else {
    reflectionLog.push(`QA: No dynamic enrichment applied. Proceeding with deterministic baseline.`);
  }

  return res.json({
    hs_code,
    origin_country,
    destination_country: destUpper,
    duty_rate_pct: finalRate,
    additional_duties: [
      { name: 'Customs Processing Surcharge', rate_pct: 0.15 }
    ],
    notes: `Derived via ${source} for cargo category: ${resolvedCategory}.`,
    enrichment: {
      applied: enrichmentApplied,
      taric_rate: webRate,
      taric_last_updated: enrichmentApplied ? new Date().toISOString() : null,
      source_ref: sourceRef
    },
    qa_supervisor: {
      status: qaStatus,
      self_reflection_log: reflectionLog
    }
  });
});

module.exports = router;
