/**
 * SCMS v11 — 00_landing.js
 * Landing screen + Telegram-based login flow.
 *
 * When the app is opened OUTSIDE Telegram (native Capacitor app or plain web),
 * the user has no Telegram WebApp session to authenticate them. We show a
 * landing page with three actions:
 *
 *   1. "Sign in with Telegram"  → opens Telegram bot with /start app_login_<token>.
 *      The bot writes { token, teacher_id, school_id } into the `app_sessions`
 *      Supabase table; the app polls every 2 s and bootstraps when it finds
 *      its token. The token is then stored in localStorage so future launches
 *      auto-login.
 *
 *   2. "Register a new school"  → opens Telegram with /register_school
 *      (existing wizard in the n8n flow, no change needed).
 *
 *   3. "Join existing school"   → opens Telegram with /register_teacher
 *      (existing wizard).
 *
 * Inside Telegram (TWA) this whole screen is skipped — the user is already
 * authenticated via initData, and 14_app.js boots straight into the main UI.
 */

'use strict';

let _loginPollTimer = null;
let _loginToken     = null;
let _loginPollCount = 0;

/**
 * Decide whether the landing page should be shown.
 * Cases:
 *   • Running inside Telegram (TWA) → NO, skip to bootstrap
 *   • Have a saved session token in localStorage → NO, try silent login
 *   • Otherwise (cold native or web start) → YES, show landing
 */
window.shouldShowLanding = function () {
  if (isTWA()) return false;
  const saved = _getSavedSession();
  if (saved && saved.token && saved.telegram_id) return false;
  return true;
};

/**
 * Render the landing screen into #bootScreen (replacing the spinner).
 * Called by 14_app.js before bootstrap runs.
 */
window.renderLanding = function () {
  const boot = document.getElementById('bootScreen');
  if (!boot) return;
  boot.style.display = 'flex';
  boot.innerHTML = `
    <div class="landing-shell">
      <div class="landing-inner">

        <div class="landing-logo">
          <span class="landing-logo-mark">S</span>
          <span class="landing-logo-text">CMS</span>
        </div>

        <h1 class="landing-title">School class management,<br><em>done simply.</em></h1>
        <p class="landing-subtitle">Attendance, homework, parent updates, and your team — all in one place.</p>

        <button class="landing-btn landing-btn-primary" id="btnTgLogin" onclick="startTelegramLogin()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M9.999 15.2L9.847 18.6c.36 0 .516-.155.704-.34l1.688-1.62 3.499 2.563c.641.358 1.097.17 1.27-.594l2.299-10.78h.001c.205-.953-.345-1.326-.97-1.09L4.07 11.91c-.93.36-.916.873-.158 1.107l3.354 1.045 7.793-4.91c.367-.243.7-.108.426.135"/>
          </svg>
          <span>Sign in with Telegram</span>
        </button>

        <div class="landing-divider"><span>or get started</span></div>

        <div class="landing-secondary">
          <button class="landing-btn-ghost" onclick="openTelegramCommand('register_school')">
            <span class="landing-btn-icon">🏫</span>
            <div class="landing-btn-text">
              <div class="landing-btn-title">Register a new school</div>
              <div class="landing-btn-sub">Set up your school in Telegram</div>
            </div>
          </button>
          <button class="landing-btn-ghost" onclick="openTelegramCommand('register_teacher')">
            <span class="landing-btn-icon">👨‍🏫</span>
            <div class="landing-btn-text">
              <div class="landing-btn-title">Join an existing school</div>
              <div class="landing-btn-sub">Apply as a teacher</div>
            </div>
          </button>
        </div>

        <div class="landing-parents">
          <strong>Are you a parent?</strong>
          <p>You don't need an app. Ask your child's teacher to send you a link in Telegram — you'll receive reports there.</p>
        </div>

        <div class="landing-footer">
          v${esc(SCMS_CONFIG.VERSION)} · ${esc(window.APP.platform)}
        </div>
      </div>

      <!-- Login pending sheet (slides up after Sign-in tap) -->
      <div class="login-pending" id="loginPending" style="display:none">
        <div class="login-pending-inner">
          <div class="login-pending-spinner"><div class="spin-ring"></div></div>
          <div class="login-pending-title">Waiting for Telegram…</div>
          <div class="login-pending-sub" id="loginPendingSub">
            We've opened Telegram. Tap <b>Start</b> in the bot to sign in.
          </div>

          <button class="btn-secondary" id="btnLoginRetry" onclick="startTelegramLogin(true)">
            Open Telegram again
          </button>
          <button class="btn-ghost" onclick="cancelTelegramLogin()">Cancel</button>

          <div class="login-pending-help" id="loginPendingHelp" style="display:none">
            <details>
              <summary>Telegram didn't open?</summary>
              <p>Copy this link and open it in Telegram manually:</p>
              <code id="loginManualUrl"></code>
              <button class="btn-secondary" id="btnCopyManualUrl">📋 Copy link</button>
            </details>
          </div>
        </div>
      </div>

    </div>`;
};

