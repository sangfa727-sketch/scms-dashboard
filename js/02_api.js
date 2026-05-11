/* ============================================================
   SCMS v10 — 02_api.js
   Supabase client init, read path (RPC bootstrap or fallback),
   write path (n8n webhook or direct Supabase fallback),
   and data hydration into State.

   Architecture: HYBRID
     • READ  = direct Supabase (fast, simple)
     • WRITE = n8n webhook (triggers AI polish, parent notify,
               and shared backend with the Telegram bot)
     • FALLBACK = direct Supabase write if webhook unreachable
   ============================================================ */

/* ---------- SUPABASE CLIENT ---------- */
let supa = null;

function initSupabase() {
  if (CONFIG.DEMO) return null;
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON) return null;
  if (!window.supabase?.createClient) {
    console.warn('Supabase JS not loaded');
    return null;
  }
  try {
    supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON, {
      auth:   { persistSession: false },
      global: { headers: { 'x-scms-app': 'twa-v10' } }
    });
    return supa;
  } catch (e) {
    console.error('Supabase init failed:', e);
    return null;
  }
}

/* ============================================================
   READ PATH — load everything for the school
   ============================================================ */

/**
 * Primary read: calls `rpc_bootstrap` which returns one JSON blob
 * with school config + students + 30-day attendance/daily/homework/
 * incidents/parent_comms/timetable/monthly_summary.
 *
 * Falls back to per-table reads if the RPC isn't available.
 */
async function loadAll() {
  if (CONFIG.DEMO || !supa) {
    return hydrateFromBootstrap({ ok: true, ...DEMO });
  }
  try {
    const { data, error } = await supa.rpc('rpc_bootstrap', {
      p_school_id:   CONFIG.SCHOOL_ID,
      p_telegram_id: State.user.tg_id ? String(State.user.tg_id) : null
    });
    if (error) throw error;
    setConn(true);
    return hydrateFromBootstrap(data);
  } catch (e) {
    console.warn('RPC bootstrap failed, falling back to per-table reads:', e);
    return loadAllFallback();
  }
}

/**
 * Fallback read path — parallel SELECT per table.
 * Used if the RPC isn't created yet or returns an error.
 */
async function loadAllFallback() {
  if (!supa) {
    setConn(false);
    showToast('No backend — using demo data', 'error');
    return hydrateFromBootstrap({ ok: true, ...DEMO });
  }
  try {
    const sid   = CONFIG.SCHOOL_ID;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const fetches = await Promise.all([
      supa.from('schools')         .select('*').eq('school_id', sid).maybeSingle(),
      supa.from('students')        .select('*').eq('school_id', sid).eq('status', 'Active').order('class').order('name_en'),
      supa.from('attendance')      .select('*').eq('school_id', sid).gte('date', since).order('date', { ascending: false }),
      supa.from('daily_reports')   .select('*').eq('school_id', sid).gte('date', since).order('date', { ascending: false }),
      supa.from('homework_log')    .select('*').eq('school_id', sid).gte('date', since).order('date', { ascending: false }),
      supa.from('parent_comms')    .select('*').eq('school_id', sid).gte('date', since).order('date', { ascending: false }),
      supa.from('incidents')       .select('*').eq('school_id', sid).gte('date', since).order('date', { ascending: false }),
      supa.from('timetable')       .select('*').eq('school_id', sid).order('day').order('period'),
      supa.from('monthly_summary') .select('*').eq('school_id', sid).order('class').order('name_en')
    ]);

    const [school, st, at, dr, hw, pc, inc, tt, ms] = fetches;
    setConn(true);

    return hydrateFromBootstrap({
      ok:             true,
      schoolConfig:   school.data || {},
      user:           null,
      students:       st.data  || [],
      attendance:     at.data  || [],
      dailyReports:   dr.data  || [],
      homework:       hw.data  || [],
      parentComms:    pc.data  || [],
      incidents:      inc.data || [],
      timetable:      tt.data  || [],
      monthlySummary: ms.data  || []
    });
  } catch (e) {
    console.error('Fallback fetch failed:', e);
    setConn(false);
    showToast('Connection failed — using cached/demo', 'error');
    return hydrateFromBootstrap({ ok: true, ...DEMO });
  }
}

/* ============================================================
   WRITE PATH — actions go through n8n webhook by default
   so the bot + TWA share AI processing & parent notifications.
   ============================================================ */

/**
 * Primary write: POST to n8n webhook with action + payload.
 *
 * Supported actions:
 *   save_attendance    { records: [{date, student_id, name_en, class, status, note}] }
 *   save_daily_report  { data: {...} }
 *   save_homework      { data: {...} }
 *   save_incident      { data: {...} }
 *   send_parent_comm   { data: {...} }
 *   register_student   { data: {...} }
 */
