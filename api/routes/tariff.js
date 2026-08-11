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

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
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

  const destUpper = destination_code.toUpperCase();
  const resolvedCategory = category ? category.toLowerCase() : inferCategoryFromHs(hs_code);

  if (!resolvedCategory || !TARIFF_TABLE[resolvedCategory]) {
    return res.status(422).json({
      error: 'UNRESOLVABLE_CATEGORY',
      message: `Could not resolve product category from hs_code "${hs_code}". Provide a "category" field (textiles|food|machinery|electronics|medical).`,
      timestamp: new Date().toISOString()
    });
  }

  const categoryRates = TARIFF_TABLE[resolvedCategory];
  if (!categoryRates.hasOwnProperty(destUpper)) {
    return res.status(404).json({
      error: 'DESTINATION_NOT_FOUND',
      message: `Destination code "${destUpper}" is not in the tariff database.`,
      supported_destinations: Object.keys(categoryRates),
      timestamp: new Date().toISOString()
    });
  }

  const tariffRate = categoryRates[destUpper];
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
    source: 'TradeMatch',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
