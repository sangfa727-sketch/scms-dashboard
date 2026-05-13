/**
 * SCMS v10.2 — 14_app.js
 * Main application entry point.
 *
 * Boot sequence:
 *   1. Telegram.WebApp.ready() + expand
 *   2. Extract initData / telegram_id
 *   3. POST to n8n bootstrap webhook → rpc_bootstrap
 *   4. Populate APP context from response
 *   5. Init Supabase client (anon, read-only)
 *   6. Render all modules
 *   7. Hide boot screen, show app
 */

'use strict';

(async function initApp() {
  const bootStatus = document.getElementById('bootStatus');
  const bootSub    = document.getElementById('bootSub');
  const bootScreen = document.getElementById('bootScreen');
  const errorScreen = document.getElementById('errorScreen');

  function setStatus(msg, sub) {
    if (bootStatus) bootStatus.textContent = msg;
    if (sub && bootSub) bootSub.textContent = sub;
  }

  function showError(title, msg) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMsg').textContent = msg;
    if (bootScreen) bootScreen.style.display = 'none';
    if (errorScreen) errorScreen.style.display = 'flex';
  }

  try {
    // ── Step 1: Telegram WebApp init ─────────────────────────────────────
    setStatus('Opening Telegram…', 'School Class Management System');

    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      window.APP.tg       = tg;
      window.APP.initData = tg.initData || '';
      window.APP.tgUser   = tg.initDataUnsafe?.user || null;

      // Apply Telegram theme colors
      if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      if (tg.themeParams?.bg_color) {
        document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color);
      }
    }

    const tgUser = window.APP.tgUser;
    const telegram_id = tgUser ? String(tgUser.id) : null;

    // ── Step 2: Bootstrap via n8n ────────────────────────────────────────
    setStatus('Authenticating…', telegram_id ? `User: ${tgUser.first_name}` : 'Loading…');

    let bootstrapData = null;

    if (telegram_id && SCMS_CONFIG.N8N_BOOTSTRAP && !SCMS_CONFIG.N8N_BOOTSTRAP.includes('your-n8n')) {
      try {
        bootstrapData = await API.bootstrap(telegram_id);
      } catch (e) {
        console.warn('Bootstrap failed, trying demo mode:', e);
      }
    }

    if (!bootstrapData && !telegram_id) {
      // No Telegram context at all — likely opened in browser directly
      console.warn('No Telegram context. Running in preview mode.');
      bootstrapData = _demoBootstrap();
      window.APP.demo = true;
    } else if (!bootstrapData) {
      // Has telegram_id but bootstrap failed
      showError('Connection failed', 'Could not reach SCMS server. Please try again.');
      return;
    }

    if (!bootstrapData.ok) {
      showError('Authentication failed', bootstrapData.error || 'Your account is not registered in this school.');
      return;
    }

    // ── Step 3: Populate APP context ─────────────────────────────────────
    setStatus('Loading school data…', bootstrapData.schoolConfig?.school_name || '');

    const sc = bootstrapData.schoolConfig || {};
    const u  = bootstrapData.user || {};

    window.APP.school_id      = sc.school_id || '';
    window.APP.school_name    = sc.school_name || 'SCMS';
    window.APP.teacher_id     = u.teacher_id || '';
    window.APP.teacher_name   = u.teacher_name || tgUser?.first_name || '';
    window.APP.teacher_role   = u.role || '';
    window.APP.teacher_classes = u.classes || '';
    window.APP.is_admin       = ['Admin', 'Principal', 'HT'].includes(u.role);
    window.APP.config         = bootstrapData.config || {};
    window.APP.currentTerm    = bootstrapData.currentTerm || null;

    // Cache data from bootstrap (30 days window)
    window.APP.students       = bootstrapData.students       || [];
    window.APP.attendance     = bootstrapData.attendance     || [];
    window.APP.dailyReports   = bootstrapData.dailyReports   || [];
    window.APP.homework       = bootstrapData.homework       || [];
    window.APP.parentComms    = bootstrapData.parentComms    || [];
    window.APP.incidents      = bootstrapData.incidents      || [];
    window.APP.timetable      = bootstrapData.timetable      || [];
    window.APP.subjects       = bootstrapData.subjects       || [];
    window.APP.terms          = bootstrapData.terms          || [];
    window.APP.monthlySummary = bootstrapData.monthlySummary || [];

    window.APP.ready = true;

    // ── Step 4: Init Supabase client ─────────────────────────────────────
    if (window.supabase && SCMS_CONFIG.SUPABASE_URL && SCMS_CONFIG.SUPABASE_ANON &&
        !SCMS_CONFIG.SUPABASE_ANON.includes('PLACEHOLDER')) {
      window.APP.supabase = window.supabase.createClient(
        SCMS_CONFIG.SUPABASE_URL,
        SCMS_CONFIG.SUPABASE_ANON
      );
    }

    // ── Step 5: Update header UI ─────────────────────────────────────────
    document.getElementById('schoolName').textContent = window.APP.school_name;
    document.getElementById('userName').textContent   = window.APP.teacher_name;
    document.getElementById('userRole').textContent   = window.APP.teacher_role || '—';
    document.getElementById('connDot').classList.add('online');

    // ── Step 6: Render modules ───────────────────────────────────────────
    setStatus('Building dashboard…', '');

    if (typeof renderStudents  === 'function') renderStudents();
    if (typeof renderAttendance === 'function') renderAttendance();
    if (typeof renderDaily     === 'function') renderDaily();
    if (typeof renderHomework  === 'function') renderHomework();
    if (typeof renderComms     === 'function') renderComms();
    if (typeof renderIncidents === 'function') renderIncidents();
    if (typeof renderTimetable === 'function') renderTimetable();
    if (typeof renderSummary   === 'function') renderSummary();
    if (typeof renderMore      === 'function') renderMore();

    // Tab bar navigation
    _initTabBar();

    // FAB
    _initFab();

    // Refresh button
    document.getElementById('btnRefresh').addEventListener('click', async () => {
      showToast('Refreshing…');
      try {
        await API.refreshAll();
        if (typeof renderStudents  === 'function') renderStudents();
        if (typeof renderAttendance === 'function') renderAttendance();
        if (typeof renderDaily     === 'function') renderDaily();
        if (typeof renderHomework  === 'function') renderHomework();
        showToast('✓ Data updated');
      } catch (e) {
        showToast('Refresh failed — check connection');
      }
    });

    // ── Step 7: Hide boot screen ─────────────────────────────────────────
    setTimeout(() => {
      if (bootScreen) {
        bootScreen.classList.add('fade-out');
        setTimeout(() => { bootScreen.style.display = 'none'; }, 350);
      }
    }, 400);

    // Online/offline detection
    window.addEventListener('online',  () => {
      document.getElementById('offlineBanner').style.display = 'none';
      document.getElementById('connDot').classList.add('online');
    });
    window.addEventListener('offline', () => {
      document.getElementById('offlineBanner').style.display = 'flex';
      document.getElementById('connDot').classList.remove('online');
    });

    if (!navigator.onLine) {
      document.getElementById('offlineBanner').style.display = 'flex';
    }

  } catch (err) {
    console.error('App init error:', err);
    showError('Startup error', err.message || 'Unknown error. Please reload.');
  }
})();

