/**
 * SCMS v11 — 01_config.js
 * Multi-tenant config: auto-detected from Telegram WebApp initData OR Capacitor app.
 *
 * Architecture:
 *   Platform A — Telegram WebApp (TWA, current)
 *     Telegram WebApp → initData (telegram_id) → n8n bootstrap webhook
 *     → rpc_bootstrap(school_id, telegram_id) → full school context
 *
 *   Platform B — Native App (Capacitor, future)
 *     Login screen → email/phone → n8n bootstrap webhook
 *     → same rpc_bootstrap → same context (telegram_id optional)
 *
 *   Both:
 *     Supabase direct (read-only, anon key) for live queries
 *     n8n TWA webhook (write operations — save_attendance, etc.)
 */

'use strict';

// ─── HARDCODED BACKEND CONSTANTS ────────────────────────────────────────────
const SCMS_CONFIG = {
  // Supabase project (read queries — students, attendance, etc.)
  SUPABASE_URL:    'https://rszgbryucqwmrdbsgwbb.supabase.co',
  SUPABASE_ANON:   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzemdicnl1Y3F3bXJkYnNnd2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjkzNjcsImV4cCI6MjA4NjQwNTM2N30.PLACEHOLDER_ANON_KEY',

  // n8n TWA webhook (all write operations)
  N8N_WEBHOOK:     'https://stailla.xyz//webhook/scms-twa',

  // n8n Bootstrap webhook (initial session resolve)
  N8N_BOOTSTRAP:   'https://stailla.xyz//webhook/scms-bootstrap',

  // Telegram bot username — used to build deep-links for parent TG ID capture
  // e.g. https://t.me/<BOT_USERNAME>?start=parent_STU-XXXXXX
  // Backend (n8n Merge Pre-State) parses regex: /^\/start\s+parent_(STU-[A-Z0-9]+)/i
  BOT_USERNAME:    'VavidaIBSbot',

  // App version
  VERSION: '11.0.0',
};

// ─── PLATFORM DETECTION ─────────────────────────────────────────────────────
// Used everywhere we need to know "are we inside Telegram (hide chat/sidebar)
// or running as native/standalone app (show full UI)?"
function _detectPlatform() {
  // 1. Capacitor / Cordova → native app
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    return 'native';
  }
  if (window.cordova) return 'native';

  // 2. Real Telegram WebApp (must have initData, not just SDK loaded)
  const tg = window.Telegram?.WebApp;
  if (tg && (tg.initData || tg.initDataUnsafe?.user)) {
    return 'twa';
  }

  // 3. Standalone PWA (added to home screen) — treat as native
  if (window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    return 'native';
  }

  // 4. Fallback — desktop browser preview
  return 'web';
}

// ─── RUNTIME STATE (populated after bootstrap) ──────────────────────────────
window.APP = {
  // Platform
  platform:     _detectPlatform(),    // 'twa' | 'native' | 'web'

  // Telegram context (TWA only)
  tg:           null,
  tgUser:       null,
  initData:     '',

  // School + teacher context (from rpc_bootstrap)
  school_id:    '',
  school_name:  '',
  teacher_id:   '',
  teacher_name: '',
  teacher_role: '',
  teacher_classes: '',
  is_admin:     false,
  config:       {},
  currentTerm:  null,

  // Local cache (from bootstrap)
  students:     [],
  attendance:   [],
  dailyReports: [],
  homework:     [],
  parentComms:  [],
  incidents:    [],
  timetable:    [],
  subjects:     [],
  terms:        [],
  monthlySummary: [],
  chatMessages: [],   // teacher-to-teacher / staff chat (native only)

  // Supabase client (for reads)
  supabase:     null,

  // Boot state
  ready:        false,
  demo:         false,

  // UI state
  sidebarOpen:  false,
  currentPage:  'students',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Is the app currently embedded inside Telegram? */
window.isTWA = function() {
  return window.APP.platform === 'twa';
};

/** Is the app running as a native app (Capacitor / standalone PWA)? */
window.isNative = function() {
  return window.APP.platform === 'native';
};

/** Post to n8n TWA webhook. Always injects school_id + teacher_id. */
async function twaPost(action, data = {}) {
  const payload = {
    action,
    school_id:  window.APP.school_id,
    teacher_id: window.APP.teacher_id,
    platform:   window.APP.platform,
    data,
  };
  const resp = await fetch(SCMS_CONFIG.N8N_WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`TWA ${action} failed ${resp.status}: ${txt}`);
  }
  return resp.json().catch(() => ({}));
}

/** Direct Supabase query (read-only, anon key). */
async function sbQuery(table, params = '') {
  const url = `${SCMS_CONFIG.SUPABASE_URL}/rest/v1/${table}?${params}`;
  const resp = await fetch(url, {
    headers: {
      'apikey':        SCMS_CONFIG.SUPABASE_ANON,
      'Authorization': `Bearer ${SCMS_CONFIG.SUPABASE_ANON}`,
    },
  });
  if (!resp.ok) throw new Error(`Supabase ${table} ${resp.status}`);
  return resp.json();
}

/** Build the parent-link deep-link for a freshly added student. */
window.buildParentLinkURL = function(studentId) {
  const bot = SCMS_CONFIG.BOT_USERNAME || 'YourSchoolBot';
  // Backend regex: /^\/start\s+parent_(STU-[A-Z0-9]+)/i
  // → must be `parent_<STU-XXX>` exactly (no "link_" prefix).
  return `https://t.me/${bot}?start=parent_${encodeURIComponent(studentId)}`;
};

// Expose globally
window.SCMS_CONFIG = SCMS_CONFIG;
window.twaPost     = twaPost;
window.sbQuery     = sbQuery;
