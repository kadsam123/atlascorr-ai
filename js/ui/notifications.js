/* ============================================================
   Notifications UI — Alert Cards with Dismiss
   ============================================================ */
window.CT = window.CT || {};
CT.ui = CT.ui || {};

CT.ui.notifications = {
  render() {
    const all    = CT.store.getNotifications();
    const unread = all.filter(n => n.unread);
    const read   = all.filter(n => !n.unread);

    return `
<div class="view-enter">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div style="font-size:13px;color:var(--text-muted)">
      <span style="color:var(--accent-teal);font-weight:600">${unread.length} unread</span> · ${all.length} total
    </div>
    <button onclick="CT.ui.notifications.markAllRead()"
      style="padding:7px 16px;background:var(--glass-bg);color:var(--text-secondary);border:1px solid var(--glass-border);border-radius:7px;font-size:12px;cursor:pointer">
      Mark All Read
    </button>
  </div>

  ${unread.length ? `
    <div style="font-size:9px;font-weight:700;letter-spacing:1.3px;color:var(--text-muted);margin-bottom:10px">UNREAD</div>
    <div class="notifications-list" style="margin-bottom:22px">
      ${unread.map(n => this._card(n)).join('')}
    </div>` : ''}

  ${read.length ? `
    <div style="font-size:9px;font-weight:700;letter-spacing:1.3px;color:var(--text-muted);margin-bottom:10px">READ</div>
    <div class="notifications-list">
      ${read.map(n => this._card(n)).join('')}
    </div>` : ''}

  ${!all.length ? `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-text">No notifications yet. Run a pipeline to generate insights.</div></div>` : ''}
</div>`;
  },

  _card(n) {
    const icons = { route:'🛣️', compliance:'⚠️', opportunity:'🌟', info:'📊' };
    return `
<div class="notification-card ${n.unread ? 'unread' : ''}" id="notif-${n.id}">
  <div class="notif-icon ${n.type || 'info'}">${icons[n.type] || '📊'}</div>
  <div class="notif-body">
    <div class="notif-title">${n.title}</div>
    <div class="notif-message">${n.message}</div>
    <div class="notif-meta">
      <span class="notif-customer">${n.customer}</span>
      <span class="notif-time">${window.formatTime(n.time)}</span>
    </div>
  </div>
  ${n.unread ? `<button class="notif-dismiss" onclick="CT.ui.notifications.dismiss('${n.id}')" title="Dismiss">✕</button>` : ''}
</div>`;
  },

  dismiss(id) {
    CT.store.dismissNotification(id);
    const el = document.getElementById(`notif-${id}`);
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity .18s ease';
      setTimeout(() => CT.app.navigate('notifications'), 200);
    }
  },

  markAllRead() {
    CT.store.getNotifications().forEach(n => {
      if (n.unread) CT.store.dismissNotification(n.id);
    });
    CT.app.navigate('notifications');
  },
};