// ─── TAB BAR ────────────────────────────────────────────────────────────────

function _initTabBar() {
  const tabs  = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.page');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.page;
      tabs.forEach(t => t.classList.remove('active'));
      pages.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pg = document.getElementById(`page-${target}`);
      if (pg) pg.classList.add('active');

      // Haptic feedback
      if (window.APP.tg?.HapticFeedback) {
        window.APP.tg.HapticFeedback.selectionChanged();
      }
    });
  });
}

// ─── FAB (Floating Action Button) ───────────────────────────────────────────

function _initFab() {
  const fab = document.getElementById('fab');
  if (!fab) return;

  fab.addEventListener('click', () => {
    // Determine context from active page
    const activePage = document.querySelector('.page.active');
    const pageId = activePage?.id?.replace('page-', '') || 'students';

    const actions = {
      students:   () => typeof openAddStudentModal  === 'function' && openAddStudentModal(),
      attend:     () => showToast('Use the attendance grid below ↓'),
      daily:      () => typeof openDailyReportModal === 'function' && openDailyReportModal(),
      hw:         () => typeof openHomeworkModal    === 'function' && openHomeworkModal(),
      incidents:  () => typeof openIncidentModal    === 'function' && openIncidentModal(),
      parents:    () => typeof openParentCommModal  === 'function' && openParentCommModal(),
      timetable:  () => showToast('Timetable managed by admin'),
      summary:    () => showToast('Summary auto-generated monthly'),
      more:       () => {},
    };

    const action = actions[pageId];
    if (action) action();
    else showToast('Tap + to add a new entry');

    if (window.APP.tg?.HapticFeedback) {
      window.APP.tg.HapticFeedback.impactOccurred('light');
    }
  });
}

