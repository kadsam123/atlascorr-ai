'use strict';

// ── Demo API keys ──────────────────────────────────────────────────────────────
// Valid keys: hardcoded demo key OR key set via environment variable API_KEY
const DEMO_KEY = 'ct-demo-key-2026';

const PRICES = {
  '/hs-code': { amount: '100000', decimal: '0.10' },
  '/tariff': { amount: '200000', decimal: '0.20' },
  '/route': { amount: '500000', decimal: '0.50' },
  '/market': { amount: '500000', decimal: '0.50' },
  '/compliance': { amount: '750000', decimal: '0.75' },
  '/opportunity': { amount: '1000000', decimal: '1.00' },
  '/export-plan': { amount: '2500000', decimal: '2.50' },
  '/pipeline': { amount: '5000000', decimal: '5.00' }
};

const SELLER_ADDRESS = '0xfb29a5bcbfbec7e5f55698addee52397003eb1d9';

function getPaymentInfo(path) {
  const price = PRICES[path] || { amount: '100000', decimal: '0.10' };
  return {
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453', // Base
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        payTo: SELLER_ADDRESS,
        amount: price.amount
      },
      {
        scheme: 'exact',
        network: 'eip155:1', // Ethereum
        asset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        payTo: SELLER_ADDRESS,
        amount: price.amount
      },
      {
        scheme: 'exact',
        network: 'eip155:42161', // Arbitrum
        asset: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        payTo: SELLER_ADDRESS,
        amount: price.amount
      }
    ]
  };
}

/**
 * API key authentication middleware.
 * Reads X-API-Key header and validates it against DEMO_KEY or process.env.API_KEY.
 * Returns HTTP 402 with x402 payment headers and body if key is missing or invalid.
 */
function auth(req, res, next) {
  // Skip auth for the monitoring/docs endpoints
  if (req.path === '/usage' || req.path === '/docs') {
    return next();
  }

  const key = req.headers['x-api-key'];
  const validKeys = new Set([DEMO_KEY]);
  if (process.env.API_KEY) {
    validKeys.add(process.env.API_KEY);
  }

  if (!key || !validKeys.has(key)) {
    // Return 402 Payment Required in compliant x402 format
    const payInfo = getPaymentInfo(req.path);
    const base64Info = Buffer.from(JSON.stringify(payInfo)).toString('base64');
    
    res.setHeader('Payment-Required', base64Info);
    res.setHeader('PAYMENT-REQUIRED', base64Info);
    return res.status(402).json({
      error: 'PAYMENT_REQUIRED',
      message: `Payment required to access this endpoint. Price: $${(PRICES[req.path] || { decimal: '0.10' }).decimal} USDC.`,
      x_payment_info: {
        protocols: [
          { x402: {} },
          { mpp: { method: 'exact', intent: 'direct', currency: 'USDC' } }
        ],
        price: {
          mode: 'fixed',
          currency: 'USDC',
          amount: (PRICES[req.path] || { decimal: '0.10' }).decimal
        }
      },
      ...payInfo,
      timestamp: new Date().toISOString()
    });
  }

  // Attach key info to request for downstream middleware/logging
  req.apiKey = key;
  next();
}

module.exports = auth;

