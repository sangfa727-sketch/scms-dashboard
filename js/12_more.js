/* ============================================================
   SCMS v10.1 — 12_more.js
   More page:
     • Quick-jump to Summary / Incidents / Parent Messages
     • Add Student form launcher
     • School Settings (NEW v10.1 — subjects/houses/grades/etc.)
     • Connection Settings (Supabase URL, anon key, webhook)
     • Sync Now (force re-fetch)
     • About sheet showing version + connection mode + current term

   NEW IN v10.1:
     • "School Settings" menu item → openSchoolSettings()
     • "Connection Settings" renamed (was "Settings")
     • About sheet shows current term + config summary
   ============================================================ */

/* ============================================================
   PAGE: MORE
   ============================================================ */

/**
 * Re-render the more page.
 * Built from a static menu list — no data dependency.
 */
function renderMore() {
  const menu = $('#moreMenu');

  /* ---------- Menu items ---------- */
  const items = [
    {
      icon:   '📊',
      title:  'Monthly Summary',
      desc:   'Attendance & performance overview',
      action: () => switchPage('summary')
    },
    {
      icon:   '⚡',
      title:  'Incidents',
      desc:   'Behavior & achievement records',
      action: () => switchPage('incidents')
    },
    {
      icon:   '💬',
      title:  'Parent Messages',
      desc:   'Communication log',
      action: () => switchPage('parents')
    },
    {
      icon:   '➕',
      title:  'Add Student',
      desc:   'Register a new student',
      action: () => openStudentRegistrationForm()
    },
    /* NEW v10.1: School Settings (subjects/houses/grades/etc.) */
    {
      icon:   '🏫',
      title:  'School Settings',
      desc:   'Subjects, houses, grades, schedule…',
      action: () => openSchoolSettings()
    },
    {
      icon:   '🔄',
      title:  'Sync Now',
      desc:   'Refresh data from Supabase',
      action: () => bootstrap(true)
    },
    {
      icon:   '🔌',
      title:  'Connection Settings',
      desc:   'Supabase URL & webhook config',
      action: () => showSetup()
    },
    {
      icon:   'ℹ️',
      title:  'About',
      desc:   `SCMS v${CONFIG.VERSION}`,
      action: () => showAbout()
    }
  ];

  /* ---------- Render menu (reuses student-card styling) ---------- */
  menu.innerHTML = '';

  items.forEach(it => {
    menu.appendChild(el('div', {
      class:   'student-card',
      onclick: () => { haptic('selection'); it.action(); }
    },
      el('div', {
        class: 'avatar',
        style: 'background:var(--line-2);color:var(--ink-2);font-size:20px'
      }, it.icon),

      el('div', { class: 'info' },
        el('div', { class: 'name' },    it.title),
        el('div', { class: 'name-mm' }, it.desc)
      )
    ));
  });
}

/* ============================================================
   ABOUT SHEET
   ============================================================ */

/**
 * Show the About bottom sheet with app metadata.
 * v10.1: now includes current term, subject count, config summary.
 */
function showAbout() {
  /* Compute connection mode label */
  const mode =
    CONFIG.DEMO          ? 'Demo'         :
    CONFIG.SUPABASE_URL  ? 'Live'         :
                           'Unconfigured';

  const term = State.currentTerm;
  const termLabel = term
    ? `${term.term_name} · ${formatDate(term.start_date)} → ${formatDate(term.end_date)}`
    : null;

  const body = el('div', {},

    /* ---------- Description ---------- */
    el('p', {
      style: 'color:var(--ink-2);font-size:14px;line-height:1.6'
    },
      'School Class Management System. Telegram Mini App connected to ' +
      'Supabase (database) and n8n (bot orchestration + AI smart chat). ' +
      'Built for international school teachers.'
    ),

    /* ---------- Metadata grid ---------- */
    el('div', { class: 'detail-grid' },

      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Version'),
        el('div', { class: 'value mono' }, CONFIG.VERSION)
      ),

      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Mode'),
        el('div', { class: 'value' }, mode)
      ),

      el('div', { class: 'detail-item full' },
        el('div', { class: 'label' }, 'School'),
        el('div', { class: 'value' }, State.schoolConfig.school_name || '—')
      ),

      el('div', { class: 'detail-item full' },
        el('div', { class: 'label' }, 'School ID'),
        el('div', { class: 'value mono' }, CONFIG.SCHOOL_ID)
      ),

      State.user.name
        ? el('div', { class: 'detail-item' },
            el('div', { class: 'label' }, 'Teacher'),
            el('div', { class: 'value' }, State.user.name)
          )
        : null,

      State.user.id
        ? el('div', { class: 'detail-item' },
            el('div', { class: 'label' }, 'Teacher ID'),
            el('div', { class: 'value mono' }, State.user.id)
          )
        : null,

      State.schoolConfig.academic_year
        ? el('div', { class: 'detail-item full' },
            el('div', { class: 'label' }, 'Academic Year'),
            el('div', { class: 'value' }, State.schoolConfig.academic_year)
          )
        : null,

      /* NEW v10.1: current term */
      termLabel
        ? el('div', { class: 'detail-item full' },
            el('div', { class: 'label' }, 'Current Term'),
            el('div', { class: 'value' }, termLabel)
          )
        : null
    ),

    /* ---------- Statistics ---------- */
    el('div', { class: 'detail-grid', style: 'margin-top:16px' },
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Students'),
        el('div', { class: 'value mono' }, String(State.students.length))
      ),
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Classes'),
        el('div', { class: 'value mono' }, String(getClasses().length))
      ),
      /* NEW v10.1 */
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Subjects'),
        el('div', { class: 'value mono' }, String(getSubjects().length))
      ),
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Houses'),
        el('div', { class: 'value mono' }, String(getHouses().length))
      )
    ),

    /* NEW v10.1: locale info */
    el('div', { class: 'detail-grid', style: 'margin-top:8px' },
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Language'),
        el('div', { class: 'value' }, getConfigValue('local_language', 'English'))
      ),
      el('div', { class: 'detail-item' },
        el('div', { class: 'label' }, 'Week Start'),
        el('div', { class: 'value' }, getConfigValue('week_start', 'Monday'))
      )
    ),

    /* ---------- Tech credits ---------- */
    el('p', {
      style:
        'color:var(--ink-3);font-size:11px;text-align:center;' +
        'margin-top:24px;line-height:1.6'
    },
      'Powered by Telegram WebApp + Supabase + n8n + OpenAI'
    )
  );

  openSheet('About SCMS', body);
}
