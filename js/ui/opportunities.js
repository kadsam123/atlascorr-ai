/* ============================================================
   Opportunities UI — Ranked Market Opportunities with Filters
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.opportunities = {
  _filter: 'all',

  render() {
    const opps    = CT.store.getOpportunities();
    const regions = [...new Set(opps.map(o => o.region))].sort();

    return `
<div class="view-enter">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="font-size:13px;color:var(--text-muted)">${opps.length} export opportunities across ${regions.length} regions</div>
  </div>

  <div class="opportunities-filters" id="opp-filters">
    <button class="filter-btn ${this._filter==='all'  ?'active':''}" onclick="CT.ui.opportunities.applyFilter('all')">All</button>
    ${regions.map(r => `<button class="filter-btn ${this._filter===r?'active':''}" onclick="CT.ui.opportunities.applyFilter('${r}')">${r}</button>`).join('')}
    <button class="filter-btn ${this._filter==='high' ?'active':''}" onclick="CT.ui.opportunities.applyFilter('high')">Score 80+</button>
  </div>

  <div class="opportunities-list" id="opp-list">
    ${this._renderList(opps)}
  </div>
</div>`;
  },

  applyFilter(value) {
    this._filter = value;
    const opps = CT.store.getOpportunities();
    const filtered =
      value === 'all'  ? opps :
      value === 'high' ? opps.filter(o => o.score >= 80) :
                         opps.filter(o => o.region === value);

    const list = document.getElementById('opp-list');
    if (list) list.innerHTML = this._renderList(filtered);

    document.querySelectorAll('.filter-btn').forEach(btn => {
      const match =
        (value === 'all'  && btn.textContent.trim() === 'All')      ||
        (value === 'high' && btn.textContent.trim() === 'Score 80+')||
        btn.textContent.trim() === value;
      btn.classList.toggle('active', match);
    });
  },

  _renderList(opps) {
    if (!opps.length) return `<div class="empty-state"><div class="empty-state-icon">🌐</div><div class="empty-state-text">No opportunities match the current filter</div></div>`;

    return opps.map((o, i) => {
      const sc  = o.score;
      const col = window.scoreColor(sc);
      const circ = 2 * Math.PI * 22;
      return `
<div class="opportunity-card">
  <div class="opp-rank">#${i+1}</div>

  <div class="opp-score-ring">
    <svg viewBox="0 0 54 54">
      <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="4"/>
      <circle cx="27" cy="27" r="22" fill="none"
        stroke="${col}" stroke-width="4"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${circ * (1 - sc / 100)}"
        stroke-linecap="round"/>
    </svg>
    <div class="opp-score-ring-text" style="color:${col}">${sc}</div>
  </div>

  <div class="opp-details">
    <div class="opp-market">${o.market} <span style="font-size:11px;color:var(--text-muted)">· ${o.region}</span></div>
    <div class="opp-product">${o.product} · <span style="color:var(--accent-teal)">${o.customerFlag} ${o.customer}</span></div>
  </div>

  <div class="opp-metrics">
    <div class="opp-metric">
      <div class="opp-metric-value">${o.tariff}%</div>
      <div class="opp-metric-label">Tariff</div>
    </div>
    <div class="opp-metric">
      <div class="opp-metric-value" style="color:var(--success)">+${o.importGrowth}%</div>
      <div class="opp-metric-label">Import ↑</div>
    </div>
    <div class="opp-metric">
      <div class="opp-metric-value">+${o.gdpGrowth}%</div>
      <div class="opp-metric-label">GDP ↑</div>
    </div>
  </div>
</div>`;
    }).join('');
  },
};