async function writeAction(action, payload) {
  if (CONFIG.DEMO) {
    await new Promise(r => setTimeout(r, 250));
    return { ok: true, demo: true };
  }

  if (CONFIG.WEBHOOK_URL) {
    try {
      const res = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          school_id:    CONFIG.SCHOOL_ID,
          teacher_id:   State.user.id || 'T001',
          tg_init_data: tg?.initData || '',
          version:      CONFIG.VERSION,
          ...payload
        })
      });
      if (!res.ok) throw new Error('webhook ' + res.status);
      return await res.json();
    } catch (e) {
      console.warn('Webhook write failed, falling back to direct Supabase:', e);
      return writeFallback(action, payload);
    }
  }

  // No webhook configured → write direct (skips bot-side AI/parent notify)
  return writeFallback(action, payload);
}

/**
 * Fallback write: direct Supabase upserts.
 * Used when n8n webhook is unreachable or not configured.
 * Note: this skips AI polish and bot-side parent notifications.
 */
async function writeFallback(action, payload) {
  if (!supa) return { ok: false, error: 'no backend' };

  try {
    /* ---------- SAVE ATTENDANCE (batch upsert) ---------- */
    if (action === 'save_attendance') {
      const records = (payload.records || []).map(r => ({
        ...r,
        school_id: CONFIG.SCHOOL_ID
      }));
      const { error } = await supa
        .from('attendance')
        .upsert(records, { onConflict: 'date,student_id' });
      if (error) throw error;
      return { ok: true, saved: records.length };
    }

    /* ---------- SAVE DAILY REPORT ---------- */
    if (action === 'save_daily_report') {
      const { error } = await supa
        .from('daily_reports')
        .insert({ ...payload.data, school_id: CONFIG.SCHOOL_ID });
      if (error) throw error;
      return { ok: true };
    }

    /* ---------- SAVE HOMEWORK ---------- */
    if (action === 'save_homework') {
      const data = { ...payload.data, school_id: CONFIG.SCHOOL_ID };
      if (!data.due_date) delete data.due_date;          // null date would fail
      const { error } = await supa.from('homework_log').insert(data);
      if (error) throw error;
      return { ok: true };
    }

    /* ---------- SAVE INCIDENT ---------- */
    if (action === 'save_incident') {
      const { error } = await supa
        .from('incidents')
        .insert({ ...payload.data, school_id: CONFIG.SCHOOL_ID });
      if (error) throw error;
      return { ok: true };
    }

    /* ---------- SEND PARENT COMM (logs only; bot would actually deliver) ---------- */
    if (action === 'send_parent_comm') {
      const { error } = await supa
        .from('parent_comms')
        .insert({
          ...payload.data,
          school_id: CONFIG.SCHOOL_ID,
          status:    'Queued'
        });
      if (error) throw error;
      return { ok: true };
    }

    /* ---------- REGISTER STUDENT ---------- */
    if (action === 'register_student') {
      const sid = 'S' + Date.now() + Math.floor(Math.random() * 1000);
      const data = {
        ...payload.data,
        student_id: sid,
        school_id:  CONFIG.SCHOOL_ID,
        status:     'Active'
      };
      // strip optional empty date fields to avoid validation errors
      if (!data.date_of_birth)   delete data.date_of_birth;
      if (!data.enrollment_date) data.enrollment_date = todayISO();

      const { error } = await supa.from('students').insert(data);
      if (error) throw error;
      return { ok: true, student_id: sid };
    }

    return { ok: false, error: 'unknown action: ' + action };

  } catch (e) {
    console.error('writeFallback error:', e);
    return { ok: false, error: String(e.message || e) };
  }
}

/* ============================================================
   DATA HYDRATION
   ============================================================ */

/**
 * Hydrate State from a bootstrap blob.
 * Updates header UI with school name / user name / role.
 */
function hydrateFromBootstrap(data) {
  State.students       = data.students       || [];
  State.attendance     = data.attendance     || [];
  State.dailyReports   = data.dailyReports   || [];
  State.homework       = data.homework       || [];
  State.parentComms    = data.parentComms    || [];
  State.incidents      = data.incidents      || [];
  State.timetable      = data.timetable      || [];
  State.monthlySummary = data.monthlySummary || [];
  State.schoolConfig   = data.schoolConfig   || {};

  // Resolve user info (from RPC response if present, else Telegram WebApp)
  if (data.user) {
    State.user.id   = data.user.teacher_id   || data.user.id   || 'T001';
    State.user.name = data.user.teacher_name || data.user.name || 'Teacher';
    State.user.role = data.user.role || 'AT';
  }

  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    State.user.tg_id = u.id;
    if (!State.user.name || State.user.name === 'Teacher') {
      State.user.name = u.first_name + (u.last_name ? ' ' + u.last_name : '');
    }
  }

  // Reflect in header
  const sn = document.getElementById('schoolName');
  const un = document.getElementById('userName');
  const ur = document.getElementById('userRole');
  if (sn) sn.textContent = State.schoolConfig.school_name || 'School Class Management';
  if (un) un.textContent = State.user.name || 'Teacher';
  if (ur) ur.textContent = State.user.role || 'AT';

  return data;
}
