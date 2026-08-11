'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Trade corridor database ────────────────────────────────────────────────────
const CORRIDORS = [
  {
    id: 'UK_UAE',
    name: 'UK → UAE',
    origin: ['GB', 'GBR', 'UK', 'UNITED KINGDOM'],
    destination: ['AE', 'UAE', 'UNITED ARAB EMIRATES'],
    score: 87,
    transit_days: 9,
    cost_index: 3.2,
    port_efficiency: 94,
    political_risk: 'LOW',
    regulatory_alignment: 'HIGH',
    primary_ports: ['Port of London', 'Jebel Ali Port'],
    recommendation: 'Excellent corridor — high efficiency, strong trade treaty support, low political risk. Preferred route for premium goods and regulated products.'
  },
  {
    id: 'EU_SEASIA',
    name: 'EU → SE Asia',
    origin: ['EU', 'EUROPE', 'DEU', 'DE', 'FRA', 'FR', 'ITA', 'IT', 'NLD', 'NL', 'ESP', 'ES'],
    destination: ['SGP', 'SG', 'SINGAPORE', 'VNM', 'VN', 'VIETNAM', 'THA', 'TH', 'THAILAND', 'IDN', 'ID', 'INDONESIA', 'MYS', 'MY', 'MALAYSIA'],
    score: 82,
    transit_days: 18,
    cost_index: 2.8,
    port_efficiency: 91,
    political_risk: 'LOW',
    regulatory_alignment: 'MODERATE',
    primary_ports: ['Port of Rotterdam', 'Port of Singapore', 'Ho Chi Minh City Port'],
    recommendation: 'Strong corridor with EUSFTA framework. Longer transit suitable for non-perishables. Singapore hub maximises Southeast Asian distribution reach.'
  },
  {
    id: 'USA_EU',
    name: 'USA → EU',
    origin: ['US', 'USA', 'UNITED STATES'],
    destination: ['EU', 'EUROPE', 'DEU', 'DE', 'GERMANY', 'FRA', 'FR', 'FRANCE', 'ITA', 'IT', 'ITALY', 'GBR', 'GB', 'UK'],
    score: 79,
    transit_days: 12,
    cost_index: 2.5,
    port_efficiency: 88,
    political_risk: 'MODERATE',
    regulatory_alignment: 'MODERATE',
    primary_ports: ['Port of New York/New Jersey', 'Port of Hamburg', 'Port of Rotterdam'],
    recommendation: 'Reliable transatlantic corridor with established infrastructure. Moderate regulatory divergence post-Brexit for UK routes. Monitor tariff policy updates.'
  },
  {
    id: 'INDIA_USA',
    name: 'India → USA',
    origin: ['IN', 'IND', 'INDIA'],
    destination: ['US', 'USA', 'UNITED STATES'],
    score: 75,
    transit_days: 21,
    cost_index: 2.1,
    port_efficiency: 78,
    political_risk: 'LOW',
    regulatory_alignment: 'MODERATE',
    primary_ports: ['JNPT Mumbai', 'Port of Los Angeles', 'Port of New York'],
    recommendation: 'Cost-effective corridor for textiles, pharmaceuticals, and IT equipment. Plan for 3-week lead time. US customs compliance critical for food and pharma.'
  },
  {
    id: 'DE_INDIA',
    name: 'Germany → India',
    origin: ['DE', 'DEU', 'GERMANY'],
    destination: ['IN', 'IND', 'INDIA'],
    score: 73,
    transit_days: 20,
    cost_index: 2.3,
    port_efficiency: 76,
    political_risk: 'LOW',
    regulatory_alignment: 'MODERATE',
    primary_ports: ['Port of Hamburg', 'JNPT Mumbai', 'Mundra Port'],
    recommendation: 'Growing corridor driven by Indo-German industrial partnerships. Strong for machinery and automotive parts. Allow additional customs clearance time at Indian ports.'
  },
  {
    id: 'IT_SGP',
    name: 'Italy → Singapore',
    origin: ['IT', 'ITA', 'ITALY'],
    destination: ['SG', 'SGP', 'SINGAPORE'],
    score: 88,
    transit_days: 22,
    cost_index: 3.0,
    port_efficiency: 95,
    political_risk: 'LOW',
    regulatory_alignment: 'HIGH',
    primary_ports: ['Port of Genoa', 'Port of Singapore'],
    recommendation: 'Top-rated corridor for luxury and high-value goods. Singapore acts as an ASEAN distribution gateway. High port efficiency minimises dwell time despite long transit.'
  }
];

// Generic route fallback for unrecognised pairs
const GENERIC_ROUTE = {
  score: 62,
  transit_days: 28,
  cost_index: 2.0,
  port_efficiency: 72,
  political_risk: 'MODERATE',
  regulatory_alignment: 'UNKNOWN',
  recommendation: 'No optimised corridor found. Using standard international sea freight estimates. Consider engaging a freight forwarder to identify the best routing option.'
};

/**
 * Normalises a country string for matching.
 */
function norm(s) {
  return (s || '').toUpperCase().trim();
}

/**
 * Finds the best matching corridor(s) for an origin→destination pair.
 */
function findCorridors(origin, destination) {
  const o = norm(origin);
  const d = norm(destination);

  const matches = CORRIDORS.filter(c =>
    c.origin.includes(o) && c.destination.includes(d)
  );

  if (matches.length > 0) return matches;

  // Check partial matches (origin only or destination only)
  const partialOrigin = CORRIDORS.filter(c => c.origin.includes(o));
  const partialDest   = CORRIDORS.filter(c => c.destination.includes(d));

  if (partialOrigin.length > 0) {
    return partialOrigin.map(c => ({
      ...c,
      score: Math.max(c.score - 10, 50),
      recommendation: `Partial match on origin. Destination "${d}" not directly served — re-routing via ${c.destination[0]} hub recommended. ` + c.recommendation
    }));
  }
  if (partialDest.length > 0) {
    return partialDest.map(c => ({
      ...c,
      score: Math.max(c.score - 10, 50),
      recommendation: `Partial match on destination. Origin "${o}" not directly served — connecting via ${c.origin[0]} port. ` + c.recommendation
    }));
  }

  return [];
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { origin, destination, product_category } = req.body || {};

  if (!origin || typeof origin !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`origin` is required (e.g. "UK", "Germany", "USA").',
      timestamp: new Date().toISOString()
    });
  }

  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`destination` is required (e.g. "UAE", "Singapore", "India").',
      timestamp: new Date().toISOString()
    });
  }

  const matched = findCorridors(origin, destination);

  let routes;
  if (matched.length === 0) {
    routes = [{
      name: `${origin} → ${destination}`,
      ...GENERIC_ROUTE
    }];
  } else {
    routes = matched.map(c => ({
      name: c.name,
      score: c.score,
      transit_days: c.transit_days,
      cost_index: c.cost_index,
      port_efficiency: c.port_efficiency,
      political_risk: c.political_risk,
      regulatory_alignment: c.regulatory_alignment,
      primary_ports: c.primary_ports,
      recommendation: c.recommendation
    }));
  }

  // Sort by score descending
  routes.sort((a, b) => b.score - a.score);
  const bestRoute = routes[0];

  return res.json({
    request_id: uuidv4(),
    query: { origin, destination, product_category: product_category || null },
    routes,
    best_route: {
      name: bestRoute.name,
      score: bestRoute.score,
      transit_days: bestRoute.transit_days,
      cost_index: bestRoute.cost_index,
      recommendation: bestRoute.recommendation
    },
    total_routes_found: routes.length,
    source: 'MeridianFlow',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
