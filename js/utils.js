// ============================================
// Shared utilities + Supabase client
// ============================================

const { createClient } = window.supabase;
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
window.db = db;

// ---------- Avatar ----------
// DiceBear "adventurer" style gives each user a unique cartoon avatar
function avatarUrl(seed) {
  const s = encodeURIComponent(seed || 'anonymous');
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}&backgroundColor=transparent`;
}

// ---------- Toast ----------
function toast(msg, kind = '') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'error' ? 'err' : kind === 'ok' ? 'ok' : '');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ---------- Auth state ----------
async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile ? { ...user, profile } : user;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.profile?.is_admin) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// ---------- Format ----------
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'entry-' + Date.now();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert YouTube / Streamable / direct mp4 URL → embed URL
function videoEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    // Streamable
    if (host === 'streamable.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return { type: 'iframe', src: `https://streamable.com/e/${id}` };
    }
    // Direct mp4
    if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) {
      return { type: 'video', src: url };
    }
  } catch {}
  return { type: 'iframe', src: url }; // fallback: try as-is
}

// ---------- Header rendering ----------
async function renderHeader() {
  const host = document.getElementById('header-host');
  if (!host) return;
  const user = await getCurrentUser();
  const isAdmin = user?.profile?.is_admin;

  const bellHtml = user ? await renderNotifBell(user) : '';

  host.innerHTML = `
    <header>
      <div class="nav">
        <a href="index.html" class="logo">
          <span class="logo-mark">K</span>
          <span class="logo-text">
            <span class="handle">_._kret_._</span>
            <span class="sub">DonutSMP Utils</span>
          </span>
        </a>
        <div class="nav-actions">
          ${user ? `
            ${isAdmin ? '<a href="admin.html">Admin</a>' : ''}
            ${bellHtml}
            <a href="user.html?u=${encodeURIComponent(user.profile?.username || '')}" class="user-chip" title="Your profile">
              <img src="${avatarUrl(user.profile?.username || user.email)}" alt="avatar">
              ${escapeHtml(user.profile?.username || user.email)}
            </a>
            <a href="#" id="logout-btn" class="logout-link" title="Sign out">↗</a>
          ` : `
            <a href="login.html">Sign in</a>
            <a href="register.html" class="btn-primary">Register</a>
          `}
        </div>
      </div>
    </header>
  `;

  const logout = document.getElementById('logout-btn');
  if (logout) {
    logout.addEventListener('click', async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      window.location.href = 'index.html';
    });
  }
}

function renderFooter() {
  const host = document.getElementById('footer-host');
  if (!host) return;
  const s = window.SOCIAL_LINKS || {};
  const links = [];
  if (s.discord) links.push(`<a href="${s.discord}" target="_blank" rel="noopener">Discord</a>`);
  if (s.youtube) links.push(`<a href="${s.youtube}" target="_blank" rel="noopener">YouTube</a>`);
  if (s.tiktok) links.push(`<a href="${s.tiktok}" target="_blank" rel="noopener">TikTok</a>`);
  if (s.twitch) links.push(`<a href="${s.twitch}" target="_blank" rel="noopener">Twitch</a>`);

  host.innerHTML = `
    <footer>
      ${links.length ? `<div class="socials">${links.join('')}</div>` : ''}
      <div class="footer-text">_._kret_._<span class="sep">×</span>DonutSMP Utils<span class="sep">×</span>unofficial</div>
    </footer>
  `;
}

window.KU = {
  db, avatarUrl, toast, getCurrentUser, requireAdmin,
  timeAgo, slugify, escapeHtml, videoEmbed, renderHeader, renderFooter,
  parseMentions, renderMentions, createNotification, formatCount,
  incrementView, renderNotifBell
};

// ---------- Mentions ----------
// Extract @usernames from text. Returns array of unique usernames (no @).
function parseMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_.-]{3,24})/g) || [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

// Render @mentions as pink highlighted spans (HTML safe).
function renderMentions(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(/@([a-zA-Z0-9_.-]{3,24})/g,
    '<a href="user.html?u=$1" class="mention">@$1</a>');
}

// ---------- Notifications ----------
async function createNotification({ userId, type, entryId, commentId, payload = {} }) {
  const me = await getCurrentUser();
  if (!me || me.id === userId) return; // don't notify yourself
  await db.from('notifications').insert({
    user_id: userId,
    type,
    actor_id: me.id,
    entry_id: entryId || null,
    comment_id: commentId || null,
    payload
  });
}

// ---------- Format ----------
function formatCount(n) {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 1000000) return Math.floor(n / 1000) + 'k';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// ---------- Views ----------
async function incrementView(slug) {
  // Use sessionStorage so rapid refreshes don't inflate the count
  const key = 'viewed:' + slug;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  try {
    await db.rpc('increment_view', { entry_slug: slug });
  } catch (e) { /* ignore */ }
}

// ---------- Notification bell ----------
async function renderNotifBell(user) {
  if (!user) return '';
  const { count } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);
  return `
    <a href="notifications.html" class="notif-bell" title="Notifications">
      <span class="bell-icon">🔔</span>
      ${count && count > 0 ? `<span class="bell-badge">${count > 99 ? '99+' : count}</span>` : ''}
    </a>
  `;
}
