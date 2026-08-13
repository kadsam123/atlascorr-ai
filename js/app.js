/* ============================================================
   AtlasTrade AI — App Router, Particles, Clocks & Boot
   ============================================================ */
window.CT = window.CT || {};

CT.app = (() => {
  let _currentView = 'dashboard';
  let _nextRunSec  = 0;
  const DAY = 86400;

  const VIEWS = {
    dashboard:     { title:'Dashboard',    crumb:'AtlasTrade AI → Dashboard',    render:() => CT.ui.dashboard.render()      },
    pipeline:      { title:'Pipeline',     crumb:'AtlasTrade AI → Pipeline',     render:() => CT.ui.pipeline.render()       },
    customers:     { title:'Customers',    crumb:'AtlasTrade AI → Customers',    render:() => CT.ui.customers.render()      },
    opportunities: { title:'Opportunities',crumb:'AtlasTrade AI → Opportunities',render:() => CT.ui.opportunities.render() },
    compliance:    { title:'Compliance',   crumb:'AtlasTrade AI → Compliance',   render:() => CT.ui.compliance.render()     },
    marketplace:   { title:'Marketplace',  crumb:'AtlasTrade AI → Developer Marketplace', render:() => CT.ui.marketplace.render() },
    notifications: { title:'Alerts',       crumb:'AtlasTrade AI → Alerts',       render:() => CT.ui.notifications.render()  },
    logs:          { title:'Logs',          crumb:'AtlasTrade AI → Logs',         render:() => CT.ui.logs.render()           },
  };

  // ── Navigation ────────────────────────────────────────────
  function navigate(viewId) {
    const view = VIEWS[viewId];
    if (!view) return;
    _currentView = viewId;

    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.view === viewId)
    );

    document.getElementById('page-title').textContent      = view.title;
    document.getElementById('page-breadcrumb').textContent = view.crumb;

    const content = document.getElementById('content');
    content.innerHTML  = view.render();
    content.scrollTop  = 0;
  }

  // ── Quick Run (from header button) ────────────────────────
  function quickRun() {
    navigate('pipeline');
    setTimeout(() => CT.ui.pipeline.run(), 150);
  }

  // ── Modal ─────────────────────────────────────────────────
  function closePipelineModal() {
    document.getElementById('pipeline-modal')?.classList.add('hidden');
  }

  // ── DateTime Clock ────────────────────────────────────────
  function _clockTick() {
    const el = document.getElementById('datetime-display');
    if (el) el.textContent = new Date().toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'medium' });
  }

  // ── Next-Run Countdown ────────────────────────────────────
  function _timerTick() {
    _nextRunSec--;
    if (_nextRunSec < 0) _nextRunSec = DAY - 1;

    const h = String(Math.floor(_nextRunSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((_nextRunSec % 3600) / 60)).padStart(2, '0');
    const s = String(_nextRunSec % 60).padStart(2, '0');

    const timerEl = document.getElementById('next-run-timer');
    const fillEl  = document.getElementById('next-run-fill');
    if (timerEl) timerEl.textContent = `${h}:${m}:${s}`;
    if (fillEl)  fillEl.style.width  = `${(_nextRunSec / DAY) * 100}%`;
  }

  // ── Particle Canvas ───────────────────────────────────────
  function _initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const N = 55;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.35 + 0.08,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < N; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.a})`;
        ctx.fill();

        for (let j = i + 1; j < N; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,212,255,${0.07 * (1 - dist / 115)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ── API Mode Settings handlers ────────────────────────────
  function toggleApiMode() {
    const config = CT.store.getApiConfig();
    const newMode = config.mode === 'mock' ? 'live' : 'mock';
    CT.store.setApiConfig({ mode: newMode });
    _updateApiUI();
    
    CT.store.addLog({
      module: 'CB',
      message: `Connection mode toggled to: ${newMode.toUpperCase()}`,
      customerId: null,
      customer: 'System'
    });
  }

  function openApiSettings() {
    const config = CT.store.getApiConfig();
    const urlInput = document.getElementById('api-settings-url');
    const keyInput = document.getElementById('api-settings-key');
    if (urlInput) urlInput.value = config.url;
    if (keyInput) keyInput.value = config.key;
    document.getElementById('api-settings-modal')?.classList.remove('hidden');
  }

  function closeApiSettings() {
    document.getElementById('api-settings-modal')?.classList.add('hidden');
  }

  function saveApiSettings() {
    const url = document.getElementById('api-settings-url')?.value.trim();
    const key = document.getElementById('api-settings-key')?.value.trim();
    
    CT.store.setApiConfig({ url, key });
    closeApiSettings();

    CT.store.addLog({
      module: 'CB',
      message: `API Configurations updated: URL=${url}`,
      customerId: null,
      customer: 'System'
    });
  }

  function _updateApiUI() {
    const config = CT.store.getApiConfig();
    const btn = document.getElementById('api-mode-toggle-btn');
    if (!btn) return;
    
    if (config.mode === 'mock') {
      btn.className = 'api-mode-badge mock';
      btn.querySelector('.mode-text').textContent = 'MOCK MODE';
    } else {
      btn.className = 'api-mode-badge live';
      btn.querySelector('.mode-text').textContent = 'LIVE API';
    }
  }

  // ── Navigation Event Binding ──────────────────────────────
  function _bindNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigate(item.dataset.view);
      });
    });
  }

  // ── Boot ──────────────────────────────────────────────────
  function init() {
    // Initialize AI modules
    CT.circleBrain.initialize();

    // Visual init
    _initParticles();
    _bindNav();
    _updateApiUI();

    // Update badge
    const badge = document.getElementById('nav-badge');
    if (badge) badge.textContent = CT.store.getUnreadCount();

    // Clocks
    _clockTick();
    setInterval(_clockTick, 1000);

    // Countdown: randomize between 5 – 16 hours remaining
    _nextRunSec = Math.floor(Math.random() * 39600) + 18000;
    _timerTick();
    setInterval(_timerTick, 1000);

    // Default view
    navigate('dashboard');

    console.log('%c🚀 AtlasTrade AI Online', 'color:#00d4ff;font-size:14px;font-weight:bold');
    console.log('%cMeridian Flow · TradeMatch · DDTRS · CircleBrain — all modules active', 'color:#7c3aed');
  }

  return { navigate, quickRun, closePipelineModal, init, toggleApiMode, openApiSettings, closeApiSettings, saveApiSettings };
})();

// Boot on DOMContentLoaded
document.addEventListener('DOMContentLoaded', CT.app.init);
