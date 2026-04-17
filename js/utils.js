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

  host.innerHTML = `
    <header>
      <div class="nav">
        <a href="index.html" class="logo">
          <span class="bracket">_._</span>kret<span class="bracket">_._</span>
          <span class="divider">//</span>
          <span class="sub">DonutSMP Utils</span>
        </a>
        <div class="nav-actions">
          ${user ? `
            ${isAdmin ? '<a href="admin.html">Admin</a>' : ''}
            <a href="#" id="logout-btn" class="user-chip">
              <img src="${avatarUrl(user.profile?.username || user.email)}" alt="avatar">
              ${escapeHtml(user.profile?.username || user.email)}
            </a>
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
      <div>_._kret_._ <span class="divider">//</span> DonutSMP Utils <span class="divider">//</span> unofficial</div>
    </footer>
  `;
}

window.KU = {
  db, avatarUrl, toast, getCurrentUser, requireAdmin,
  timeAgo, slugify, escapeHtml, videoEmbed, renderHeader, renderFooter
};
