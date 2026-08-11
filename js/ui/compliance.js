/* ============================================================
   Compliance UI — DDTRS Checker, HS Lookup, Risk Meter
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.compliance = {
  _last: null,

  render() {
    const recentLogs = CT.store.getLogs().filter(l => l.module === 'DD').slice(0, 6);
    return `
<div class="view-enter">
  <div class="compliance-layout">

    <!-- Left: Input Panel -->
    <div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">🛡️ DDTRS Compliance Check</span>
        </div>
        <div class="card-body">
          <div style="margin-bottom:12px">
            <label style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);display:block;margin-bottom:6px">PRODUCT DESCRIPTION</label>
            <input type="text" class="hs-input" id="ct-product-desc" placeholder="e.g. Merino wool scarves, Solar panels…">
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);display:block;margin-bottom:6px">DESTINATION MARKET</label>
            <select class="hs-input" id="ct-dest">
              ${CT.data.markets.map(m => `<option value="${m.code}">${m.name}</option>`).join('')}
            </select>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);display:block;margin-bottom:6px">PRODUCT CATEGORY</label>
            <select class="hs-input" id="ct-category">
              <option value="textiles">Textiles &amp; Apparel</option>
              <option value="food">Food &amp; Beverage</option>
              <option value="machinery">Machinery &amp; Equipment</option>
              <option value="electronics">Electronics</option>
              <option value="medical">Medical Devices</option>
            </select>
          </div>
          <button class="hs-lookup-btn" onclick="CT.ui.compliance.run()">Run DDTRS Check</button>
        </div>
      </div>

      <!-- Quick Examples -->
      <div class="card">
        <div class="card-header"><span class="card-title">⚡ Quick Examples</span></div>
        <div class="card-body" style="padding:10px 14px">
          ${[
            { label:'Merino Wool → UAE',        desc:'Merino wool scarves',       dest:'UAE', cat:'textiles'   },
            { label:'Battery Storage → India',  desc:'Battery storage units',     dest:'IND', cat:'electronics' },
            { label:'Ultrasound Device → Brazil',desc:'Portable ultrasound device',dest:'BRA', cat:'medical'    },
            { label:'Olive Oil → Singapore',    desc:'Truffle infused olive oil', dest:'SGP', cat:'food'       },
            { label:'Turmeric → Germany',       desc:'Organic turmeric powder',   dest:'DEU', cat:'food'       },
          ].map(e => `
            <div onclick="CT.ui.compliance.fill('${e.desc}','${e.dest}','${e.cat}')"
              style="padding:9px 11px;border-radius:7px;cursor:pointer;font-size:12px;color:var(--text-secondary);
                     margin-bottom:5px;border:1px solid var(--glass-border);transition:all .2s"
              onmouseover="this.style.borderColor='rgba(0,212,255,.3)';this.style.color='var(--text-primary)'"
              onmouseout="this.style.borderColor='var(--glass-border)';this.style.color='var(--text-secondary)'">
              ${e.label}
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Right: Results Panel -->
    <div>
      <div class="card" id="ct-result-panel" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">📋 DDTRS Results</span></div>
        <div class="card-body" id="ct-result-body">
          ${this._last ? this._renderResult(this._last) : `
            <div class="empty-state">
              <div class="empty-state-icon">🛡️</div>
              <div class="empty-state-text">Run a check to see compliance results</div>
            </div>`}
        </div>
      </div>

      <!-- Recent Runs -->
      <div class="card">
        <div class="card-header"><span class="card-title">🕐 Recent DDTRS Runs</span></div>
        <div class="card-body" style="padding:0 20px">
          ${!recentLogs.length
            ? '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No checks yet</div></div>'
            : recentLogs.map(l => `
              <div style="padding:9px 0;border-bottom:1px solid var(--glass-border);font-size:12px">
                <div style="color:var(--text-primary);margin-bottom:2px">${l.message}</div>
                <div style="font-size:11px;color:var(--text-muted)">${l.customer} · ${window.formatTime(l.timestamp)}</div>
              </div>`).join('')}
        </div>
      </div>
    </div>

  </div>
</div>`;
  },

  fill(desc, dest, cat) {
    const d = document.getElementById('ct-product-desc');
    const ds = document.getElementById('ct-dest');
    const c = document.getElementById('ct-category');
    if (d)  d.value  = desc;
    if (ds) ds.value = dest;
    if (c)  c.value  = cat;
  },

  run() {
    const desc     = (document.getElementById('ct-product-desc')?.value  || 'unknown product').trim();
    const destCode = document.getElementById('ct-dest')?.value            || 'UAE';
    const category = document.getElementById('ct-category')?.value        || 'general';
    const destName = CT.data.markets.find(m => m.code === destCode)?.name || destCode;

    const hsCode     = CT.ddtrs.extractHSCode(desc);
    const product    = { name: desc, hsCode, category };
    const compliance = CT.ddtrs.checkCompliance(product, destName);
    const riskScore  = CT.ddtrs.getRiskScore(product, destName);
    const tariff     = CT.tradeMatch.lookupTariff(hsCode, destCode, category);

    this._last = { desc, hsCode, destName, category, compliance, riskScore, tariff };

    CT.store.addLog({
      module: 'DD',
      message: `Manual check — "${desc}" → ${destName} | HS: ${hsCode} | Risk: ${riskScore}/10 | Tariff: ${tariff}%`,
      customerId: null,
      customer: 'Manual Check',
    });

    const body = document.getElementById('ct-result-body');
    if (body) body.innerHTML = this._renderResult(this._last);
  },

  _renderResult(r) {
    const rCol  = r.riskScore <= 3 ? 'var(--success)' : r.riskScore <= 6 ? 'var(--warning)' : 'var(--danger)';
    const rBg   = r.riskScore <= 3 ? '#10b981'         : r.riskScore <= 6 ? '#f59e0b'         : '#ef4444';
    const rPct  = (r.riskScore / 10) * 100;

    return `
${[
  ['📦 Product',         r.desc,                                                      ''],
  ['🏷️ HS Code (DDTRS)', `<span style="color:var(--accent-teal);font-weight:700">${r.hsCode}</span>`, ''],
  ['🌍 Destination',     r.destName,                                                  ''],
  ['💰 Applicable Tariff', `<span style="font-weight:700">${r.tariff}%</span>`,      ''],
  ['✅ Compliance',      r.compliance.passed
      ? '<span class="compliance-check-value pass">✅ PASSED</span>'
      : '<span class="compliance-check-value fail">❌ BLOCKED</span>',               ''],
  ['📜 Export License',  r.compliance.licenseRequired
      ? '<span class="compliance-check-value warn">⚠️ REQUIRED</span>'
      : '<span class="compliance-check-value pass">✅ NOT REQUIRED</span>',          ''],
].map(([label, val]) => `
  <div class="compliance-result-item">
    <span class="compliance-check-label">${label}</span>
    <span style="font-size:13px">${val}</span>
  </div>`).join('')}

<div class="risk-meter">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
    <span style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted)">RISK SCORE</span>
    <span style="font-family:var(--font-heading);font-size:24px;font-weight:800;color:${rCol}">
      ${r.riskScore}<span style="font-size:13px;font-weight:400;color:var(--text-muted)">/10</span>
    </span>
  </div>
  <div class="risk-meter-track">
    <div class="risk-meter-fill" style="width:${rPct}%;background:${rBg}"></div>
  </div>
</div>

${r.compliance.warnings.length ? `
  <div style="margin-top:10px">
    <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:7px">WARNINGS</div>
    ${r.compliance.warnings.map(w => `
      <div style="padding:9px 12px;background:var(--warning-dim);border:1px solid rgba(245,158,11,.2);border-radius:7px;font-size:12px;color:var(--warning);margin-bottom:6px">
        ⚠️ ${w.message}
      </div>`).join('')}
  </div>` : ''}

${r.compliance.issues.length ? `
  <div style="margin-top:10px">
    <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:7px">BLOCKS</div>
    ${r.compliance.issues.map(issue => `
      <div style="padding:9px 12px;background:var(--danger-dim);border:1px solid rgba(239,68,68,.2);border-radius:7px;font-size:12px;color:var(--danger);margin-bottom:6px">
        ❌ ${issue.message}
      </div>`).join('')}
  </div>` : ''}`;
  },
};
