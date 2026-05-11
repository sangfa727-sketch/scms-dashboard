/* ============================================================
   SCMS v10 — 14_app.js
   App entry point:
     • switchPage()  — tab navigation between 9 pages
     • handleFab()   — context-aware floating action button
     • bootstrap()   — load all data from Supabase / demo
     • showSetup() / hideSetup()  — first-run config overlay
     • DOMContentLoaded handler that wires every button,
       tab, search input, settings overlay, online/offline
       events, ESC key, and Telegram BackButton.
   ============================================================ */

/* ============================================================
   PAGE SWITCHING
   ============================================================ */

/**
 * Switch to another page. Updates the visible page section,
 * highlights the active tab, calls the correct renderer, and
 * scrolls to top.
 *
 * @param {string} page  — students | attend | daily | hw |
 *                         parents | incidents | timetable |
 *                         summary | more
 */
function switchPage(page) {
  State.currentPage = page;

  /* ---------- Update visible page ---------- */
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + page)?.classList.add('active');

  /* ---------- Update tab button highlight ---------- */
  $$('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.page === page)
  );

  haptic('light');

  /* ---------- Call the page-specific renderer ---------- */
  switch (page) {
    case 'students':  renderStudents();   break;
    case 'attend':    renderAttendance(); break;
    case 'daily':     renderDaily();      break;
    case 'hw':        renderHomework();   break;
    case 'parents':   renderComms();      break;
    case 'incidents': renderIncidents();  break;
    case 'timetable': renderTimetable();  break;
    case 'summary':   renderSummary();    break;
    case 'more':      renderMore();       break;
  }

  /* ---------- Update FAB visibility & scroll to top ---------- */
  updateFab();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* ---------- Telegram BackButton: hide on root, show elsewhere ---------- */
  if (tg?.BackButton) {
    if (page === 'students') tg.BackButton.hide();
    else                     tg.BackButton.show();
  }
}

/* ============================================================
   FAB (context-aware floating action button)
   ============================================================ */

/**
 * Handle FAB tap.
 * Action depends on current page:
 *   - attend     → save attendance (commit draft)
 *   - daily      → open daily report form
 *   - hw         → open homework form
 *   - parents    → open parent message form
 *   - incidents  → open incident form
 *   - students   → open student registration form
 *   - timetable  → open add-period form
 */
function handleFab() {
  haptic('medium');
  const p = State.currentPage;

  switch (p) {
    case 'attend':    saveAttendance();                 break;
    case 'daily':     openDailyReportForm();            break;
    case 'hw':        openHomeworkForm();               break;
    case 'parents':   openParentMessageForm();          break;
    case 'incidents': openIncidentForm();               break;
    case 'students':  openStudentRegistrationForm();    break;
    case 'timetable': openTimetableForm();              break;
    default:
      showToast('Use a specific tab to add', 'error');
  }
}

/**
 * Show / hide the FAB based on the current page.
 * Hide on summary / more pages where add actions don't apply.
 */
function updateFab() {
  const fab = $('#fab');
  if (!fab) return;
  const visible = [
    'students', 'attend', 'daily', 'hw',
    'parents',  'incidents', 'timetable'
  ].includes(State.currentPage);
  fab.style.display = visible ? 'flex' : 'none';
}

/* ============================================================
   SETUP OVERLAY (first-run config)
   ============================================================ */

/**
 * Show the setup overlay with current config values pre-filled.
 */
function showSetup() {
  $('#setupUrl').value     = CONFIG.SUPABASE_URL  || '';
  $('#setupKey').value     = CONFIG.SUPABASE_ANON || '';
  $('#setupWebhook').value = CONFIG.WEBHOOK_URL   || '';
  $('#setupSchool').value  = CONFIG.SCHOOL_ID     || 'SCH001';
  $('#setupOverlay').classList.add('show');
}

/** Hide the setup overlay. */
function hideSetup() {
  $('#setupOverlay').classList.remove('show');
}

/* ============================================================
   BOOTSTRAP (load data and render)
   ============================================================ */

/**
 * Initialize Supabase client and load all data.
 * If no backend is configured (and not in DEMO mode), open setup.
 *
 * @param {boolean} force — true when user explicitly tapped Sync
 */
async function bootstrap(force = false) {
  /* ---------- First-run: open setup if unconfigured ---------- */
  if (!CONFIG.DEMO && !CONFIG.SUPABASE_URL && !window.SCMS_SUPABASE_URL) {
    showSetup();
    return;
  }

  /* ---------- Init Supabase client (idempotent) ---------- */
  initSupabase();

  showToast(force ? 'Syncing…' : 'Loading…');

  try {
    await loadAll();
    if (force) showToast('✓ Synced', 'success');
    switchPage(State.currentPage);
  } catch (e) {
    console.error('Bootstrap error:', e);
    showToast('Load failed — using demo', 'error');
    hydrateFromBootstrap({ ok: true, ...DEMO });
    switchPage(State.currentPage);
  }
}

/* ============================================================
   DOMContentLoaded — wire up the whole app
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Tab clicks ---------- */
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  /* ---------- FAB ---------- */
  $('#fab').addEventListener('click', handleFab);

  /* ---------- Header buttons ---------- */
  $('#btnRefresh').addEventListener('click',  () => bootstrap(true));
  $('#btnSettings').addEventListener('click', showSetup);

  /* ---------- Save attendance button ---------- */
  $('#btnSaveAttendance').addEventListener('click', saveAttendance);

  /* ---------- Setup overlay buttons ---------- */
  $('#setupSaveBtn').addEventListener('click', () => {
    const url = $('#setupUrl').value.trim();
    const key = $('#setupKey').value.trim();

    if (!url || !key) {
      showToast('Need URL and key', 'error');
      haptic('error');
      return;
    }

    saveConfig({
      SUPABASE_URL:  url,
      SUPABASE_ANON: key,
      WEBHOOK_URL:   $('#setupWebhook').value.trim(),
      SCHOOL_ID:     $('#setupSchool').value.trim() || 'SCH001',
      DEMO:          false
    });

    hideSetup();
    bootstrap(true);
  });

  $('#setupDemoBtn').addEventListener('click', () => {
    saveConfig({ DEMO: true });
    hideSetup();
    bootstrap(true);
  });

  /* ---------- Student search input ---------- */
  const searchInput = $('#studentSearchInput');
  searchInput.addEventListener('input', (e) => {
    State.filters.students.search = e.target.value;
    $('#studentSearch').classList.toggle('has-value', !!e.target.value);
    renderStudents();
  });

  /* ---------- Search clear button ---------- */
  $('#studentSearchClear').addEventListener('click', () => {
    searchInput.value = '';
    State.filters.students.search = '';
    $('#studentSearch').classList.remove('has-value');
    renderStudents();
    haptic('selection');
  });

  /* ---------- Header scroll shadow ---------- */
  window.addEventListener('scroll', () => {
    $('#appHeader').classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });

  /* ---------- Online / offline state ---------- */
  window.addEventListener('online',  () => document.body.classList.remove('offline'));
  window.addEventListener('offline', () => document.body.classList.add('offline'));
  if (!navigator.onLine) document.body.classList.add('offline');

  /* ---------- ESC closes any open sheet ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });

  /* ---------- Telegram BackButton handler ---------- */
  if (tg?.BackButton) {
    tg.BackButton.onClick(() => switchPage('students'));
  }

  /* ---------- Initial UI state + load ---------- */
  updateFab();
  bootstrap();
});
