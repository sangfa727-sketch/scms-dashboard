/**
 * SCMS v10.2 — 01_config.js
 * Multi-tenant config: auto-detected from Telegram WebApp initData.
 * NO manual URL/key setup needed. All context comes from n8n bootstrap RPC.
 *
 * Architecture:
 *   Telegram WebApp → initData (telegram_id) → n8n bootstrap webhook
 *   → rpc_bootstrap(school_id, telegram_id) → full school context
 *   → Supabase direct (read-only, anon key) for live queries
 *   → n8n TWA webhook (write operations — save_attendance, etc.)
 */

'use strict';

// ─── HARDCODED BACKEND CONSTANTS ────────────────────────────────────────────
// These never change per deployment — school context auto-resolves from TG ID
const SCMS_CONFIG = {
  // Supabase project (read queries — students, attendance, etc.)
  SUPABASE_URL:    'https://rszgbryucqwmrdbsgwbb.supabase.co',
  SUPABASE_ANON:   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzemdicnl1Y3F3bXJkYnNnd2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjkzNjcsImV4cCI6MjA4NjQwNTM2N30.PLACEHOLDER_ANON_KEY',





   // n8n Main webhook// n8n TWA webhook (all write operations)
N8N_WEBHOOK:   'https://stailla.xyz/webhook/scms-twa',

// n8n Bootstrap webhook // n8n Bootstrap webhook (initial session resolve)
N8N_BOOTSTRAP: 'https://stailla.xyz/webhook/scms-bootstrap',

  // App version
  VERSION: '10.2.0',
};

// ─── RUNTIME STATE (populated after bootstrap) ──────────────────────────────
window.APP = {
  // Telegram context
  tg:           null,    // Telegram.WebApp instance
  tgUser:       null,    // { id, first_name, last_name, username }
  initData:     '',      // raw initData string for auth

  // School + teacher context (from rpc_bootstrap)
  school_id:    '',
  school_name:  '',
  teacher_id:   '',
  teacher_name: '',
  teacher_role: '',
  teacher_classes: '',
  is_admin:     false,
  config:       {},      // school config (attendance_codes, subjects, etc.)
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

  // Supabase client (for reads)
  supabase:     null,

  // Boot state
  ready:        false,
  demo:         false,   // demo mode if no TG context
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Post to n8n TWA webhook. Always injects school_id + teacher_id. */
async function twaPost(action, data = {}) {
  const payload = {
    action,
    school_id:  window.APP.school_id,
    teacher_id: window.APP.teacher_id,
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

// Expose globally
window.SCMS_CONFIG = SCMS_CONFIG;
window.twaPost     = twaPost;
window.sbQuery     = sbQuery;
