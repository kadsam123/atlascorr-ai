/* ============================================================
   AtlasCorr AI — In-Memory State Store
   Simulates Firestore: logs, notifications, stats, pipeline runs.
   ============================================================ */
window.CT = window.CT || {};

CT.store = (() => {
  const state = {
    customers: [
      {
        id: 'SME-000', name: 'EuroWeave Textiles GmbH', country: 'DE', flag: '🇩🇪', sector: 'Textiles',
        products: [{ id: 'P000', name: 'Merino Wool Scarves', category: 'textiles', hsCode: '6117.10' }],
        targetMarkets: ['SGP', 'UAE', 'JPN'], budget: 50000, riskTolerance: 'medium'
      },
      {
        id: 'SME-001', name: 'Hargreaves Textiles Ltd', country: 'GB', flag: '🇬🇧', sector: 'Textiles & Apparel',
        products: [{ id: 'P001', name: 'Merino Wool Scarves', category: 'textiles', hsCode: '6117.10' }],
        targetMarkets: ['UAE', 'SGP', 'JPN'], budget: 35000, riskTolerance: 'medium'
      },
      {
        id: 'SME-002', name: 'GreenTech Solutions GmbH', country: 'DE', flag: '🇩🇪', sector: 'Clean Energy Equipment',
        products: [{ id: 'P002', name: 'Battery Storage Units', category: 'electronics', hsCode: '8507.60' }],
        targetMarkets: ['IND', 'AUS', 'ZAF'], budget: 120000, riskTolerance: 'low'
      },
      {
        id: 'SME-003', name: 'Artisan Foods Co.', country: 'IT', flag: '🇮🇹', sector: 'Food & Beverage',
        products: [{ id: 'P003', name: 'Virgin Olive Oil', category: 'food', hsCode: '1509.10' }],
        targetMarkets: ['SGP', 'CAN', 'USA'], budget: 15000, riskTolerance: 'high'
      },
      {
        id: 'SME-004', name: 'MedDevPro Inc.', country: 'US', flag: '🇺🇸', sector: 'Medical Devices',
        products: [{ id: 'P004', name: 'Ultrasound Equipment', category: 'medical', hsCode: '9018.12' }],
        targetMarkets: ['DEU', 'BRA', 'JPN'], budget: 250000, riskTolerance: 'low'
      },
      {
        id: 'SME-005', name: 'Spice Route Trading', country: 'IN', flag: '🇮🇳', sector: 'Agricultural Commodities',
        products: [{ id: 'P005', name: 'Organic Turmeric Powder', category: 'food', hsCode: '0910.30' }],
        targetMarkets: ['USA', 'GBR', 'UAE'], budget: 8000, riskTolerance: 'medium'
      }
    ],
    logs: [],
    notifications: [],
    pipelineRuns: [],
    opportunities: [],
    stats: {
      totalCustomers: 6,
      routesScored: 0,
      opportunitiesFound: 0,
      complianceChecks: 0,
    },
    // ── API Configuration State (Default to live) ─────────────────────
    apiMode: localStorage.getItem('CT_apiMode') || 'live',
    apiUrl:  localStorage.getItem('CT_apiUrl')  || 'https://circletrade-agent-api-production.up.railway.app',
    apiKey:  localStorage.getItem('CT_apiKey')  || 'ct-demo-key-2026',
  };

  // Seed initial log history
  const seedLogs = [
    { module:'CB', message:'AtlasCorr AI production API stack initialized — live connections active', customerId:null, customer:'System' }
  ];

  const now = Date.now();
  seedLogs.forEach((l, i) => {
    state.logs.push({
      id: `LOG-${String(i + 1).padStart(4, '0')}`,
      timestamp: new Date(now - (seedLogs.length - i) * 480000).toISOString(),
      module: l.module,
      message: l.message,
      customerId: l.customerId,
      customer: l.customer,
    });
  });

  // Auto-correct local storage URL if it points to the deprecated atlascorr domain
  if (state.apiUrl.includes('atlascorr-agent-api-production')) {
    state.apiUrl = 'https://circletrade-agent-api-production.up.railway.app';
    localStorage.setItem('CT_apiUrl', state.apiUrl);
  }

  return {
    // ── Getters ──────────────────────────────────────────────
    getState:         () => state,
    getCustomers:     () => state.customers,
    getCustomer:      (id) => state.customers.find(c => c.id === id),
    getLogs:          () => [...state.logs].reverse(),
    getNotifications: () => state.notifications,
    getUnreadCount:   () => state.notifications.filter(n => n.unread).length,
    getStats:         () => state.stats,
    getOpportunities: () => state.opportunities,
    getApiConfig:     () => ({ mode: state.apiMode, url: state.apiUrl, key: state.apiKey }),

    // ── Mutations ────────────────────────────────────────────
    setApiConfig(config) {
      if (config.mode) {
        state.apiMode = config.mode;
        localStorage.setItem('CT_apiMode', config.mode);
      }
      if (config.url) {
        state.apiUrl = config.url;
        localStorage.setItem('CT_apiUrl', config.url);
      }
      if (config.key) {
        state.apiKey = config.key;
        localStorage.setItem('CT_apiKey', config.key);
      }
      window.dispatchEvent(new CustomEvent('CT_apiConfigChanged', { detail: this.getApiConfig() }));
    },

    addLog(entry) {
      const log = {
        id: `LOG-${String(state.logs.length + 1).padStart(4, '0')}`,
        timestamp: new Date().toISOString(),
        ...entry,
      };
      state.logs.push(log);
      return log;
    },

    addNotification(notif) {
      const n = { id: `N${Date.now()}`, unread: true, time: new Date().toISOString(), ...notif };
      state.notifications.unshift(n);
      _updateBadge();
      return n;
    },

    dismissNotification(id) {
      const n = state.notifications.find(x => x.id === id);
      if (n) n.unread = false;
      _updateBadge();
    },

    setOpportunities(opps) { state.opportunities = opps; },
    addPipelineRun(run) { state.pipelineRuns.unshift(run); },
    updateStats(delta) { Object.assign(state.stats, delta); }
  };

  function _updateBadge() {
    const badge = document.getElementById('nav-badge');
    if (badge) badge.textContent = state.notifications.filter(n => n.unread).length;
  }
})();
