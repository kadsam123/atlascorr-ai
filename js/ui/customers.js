/* ============================================================
   Customers UI — SME Profile Grid & Detail Modal
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.customers = {
  render() {
    const customers = CT.store.getCustomers();
    return `
<div class="view-enter">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div style="font-size:13px;color:var(--text-muted)">${customers.length} active SME customers in CircleTrade AI</div>
  </div>
  <div class="customers-grid">
    ${customers.map(c => this._card(c)).join('')}
  </div>
</div>`;
  },

  _card(c) {
    const opps     = CT.store.getOpportunities().filter(o => o.customerId === c.id);
    const bestScore = opps.reduce((mx, o) => Math.max(mx, o.score), 0);

    return `
<div class="customer-card" onclick="CT.ui.customers.detail('${c.id}')">
  <div class="customer-header">
    <div class="customer-flag">${c.flag}</div>
    <div class="customer-info">
      <div class="customer-name">${c.name}</div>
      <div class="customer-sector">${c.sector} · ${c.country}</div>
    </div>
    <span style="font-size:10px;padding:3px 9px;background:var(--success-dim);color:var(--success);border-radius:20px;font-weight:700">Active</span>
  </div>

  <div class="customer-stats">
    <div class="cstat">
      <div class="cstat-value">${c.products.length}</div>
      <div class="cstat-label">Products</div>
    </div>
    <div class="cstat">
      <div class="cstat-value">${c.targetMarkets.length}</div>
      <div class="cstat-label">Markets</div>
    </div>
    <div class="cstat">
      <div class="cstat-value">${opps.length}</div>
      <div class="cstat-label">Opportunities</div>
    </div>
    <div class="cstat">
      <div class="cstat-value" style="color:${window.scoreColor(bestScore)}">${bestScore || '—'}</div>
      <div class="cstat-label">Best Score</div>
    </div>
  </div>

  <div class="customer-products">
    ${c.products.map(p => `<span class="product-tag">${p.name}</span>`).join('')}
  </div>

  <div style="display:flex;gap:8px;margin-top:14px">
    <button onclick="event.stopPropagation();CT.ui.pipeline.selectAndRun('${c.id}')"
      style="flex:1;padding:8px;background:var(--accent-teal-dim);color:var(--accent-teal);border:1px solid rgba(0,212,255,.2);border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">
      ▶ Run Pipeline
    </button>
    <button onclick="event.stopPropagation();CT.ui.customers.detail('${c.id}')"
      style="flex:1;padding:8px;background:var(--glass-bg);color:var(--text-secondary);border:1px solid var(--glass-border);border-radius:7px;font-size:12px;cursor:pointer">
      View Details
    </button>
  </div>
</div>`;
  },

  detail(customerId) {
    const c    = CT.store.getCustomer(customerId);
    if (!c) return;
    const opps = CT.store.getOpportunities().filter(o => o.customerId === customerId);
    const logs = CT.store.getLogs().filter(l => l.customerId === customerId).slice(0, 5);

    const modal = document.getElementById('pipeline-modal');
    document.getElementById('modal-title').textContent = `${c.flag} ${c.name}`;
    document.getElementById('modal-pipeline-body').innerHTML = `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
  <div>
    <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:8px">PROFILE</div>
    ${[['Country', c.country],['Sector', c.sector],['Budget', `£${(c.budget||0).toLocaleString()}`],['Risk Tolerance', c.riskTolerance]].map(([k,v]) => `
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--glass-border);font-size:13px">
        <span style="color:var(--text-muted)">${k}</span><span style="text-transform:capitalize">${v}</span>
      </div>`).join('')}
  </div>
  <div>
    <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:8px">PRODUCTS</div>
    ${c.products.map(p => `
      <div style="padding:9px 12px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:8px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">HS: ${p.hsCode} · ${p.category}</div>
      </div>`).join('')}
  </div>
</div>

<div style="margin-bottom:18px">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:8px">TARGET MARKETS</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px">
    ${c.targetMarkets.map(m => `<span style="padding:4px 12px;background:var(--accent-teal-dim);color:var(--accent-teal);border-radius:20px;font-size:12px;font-weight:500">${m}</span>`).join('')}
  </div>
</div>

${opps.length ? `
<div style="margin-bottom:18px">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:8px">TOP OPPORTUNITIES</div>
  ${opps.slice(0,3).map(o => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:8px;margin-bottom:6px">
      <div>
        <div style="font-size:13px;font-weight:600">${o.product} → ${o.market}</div>
        <div style="font-size:11px;color:var(--text-muted)">Tariff: ${o.tariff}% · ${o.region}</div>
      </div>
      <div style="font-family:var(--font-heading);font-size:22px;font-weight:800;color:${window.scoreColor(o.score)}">${o.score}</div>
    </div>`).join('')}
</div>` : ''}

${logs.length ? `
<div style="margin-bottom:18px">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:8px">RECENT ACTIVITY</div>
  ${logs.map(l => `
    <div style="padding:8px 0;border-bottom:1px solid var(--glass-border);font-size:12px">
      <span style="display:inline-block;padding:1px 7px;background:var(--glass-bg);border-radius:3px;color:var(--accent-teal);font-size:10px;font-weight:700;margin-right:8px">${l.module}</span>
      <span style="color:var(--text-secondary)">${l.message}</span>
    </div>`).join('')}
</div>` : ''}

<button onclick="CT.app.closePipelineModal();CT.ui.pipeline.selectAndRun('${c.id}');"
  style="width:100%;padding:13px;background:var(--accent-gradient);color:#fff;font-size:14px;font-weight:700;border-radius:9px;cursor:pointer;margin-top:4px">
  ▶ Run Export Pipeline for ${c.name}
</button>`;

    modal.classList.remove('hidden');
  },
};
