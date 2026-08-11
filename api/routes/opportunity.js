'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Full market dataset ────────────────────────────────────────────────────────
const MARKETS = {
  UAE: { name: 'United Arab Emirates', region: 'Middle East',     easeOfTrade: 88, importGrowth: 7.8, gdpGrowth: 4.2, strongCategories: ['textiles', 'electronics', 'food', 'medical'] },
  SGP: { name: 'Singapore',            region: 'Southeast Asia',  easeOfTrade: 95, importGrowth: 6.1, gdpGrowth: 3.6, strongCategories: ['electronics', 'machinery', 'medical', 'food'] },
  JPN: { name: 'Japan',                region: 'East Asia',       easeOfTrade: 82, importGrowth: 3.2, gdpGrowth: 1.5, strongCategories: ['machinery', 'electronics', 'medical', 'food'] },
  IND: { name: 'India',                region: 'South Asia',      easeOfTrade: 67, importGrowth: 9.4, gdpGrowth: 6.8, strongCategories: ['electronics', 'machinery', 'textiles'] },
  AUS: { name: 'Australia',            region: 'Oceania',         easeOfTrade: 86, importGrowth: 5.1, gdpGrowth: 2.3, strongCategories: ['food', 'medical', 'machinery', 'textiles'] },
  GBR: { name: 'United Kingdom',       region: 'Europe',          easeOfTrade: 89, importGrowth: 2.8, gdpGrowth: 1.2, strongCategories: ['medical', 'electronics', 'food', 'textiles'] },
  DEU: { name: 'Germany',              region: 'Europe',          easeOfTrade: 91, importGrowth: 2.9, gdpGrowth: 0.9, strongCategories: ['machinery', 'electronics', 'medical', 'textiles'] },
  HKG: { name: 'Hong Kong SAR',        region: 'East Asia',       easeOfTrade: 94, importGrowth: 4.8, gdpGrowth: 3.1, strongCategories: ['electronics', 'textiles', 'food', 'medical'] },
  CAN: { name: 'Canada',               region: 'North America',   easeOfTrade: 87, importGrowth: 3.7, gdpGrowth: 1.8, strongCategories: ['food', 'medical', 'machinery', 'electronics'] },
  VNM: { name: 'Vietnam',              region: 'Southeast Asia',  easeOfTrade: 70, importGrowth: 11.2, gdpGrowth: 6.5, strongCategories: ['textiles', 'electronics', 'machinery'] }
};

const TARIFF_TABLE = {
  textiles:    { UAE: 5, SGP: 0, JPN: 8.4,  IND: 20, AUS: 10, GBR: 12, DEU: 12, HKG: 0,  CAN: 14, VNM: 12 },
  food:        { UAE: 5, SGP: 0, JPN: 15.3, IND: 30, AUS: 0,  GBR: 0,  DEU: 15, HKG: 0,  CAN: 0,  VNM: 10 },
  machinery:   { UAE: 5, SGP: 0, JPN: 0,    IND: 7.5, AUS: 5, GBR: 0,  DEU: 0,  HKG: 0,  CAN: 0,  VNM: 5  },
  electronics: { UAE: 5, SGP: 0, JPN: 0,    IND: 15, AUS: 5,  GBR: 0,  DEU: 0,  HKG: 0,  CAN: 0,  VNM: 0  },
  medical:     { UAE: 5, SGP: 0, JPN: 0,    IND: 12, AUS: 0,  GBR: 0,  DEU: 0,  HKG: 0,  CAN: 0,  VNM: 5  }
};

/**
 * Opportunity scoring weights:
 *   importGrowth × 5  (max 56)
 *   easeOfTrade × 0.3 (max 28.5)
 *   category fit +15
 *   tariff penalty -tariff×0.4
 */
function computeOpportunityScore(marketCode, market, category) {
  const tariff = (TARIFF_TABLE[category] || {})[marketCode] !== undefined
    ? TARIFF_TABLE[category][marketCode]
    : 12;

  const growthScore    = Math.min(market.importGrowth * 5, 55);
  const tradeScore     = market.easeOfTrade * 0.3;
  const categoryBonus  = market.strongCategories.includes(category) ? 15 : 5;
  const tariffPenalty  = tariff * 0.4;

  return {
    score: Math.min(Math.round(growthScore + tradeScore + categoryBonus - tariffPenalty), 99),
    tariff
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { product_category, products, budget } = req.body || {};

  const validCategories = ['textiles', 'food', 'machinery', 'electronics', 'medical'];
  if (!product_category || !validCategories.includes(product_category.toLowerCase())) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `\`product_category\` is required. Valid: ${validCategories.join(', ')}.`,
      timestamp: new Date().toISOString()
    });
  }

  const category = product_category.toLowerCase();
  const budgetNum = typeof budget === 'number' && budget > 0 ? budget : null;

  const opportunities = Object.entries(MARKETS).map(([code, market]) => {
    const { score, tariff } = computeOpportunityScore(code, market, category);

    // Estimate market entry cost tier based on score + tariff
    const entryCostTier = tariff === 0 ? 'LOW' : tariff <= 5 ? 'LOW-MODERATE' : tariff <= 15 ? 'MODERATE' : 'HIGH';

    return {
      market: market.name,
      market_code: code,
      region: market.region,
      score,
      tariff,
      import_growth: market.importGrowth,
      gdp_growth: market.gdpGrowth,
      ease_of_trade: market.easeOfTrade,
      entry_cost_tier: entryCostTier,
      budget_suitable: budgetNum
        ? (entryCostTier === 'LOW' || (entryCostTier === 'LOW-MODERATE' && budgetNum >= 25000) || (entryCostTier === 'MODERATE' && budgetNum >= 50000) || budgetNum >= 100000)
        : null,
      category_fit: market.strongCategories.includes(category) ? 'HIGH' : 'MODERATE',
      opportunity_label: score >= 80 ? 'PRIME' : score >= 65 ? 'STRONG' : score >= 50 ? 'MODERATE' : 'EMERGING'
    };
  }).sort((a, b) => b.score - a.score);

  // If products array provided, include a product-level note
  const productNotes = Array.isArray(products) && products.length > 0
    ? products.map(p => ({ product: p, category, note: `Use /api/hs-code and /api/compliance for detailed analysis.` }))
    : [];

  return res.json({
    request_id: uuidv4(),
    product_category: category,
    total: opportunities.length,
    opportunities,
    product_notes: productNotes.length > 0 ? productNotes : undefined,
    budget_filter_applied: budgetNum !== null,
    source: 'TradeMatch',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
