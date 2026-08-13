/* ============================================================
   Marketplace UI — Interactive Circle Agent Registry & Terminals
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.marketplace = {
  _running: {},
  _outputs: {},

  render() {
    const logs = CT.store.getLogs();
    
    // Calculate total simulated/live usage cost from logs
    let totalUsageCount = 0;
    let totalRevenueUsd = 0.00;

    logs.forEach(l => {
      // Find matches in metering prices
      if (l.message.includes('/api/hs-code') || l.message.includes('HS:')) {
        totalUsageCount++;
        totalRevenueUsd += 0.10;
      } else if (l.message.includes('/api/tariff') || l.message.includes('Tariff:')) {
        totalUsageCount++;
        totalRevenueUsd += 0.20;
      } else if (l.message.includes('/api/route')) {
        totalUsageCount++;
        totalRevenueUsd += 0.50;
      } else if (l.message.includes('/api/market')) {
        totalUsageCount++;
        totalRevenueUsd += 0.50;
      } else if (l.message.includes('/api/opportunity')) {
        totalUsageCount++;
        totalRevenueUsd += 1.00;
      } else if (l.message.includes('Manual check') || l.message.includes('/api/compliance')) {
        totalUsageCount++;
        totalRevenueUsd += 0.75;
      } else if (l.message.includes('/api/export-plan')) {
        totalUsageCount++;
        totalRevenueUsd += 2.50;
      } else if (l.message.includes('Pipeline complete') || l.message.includes('/api/pipeline')) {
        totalUsageCount++;
        totalRevenueUsd += 5.00;
      }
    });

    const agents = [
      {
        id: 'hs-code',
        name: 'HS Code Agent',
        tagline: 'Extracts HS classification codes from product descriptions.',
        price: 0.10,
        endpoint: '/api/hs-code',
        tags: ['export', 'compliance', 'classification'],
        inputPlaceholder: '{"product_description": "merino wool scarves"}'
      },
      {
        id: 'tariff',
        name: 'Tariff Agent',
        tagline: 'Looks up active import duty and VAT rates by HS code & destination.',
        price: 0.20,
        endpoint: '/api/tariff',
        tags: ['export', 'trade', 'taxes', 'landed-cost'],
        inputPlaceholder: '{"hs_code": "6117.10", "destination_code": "UAE", "category": "textiles"}'
      },
      {
        id: 'route',
        name: 'Route Agent',
        tagline: 'Scores and ranks trade corridors on transit, cost, and safety.',
        price: 0.50,
        endpoint: '/api/route',
        tags: ['export', 'logistics', 'routing', 'shipping'],
        inputPlaceholder: '{"origin": "UK", "destination": "UAE", "product_category": "textiles"}'
      },
      {
        id: 'market',
        name: 'Market Match Agent',
        tagline: 'Evaluates ease of trade, tariff exposure, and GDP growth across markets.',
        price: 0.50,
        endpoint: '/api/market',
        tags: ['export', 'trade', 'opportunities', 'sales'],
        inputPlaceholder: '{"product_category": "food", "target_markets": ["SGP", "UAE"]}'
      },
      {
        id: 'opportunity',
        name: 'Opportunity Scan Agent',
        tagline: 'Scans all destination markets for highest-scoring export routes.',
        price: 1.00,
        endpoint: '/api/opportunity',
        tags: ['export', 'trade', 'growth', 'globalization'],
        inputPlaceholder: '{"product_category": "textiles", "budget": 45000}'
      },
      {
        id: 'compliance',
        name: 'Compliance Agent',
        tagline: 'Runs sanctions checklist, dual-use checks, and license verification.',
        price: 0.75,
        endpoint: '/api/compliance',
        tags: ['export', 'compliance', 'sanctions', 'dual-use'],
        inputPlaceholder: '{"product_description": "portable ultrasound device", "destination": "Brazil", "category": "medical"}'
      },
      {
        id: 'export-plan',
        name: 'Export Plan Agent',
        tagline: 'Compiles a complete strategic report covering route, tariff, and timeline.',
        price: 2.50,
        endpoint: '/api/export-plan',
        tags: ['export', 'trade', 'strategy', 'logistics'],
        inputPlaceholder: '{"company_name": "Artisan Foods", "product": "Truffle Olive Oil", "origin": "IT", "target_market": "SGP", "budget": 30000}'
      }
    ];

    return `
<div class="view-enter">
  
  <!-- Marketplace Stats Banner -->
  <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(0,212,255,0.03) 100%);">
    <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; padding: 20px;">
      <div>
        <h2 style="font-family: var(--font-heading); font-size: 20px; margin-bottom: 6px; color: var(--text);">Developer Management Dashboard</h2>
        <div style="font-size: 13px; color: var(--text-muted);">Monitor subagent executions and sync billing data directly to Stripe in real-time.</div>
      </div>
      <div style="display: flex; gap: 20px; text-align: right;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px;">ACCUMULATED EXECUTIONS</div>
          <div style="font-family: var(--font-heading); font-size: 26px; font-weight: 800; color: var(--accent-teal);" id="market-executions-count">${totalUsageCount}</div>
        </div>
        <div>
          <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px;">ACCUMULATED REVENUE</div>
          <div style="font-family: var(--font-heading); font-size: 26px; font-weight: 800; color: #a78bfa;" id="market-revenue-count">$${totalRevenueUsd.toFixed(2)} USD</div>
        </div>
        <div>
          <button class="run-btn" style="background: var(--accent-violet); border-color: rgba(124,58,237,0.4);" onclick="CT.ui.marketplace.triggerStripeSync(this)">
            🌀 Sync to Stripe
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Stripe Sync Response Info Card -->
  <div id="stripe-sync-banner" class="hidden" style="margin-bottom: 16px; padding: 12px 16px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; font-size: 12px; color: var(--success); display: flex; justify-content: space-between; align-items: center;">
    <div id="stripe-sync-message">Stripe metered sync executed successfully.</div>
    <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="this.parentElement.classList.add('hidden')">✕</button>
  </div>

  <!-- Agents Catalog Grid -->
  <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
    ${agents.map(a => {
      const isRunning = this._running[a.id];
      const output = this._outputs[a.id] || null;
      return `
      <div class="card opportunity-card" style="display: block; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h3 style="font-family: var(--font-heading); font-size: 17px; font-weight: 700; color: var(--text);">${a.name}</h3>
              <span style="font-size: 9px; font-weight: 700; padding: 3px 6px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); border-radius: 4px; color: #a78bfa; font-family: var(--font-mono);">${a.endpoint}</span>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 8px;">${a.tagline}</p>
            <div style="display: flex; gap: 6px;">
              ${a.tags.map(t => `<span style="font-size: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 2px 8px; border-radius: 12px; color: var(--text-muted);">${t}</span>`).join('')}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px;">METERED PRICE</div>
            <div style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: var(--accent-teal);">$${a.price.toFixed(2)} <span style="font-size: 10px; font-weight: 400; color: var(--text-muted);">/ call</span></div>
          </div>
        </div>

        <!-- Inline Console Test Area -->
        <div style="border-top: 1px solid var(--border); padding-top: 14px; margin-top: 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            
            <!-- Input Console -->
            <div>
              <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 6px;">JSON PAYLOAD INPUT</div>
              <textarea id="console-input-${a.id}" class="compliance-input" style="width: 100%; height: 95px; font-family: var(--font-mono); font-size: 12px; line-height: 1.4; padding: 10px; background: rgba(0,0,0,0.15);" placeholder='${a.inputPlaceholder}'>${JSON.stringify(JSON.parse(a.inputPlaceholder), null, 2)}</textarea>
              <button class="hs-lookup-btn" style="margin-top: 8px; width: 100%; border-radius: 6px; padding: 9px;" onclick="CT.ui.marketplace.executeLive('${a.id}', '${a.endpoint}', this)" ${isRunning ? 'disabled' : ''}>
                ${isRunning ? 'Executing Live Endpoint...' : 'Execute Live Agent'}
              </button>
            </div>

            <!-- Output Console -->
            <div>
              <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 6px;">RESPONSE METADATA OUTPUT</div>
              <pre id="console-output-${a.id}" style="width: 100%; height: 130px; font-family: var(--font-mono); font-size: 11px; padding: 10px; background: #030712; border: 1px solid var(--border); border-radius: 8px; overflow: auto; color: #a78bfa; margin: 0; line-height: 1.4;">${output ? output : '// Execute agent to output response JSON'}</pre>
            </div>

          </div>
        </div>
      </div>
      `;
    }).join('')}
  </div>
</div>
    `;
  },

  async executeLive(agentId, endpoint, button) {
    const inputArea = document.getElementById(`console-input-${agentId}`);
    const outputArea = document.getElementById(`console-output-${agentId}`);
    if (!inputArea || !outputArea) return;

    let payload;
    try {
      payload = JSON.parse(inputArea.value);
    } catch (err) {
      outputArea.textContent = `// JSON Parsing Error:\n${err.message}`;
      outputArea.style.color = 'var(--danger)';
      return;
    }

    button.disabled = true;
    button.textContent = 'Executing Live Endpoint...';
    outputArea.textContent = '// Sending POST request to live Railway server...';
    outputArea.style.color = 'var(--text-muted)';

    const apiConfig = CT.store.getApiConfig();
    const startTime = Date.now();

    try {
      const response = await fetch(`${apiConfig.url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiConfig.key
        },
        body: JSON.stringify(payload)
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Server returned error status ${response.status}`);
      }

      this._outputs[agentId] = JSON.stringify(data, null, 2);
      outputArea.textContent = this._outputs[agentId];
      outputArea.style.color = '#a78bfa';

      // Log success and usage count
      CT.store.addLog({
        module: 'CB',
        message: `Marketplace Agent execution passed — POST ${endpoint} [${responseTime}ms]`,
        customerId: null,
        customer: 'Marketplace Caller'
      });

      // Reload view stats dynamically
      const content = document.getElementById('content');
      if (content && window.CT.app._currentView === 'marketplace') {
        const executionsEl = document.getElementById('market-executions-count');
        const revenueEl = document.getElementById('market-revenue-count');
        
        // Calculate new counts
        const logs = CT.store.getLogs();
        let totalCount = 0;
        let totalRev = 0;
        logs.forEach(l => {
          if (l.message.includes('/api/hs-code') || l.message.includes('HS:')) { totalCount++; totalRev += 0.10; }
          else if (l.message.includes('/api/tariff') || l.message.includes('Tariff:')) { totalCount++; totalRev += 0.20; }
          else if (l.message.includes('/api/route')) { totalCount++; totalRev += 0.50; }
          else if (l.message.includes('/api/market')) { totalCount++; totalRev += 0.50; }
          else if (l.message.includes('/api/opportunity')) { totalCount++; totalRev += 1.00; }
          else if (l.message.includes('Manual check') || l.message.includes('/api/compliance')) { totalCount++; totalRev += 0.75; }
          else if (l.message.includes('/api/export-plan')) { totalCount++; totalRev += 2.50; }
          else if (l.message.includes('Pipeline complete') || l.message.includes('/api/pipeline')) { totalCount++; totalRev += 5.00; }
        });
        
        if (executionsEl) executionsEl.textContent = totalCount;
        if (revenueEl) revenueEl.textContent = `$${totalRev.toFixed(2)} USD`;
      }

    } catch (err) {
      console.error('[Marketplace Execution Error]', err);
      outputArea.textContent = `// Connection / Server Error:\n${err.message}`;
      outputArea.style.color = 'var(--danger)';
    } finally {
      button.disabled = false;
      button.textContent = 'Execute Live Agent';
    }
  },

  async triggerStripeSync(button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Syncing...';

    const apiConfig = CT.store.getApiConfig();
    const banner = document.getElementById('stripe-sync-banner');
    const msg = document.getElementById('stripe-sync-message');

    try {
      const response = await fetch(`${apiConfig.url}/api/admin/sync-stripe`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiConfig.key
        }
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP status ${response.status}`);
      }

      const data = await response.json();
      
      if (banner && msg) {
        banner.classList.remove('hidden');
        if (data.status === 'success' || data.status === 'idle') {
          banner.style.background = 'rgba(16,185,129,0.08)';
          banner.style.borderColor = 'rgba(16,185,129,0.25)';
          banner.style.color = 'var(--success)';
          msg.innerHTML = `✅ <strong>Stripe Sync Successful:</strong> Synced ${data.synced_events || 0} events to Stripe. Status: ${data.status.toUpperCase()}.`;
        } else {
          banner.style.background = 'rgba(239,68,68,0.08)';
          banner.style.borderColor = 'rgba(239,68,68,0.25)';
          banner.style.color = 'var(--danger)';
          msg.textContent = `⚠️ Stripe sync returned status: ${data.status}. Message: ${data.message || 'unknown error'}`;
        }
      }

    } catch (err) {
      console.error('[Stripe Sync Trigger Error]', err);
      if (banner && msg) {
        banner.classList.remove('hidden');
        banner.style.background = 'rgba(239,68,68,0.08)';
        banner.style.borderColor = 'rgba(239,68,68,0.25)';
        banner.style.color = 'var(--danger)';
        msg.textContent = `⚠️ Connection error: ${err.message}`;
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
};
