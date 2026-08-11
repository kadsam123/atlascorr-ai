'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Market database ────────────────────────────────────────────────────────────
const MARKETS = {
  UAE: { name: 'United Arab Emirates', region: 'Middle East',     easeOfTrade: 88, importGrowth: 7.8, gdpGrowth: 4.2, currency: 'AED', population: 9.9,  strongCategories: ['textiles', 'electronics', 'food', 'medical'] },
  SGP: { name: 'Singapore',            region: 'Southeast Asia',  easeOfTrade: 95, importGrowth: 6.1, gdpGrowth: 3.6, currency: 'SGD', population: 5.9,  strongCategories: ['electronics', 'machinery', 'medical', 'food'] },
  JPN: { name: 'Japan',                region: 'East Asia',       easeOfTrade: 82, importGrowth: 3.2, gdpGrowth: 1.5, currency: 'JPY', population: 125.1, strongCategories: ['machinery', 'electronics', 'medical', 'food'] },
  IND: { name: 'India',                region: 'South Asia',      easeOfTrade: 67, importGrowth: 9.4, gdpGrowth: 6.8, currency: 'INR', population: 1428,  strongCategories: ['electronics', 'machinery', 'textiles'] },
  AUS: { name: 'Australia',            region: 'Oceania',         easeOfTrade: 86, importGrowth: 5.1, gdpGrowth: 2.3, currency: 'AUD', population: 26.5,  strongCategories: ['food', 'medical', 'machinery', 'textiles'] },
  GBR: { name: 'United Kingdom',       region: 'Europe',          easeOfTrade: 89, importGrowth: 2.8, gdpGrowth: 1.2, currency: 'GBP', population: 67.7,  strongCategories: ['medical', 'electronics', 'food', 'textiles'] },
  DEU: { name: 'Germany',              region: 'Europe',          easeOfTrade: 91, importGrowth: 2.9, gdpGrowth: 0.9, currency: 'EUR', population: 84.4,  strongCategories: ['machinery', 'electronics', 'medical', 'textiles'] },
  HKG: { name: 'Hong Kong SAR',        region: 'East Asia',       easeOfTrade: 94, importGrowth: 4.8, gdpGrowth: 3.1, currency: 'HKD', population: 7.5,   strongCategories: ['electronics', 'textiles', 'food', 'medical'] },
  CAN: { name: 'Canada',               region: 'North America',   easeOfTrade: 87, importGrowth: 3.7, gdpGrowth: 1.8, currency: 'CAD', population: 39.6,  strongCategories: ['food', 'medical', 'machinery', 'electronics'] },
  VNM: { name: 'Vietnam',              region: 'Southeast Asia',  easeOfTrade: 70, importGrowth: 11.2, gdpGrowth: 6.5, currency: 'VND', population: 97.3, strongCategories: ['textiles', 'electronics', 'machinery'] }
};

const TARIFF_TABLE = {
  textiles:    { UAE: 5,   SGP: 0,  JPN: 8.4,  IND: 20,  AUS: 10,  GBR: 12,  USA: 11.4, DEU: 12,  HKG: 0,  CAN: 14,  ZAF: 30,  BRA: 35,  VNM: 12 },
  food:        { UAE: 5,   SGP: 0,  JPN: 15.3, IND: 30,  AUS: 0,   GBR: 0,   USA: 5.6,  DEU: 15,  HKG: 0,  CAN: 0,   ZAF: 30,  BRA: 55,  VNM: 10 },
  machinery:   { UAE: 5,   SGP: 0,  JPN: 0,    IND: 7.5, AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 14,  VNM: 5  },
  electronics: { UAE: 5,   SGP: 0,  JPN: 0,    IND: 15,  AUS: 5,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 10,  BRA: 16,  VNM: 0  },
  medical:     { UAE: 5,   SGP: 0,  JPN: 0,    IND: 12,  AUS: 0,   GBR: 0,   USA: 0,    DEU: 0,   HKG: 0,  CAN: 0,   ZAF: 15,  BRA: 14,  VNM: 5  }
};

/**
 * Computes a composite market match score for a product category in a given market.
 * Score weights: easeOfTrade (30%) + importGrowth scaled (40%) + categoryFit (30%)
 */
function scoreMarket(marketCode, market, category) {
  const tariffRates = TARIFF_TABLE[category] || {};
  const tariff = tariffRates[marketCode] !== undefined ? tariffRates[marketCode] : 10;

  const tradeFactor    = market.easeOfTrade * 0.30;
  const growthFactor   = Math.min(market.importGrowth * 4, 40); // cap at 40
  const categoryBonus  = market.strongCategories.includes(category) ? 30 : 15;
  const tariffPenalty  = Math.min(tariff * 0.5, 15);

  const score = Math.round(tradeFactor + growthFactor + categoryBonus - tariffPenalty);
  return { score: Math.min(score, 99), tariff };
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { product_category, target_markets } = req.body || {};

  const validCategories = ['textiles', 'food', 'machinery', 'electronics', 'medical'];
  if (!product_category || !validCategories.includes(product_category.toLowerCase())) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `\`product_category\` is required. Valid values: ${validCategories.join(', ')}.`,
      timestamp: new Date().toISOString()
    });
  }

  const category = product_category.toLowerCase();

  // Determine which markets to evaluate
  let marketCodes = Object.keys(MARKETS);
  if (Array.isArray(target_markets) && target_markets.length > 0) {
    const requested = target_markets.map(m => m.toUpperCase());
    marketCodes = requested.filter(m => MARKETS[m]);
    if (marketCodes.length === 0) {
      return res.status(404).json({
        error: 'NO_MATCHING_MARKETS',
        message: 'None of the requested target_markets were found.',
        supported_markets: Object.keys(MARKETS),
        timestamp: new Date().toISOString()
      });
    }
  }

  const matches = marketCodes.map(code => {
    const market = MARKETS[code];
    const { score, tariff } = scoreMarket(code, market, category);
    return {
      market: market.name,
      market_code: code,
      region: market.region,
      score,
      tariff,
      import_growth: market.importGrowth,
      gdp_growth: market.gdpGrowth,
      ease_of_trade: market.easeOfTrade,
      category_fit: market.strongCategories.includes(category) ? 'HIGH' : 'MODERATE',
      recommendation: score >= 80
        ? `Top-tier market for ${category}. Strong ease of trade and import growth make this a priority target.`
        : score >= 65
          ? `Good market opportunity for ${category}. Moderate growth with manageable compliance requirements.`
          : `Emerging opportunity. Higher tariffs or complexity — suitable for phased market entry.`
    };
  }).sort((a, b) => b.score - a.score);

  const bestMarket = matches[0];

  return res.json({
    request_id: uuidv4(),
    product_category: category,
    matches,
    best_market: {
      market: bestMarket.market,
      market_code: bestMarket.market_code,
      score: bestMarket.score,
      tariff: bestMarket.tariff,
      import_growth: bestMarket.import_growth,
      recommendation: bestMarket.recommendation
    },
    total_markets_evaluated: matches.length,
    source: 'TradeMatch',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
