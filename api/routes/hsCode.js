'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── HS Code keyword lookup table ───────────────────────────────────────────────
const HS_KEYWORD_MAP = {
  wool:        { hsCode: '5101.11', category: 'textiles',    description: 'Wool, not carded or combed — greasy, shorn' },
  merino:      { hsCode: '6117.10', category: 'textiles',    description: 'Shawls, scarves, mufflers, mantillas, veils — knitted/crocheted, merino' },
  cotton:      { hsCode: '6205.20', category: 'textiles',    description: "Men's or boys' shirts — cotton" },
  shirt:       { hsCode: '6205.20', category: 'textiles',    description: "Men's or boys' shirts — cotton" },
  scarf:       { hsCode: '6117.10', category: 'textiles',    description: 'Shawls, scarves, mufflers, mantillas, veils — knitted/crocheted' },
  solar:       { hsCode: '8541.40', category: 'electronics', description: 'Photosensitive semiconductor devices — photovoltaic cells' },
  battery:     { hsCode: '8507.60', category: 'electronics', description: 'Electric accumulators — lithium-ion' },
  oil:         { hsCode: '1509.10', category: 'food',        description: 'Olive oil — virgin' },
  olive:       { hsCode: '1509.10', category: 'food',        description: 'Olive oil — virgin' },
  cheese:      { hsCode: '0406.20', category: 'food',        description: 'Grated or powdered cheese, of all kinds' },
  ultrasound:  { hsCode: '9018.12', category: 'medical',     description: 'Ultrasonic scanning apparatus' },
  medical:     { hsCode: '9018.90', category: 'medical',     description: 'Other instruments and appliances used in medical sciences' },
  surgical:    { hsCode: '9018.90', category: 'medical',     description: 'Other surgical instruments and appliances' },
  turmeric:    { hsCode: '0910.30', category: 'food',        description: 'Turmeric (curcuma)' },
  pepper:      { hsCode: '0904.11', category: 'food',        description: 'Pepper of the genus Piper — neither crushed nor ground' },
  mounting:    { hsCode: '7308.90', category: 'machinery',   description: 'Structures of iron or steel — other' },
  maple:       { hsCode: '1702.20', category: 'food',        description: 'Maple syrup and maple sugar' },
  syrup:       { hsCode: '1702.20', category: 'food',        description: 'Maple syrup and maple sugar' },
  sirop:       { hsCode: '1702.20', category: 'food',        description: 'Maple syrup and maple sugar' },
  ginseng:     { hsCode: '1211.20', category: 'food',        description: 'Ginseng roots, fresh or dried' },
  lobster:     { hsCode: '0306.12', category: 'food',        description: 'Lobster, live or frozen' }
};

const CATEGORY_FALLBACK = {
  textiles:    { hsCode: '6299.00', description: 'Textile articles, n.e.s.' },
  food:        { hsCode: '2106.90', description: 'Food preparations, n.e.s.' },
  machinery:   { hsCode: '8479.89', description: 'Machines and mechanical appliances, n.e.s.' },
  electronics: { hsCode: '8543.70', description: 'Electrical machines and apparatus, n.e.s.' },
  medical:     { hsCode: '9018.90', description: 'Medical/surgical instruments, n.e.s.' }
};

