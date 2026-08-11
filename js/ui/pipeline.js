/* ============================================================
   Pipeline UI — Animated 5-Step Export Intelligence Pipeline
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.pipeline = {
  isRunning:   false,
  stepStates:  {},

  render() {
    const customers = CT.store.getCustomers();
    return `
<div class="view-enter pipeline-container">
  <div class="pipeline-hero">
    <h2>Export Intelligence Pipeline</h2>
    <p>Run the full AI pipeline: ingest → route score → market match → compliance → report</p>
  </div>

  <div class="pipeline-controls">
    <select class="pipeline-customer-select" id="pipeline-customer-select">
      ${customers.map(c => `<option value="${c.id}">${c.flag} ${c.name}</option>`).join('')}
    </select>
    <button class="pipeline-run-btn" id="pipeline-run-btn" onclick="CT.ui.pipeline.run()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      Run Pipeline
    </button>
  </div>

  <div class="pipeline-steps" id="pipeline-steps-container">
    ${this._renderSteps({})}
  </div>

  <div id="pipeline-result-container"></div>
</div>`;
  },

  _renderSteps(states) {
    const defs = [
      { id:'ingest',     emoji:'📥', name:'Data Ingestion',     desc:'Ingest manifests, products, constraints, target markets' },
      { id:'meridian',   emoji:'🗺️', name:'Meridian Flow',      desc:'Corridor scoring, route ranking, bottleneck detection'   },
      { id:'tradematch', emoji:'🎯', name:'TradeMatch',          desc:'Product-to-market matching, tariff lookup, opportunity score' },
      { id:'ddtrs',      emoji:'🛡️', name:'DDTRS',              desc:'HS code extraction, compliance checks, risk scoring'    },
      { id:'aggregate',  emoji:'🧠', name:'CircleBrain',         desc:'Aggregate results, generate report, notify customer'   },
    ];

    return defs.map(step => {
      const st  = states[step.id] || 'pending';
      const out = states[`${step.id}_output`];
      return `
<div class="pipeline-step ${st}" id="pipeline-step-${step.id}">
  <div class="step-indicator">
    ${st === 'running' ? '<div class="spin"></div>' : st === 'done' ? '✅' : st === 'error' ? '❌' : step.emoji}
  </div>
  <div class="step-content">
    <div class="step-title">
      ${step.name}
      ${st === 'running' ? '<span style="font-size:11px;color:var(--accent-teal);">Processing…</span>' : ''}
      ${st === 'done'    ? '<span style="font-size:11px;color:var(--success);">Complete</span>'         : ''}
    </div>
    <div class="step-subtitle">${step.desc}</div>
    ${out ? `
    <div class="step-output">
      <div class="step-output-title">Output</div>
      <div class="step-output-content">${this._fmtOutput(step.id, out)}</div>
    </div>` : ''}
  </div>
</div>`;
    }).join('');
  },

  _fmtOutput(id, d) {
    switch (id) {
      case 'ingest':
        return `Customer: ${d.customer}\nProducts: ${d.products}  |  Target Markets: ${d.targetMarkets}\nBudget: £${(d.budget||0).toLocaleString()}  |  Risk Tolerance: ${d.riskTolerance}`;
      case 'meridian': {
        const r = d.bestRoute;
        return r
          ? `Best Route:    ${r.name}  (Score: ${r.score})\nTransit:       ${r.transitDays} days  |  Cost Index: ${r.costIndex}×\n${r.recommendation}`
          : 'No matching corridors found.';
      }
      case 'tradematch': {
        const m = d.bestMatch;
        return m
          ? `Best Market:   ${m.market.name}  (Score: ${m.score})\nTariff:        ${m.tariff}%  |  ${m.recommendation}`
          : 'No market matches found.';
      }
      case 'ddtrs':
        return `Checks:    ${d.results?.length || 0}  |  Blocked: ${d.blocked?.length || 0}\nHigh-Risk: ${d.highRisk?.length || 0}  |  Avg Risk: ${d.avgRisk?.toFixed(1) || 'N/A'}/10`;
      case 'aggregate':
        return `Route:        ${d.bestRoute}\nMarket:       ${d.bestMarket}\nOpportunity:  ${d.opportunityScore}/100  |  Risk: ${d.riskScore}/10\nLicense Req:  ${d.licenseRequired ? 'YES ⚠️' : 'NO ✅'}\n\n${d.recommendation}`;
      default:
        return '';
    }
  },

  async run() {
    if (this.isRunning) return;
    const select = document.getElementById('pipeline-customer-select');
    if (!select) return;

    this.isRunning  = true;
    this.stepStates = {};
    const btn = document.getElementById('pipeline-run-btn');
    if (btn) btn.disabled = true;

    const onStep = async (stepId, status, output) => {
      this.stepStates[stepId] = status;
      if (output) this.stepStates[`${stepId}_output`] = output;
      const c = document.getElementById('pipeline-steps-container');
      if (c) c.innerHTML = this._renderSteps(this.stepStates);
    };

    try {
      const results = await CT.circleBrain.runPipeline(select.value, onStep);
      const rc = document.getElementById('pipeline-result-container');
      if (rc && results.report) rc.innerHTML = this._renderResult(results.report);
    } catch (e) {
      console.error('[Pipeline]', e);
    } finally {
      this.isRunning = false;
      if (btn) btn.disabled = false;
    }
  },

  _renderResult(r) {
    return `
<div class="pipeline-result view-enter">
  <div class="pipeline-result-header">
    <h3>📋 Export Intelligence Report — ${r.customer}</h3>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${new Date(r.timestamp).toLocaleString()}</div>
  </div>
  <div class="pipeline-result-body">
    ${_rm('Best Route',       r.bestRoute,         'var(--accent-teal)', '15px')}
    ${_rm('Best Market',      r.bestMarket,        'var(--text-primary)','15px')}
    ${_rm('Transit Time',     r.transitDays + ' days', 'var(--text-primary)', '20px')}
    ${_rm('Tariff Rate',      r.tariffRate + '%',  'var(--text-primary)', '20px')}
    ${_rm('Opportunity',      r.opportunityScore + '/100', window.scoreColor(r.opportunityScore), '22px')}
    ${_rm('Risk Score',       r.riskScore + '/10', r.riskScore<=3?'var(--success)':r.riskScore<=6?'var(--warning)':'var(--danger)', '22px')}
  </div>
  <div style="padding:0 20px 20px">
    <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:6px">RECOMMENDATION</div>
      <div style="font-size:14px">${r.recommendation}</div>
    </div>
    <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius);padding:14px 16px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:6px">NEXT ACTION</div>
      <div style="font-size:13px;color:var(--accent-teal)">${r.nextAction}</div>
    </div>
  </div>
</div>`;
  },

  // Allow external callers to pre-select a customer and auto-run
  selectAndRun(customerId) {
    CT.app.navigate('pipeline');
    setTimeout(() => {
      const s = document.getElementById('pipeline-customer-select');
      if (s) { s.value = customerId; CT.ui.pipeline.run(); }
    }, 120);
  },
};

function _rm(label, value, color, fSize) {
  return `
<div class="result-metric">
  <div class="result-metric-label">${label}</div>
  <div class="result-metric-value" style="color:${color};font-size:${fSize}">${value}</div>
</div>`;
}
