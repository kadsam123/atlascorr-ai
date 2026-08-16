/* ============================================================
   Dossiers UI — Comparative Multi-Corridor Intelligence Hub
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.dossier = {
  _isLoading: false,
  _batchResults: null,
  _errorMsg: null,

  render() {
    let resultSectionHtml = '';

    if (this._isLoading) {
      resultSectionHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:12px;">
          <div class="pulse" style="width:24px;height:24px;border-radius:50%;background:var(--accent-cyan)"></div>
          <div style="font-size:13px;color:var(--text-muted)">Generating comparative intelligence dossiers... (Calling hybrid agent pipeline)</div>
        </div>`;
    } else if (this._errorMsg) {
      resultSectionHtml = `
        <div class="empty-state" style="border-color:rgba(239,68,68,.15)">
          <div class="empty-state-icon" style="color:var(--error)">⚠</div>
          <div class="empty-state-text" style="color:var(--error)">${this._errorMsg}</div>
        </div>`;
    } else if (this._batchResults) {
      resultSectionHtml = this._renderResults();
    } else {
      resultSectionHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-text">Select corridors and HS codes to compile dossier strategy report.</div>
        </div>`;
    }

    return `
<div class="view-enter" style="display:grid;grid-template-columns:300px 1fr;gap:20px;">
  <!-- Left Selector Sidebar -->
  <div class="card" style="padding:16px;height:fit-content;display:flex;flex-direction:column;gap:16px;">
    <div style="font-size:14px;font-weight:600;color:var(--text-light);border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:8px">Parameters Setup</div>
    
    <div class="form-group">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Origin Country</label>
      <input type="text" id="dossier-origin" class="compliance-input" style="width:100%" value="CA" readonly>
    </div>

    <div class="form-group">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Target Corridors (Select All)</label>
      <div style="display:flex;flex-direction:column;gap:8px;padding:8px;background:rgba(255,255,255,.02);border-radius:6px;border:1px solid rgba(255,255,255,.05)">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
          <input type="checkbox" name="dossier-corridors" value="DE" checked> Germany (DE)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
          <input type="checkbox" name="dossier-corridors" value="AE" checked> UAE (AE)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
          <input type="checkbox" name="dossier-corridors" value="DZ"> Algeria (DZ)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
          <input type="checkbox" name="dossier-corridors" value="SN"> Senegal (SN)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
          <input type="checkbox" name="dossier-corridors" value="FR"> France (FR)
        </label>
      </div>
    </div>

    <div class="form-group">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">HS Classification Codes</label>
      <input type="text" id="dossier-hs-codes" class="compliance-input" style="width:100%;font-family:var(--font-mono)" value="2009.12, 6203.42" placeholder="e.g. 2009.12, 6203.42">
      <span style="font-size:10px;color:var(--text-muted)">Comma separated values.</span>
    </div>

    <div class="form-group">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Freight Mode</label>
      <select id="dossier-mode" class="compliance-input" style="width:100%;background:var(--bg-card);color:var(--text-light)">
        <option value="sea">Sea Freight</option>
        <option value="air">Air Freight</option>
      </select>
    </div>

    <div class="form-group">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Min Cargo Value (USD)</label>
      <input type="number" id="dossier-value" class="compliance-input" style="width:100%" value="25000">
    </div>

    <button class="run-btn" style="width:100%;margin-top:8px" onclick="CT.ui.dossier.generate()" ${this._isLoading ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px;height:14px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Generate Portfolio
    </button>
  </div>

  <!-- Right Results Display -->
  <div style="display:flex;flex-direction:column;gap:20px;">
    ${resultSectionHtml}
  </div>
</div>`;
  },

  async generate() {
    this._isLoading = true;
    this._errorMsg = null;
    this._batchResults = null;
    CT.app.navigate('dossiers');

    const origin = document.getElementById('dossier-origin')?.value || 'CA';
    const corridors = Array.from(document.querySelectorAll('input[name="dossier-corridors"]:checked')).map(el => el.value);
    const hsInput = document.getElementById('dossier-hs-codes')?.value || '';
    const mode = document.getElementById('dossier-mode')?.value || 'sea';
    const cargoValue = parseFloat(document.getElementById('dossier-value')?.value || '25000');

    const hsCodes = hsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (!corridors.length || !hsCodes.length) {
      this._isLoading = false;
      this._errorMsg = 'Please select at least one target corridor and enter one HS code.';
      CT.app.navigate('dossiers');
      return;
    }

    try {
      const config = CT.store.getApiConfig();
      const baseUrl = config.mode === 'live' ? config.url : 'https://atlascorr-agent-api-production.up.railway.app';
      const apiKey = config.key || 'ct-demo-key-2026';

      const response = await fetch(`${baseUrl}/api/dossier-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          origin_country: origin,
          corridors,
          hs_codes: hsCodes,
          mode,
          min_cargo_value: cargoValue
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      this._batchResults = await response.json();
    } catch (err) {
      this._errorMsg = `Failed to generate dossiers: ${err.message}`;
    } finally {
      this._isLoading = false;
      CT.app.navigate('dossiers');
    }
  },

  _renderResults() {
    const summary = this._batchResults.portfolio_summary;
    const list = this._batchResults.dossiers;

    return `
      <!-- Portfolio summary cards -->
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px">
        <div class="card" style="padding:12px 16px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Total Shipments</div>
          <div style="font-size:20px;font-weight:700;color:var(--text-light);margin-top:4px">${summary.total_dossiers}</div>
        </div>
        <div class="card" style="padding:12px 16px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;color:var(--success)">Fully Enriched</div>
          <div style="font-size:20px;font-weight:700;color:var(--success);margin-top:4px">${summary.fully_enriched_count}</div>
        </div>
        <div class="card" style="padding:12px 16px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;color:var(--warning)">Degraded Baseline</div>
          <div style="font-size:20px;font-weight:700;color:var(--warning);margin-top:4px">${summary.degraded_count}</div>
        </div>
        <div class="card" style="padding:12px 16px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;color:var(--error)">High Risk Corridors</div>
          <div style="font-size:20px;font-weight:700;color:var(--error);margin-top:4px">${summary.high_risk_count}</div>
        </div>
      </div>

      <!-- Comparison Grid Table -->
      <div class="card" style="overflow:hidden">
        <div style="display:flex;justify-content:between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="font-size:13px;font-weight:600;color:var(--text-light)">Corridor Suitability Portfolio</div>
          <button class="filter-btn" style="font-size:11px;padding:4px 8px;margin-left:auto" onclick="window.print()">Export Dossier Hub (PDF)</button>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
          <thead>
            <tr style="background:rgba(255,255,255,.01);border-bottom:1px solid rgba(255,255,255,.05)">
              <th style="padding:12px 16px;color:var(--text-muted)">HS Code</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Corridor</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Category</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Duty Rate</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Risk Score</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Est. Cost</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Transit</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Complexity</th>
              <th style="padding:12px 16px;color:var(--text-muted)">Suitability</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((d, index) => {
              const suitabilityCol = d.summary.suitability === 'HIGH' ? 'var(--success)' : (d.summary.suitability === 'LOW' ? 'var(--error)' : 'var(--warning)');
              const complexityCol = d.summary.overall_complexity > 0.7 ? 'var(--warning)' : 'var(--text-light)';
              return `
                <tr style="border-bottom:1px solid rgba(255,255,255,.02);cursor:pointer;transition:background 0.2s" onclick="document.getElementById('detail-row-${index}').classList.toggle('hidden')" onmouseover="this.style.background='rgba(255,255,255,.01)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:12px 16px;font-family:var(--font-mono);font-weight:600">${d.hs_code}</td>
                  <td style="padding:12px 16px;font-weight:600">${this._batchResults.origin_country} → ${d.destination_country}</td>
                  <td style="padding:12px 16px;text-transform:capitalize">${d.category}</td>
                  <td style="padding:12px 16px">${d.tariff.duty_rate}% <span style="font-size:9px;color:var(--text-muted)">(${d.tariff.qa_status === 'APPROVED_WITH_ENRICHMENT' ? 'Enriched' : 'Core'})</span></td>
                  <td style="padding:12px 16px;color:${d.compliance.risk_score > 0.5 ? 'var(--error)' : 'var(--success)'}">${d.compliance.risk_score}</td>
                  <td style="padding:12px 16px">$${d.route.cost_usd.toLocaleString()}</td>
                  <td style="padding:12px 16px">${d.route.transit_days}d</td>
                  <td style="padding:12px 16px;color:${complexityCol}">${d.summary.overall_complexity}</td>
                  <td style="padding:12px 16px;font-weight:bold;color:${suitabilityCol}">${d.summary.suitability}</td>
                </tr>
                <tr id="detail-row-${index}" class="hidden" style="background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.03)">
                  <td colspan="9" style="padding:16px">
                    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:16px">
                      <!-- Left details -->
                      <div>
                        <div style="font-weight:600;margin-bottom:8px;color:var(--accent-cyan)">Compliance Requirements</div>
                        <ul style="padding-left:16px;margin:0 0 12px 0;display:flex;flex-direction:column;gap:4px">
                          ${d.compliance.mandatory_docs.map(doc => `<li>${doc}</li>`).join('')}
                        </ul>
                        <div style="font-size:11px;color:var(--text-muted)">
                          Compliance Supervisor: <span style="color:var(--accent-teal)">${d.compliance.qa_status}</span>
                        </div>
                      </div>
                      
                      <!-- Right details -->
                      <div>
                        <div style="font-weight:600;margin-bottom:8px;color:var(--accent-cyan)">Export Steps & Pipeline Logs</div>
                        <div style="font-size:11px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px">
                          <div>Export steps: <strong>${d.export_plan.steps_count}</strong></div>
                          <div>Route rating: <strong>${d.route.route_score} score</strong></div>
                          <div>Audit Status: <strong style="color:var(--success)">${d.route.qa_status}</strong></div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }
};
