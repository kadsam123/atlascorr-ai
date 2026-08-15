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
    docs: ['Commercial Invoice', 'Certificate of Origin', 'FDA Export Permit', 'ISO 13485 Certificate']
  },
  electronics: {
    requiresLicense: false,
    licenseType: null,
    dualUse: true,
    docs: ['Commercial Invoice', 'Certificate of Origin', 'End-User Statement', 'ECCN Declaration']
  },
  machinery: {
    requiresLicense: false,
    licenseType: null,
    dualUse: true,
    docs: ['Commercial Invoice', 'Certificate of Origin', 'CE Declaration of Conformity']
  },
  food: {
    requiresLicense: false,
    licenseType: null,
    dualUse: false,
    docs: ['Commercial Invoice', 'Certificate of Origin', 'Phytosanitary Certificate', 'Food Safety Certificate']
  },
  textiles: {
    requiresLicense: false,
    licenseType: null,
    dualUse: false,
    docs: ['Commercial Invoice', 'Certificate of Origin', 'Packing List']
  }
};

const HS_CATEGORY_MAP = {
  '51': 'textiles',  '52': 'textiles',  '61': 'textiles',  '62': 'textiles',
  '09': 'food',      '10': 'food',      '15': 'food',      '04': 'food',      '21': 'food',
  '73': 'machinery', '84': 'machinery', '85': 'electronics',
  '90': 'medical'
};

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
  return '6299.00'; // Default textiles fallback
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const body = req.body || {};

  const productObj = body.product;
  const origin = body.origin_country || 'CA';
  const destination = body.destination_country || body.destination;
  const val = body.value_usd || 0;

  let descText = '';
  let hsCodeHint = null;
  let cat = body.category || 'textiles';

  if (productObj && typeof productObj === 'object') {
    descText = `${productObj.name || ''} ${productObj.description || ''}`.trim();
    hsCodeHint = productObj.hs_code_hint;
  } else if (typeof body.product_description === 'string') {
    descText = body.product_description;
  } else if (typeof productObj === 'string') {
    descText = productObj;
  }

  if (!descText || !destination) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Required parameters: product description and destination country are missing.',
      timestamp: new Date().toISOString()
    });
  }

  const destUpper = destination.toUpperCase().trim();
  const isSanctioned = SANCTIONED_COUNTRIES.has(destUpper);

  const hsCode = hsCodeHint || extractHsCode(descText);
  if (!body.category) {
    cat = inferCategoryFromHs(hsCode);
  }
  const rules = COMPLIANCE_RULES[cat] || COMPLIANCE_RULES.textiles;

  const issues = [];
  const requiredDocs = [...rules.docs];

  if (isSanctioned) {
    issues.push(`Sanctions Alert: Export to "${destination}" is restricted. Trade is prohibited under international embargo regulations.`);
  }

  if (rules.requiresLicense) {
    issues.push(`Licence Required: An export license (${rules.licenseType}) is required for exporting ${cat} items to ${destination}.`);
  }

  if (rules.dualUse) {
    issues.push(`Dual-Use Check: Product category (${cat}) contains potential dual-use goods. Final end-user certification required.`);
  }

  if (val && val > 100000) {
    requiredDocs.push('High-Value Customs Declaration');
  }

  const compliant = !isSanctioned && !rules.requiresLicense;

  return res.json({
    compliant,
    passed: compliant,
    hs_code: hsCode,
    sanctioned: isSanctioned,
    license_required: rules.requiresLicense,
    risk_score: isSanctioned ? 90 : (rules.requiresLicense ? 55 : (rules.dualUse ? 35 : 10)),
    warnings: rules.dualUse ? ['Potential dual-use goods classification'] : [],
    issues,
    required_documents: requiredDocs,
    input: descText
  });
});

module.exports = router;