// ─── DEMO BOOTSTRAP (browser preview without Telegram) ──────────────────────

function _demoBootstrap() {
  return {
    ok: true,
    schoolConfig: {
      school_id:    'SCH-DEMO',
      school_name:  'Demo International School',
      country:      'Myanmar',
      timezone:     'Asia/Yangon',
    },
    config: {
      subjects:         ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Music', 'PE'],
      attendance_codes: [
        { code: 'P', label: 'Present', color: '#10B981' },
        { code: 'A', label: 'Absent',  color: '#EF4444' },
        { code: 'L', label: 'Leave',   color: '#3B82F6' },
        { code: 'T', label: 'Tardy',   color: '#F59E0B' },
        { code: 'S', label: 'Sick',    color: '#EF4444' },
      ],
      incident_types:   ['Good Behaviour', 'Participation', 'Achievement', 'Concern', 'Health', 'Other'],
      severities:       ['Info', 'Low', 'Medium', 'High'],
      grades:           ['KG', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    },
    currentTerm: { term_name: 'Term 1 2024-25', start_date: '2024-09-01', end_date: '2024-12-20', is_current: true },
    user: {
      teacher_id:   'T-DEMO',
      teacher_name: 'Demo Teacher',
      role:         'Teacher',
      classes:      'P3,P4',
      status:       'active',
    },
    students: [
      { student_id: 'STU-DEMO-0001', name_en: 'Alice Chen',   class: 'P3', gender: 'F', status: 'Active', parent_tg_id: '' },
      { student_id: 'STU-DEMO-0002', name_en: 'Bob Tan',      class: 'P3', gender: 'M', status: 'Active', parent_tg_id: '' },
      { student_id: 'STU-DEMO-0003', name_en: 'Clara Myint',  class: 'P4', gender: 'F', status: 'Active', parent_tg_id: '' },
      { student_id: 'STU-DEMO-0004', name_en: 'David Lwin',   class: 'P4', gender: 'M', status: 'Active', parent_tg_id: '' },
    ],
    attendance:     [],
    dailyReports:   [],
    homework:       [],
    parentComms:    [],
    incidents:      [],
    timetable:      [],
    subjects:       [],
    terms:          [],
    monthlySummary: [],
  };
}

// ─── GLOBAL TOAST ────────────────────────────────────────────────────────────

window.showToast = function(msg, duration = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), duration);
};

// ─── GLOBAL MODAL HELPERS ────────────────────────────────────────────────────

window.openModal = function(html, onClose) {
  const overlay = document.getElementById('modalOverlay');
  overlay.innerHTML = html;
  overlay.classList.add('active');
  overlay.onclick = function(e) {
    if (e.target === overlay) closeModal(onClose);
  };
};

window.closeModal = function(onClose) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('active');
  overlay.innerHTML = '';
  if (typeof onClose === 'function') onClose();
};

// ─── SKELETON LOADING HELPER ─────────────────────────────────────────────────

window.skeletonCards = function(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-line w60"></div>
      <div class="skeleton-line w40"></div>
      <div class="skeleton-line w80"></div>
    </div>
  `).join('');
};

// ─── EMPTY STATE HELPER ──────────────────────────────────────────────────────

window.emptyState = function(icon, title, subtitle = '') {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      ${subtitle ? `<div class="empty-sub">${subtitle}</div>` : ''}
    </div>
  `;
};