/**
 * Kick off the Telegram login flow.
 *   • Generate a random token (UUID-ish)
 *   • Save it locally so we know what to poll for
 *   • Open Telegram with /start app_login_<token>
 *   • Start polling Supabase app_sessions table
 */
window.startTelegramLogin = async function (isRetry) {
  // Generate fresh token on first call; reuse on retry so the bot's earlier
  // /start lands on the same session row.
  if (!_loginToken || !isRetry) {
    _loginToken = _generateToken();
  }
  _loginPollCount = 0;

  // 1) Pre-register an empty session row in Supabase so the bot can find it
  //    by token. (If RLS prevents the anon insert, fall through — the bot
  //    creates the row itself.)
  await _preregisterSession(_loginToken).catch(() => { /* best effort */ });

  // 2) Build the deep link and open Telegram
  const url = _buildLoginUrl(_loginToken);
  _openTelegram(url);

  // 3) Show the pending sheet
  const pending = document.getElementById('loginPending');
  if (pending) pending.style.display = 'flex';
  const manualUrlEl = document.getElementById('loginManualUrl');
  if (manualUrlEl) manualUrlEl.textContent = url;
  const copyBtn = document.getElementById('btnCopyManualUrl');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard?.writeText(url);
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => { copyBtn.textContent = '📋 Copy link'; }, 1500);
    };
  }

  // 4) Begin polling
  _startLoginPolling(_loginToken);

  // 5) After 12 s, reveal the manual-copy fallback
  setTimeout(() => {
    const help = document.getElementById('loginPendingHelp');
    if (help) help.style.display = 'block';
  }, 12000);
};

/**
 * Open Telegram with a bot command (used for register flows).
 */
window.openTelegramCommand = function (cmd) {
  const bot = SCMS_CONFIG.BOT_USERNAME || 'YourSchoolBot';
  // No start param — user types the command themselves (matches existing flow)
  const url = `https://t.me/${bot}?start=${encodeURIComponent(cmd)}`;
  _openTelegram(url);
};

window.cancelTelegramLogin = function () {
  _stopLoginPolling();
  _loginToken = null;
  const pending = document.getElementById('loginPending');
  if (pending) pending.style.display = 'none';
};

/* ────────────────────────────────────────────────────────────────────────
   Internals
   ──────────────────────────────────────────────────────────────────────── */

function _generateToken() {
  // 16 random bytes → hex (32 chars). crypto if available, fallback otherwise.
  if (window.crypto?.getRandomValues) {
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }
  return (Math.random().toString(36) + Date.now().toString(36)).replace(/\./g, '');
}

function _buildLoginUrl(token) {
  const bot = SCMS_CONFIG.BOT_USERNAME || 'YourSchoolBot';
  // Backend regex in Pre-Auth must match: /^\/start\s+app_login_([a-f0-9]+)/i
  return `https://t.me/${bot}?start=app_login_${encodeURIComponent(token)}`;
}

