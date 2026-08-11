'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Sanctioned countries ──────────────────────────────────────────────────────
const SANCTIONED_COUNTRIES = new Set([
  'IRAN', 'IR', 'IRN',
  'NORTH KOREA', 'KP', 'PRK', 'DPRK',
  'SYRIA', 'SY', 'SYR',
  'CUBA', 'CU', 'CUB',
  'VENEZUELA', 'VE', 'VEN',
  'BELARUS', 'BY', 'BLR',
  'MYANMAR', 'MM', 'MMR', 'BURMA'
]);

// ── Compliance rules by category ───────────────────────────────────────────────
const COMPLIANCE_RULES = {
  medical: {
    requiresLicense: true,
    licenseType: 'FDA Export Permit / CE Mark',
    dualUse: false,
    checkBody: 'FDA / EMA / MHRA',
    certRequired: 'ISO 13485 / CE Mark / FDA 510(k)',
    standardWarnings: [
      'Medical devices require pre-market approval in most jurisdictions.',
      'Verify CE Mark validity for EU/GBR destinations.',
      'FDA Export Permit mandatory for US-origin medical exports.'
    ]
  },
  electronics: {
    requiresLicense: false,
    licenseType: null,
    dualUse: true,
    checkBody: 'BIS / ECCN',
    certRequired: null,
    standardWarnings: [
      'Electronics may be classified under EAR (Export Administration Regulations).',
      'Check ECCN classification for dual-use items (e.g. encryption, sensors).',
      'BIS licence exception or authorisation required if ECCN is controlled.'
    ]
  },
  machinery: {
    requiresLicense: false,
    licenseType: null,
    dualUse: true,
    checkBody: 'BIS / ECCN / Wassenaar',
    certRequired: null,
    standardWarnings: [
      'Heavy machinery may fall under Wassenaar Arrangement controls.',
      'Verify end-user and end-use certificates for dual-use machinery.',
      'CE marking required for machinery exported to EU/EEA markets.'
    ]
  },
  food: {
    requiresLicense: false,
    licenseType: null,
    dualUse: false,
    checkBody: 'CODEX / FSANZ / FDA',
    certRequired: 'Phytosanitary / Food Safety Certificate',
    standardWarnings: [
      'Phytosanitary certificate required for plant-based food products.',
      'Food safety certification (HACCP / ISO 22000) strongly recommended.',
      'Country-specific labelling rules must be followed (e.g. Halal, Kosher, allergens).'
    ]
  },
  textiles: {
    requiresLicense: false,
    licenseType: null,
    dualUse: false,
    checkBody: null,
    certRequired: null,
    standardWarnings: [
      'Verify fibre composition and country-of-origin labelling requirements.',
      'REACH compliance required for chemical treatments on textiles exported to EU.',
      'Anti-dumping duties may apply on certain textile products.'
    ]
  }
};

// ── HS code keyword map (reused from hsCode route logic) ──────────────────────
const HS_KEYWORD_MAP = {
  wool: '5101.11', merino: '6117.10', cotton: '6205.20', shirt: '6205.20',
  scarf: '6117.10', solar: '8541.40', battery: '8507.60', oil: '1509.10',
  olive: '1509.10', cheese: '0406.20', ultrasound: '9018.12', medical: '9018.90',
  surgical: '9018.90', turmeric: '0910.30', pepper: '0904.11', mounting: '7308.90'
};

function extractHsCode(desc) {
  const lower = (desc || '').toLowerCase();
  for (const [kw, hs] of Object.entries(HS_KEYWORD_MAP)) {
    if (lower.includes(kw)) return hs;
  }
  return null;
}

/**
 * Computes a composite risk score 0-100. Higher = more risk.
 */
function computeRiskScore({ sanctioned, licenseRequired, dualUse, category }) {
  let score = 0;
  if (sanctioned)       score += 100;
  if (licenseRequired)  score += 25;
  if (dualUse)          score += 20;
  if (category === 'medical')     score += 15;
  if (category === 'electronics') score += 10;
  if (category === 'machinery')   score += 10;
  return Math.min(score, 100);
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { product_description, destination, category } = req.body || {};

  const validCategories = ['textiles', 'food', 'machinery', 'electronics', 'medical'];

  if (!product_description || typeof product_description !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`product_description` is required.',
      timestamp: new Date().toISOString()
    });
  }
  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`destination` is required (country name or ISO code).',
      timestamp: new Date().toISOString()
    });
  }
  if (!category || !validCategories.includes(category.toLowerCase())) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `\`category\` is required. Valid values: ${validCategories.join(', ')}.`,
      timestamp: new Date().toISOString()
    });
  }

  const cat = category.toLowerCase();
  const destUpper = destination.toUpperCase().trim();
  const rules = COMPLIANCE_RULES[cat];

  // Sanction check
  const isSanctioned = SANCTIONED_COUNTRIES.has(destUpper);

  // HS code extraction
  const detectedHs = extractHsCode(product_description) || '9999.99';

  // Warnings & issues
  const warnings = [...rules.standardWarnings];
  const issues = [];

  if (isSanctioned) {
    issues.push(`CRITICAL: "${destination}" is a sanctioned country. This shipment is PROHIBITED under international trade law.`);
    issues.push('Proceeding with this export may result in severe legal penalties including criminal prosecution.');
  }

  if (rules.requiresLicense) {
    warnings.push(`A ${rules.licenseType} must be obtained before export.`);
  }

  if (rules.dualUse) {
    warnings.push(`Product category "${cat}" has dual-use potential. An ECCN classification review is required.`);
  }

  if (rules.certRequired) {
    warnings.push(`Required certification: ${rules.certRequired}.`);
  }

  const riskScore = computeRiskScore({
    sanctioned: isSanctioned,
    licenseRequired: rules.requiresLicense,
    dualUse: rules.dualUse,
    category: cat
  });

  const passed = !isSanctioned && issues.length === 0;

  return res.json({
    request_id: uuidv4(),
    passed,
    hs_code: detectedHs,
    category: cat,
    destination,
    sanctioned: isSanctioned,
    license_required: rules.requiresLicense,
    license_type: rules.licenseType || null,
    dual_use: rules.dualUse,
    check_body: rules.checkBody || null,
    cert_required: rules.certRequired || null,
    risk_score: riskScore,
    risk_level: riskScore >= 80 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MODERATE' : 'LOW',
    warnings,
    issues,
    recommendation: isSanctioned
      ? 'DO NOT PROCEED. Shipment to this destination is prohibited by international sanctions.'
      : riskScore >= 50
        ? 'Engage a licensed trade compliance officer before proceeding.'
        : 'Obtain required certifications and proceed with standard due diligence.',
    source: 'DDTRS',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
