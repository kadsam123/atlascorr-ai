/* ============================================================
   Logs UI — Structured Decision Log Table
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.logs = {
  _activeModule: null,

  render() {
    const logs = CT.store.getLogs();
    return `
<div class="view-enter">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
    <div style="font-size:13px;color:var(--text-muted)">${logs.length} log entries</div>
    <div style="display:flex;gap:6px;align-items:center">
      <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Filter:</span>
      ${['MF','TM','DD','CB'].map(m => `
        <span onclick="CT.ui.logs.filterBy('${m}')"
          class="log-module-badge log-module-${m.toLowerCase()} ${this._activeModule===m?'ring':''}"
          style="cursor:pointer;padding:4px 10px;font-size:11px;${this._activeModule===m?'outline:1px solid currentColor;':''}">${m}</span>
      `).join('')}
      <span onclick="CT.ui.logs.filterBy(null)"
        style="padding:4px 10px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:4px;font-size:11px;color:var(--text-muted);cursor:pointer">
        All
      </span>
    </div>
  </div>

  <div class="card">
    <div class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Module</th>
            <th>Customer</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody id="logs-tbody">
          ${this._rows(logs)}
        </tbody>
      </table>
    </div>
  </div>
</div>`;
  },

  filterBy(module) {
    this._activeModule = module;
    const logs = CT.store.getLogs();
    const filtered = module ? logs.filter(l => l.module === module) : logs;
    const tbody = document.getElementById('logs-tbody');
    if (tbody) tbody.innerHTML = this._rows(filtered);
  },

  _rows(logs) {
    const cls = { MF:'log-module-mf', TM:'log-module-tm', DD:'log-module-dd', CB:'log-module-cb' };
    if (!logs.length) return `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No log entries</td></tr>`;
    return logs.map(l => `
<tr>
  <td class="log-timestamp">${new Date(l.timestamp).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'medium'})}</td>
  <td><span class="log-module-badge ${cls[l.module]||'log-module-cb'}">${l.module}</span></td>
  <td class="log-customer">${l.customer}</td>
  <td class="log-message">${l.message}</td>
</tr>`).join('');
  },
};
