'use strict';

const { exec } = require('child_process');

console.log('🌀 Launching background balance monitor daemon...');
const address = '0xfb29a5bcbfbec7e5f55698addee52397003eb1d9';
const maxAttempts = 20;
let attempts = 0;

function check() {
  attempts++;
  console.log(`[Check #${attempts}/${maxAttempts}] Querying balance for ${address}...`);

  exec(`circle wallet balance --address ${address} --chain BASE --output json`, (err, stdout, stderr) => {
    if (err) {
      console.error(`[Error] CLI command failed: ${err.message}`);
      scheduleNext();
      return;
    }

    try {
      const result = JSON.parse(stdout);
      const balances = result.data.balances || [];
      const usdcBalance = balances.find(b => b.token.symbol === 'USDC' || b.token.name === 'USDC');

      if (usdcBalance && parseFloat(usdcBalance.amount) > 0) {
        console.log(`\n🎉 SUCCESS! USDC balance cleared: ${usdcBalance.amount} USDC`);
        process.exit(0);
      } else {
        console.log(`      Current balance: empty.`);
      }
    } catch (parseErr) {
      console.error('[Error] Failed to parse JSON output.');
    }

    scheduleNext();
  });
}

function scheduleNext() {
  if (attempts >= maxAttempts) {
    console.log('\n⚠️ Monitor timed out. Balance is still empty. Please verify transaction on Transak.');
    process.exit(1);
  }
  setTimeout(check, 15000); // 15 seconds
}

check();
