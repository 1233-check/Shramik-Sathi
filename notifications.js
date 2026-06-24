/**
 * Shramik Sathi — in-app notifications widget (shared)
 *
 * Drop-in: give a bell button id="notifBell" on a page that also loads
 * supabase-config.js. This adds an unread badge + a dropdown panel, loads the
 * current user's notifications (RLS scopes them to the recipient), and marks
 * them read when the panel is opened. Works for both worker and employer
 * dashboards — notifications are addressed by auth user id.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(init);

  function init() {
    const bell = document.getElementById('notifBell');
    if (!bell || typeof getSupabaseClient !== 'function') return;
    const sb = getSupabaseClient();
    const esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };
    let items = [];
    let open = false;

    // Unread badge on the bell
    const badge = document.createElement('span');
    badge.style.cssText = 'position:absolute;top:3px;right:3px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:#e11d48;color:#fff;font-size:10px;font-weight:800;line-height:16px;text-align:center;display:none;pointer-events:none;';
    if (getComputedStyle(bell).position === 'static') bell.style.position = 'relative';
    bell.appendChild(badge);

    // Dropdown panel (appended to body, fixed-positioned under the bell)
    const panel = document.createElement('div');
    panel.setAttribute('role', 'menu');
    panel.style.cssText = 'position:fixed;z-index:9999;width:340px;max-width:92vw;max-height:70vh;overflow-y:auto;background:#fff;border:1px solid #e2e4e2;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.18);display:none;font-family:inherit;';
    document.body.appendChild(panel);

    function timeAgo(ts) {
      const s = (Date.now() - new Date(ts).getTime()) / 1000;
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    }

    function render() {
      const unread = items.filter(n => !n.read).length;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = unread > 0 ? 'block' : 'none';

      if (!items.length) {
        panel.innerHTML = '<div style="padding:12px 16px;font-weight:800;color:#1c211f;border-bottom:1px solid #eee;font-size:14px;">Notifications</div>'
          + '<div style="padding:28px 16px;text-align:center;color:#8b928f;font-size:13px;">No notifications yet</div>';
        return;
      }
      panel.innerHTML =
        '<div style="padding:12px 16px;font-weight:800;color:#1c211f;border-bottom:1px solid #eee;font-size:14px;">Notifications</div>' +
        items.map(function (n) {
          const link = n.link ? esc(n.link) : '';
          return '<div data-link="' + link + '" style="padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:' + (link ? 'pointer' : 'default') + ';background:' + (n.read ? '#fff' : '#f5faf8') + ';">'
            + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">'
            + '<span style="font-weight:700;color:#1c211f;font-size:13px;">' + esc(n.title) + '</span>'
            + '<span style="color:#9aa0a6;font-size:11px;white-space:nowrap;">' + timeAgo(n.created_at) + '</span></div>'
            + (n.body ? '<div style="color:#4a514e;font-size:12px;margin-top:2px;line-height:1.4;">' + esc(n.body) + '</div>' : '')
            + '</div>';
        }).join('');

      panel.querySelectorAll('[data-link]').forEach(function (el) {
        const link = el.getAttribute('data-link');
        if (link) el.addEventListener('click', function () { window.location.href = link; });
      });
    }

    function position() {
      const r = bell.getBoundingClientRect();
      const w = Math.min(340, window.innerWidth * 0.92);
      panel.style.width = w + 'px';
      panel.style.top = (r.bottom + 8) + 'px';
      // anchor under the bell, but clamp so the panel never overflows either edge
      const right = Math.min(Math.max(8, window.innerWidth - r.right), window.innerWidth - w - 8);
      panel.style.right = right + 'px';
      panel.style.left = 'auto';
    }

    async function load() {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        const { data, error } = await sb.from('notifications')
          .select('*').order('created_at', { ascending: false }).limit(20);
        if (error) { console.warn('[notif]', error.message); return; }
        items = data || [];
        render();
      } catch (e) { console.warn('[notif] load failed', e); }
    }

    async function markRead() {
      const unreadIds = items.filter(n => !n.read).map(n => n.id);
      if (!unreadIds.length) return;
      items.forEach(n => { n.read = true; });
      render();
      try { await sb.from('notifications').update({ read: true }).in('id', unreadIds); }
      catch (e) { console.warn('[notif] markRead failed', e); }
    }

    bell.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      open = !open;
      if (open) { position(); panel.style.display = 'block'; markRead(); }
      else { panel.style.display = 'none'; }
    });
    document.addEventListener('click', function (e) {
      if (open && !panel.contains(e.target) && !bell.contains(e.target)) { open = false; panel.style.display = 'none'; }
    });
    window.addEventListener('resize', function () { if (open) position(); });

    render();   // initial empty state, so the panel always has content on first open
    load();
    setInterval(load, 60000); // light polling so new notifications appear without a refresh
  }
})();
