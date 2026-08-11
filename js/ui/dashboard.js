/* ============================================================
   Dashboard UI — KPIs, Module Status, Activity, Corridors
   ============================================================ */
window.CT   = window.CT   || {};
CT.ui       = CT.ui       || {};

// ── Shared Helpers (global scope so all UI files can use them) ──
window.formatTime = function(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(isoString).toLocaleDateString('en-GB');
};

window.scoreColor = function(s) {
  return s >= 80 ? 'var(--success)' : s >= 65 ? 'var(--warning)' : 'var(--danger)';
};

window.moduleColor = function(mod) {
  return { MF:'teal', TM:'violet', DD:'warning', CB:'success' }[mod] || 'teal';
};

// ── Dashboard View ────────────────────────────────────────────
CT.ui.dashboard = {
  render() {
    const stats    = CT.store.getStats();
    const corridors = CT.meridianFlow.getRankedCorridors();
    const logs     = CT.store.getLogs().slice(0, 7);
    const opps     = CT.store.getOpportunities().slice(0, 5);
    const customers = CT.store.getCustomers();

    return `
<div class="view-enter">

  <!-- KPI Row -->
  <div class="kpi-grid">
    ${_kpi('👥', 'Active Customers',    stats.totalCustomers,       '+2 this month', 'up',   'kpi-icon-teal')}
    ${_kpi('🗺️', 'Routes Scored',       stats.routesScored,         '+8 today',      'up',   'kpi-icon-violet')}
    ${_kpi('🌟', 'Opportunities Found', stats.opportunitiesFound,   '+5 today',      'up',   'kpi-icon-success')}
    ${_kpi('🛡️', 'Compliance Checks',  stats.complianceChecks,     'All clear',     'up',   'kpi-icon-warning')}
  </div>

  <!-- Module Status Row -->
  <div class="module-grid">
    ${_module('Meridian Flow', '8',  'Corridors scored today',      'ONLINE', 'badge-online',  'var(--accent-teal)')}
    ${_module('TradeMatch',    '24', 'Opportunities matched',        'ONLINE', 'badge-online',  '#a78bfa')}
    ${_module('DDTRS',         '18', 'Compliance checks run',        'ONLINE', 'badge-online',  'var(--warning)')}
    ${_module('CircleBrain',   '5',  'Pipelines orchestrated',       'ONLINE', 'badge-online',  'var(--success)')}
  </div>

  <!-- Middle Row -->
  <div class="dashboard-grid">

    <!-- Top Corridors -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">🗺️ Top Trade Corridors</span>
        <span style="font-size:11px;color:var(--text-muted);">Scored by Meridian Flow</span>
      </div>
      <div class="card-body">
        <div class="corridor-list">
          ${corridors.slice(0, 5).map(c => `
            <div class="corridor-item">
              <div class="corridor-header">
                <span class="corridor-name">${c.name}</span>
                <span class="corridor-score ${c.score >= 80 ? 'score-high' : c.score >= 70 ? 'score-medium' : 'score-low'}">${c.score}</span>
              </div>
              <div class="corridor-bar"><div class="corridor-fill" style="width:${c.score}%"></div></div>
              <div class="corridor-meta">
                <span>⏱ ${c.transitDays}d</span>
                <span>💰 ${c.costIndex}×</span>
                <span>⚡ ${c.portEfficiency}%</span>
                <span>${c.trend === 'up' ? '📈' : c.trend === 'down' ? '📉' : '➡️'} ${c.trend}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">⚡ Live Activity</span>
        <span style="font-size:11px;color:var(--text-muted);">Real-time feed</span>
      </div>
      <div class="card-body" style="padding:0 20px">
        <div class="activity-feed">
          ${logs.map(log => `
            <div class="activity-item">
              <div class="activity-dot ${window.moduleColor(log.module)}"></div>
              <div class="activity-content">
                <div class="activity-title">${log.message}</div>
                <div class="activity-meta">${log.customer} · <span style="color:var(--accent-teal)">${log.module}</span></div>
              </div>
              <div class="activity-time">${window.formatTime(log.timestamp)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

  </div><!-- /dashboard-grid -->

  <!-- Bottom Row -->
  <div class="dashboard-grid">

    <!-- Customer Summary -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">👥 Active SME Customers</span>
        <button class="link-btn" onclick="CT.app.navigate('customers')">View All →</button>
      </div>
      <div class="card-body" style="padding:0 20px">
        ${customers.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--glass-border);cursor:pointer"
               onclick="CT.app.navigate('customers')">
            <span style="font-size:22px">${c.flag}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${c.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${c.sector}</div>
            </div>
            <span style="font-size:10px;padding:3px 8px;background:var(--success-dim);color:var(--success);border-radius:20px;font-weight:600">Active</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Top Opportunities Preview -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">🌟 Top Opportunities</span>
        <button class="link-btn" onclick="CT.app.navigate('opportunities')">View All →</button>
      </div>
      <div class="card-body" style="padding:0 20px">
        ${opps.map((o, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--glass-border)">
            <span style="font-family:var(--font-mono);color:var(--text-muted);font-size:12px;width:22px">#${i+1}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${o.market}</div>
              <div style="font-size:11px;color:var(--text-muted)">${o.product}</div>
            </div>
            <div style="font-family:var(--font-heading);font-size:18px;font-weight:800;color:${window.scoreColor(o.score)}">${o.score}</div>
          </div>
        `).join('')}
      </div>
    </div>

  </div><!-- /dashboard-grid -->
</div>`;
  },
};

function _kpi(icon, label, value, delta, trend, iconClass) {
  return `
    <div class="kpi-card">
      <div class="kpi-delta ${trend}">↑ ${delta}</div>
      <div class="kpi-icon-wrap ${iconClass}">${icon}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
    </div>`;
}

function _module(name, stat, desc, badge, badgeClass, color) {
  return `
    <div class="module-card">
      <div class="module-header">
        <span class="module-name" style="color:${color}">${name}</span>
        <span class="module-badge ${badgeClass}">${badge}</span>
      </div>
      <div class="module-stat">${stat}</div>
      <div class="module-desc">${desc}</div>
    </div>`;
}
