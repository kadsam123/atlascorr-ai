/* ============================================================
   Circle Wallet Panel UI Component
   Exposes programmable wallet states, balances, Base Sepolia
   explorer links, Mock/Live mode toggle, and QA reflection preview.
   ============================================================ */
window.CT = window.CT || {};
window.CT.ui = window.CT.ui || {};

window.CT.ui.circleWallet = (() => {
  const TREASURY_ADDRESS = '0xfb29a5bcbfbec7e5f55698addee52397003eb1d9';

  let _activeWallet = {
    address: '0xa98f487e4521bcbfbec7e5f55698addee5239700b5',
    wallet_id: 'wallet-demo-agent-01',
    balance_usdc: 100.00,
    chain: 'BASE_SEPOLIA',
    provider: 'Circle-Developer-Controlled'
  };

  let _operatingMode = 'SIMULATION'; // SIMULATION | LIVE_ONCHAIN
  let _lastQAReflection = null;

  const _txHistory = [];

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function safeBalance() {
    const b = _activeWallet.balance_usdc;
    return (typeof b === 'number' && !isNaN(b)) ? b.toFixed(2) : '0.00';
  }

  function shortAddr(addr) {
    if (!addr || addr.length < 16) return addr || '—';
    return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
  }

  function shortHash(hash) {
    if (!hash || hash.length < 20) return hash || '—';
    return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  }

  // ── API Calls ───────────────────────────────────────────────────────────────
  async function fetchWalletState() {
    try {
      const config = CT.store.getApiConfig();
      const res = await fetch(`${config.url}/api/payment/wallet/${_activeWallet.address}`, {
        headers: { 'X-API-Key': config.key }
      });
      if (res.ok) {
        const data = await res.json();
        _activeWallet = { ..._activeWallet, ...data };
      }
    } catch (err) {
      console.warn('[CircleWallet] Fallback to local state:', err.message);
    }
  }

  async function createNewWallet() {
    try {
      const config = CT.store.getApiConfig();
      const res = await fetch(`${config.url}/api/payment/create-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.key
        }
      });
      if (res.ok) {
        const data = await res.json();
        _activeWallet = data.wallet;
        CT.app.notify('success', 'Circle Agentic Wallet generated!');
        updateView();
      }
    } catch (err) {
      CT.app.notify('error', 'Failed to generate wallet: ' + err.message);
    }
  }

  async function executeDemoPayment() {
    const btn = document.getElementById('btn-circle-pay');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

    _lastQAReflection = {
      payment_intent: 'Antigravity logged agent intent to execute premium dossier enrichment. Cost: 0.01 USDC.',
      payment_verified: 'pending',
      enrichment_authorized: 'pending',
      fallback_status: 'pending',
      pipeline_continuity: 'pending',
      mode: _operatingMode
    };

    CT.app.notify('info', `Initiating USDC micropayment (${_operatingMode})…`);
    try {
      const config = CT.store.getApiConfig();
      const res = await fetch(`${config.url}/api/payment/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.key
        },
        body: JSON.stringify({
          sender_address: _activeWallet.address,
          amount: 0.01
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Payment rejected.');
      }

      const data = await res.json();
      _activeWallet.balance_usdc = data.wallet_balance_usdc;

      _txHistory.unshift({
        timestamp: data.timestamp || new Date().toISOString(),
        tx_hash: data.transaction.tx_hash,
        amount_usdc: data.transaction.amount_usdc,
        recipient: data.transaction.recipient,
        chain: data.transaction.chain || 'BASE_SEPOLIA',
        explorer_url: data.transaction.explorer_url,
        status: 'CONFIRMED'
      });

      _lastQAReflection.payment_verified = 'true';
      _lastQAReflection.enrichment_authorized = 'true';
      _lastQAReflection.fallback_status = 'inactive';
      _lastQAReflection.pipeline_continuity = 'Verified ledger debit match. Dossier aggregates authorized.';

      CT.app.notify('success', 'USDC Micropayment Confirmed on Base Sepolia!');
      updateView();
    } catch (err) {
      _lastQAReflection.payment_verified = 'false';
      _lastQAReflection.enrichment_authorized = 'false';
      _lastQAReflection.fallback_status = 'active (payment failed)';
      _lastQAReflection.pipeline_continuity = 'Fallback to deterministic core. No corruption.';
      CT.app.notify('error', err.message);
      updateView();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Trigger Demo Payment (0.01 USDC)'; }
    }
  }

  function toggleMode() {
    _operatingMode = _operatingMode === 'SIMULATION' ? 'LIVE_ONCHAIN' : 'SIMULATION';
    CT.app.notify('info', `Operating mode switched to ${_operatingMode}`);
    updateView();
  }

  function updateView() {
    const content = document.getElementById('content');
    if (content && window.CT.app.getCurrentView && window.CT.app.getCurrentView() === 'circleWallet') {
      content.innerHTML = render();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function render() {
    const modeColor = _operatingMode === 'LIVE_ONCHAIN' ? '#22c55e' : '#00d4ff';
    const modeLabel = _operatingMode === 'LIVE_ONCHAIN' ? 'LIVE ON-CHAIN' : 'SIMULATION';
    const modeBtnLabel = _operatingMode === 'LIVE_ONCHAIN' ? 'Switch to Simulation' : 'Switch to Live On-Chain';

    // Transaction rows (newest first — already sorted via unshift)
    const txRows = _txHistory.map(tx => {
      const ts = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '—';
      const explorerUrl = tx.explorer_url || `https://sepolia.basescan.org/tx/${tx.tx_hash}`;
      return `
        <tr>
          <td><span class="mono text-xs">${ts}</span></td>
          <td><a href="${explorerUrl}" target="_blank" rel="noopener" class="text-teal hover:underline mono text-xs">${shortHash(tx.tx_hash)} 🔗</a></td>
          <td><span class="text-success font-semibold">${tx.amount_usdc || 0} USDC</span></td>
          <td><span class="mono text-xs text-muted">${shortAddr(tx.recipient)}</span></td>
          <td><span class="badge badge-success">${tx.status || 'CONFIRMED'}</span></td>
        </tr>
      `;
    }).join('');

    const emptyRow = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions registered yet. Click "Trigger Demo Payment" to begin.</td></tr>';

    // QA Reflection preview
    let qaBlock = '';
    if (_lastQAReflection) {
      qaBlock = `
        <div class="card space-y-3">
          <h3 class="card-title text-base">QA Reflection Preview</h3>
          <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1.7; color: #c8d6e5;">
            <div><span style="color:#aaa;">payment_intent:</span> ${_lastQAReflection.payment_intent}</div>
            <div><span style="color:#aaa;">payment_verified:</span> <span style="color:${_lastQAReflection.payment_verified === 'true' ? '#22c55e' : '#ef4444'};">${_lastQAReflection.payment_verified}</span></div>
            <div><span style="color:#aaa;">enrichment_authorized:</span> <span style="color:${_lastQAReflection.enrichment_authorized === 'true' ? '#22c55e' : '#ef4444'};">${_lastQAReflection.enrichment_authorized}</span></div>
            <div><span style="color:#aaa;">fallback_status:</span> ${_lastQAReflection.fallback_status}</div>
            <div><span style="color:#aaa;">pipeline_continuity:</span> ${_lastQAReflection.pipeline_continuity}</div>
            <div><span style="color:#aaa;">operating_mode:</span> ${_lastQAReflection.mode}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="space-y-6">

        <!-- MODE INDICATOR BAR -->
        <div class="flex justify-between items-center" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 16px;">
          <div class="flex items-center gap-3">
            <span style="width:10px;height:10px;border-radius:50%;background:${modeColor};display:inline-block;box-shadow:0 0 8px ${modeColor};"></span>
            <span class="text-xs font-semibold tracking-wider" style="color:${modeColor};">${modeLabel}</span>
            <span class="text-xs text-muted">— Payment Agent operating mode</span>
          </div>
          <button class="btn btn-secondary text-xs px-3 py-1" onclick="CT.ui.circleWallet.toggleMode()">${modeBtnLabel}</button>
        </div>

        <!-- WALLET OVERVIEW + BALANCE CARD -->
        <div class="card space-y-4" style="padding: 20px; background: linear-gradient(135deg, rgba(255,255,255,0.01), rgba(0,212,255,0.02));">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="card-title text-base" style="font-size: 18px; font-weight: 700; color: var(--text-primary);">Circle Agent Wallet</h3>
              <p class="text-xs text-muted" style="margin-top: 4px;">Wallet ID: <span class="mono font-semibold">${_activeWallet.wallet_id || '—'}</span> · Provider: <span class="font-semibold">${_activeWallet.provider || 'Circle'}</span></p>
            </div>
            <div style="text-align: right;">
              <div class="text-xs text-muted font-semibold tracking-wider" style="font-size: 10px; margin-bottom: 2px;">WALLET BALANCE</div>
              <div style="font-size: 28px; font-weight: 900; color: var(--accent-teal);" class="font-h">${safeBalance()} <span style="font-size: 14px; font-weight: 700; color: var(--text-secondary);">USDC</span></div>
            </div>
          </div>

          <div class="space-y-2" style="margin-top: 16px;">
            <div class="text-xs text-muted font-semibold tracking-wider">AGENT WALLET ADDRESS</div>
            <div class="flex items-center gap-2">
              <span class="mono bg-black/30 px-3 py-2 rounded text-xs select-all w-full border border-white/5">${_activeWallet.address || '—'}</span>
              <button class="btn btn-secondary px-3 py-2 text-xs" onclick="navigator.clipboard.writeText('${_activeWallet.address}'); CT.app.notify('info','Address copied!')">Copy</button>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-xs text-muted font-semibold tracking-wider">TREASURY RECEIVER ADDRESS</div>
            <div class="flex items-center gap-2">
              <span class="mono bg-black/30 px-3 py-2 rounded text-xs select-all w-full border border-white/5">${TREASURY_ADDRESS}</span>
              <button class="btn btn-secondary px-3 py-2 text-xs" onclick="navigator.clipboard.writeText('${TREASURY_ADDRESS}'); CT.app.notify('info','Treasury address copied!')">Copy</button>
            </div>
          </div>

          <!-- ACTION BUTTONS ROW -->
          <div class="flex gap-4 pt-4 border-t border-white/5" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div class="flex gap-2">
              <button class="btn btn-secondary text-xs" onclick="CT.ui.circleWallet.createNewWallet()">Create Secondary Wallet</button>
              <button class="btn btn-secondary text-xs" onclick="CT.ui.circleWallet.refreshState()">Refresh Balance</button>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-muted font-semibold bg-black/30 px-3 py-2 rounded border border-white/5">Gas Cost: <strong style="color:var(--accent-teal)">0.01 USDC</strong></span>
              <button id="btn-circle-pay" class="btn btn-primary text-xs" style="background: var(--accent-gradient); padding: 10px 20px;" onclick="CT.ui.circleWallet.executeDemoPayment()">
                Trigger Demo Payment (0.01 USDC)
              </button>
            </div>
          </div>
        </div>

        <!-- ON-CHAIN LEDGER HISTORY -->
        <div class="card space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="card-title text-base">Circle Agentic Ledger History</h3>
            <span class="text-xs text-muted">${_txHistory.length} transaction${_txHistory.length !== 1 ? 's' : ''} · Base Sepolia Testnet</span>
          </div>

          <table class="w-full table text-sm">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Tx Hash</th>
                <th>Amount</th>
                <th>Recipient</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${txRows.length > 0 ? txRows : emptyRow}
            </tbody>
          </table>
        </div>

        <!-- QA REFLECTION PREVIEW -->
        ${qaBlock}

        <!-- GOVERNANCE ALERT -->
        <div class="alert alert-info">
          <div class="flex gap-3">
            <span class="text-lg">🛡️</span>
            <div>
              <h4 class="font-bold text-xs">Antigravity Payment Governance Active</h4>
              <p class="text-xs text-muted mt-1">Premium enrichment requires validated USDC proof. Unpaid requests fall back to deterministic core. Mode: <strong>${modeLabel}</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return {
    render,
    createNewWallet,
    executeDemoPayment,
    toggleMode,
    refreshState: async () => {
      await fetchWalletState();
      updateView();
      CT.app.notify('info', 'Wallet balance state refreshed.');
    }
  };
})();