function _openTelegram(url) {
  // On native (Capacitor) we can use the system browser to hand off to TG.
  // On web we can use window.open. tg:// scheme is the most reliable handoff
  // when Telegram is installed.
  try {
    if (window.Capacitor?.Plugins?.Browser) {
      window.Capacitor.Plugins.Browser.open({ url });
      return;
    }
  } catch (e) { /* fall through */ }

  // Try the tg:// scheme first for instant app handoff
  const tgScheme = url
    .replace('https://t.me/', 'tg://resolve?domain=')
    .replace('?start=', '&start=');
  try {
    window.location.href = tgScheme;
    // If TG isn't installed, the page won't navigate. As a fallback after
    // 800 ms open the https link in a new tab.
    setTimeout(() => { window.open(url, '_blank', 'noopener'); }, 800);
  } catch (e) {
    window.open(url, '_blank', 'noopener');
  }
}

async function _preregisterSession(token) {
  // Insert (or upsert) a placeholder row so the polling SELECT has something
  // to find. The bot will fill in telegram_id + teacher_id on its side.
  const url = `${SCMS_CONFIG.SUPABASE_URL}/rest/v1/app_sessions`;
  const resp = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SCMS_CONFIG.SUPABASE_ANON,
      'Authorization': `Bearer ${SCMS_CONFIG.SUPABASE_ANON}`,
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      token,
      status:     'pending',
      device_ua:  navigator.userAgent.slice(0, 200),
      created_at: new Date().toISOString(),
    }),
  });
  // 201 created or 200 merged is fine; 4xx means RLS blocked us — that's OK
  // because the bot will create the row itself.
  return resp.ok;
}

function _startLoginPolling(token) {
  _stopLoginPolling();
  _loginPollTimer = setInterval(async () => {
    _loginPollCount++;
    // Stop after ~5 minutes
    if (_loginPollCount > 150) {
      _stopLoginPolling();
      _setPendingSub('Timed out. Try again?');
      return;
    }
    try {
      const session = await _checkSession(token);
      if (session && session.telegram_id) {
        // ✓ Authenticated
        _stopLoginPolling();
        _saveSession(session);
        _setPendingSub('Signed in! Loading your school…');
        // Hand back to 14_app.js bootstrap
        setTimeout(() => {
          if (typeof window.bootAfterLogin === 'function') window.bootAfterLogin();
          else window.location.reload();
        }, 400);
      }
    } catch (_e) { /* keep polling */ }
  }, 2000);
}

function _stopLoginPolling() {
  if (_loginPollTimer) { clearInterval(_loginPollTimer); _loginPollTimer = null; }
}

async function _checkSession(token) {
  const url = `${SCMS_CONFIG.SUPABASE_URL}/rest/v1/app_sessions`
            + `?token=eq.${encodeURIComponent(token)}`
            + `&select=token,telegram_id,teacher_id,school_id,status,teacher_name`;
  const resp = await fetch(url, {
    headers: {
      'apikey':        SCMS_CONFIG.SUPABASE_ANON,
      'Authorization': `Bearer ${SCMS_CONFIG.SUPABASE_ANON}`,
    },
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows[0] || null;
}

function _setPendingSub(text) {
  const el = document.getElementById('loginPendingSub');
  if (el) el.textContent = text;
}

/* ────────────────────────────────────────────────────────────────────────
   Persistent session (localStorage)
   ──────────────────────────────────────────────────────────────────────── */

const _SESSION_KEY = 'scms_session_v1';

function _saveSession(session) {
  try {
    localStorage.setItem(_SESSION_KEY, JSON.stringify({
      token:        session.token,
      telegram_id:  session.telegram_id,
      teacher_id:   session.teacher_id,
      school_id:    session.school_id,
      teacher_name: session.teacher_name,
      saved_at:     Date.now(),
    }));
  } catch (e) { /* localStorage might be disabled */ }
}

function _getSavedSession() {
  try {
    const raw = localStorage.getItem(_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

window.getSavedSession = _getSavedSession;
window.clearSavedSession = function () {
  try { localStorage.removeItem(_SESSION_KEY); } catch (e) {}
};
