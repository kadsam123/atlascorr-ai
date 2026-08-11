/* ============================================================
   CircleTrade AI — In-Memory State Store
   Simulates Firestore: logs, notifications, stats, pipeline runs.
   ============================================================ */
window.CT = window.CT || {};

CT.store = (() => {
  const state = {
    customers: CT.data.customers,
    logs: [],
    notifications: [
      {
        id: 'N001', type: 'route', unread: true,
        title: '💡 Cheaper Route Found',
        message: 'UK → UAE via Jebel Ali has dropped 12% in cost index. Estimated savings: £3,200 on the next Hargreaves Textiles shipment.',
        customer: 'Hargreaves Textiles Ltd', customerId: 'SME-001',
        time: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'N002', type: 'compliance', unread: true,
        title: '⚠️ Compliance Alert',
        message: 'Battery Storage Units (HS 8507.60) destined for India now require ECA (Export Control Authorization). Review before next shipment.',
        customer: 'GreenTech Solutions GmbH', customerId: 'SME-002',
        time: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'N003', type: 'opportunity', unread: true,
        title: '🌟 New Market Opportunity',
        message: 'Vietnam shows 11.2% import growth in textiles. Opportunity score: 84/100. Low tariff environment for UK/EU exporters.',
        customer: 'Hargreaves Textiles Ltd', customerId: 'SME-001',
        time: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: 'N004', type: 'info', unread: false,
        title: '📊 Daily Intelligence Report Ready',
        message: 'Daily export intelligence report for 11 Aug 2026 is ready. 8 corridors scored, 24 opportunities identified across all customers.',
        customer: 'All Customers', customerId: null,
        time: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'N005', type: 'opportunity', unread: false,
        title: '🌟 Singapore Premium Food Market',
        message: 'Artisan food exports to Singapore score 94/100. Zero tariff on olive oil. Strong demand for Italian specialty goods.',
        customer: 'Artisan Foods Co.', customerId: 'SME-003',
        time: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
    pipelineRuns: [],
    opportunities: [],
    stats: {
      totalCustomers: 5,
      routesScored: 8,
      opportunitiesFound: 24,
      complianceChecks: 18,
    },
  };

  // Seed initial log history
  const seedLogs = [
    { module:'CB', message:'Daily pipeline initialized — all 4 modules online',               customerId:null,       customer:'System'                  },
    { module:'MF', message:'Scored 8 corridors — IT→SGP: 88, UK→UAE: 87, EU→SEA: 82',        customerId:'SME-001',  customer:'Hargreaves Textiles Ltd'  },
    { module:'TM', message:'Matched Merino Wool Scarves — top: Singapore (94), UAE (91)',     customerId:'SME-001',  customer:'Hargreaves Textiles Ltd'  },
    { module:'DD', message:'Compliance check passed — HS 6117.10, risk score: 1.2/10',        customerId:'SME-001',  customer:'Hargreaves Textiles Ltd'  },
    { module:'MF', message:'Bottleneck at Nhava Sheva Port — India→USA +3d delay expected',   customerId:'SME-005',  customer:'Spice Route Trading'      },
    { module:'TM', message:'Turmeric matched — Germany 0%, UK 0%, USA 3.2% tariff',           customerId:'SME-005',  customer:'Spice Route Trading'      },
    { module:'DD', message:'HS 9018.12 dual-use — export license recommended for Brazil',      customerId:'SME-004',  customer:'MedDevPro Inc.'           },
    { module:'TM', message:'Battery Storage → India: opp score 78, tariff 15%',               customerId:'SME-002',  customer:'GreenTech Solutions GmbH' },
    { module:'DD', message:'ECA flag raised — Battery Storage Units → India, risk: 5.8/10',    customerId:'SME-002',  customer:'GreenTech Solutions GmbH' },
    { module:'CB', message:'Generated 5 notifications — 2 route, 2 opportunity, 1 compliance', customerId:null,       customer:'System'                  },
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

    // ── Mutations ────────────────────────────────────────────
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

    addPipelineRun(run) {
      state.pipelineRuns.unshift(run);
    },

    updateStats(delta) {
      Object.assign(state.stats, delta);
    },
  };

  function _updateBadge() {
    const badge = document.getElementById('nav-badge');
    if (badge) badge.textContent = CT.store.getUnreadCount();
  }
})();
