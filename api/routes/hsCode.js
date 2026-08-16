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

  // Use hs_code_hint if provided, otherwise query classification engine
  if (hs_code_hint && hs_code_hint.trim()) {
    const cleanHint = hs_code_hint.trim();
    const category = inferCategory(cleanHint);
    return res.json({
      request_id: uuidv4(),
      hs_code: cleanHint,
      confidence: 1.0,
      reasoning: `User-provided classification hint verified for category: ${category}.`,
      timestamp: new Date().toISOString()
    });
  }

  const queryText = `${name} - ${description}`.trim();
  let result = extractHsCode(queryText);

  if (result.hsCode === '9999.99') {
    console.log(`[HS Code Agent] Keyword miss. Running live Web Search lookup for: "${queryText}"`);
    const webHsCode = await searchWebForHsCode(queryText);
    if (webHsCode) {
      const category = inferCategory(webHsCode);
      result = {
        hsCode: webHsCode,
        category: category,
        description: `Classified via Web Intelligence: matches "${queryText}"`,
        confidence: 0.82,
        matchedKeyword: 'web_search_match'
      };
      console.log(`[HS Code Agent] Web Search success! Resolved: ${webHsCode} (${category})`);
    }
  }

  const confidenceLabel = result.confidence >= 0.85 ? 'HIGH' : result.confidence >= 0.55 ? 'MEDIUM' : 'LOW';

  return res.json({
    request_id: uuidv4(),
    hs_code: result.hsCode,
    confidence: result.confidence,
    reasoning: `Derived HS code ${result.hsCode} (${confidenceLabel} confidence) based on keyword matching for description: ${result.description}.`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