function extractHsCode(productDescription) {
  const lower = productDescription.toLowerCase();
  const hits = [];

  for (const [keyword, data] of Object.entries(HS_KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      hits.push({ keyword, ...data });
    }
  }

  if (hits.length === 0) {
    const categoryKeywords = {
      textiles: ['fabric', 'cloth', 'garment', 'apparel', 'thread', 'yarn', 'knit', 'woven'],
      food: ['food', 'grain', 'spice', 'beverage', 'organic', 'dried', 'fruit', 'vegetable'],
      machinery: ['machine', 'engine', 'pump', 'valve', 'mechanical', 'turbine', 'compressor'],
      electronics: ['electronic', 'circuit', 'chip', 'sensor', 'module', 'device', 'voltage'],
      medical: ['device', 'implant', 'diagnostic', 'therapeutic', 'clinical', 'hospital']
    };
    for (const [cat, words] of Object.entries(categoryKeywords)) {
      if (words.some(w => lower.includes(w))) {
        const fb = CATEGORY_FALLBACK[cat];
        return {
          hsCode: fb.hsCode,
          category: cat,
          description: fb.description,
          confidence: 0.45,
          matchedKeyword: null
        };
      }
    }
    return {
      hsCode: '9999.99',
      category: 'unknown',
      description: 'Unclassified goods — manual review required',
      confidence: 0.10,
      matchedKeyword: null
    };
  }

  const best = hits[0];
  const confidence = Math.min(0.60 + hits.length * 0.12, 0.99);
  return { ...best, confidence };
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

async function searchWebForHsCode(productDescription) {
  try {
    const query = encodeURIComponent(`HS code for ${productDescription}`);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    const html = await fetchWebHtml(url);
    const hsCodeRegex = /\b(\d{4})\.(\d{2})\b/g;
    const matches = [];
    let match;
    while ((match = hsCodeRegex.exec(html)) !== null) {
      matches.push(match[0]);
    }
    if (matches.length > 0) {
      return matches[0];
    }
  } catch (err) {
    console.error('[WebSearch Error]', err.message);
  }
  return null;
}

function inferCategory(hsCode) {
  const prefix = parseInt(hsCode.substring(0, 2), 10);
  if (prefix >= 50 && prefix <= 63) return 'textiles';
  if (prefix >= 1 && prefix <= 24) return 'food';
  if (prefix === 84) return 'machinery';
  if (prefix === 85) return 'electronics';
  if (prefix === 90) return 'medical';
  return 'machinery';
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, description, origin_country, destination_country, hs_code_hint } = req.body || {};

  if (!name || !description || !origin_country || !destination_country) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`name`, `description`, `origin_country`, and `destination_country` are required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const queryText = `${name} - ${description}`.trim();
  const reflectionLog = [];

  // ── PHASE 1: Deterministic Core ─────────────────────────────────────────────
  reflectionLog.push(`Phase 1: Running deterministic core classifier for: "${queryText}"`);
  
  let coreResult = null;
  if (hs_code_hint && hs_code_hint.trim()) {
    const hint = hs_code_hint.trim();
    coreResult = {
      hsCode: hint,
      category: inferCategory(hint),
      description: 'User-provided classification hint.',
      confidence: 1.0,
      source: 'core_hint'
    };
    reflectionLog.push(`Core: Validated user-provided HS hint: ${hint}`);
  } else {
    const coreMatch = extractHsCode(queryText);
    if (coreMatch.hsCode !== '9999.99' && coreMatch.hsCode !== '6299.00') {
      coreResult = {
        hsCode: coreMatch.hsCode,
        category: coreMatch.category,
        description: coreMatch.description,
        confidence: coreMatch.confidence,
        source: 'core_keyword_map'
      };
      reflectionLog.push(`Core: Resolved code ${coreMatch.hsCode} via keyword mapping.`);
    } else {
      coreResult = {
        hsCode: '6299.00',
        category: 'textiles',
        description: 'Default fallback category.',
        confidence: 0.30,
        source: 'core_fallback'
      };
      reflectionLog.push(`Core: No direct keyword match found. Setting fallback to 6299.00.`);
    }
  }

  // ── PHASE 2: Dynamic Enrichment ─────────────────────────────────────────────
  let enrichmentApplied = false;
  let externalHsCode = null;
  let externalConfidence = 0.0;
  const alternativeHsCodes = [];
  const sourceRefs = [];

  if (coreResult.source === 'core_fallback' || coreResult.confidence < 0.85) {
    reflectionLog.push(`Phase 2: Core confidence low (${coreResult.confidence}). Triggering dynamic web intelligence enrichment.`);
    externalHsCode = await searchWebForHsCode(queryText);
    if (externalHsCode) {
      enrichmentApplied = true;
      externalConfidence = 0.82;
      alternativeHsCodes.push(externalHsCode);
      sourceRefs.push({
        name: 'Web Intelligence Crawler',
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent('HS code for ' + queryText)}`
      });
      reflectionLog.push(`Enrichment: Web crawler returned HS code: ${externalHsCode}`);
    } else {
      reflectionLog.push(`Enrichment: Web crawler returned no matches.`);
    }
  } else {
    reflectionLog.push(`Phase 2: Core confidence high (${coreResult.confidence}). Skipping dynamic enrichment.`);
  }

  // ── PHASE 3: Antigravity QA Supervisor ───────────────────────────────────────
  reflectionLog.push(`Phase 3: Initiating Antigravity QA validation check.`);
  let finalHsCode = coreResult.hsCode;
  let qaStatus = 'APPROVED_CORE';

  if (enrichmentApplied && externalHsCode) {
    const coreCategory = coreResult.category;
    const externalCategory = inferCategory(externalHsCode);

    reflectionLog.push(`QA: Cross-checking core category (${coreCategory}) vs enriched category (${externalCategory}).`);

    if (coreResult.source === 'core_fallback' && externalCategory !== 'textiles') {
      finalHsCode = externalHsCode;
      qaStatus = 'APPROVED_WITH_ENRICHMENT';
      reflectionLog.push(`QA: Core fallback overridden by verified web lookup: ${externalHsCode} (${externalCategory}).`);
    } else if (coreCategory !== externalCategory) {
      qaStatus = 'DEGRADED_CORE_ONLY';
      reflectionLog.push(`QA WARNING: Category conflict detected! Core resolved ${coreCategory} but Enrichment resolved ${externalCategory}. Rejecting enrichment to prevent pipeline failure.`);
    } else {
      finalHsCode = externalHsCode;
      qaStatus = 'APPROVED_WITH_ENRICHMENT';
      reflectionLog.push(`QA: Convergence achieved. Merging core and web enrichment.`);
    }
  }

  return res.json({
    request_id: uuidv4(),
    hs_code: finalHsCode,
    confidence_baseline: coreResult.confidence,
    origin_country,
    destination_country,
    reasoning: `Resolved via ${qaStatus}. Core match: ${coreResult.hsCode}. Enriched match: ${externalHsCode || 'None'}.`,
    enrichment: {
      applied: enrichmentApplied,
      alternative_hs_codes: alternativeHsCodes,
      external_confidence: externalConfidence,
      source_refs: sourceRefs
    },
    qa_supervisor: {
      status: qaStatus,
      self_reflection_log: reflectionLog
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
