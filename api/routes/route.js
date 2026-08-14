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
    primary_ports: ['Port of London', 'Jebel Ali Port'],
    recommendation: 'Excellent corridor — high efficiency, strong trade treaty support, low political risk.'
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
    primary_ports: ['Port of Rotterdam', 'Port of Singapore', 'Ho Chi Minh City Port'],
    recommendation: 'Strong corridor with EUSFTA framework. Longer transit suitable for non-perishables.'
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
    primary_ports: ['Port of New York/New Jersey', 'Port of Hamburg', 'Port of Rotterdam'],
    recommendation: 'Reliable transatlantic corridor with established infrastructure.'
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
    primary_ports: ['JNPT Mumbai', 'Port of Los Angeles', 'Port of New York'],
    recommendation: 'Cost-effective corridor for textiles, pharmaceuticals, and IT equipment.'
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
    primary_ports: ['Port of Hamburg', 'JNPT Mumbai', 'Mundra Port'],
    recommendation: 'Growing corridor driven by Indo-German industrial partnerships.'
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
    primary_ports: ['Port of Genoa', 'Port of Singapore'],
    recommendation: 'Top-rated corridor for luxury and high-value goods.'
  }
];

function norm(s) { return (s || '').toUpperCase().trim(); }

// ── Route handler ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { origin_country, destination_country, mode } = req.body || {};

  if (!origin_country || !destination_country) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`origin_country` and `destination_country` are required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const o = norm(origin_country);
  const d = norm(destination_country);

  // Search corridors
  let match = CORRIDORS.find(c => c.origin.includes(o) && c.destination.includes(d));
  
  const routes = [];
  if (match) {
    routes.push({
      corridor: `${origin_country} → ${destination_country}`,
      score: match.score / 100, // Normalize to float 0.0 - 1.0
      transit_time_days: match.transit_days,
      risk_level: match.political_risk.toLowerCase()
    });
  } else {
    // Return a generic generated route
    routes.push({
      corridor: `${origin_country} → ${destination_country}`,
      score: 0.65,
      transit_time_days: 24,
      risk_level: 'medium'
    });
  }

  // Include air freight option if mode is not specified or set to air
  if (!mode || mode.toLowerCase() === 'air') {
    routes.push({
      corridor: `${origin_country} → ${destination_country} (Air)`,
      score: 0.88,
      transit_time_days: 3,
      risk_level: 'low'
    });
  }

  return res.json({
    routes
  });
});

module.exports = router;
