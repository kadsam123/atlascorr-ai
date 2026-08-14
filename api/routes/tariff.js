'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Tariff table: category × destination ISO code ─────────────────────────────
const TARIFF_TABLE = {
  textiles:    { UAE: 5,   SGP: 0,  JPN: 8.4,  IND: 20,  AUS: 10,  GBR: 12,  USA: 11.4, DEU: 12,  HKG: 0,  CAN: 14,  ZAF: 30,  BRA: 35 },
  food:        { UAE: 5,   SGP: 0,  JPN: 15.3, IND: 30,  AUS: 0,   GBR: 0,   USA: 5.6,  DEU: 15,  HKG: 0,  CAN: 0,   ZAF: 30,  BRA: 55 },
  machinery:   { UAE: 5,   SGP: 0,  JPN: 0,    IND: 7.5, AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 14 },
  electronics: { UAE: 5,   SGP: 0,  JPN: 0,    IND: 15,  AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 16 },
  medical:     { UAE: 5,   SGP: 0,  JPN: 0,    IND: 12,  AUS: 0,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 15,  BRA: 14 }
};

// Country code → full name map
const COUNTRY_NAMES = {
  UAE: 'United Arab Emirates',
  SGP: 'Singapore',
  JPN: 'Japan',
  IND: 'India',
  AUS: 'Australia',
  GBR: 'United Kingdom',
  USA: 'United States of America',
  DEU: 'Germany',
  HKG: 'Hong Kong SAR',
  CAN: 'Canada',
  ZAF: 'South Africa',
  BRA: 'Brazil'
};

// HS code prefix → category inference
const HS_CATEGORY_MAP = {
  '51': 'textiles',  '52': 'textiles',  '61': 'textiles',  '62': 'textiles',
  '09': 'food',      '10': 'food',      '15': 'food',      '04': 'food',      '21': 'food',
  '73': 'machinery', '84': 'machinery', '85': 'electronics',
  '90': 'medical'
};

/**
 * Tries to infer category from a 4-6 char HS code string.
 * @param {string} hsCode
 * @returns {string|null}
 */
function inferCategoryFromHs(hsCode) {
  const clean = hsCode.replace(/\D/g, '').substring(0, 4);
  const prefix2 = clean.substring(0, 2);
  const prefix4 = clean.substring(0, 4);

  // Check electronics vs machinery by chapter 84/85
  if (prefix2 === '85') return 'electronics';
  if (prefix2 === '84') return 'machinery';
  if (prefix2 === '90') return 'medical';

  return HS_CATEGORY_MAP[prefix2] || null;
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
      return matches[0]; // Return first percentage found
    }
  } catch (err) {
    console.error('[WebSearch Error]', err.message);
  }
  return null;
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { hs_code, destination_code, category } = req.body || {};

  if (!hs_code || typeof hs_code !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`hs_code` is required and must be a string (e.g. "6205.20").',
      timestamp: new Date().toISOString()
    });
  }

  if (!destination_code || typeof destination_code !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`destination_code` is required (e.g. "UAE", "SGP").',
      timestamp: new Date().toISOString()
    });
  }

  const destUpper = destination_code.toUpperCase().trim();
  const resolvedCategory = category ? category.toLowerCase().trim() : (inferCategoryFromHs(hs_code) || 'machinery');

  const categoryRates = TARIFF_TABLE[resolvedCategory] || TARIFF_TABLE['machinery'];
  let tariffRate = null;
  let source = 'TradeMatch';

  // Check if country exists in our static table
  if (categoryRates.hasOwnProperty(destUpper)) {
    tariffRate = categoryRates[destUpper];
  } else {
    // Run live Web Search lookup as fallback
    console.log(`[Tariff Agent] Country "${destUpper}" not in local table. Running live Web Search lookup...`);
    const countryName = COUNTRY_NAMES[destUpper] || destUpper;
    const webRate = await searchWebForTariff(hs_code, countryName);
    if (webRate !== null) {
      tariffRate = webRate;
      source = 'TradeMatch-WebIntelligence';
      console.log(`[Tariff Agent] Web Search success! Resolved: ${tariffRate}%`);
    } else {
      // Fallback if search fails (use average of the category rates)
      const rates = Object.values(categoryRates);
      const avg = rates.reduce((sum, val) => sum + val, 0) / rates.length;
      tariffRate = Math.round(avg * 10) / 10;
      source = 'TradeMatch-Estimate';
      console.log(`[Tariff Agent] Web Search failed. Using category average: ${tariffRate}%`);
    }
  }

  const allRates = Object.entries(categoryRates).sort((a, b) => a[1] - b[1]);
  const lowestRate = allRates[0];
  const highestRate = allRates[allRates.length - 1];

  return res.json({
    request_id: uuidv4(),
    hs_code,
    destination: COUNTRY_NAMES[destUpper] || destUpper,
    destination_code: destUpper,
    category: resolvedCategory,
    tariff_rate: tariffRate,
    currency: 'percent',
    tariff_label: tariffRate === 0 ? 'DUTY_FREE' : tariffRate <= 5 ? 'LOW' : tariffRate <= 15 ? 'MODERATE' : 'HIGH',
    benchmark: {
      lowest_in_category: { destination: lowestRate[0], rate: lowestRate[1] },
      highest_in_category: { destination: highestRate[0], rate: highestRate[1] }
    },
    source: source,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
