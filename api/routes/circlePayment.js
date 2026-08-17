'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory store for simulated developer agent wallets
const WALLETS_DB = new Map();

// Default treasury receiver address
const ATLAS_TREASURY_ADDRESS = '0xfb29a5bcbfbec7e5f55698addee52397003eb1d9';

// Initialize a default demo agent wallet if empty
const DEMO_ADDRESS = '0xa98f487e4521bcbfbec7e5f55698addee5239700b5';
WALLETS_DB.set(DEMO_ADDRESS, {
  address: DEMO_ADDRESS,
  wallet_id: 'wallet-demo-agent-01',
  balance_usdc: 100.00,
  chain: 'BASE_SEPOLIA',
  provider: 'Circle-Agent-Wallet',
  created_at: new Date().toISOString()
});

// Helper to generate mock hex addresses
function generateHexAddress() {
  let hex = '0x';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 40; i++) {
    hex += chars[Math.floor(Math.random() * 16)];
  }
  return hex;
}

// Helper to generate mock transaction hashes
function generateTxHash() {
  let hex = '0x';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    hex += chars[Math.floor(Math.random() * 16)];
  }
  return hex;
}

// ── GET Wallet State ─────────────────────────────────────────────────────────
router.get('/wallet/:address', (req, res) => {
  const { address } = req.params;
  const wallet = WALLETS_DB.get(address.toLowerCase().trim());

  if (!wallet) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `No active agent wallet found for address ${address}.`,
      timestamp: new Date().toISOString()
    });
  }

  return res.json(wallet);
});

// ── POST Create Programmable Wallet ──────────────────────────────────────────
router.post('/create-wallet', (req, res) => {
  const newAddress = generateHexAddress();
  const walletId = `wallet-agent-${uuidv4().substring(0, 8)}`;
  
  const newWallet = {
    address: newAddress,
    wallet_id: walletId,
    balance_usdc: 100.00, // Initial sandbox token provision for demo run
    chain: 'BASE_SEPOLIA',
    provider: 'Circle-Developer-Controlled',
    created_at: new Date().toISOString()
  };

  WALLETS_DB.set(newAddress, newWallet);

  return res.status(201).json({
    success: true,
    message: 'Circle programmable agent wallet created successfully.',
    wallet: newWallet
  });
});

// ── POST Pay Micro-transaction ───────────────────────────────────────────────
router.post('/pay', (req, res) => {
  const { sender_address, amount } = req.body || {};

  if (!sender_address) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '`sender_address` is required in request body.',
      timestamp: new Date().toISOString()
    });
  }

  const cleanSender = sender_address.toLowerCase().trim();
  const wallet = WALLETS_DB.get(cleanSender);

  if (!wallet) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Sender agent wallet ${sender_address} not found. Please create or register it first.`,
      timestamp: new Date().toISOString()
    });
  }

  const payAmount = amount ? parseFloat(amount) : 0.01;

  if (wallet.balance_usdc < payAmount) {
    return res.status(400).json({
      error: 'INSUFFICIENT_FUNDS',
      message: `Agent wallet has insufficient USDC balance. Required: ${payAmount} USDC. Balance: ${wallet.balance_usdc} USDC.`,
      timestamp: new Date().toISOString()
    });
  }

  // Deduct simulated balance
  wallet.balance_usdc = parseFloat((wallet.balance_usdc - payAmount).toFixed(4));
  WALLETS_DB.set(cleanSender, wallet);

  const txHash = generateTxHash();
  const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;

  return res.json({
    success: true,
    message: 'Autonomous USDC micropayment settled on-chain via Circle Agent Stack.',
    transaction: {
      tx_hash: txHash,
      sender: cleanSender,
      recipient: ATLAS_TREASURY_ADDRESS,
      amount_usdc: payAmount,
      chain: 'BASE_SEPOLIA',
      explorer_url: explorerUrl
    },
    wallet_balance_usdc: wallet.balance_usdc,
    timestamp: new Date().toISOString()
  });
});

// ── GET Verify Transaction Proof ─────────────────────────────────────────────
router.get('/proof', (req, res) => {
  const { tx } = req.query;

  if (!tx || !tx.startsWith('0x') || tx.length !== 66) {
    return res.status(400).json({
      error: 'INVALID_TRANSACTION',
      message: 'Valid `tx` transaction hash parameter required (e.g. 0x... 64 hex chars).',
      timestamp: new Date().toISOString()
    });
  }

  // Simulate Base Sepolia block confirmation verification
  return res.json({
    success: true,
    confirmed: true,
    confirmations: 6,
    block_number: 14785921,
    transaction: {
      hash: tx,
      amount_usdc: 0.01,
      recipient: ATLAS_TREASURY_ADDRESS,
      chain: 'BASE_SEPOLIA',
      explorer_url: `https://sepolia.basescan.org/tx/${tx}`
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
