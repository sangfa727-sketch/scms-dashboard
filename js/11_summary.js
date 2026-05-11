/* ============================================================
   SCMS v10 — 11_summary.js
   Monthly summary page:
     • Per-student card with avatar + name + class
     • Stats: present / absent / reports sent / HW assigned
     • Attendance percentage bar with smart color thresholds
         ≥ 90%  →  green   (excellent)
         75–90% →  amber   (warning)
         < 75%  →  red     (concerning)
   ============================================================ */

/* ============================================================
   PAGE: MONTHLY SUMMARY
   ============================================================ */

/**
 * Re-render the monthly-summary page from State.
 */
function renderSummary() {
  const f     = State.filters.summary;
  const items = State.monthlySummary;

  /* ---------- Class chips ---------- */
  const classes  = [...new Set(items.map(r => r.class).filter(Boolean))].sort();
  const chipsRow = $('#summaryClassChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All', items.length, f.class === 'ALL',
    () => { f.class = 'ALL'; renderSummary(); }
  ));

  classes.forEach(cls => {
    const cnt = items.filter(r => r.class === cls).length;
    chipsRow.appendChild(makeChip(
      cls, cls, cnt, f.class === cls,
      () => { f.class = cls; renderSummary(); }
    ));
  });

  /* ---------- Apply filter ---------- */
  let filtered = items;
  if (f.class !== 'ALL') {
    filtered = filtered.filter(r => r.class === f.class);
  }

  /* ---------- Render list ---------- */
  const list = $('#summaryList');
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No summary',
      'Monthly data will appear here once attendance is recorded.',
      '📊'
    ));
    return;
  }

  filtered.forEach(r => {
    list.appendChild(summaryCard(r));
  });
}

/* ============================================================
   SUMMARY CARD
   ============================================================ */

/**
 * Build one summary card for a student.
 */
function summaryCard(r) {
  /* ---------- Attendance % + color ---------- */
  const pct = (r.attendance_pct || 0) * 100;
  const fillClass =
    pct >= 90 ? ''     :   // green (default)
    pct >= 75 ? 'warn' :   // amber
                'bad';     // red

  /* ---------- Cross-reference with State.students to get house color ---------- */
  const student = State.students.find(s => s.student_id === r.student_id);

  return el('div', { class: 'summary-card' },

    /* ---------- Header row: avatar + name + grade ---------- */
    el('div', { class: 'student-row' },
      el('div', {
        class: 'avatar ' + houseClass(student?.house_color),
        style: 'width:36px;height:36px;font-size:14px'
      }, initials(r.name_en)),

      el('div', { class: 'info', style: 'flex:1' },
        el('div', { class: 'name' }, r.name_en || r.student_id),
        el('div', {
          style: 'font-size:11px;color:var(--ink-3);margin-top:1px'
        }, r.class || '')
      ),

      r.overall_grade
        ? el('span', { class: 'tag' }, r.overall_grade)
        : null
    ),

    /* ---------- 4-column stats ---------- */
    el('div', { class: 'summary-stats' },
      statItem(r.present_days   || 0, 'Present'),
      statItem(r.absent_days    || 0, 'Absent'),
      statItem(r.reports_sent   || 0, 'Reports'),
      statItem(r.hw_assigned    || 0, 'HW')
    ),

    /* ---------- Attendance bar ---------- */
    el('div', { class: 'attendance-bar' },
      el('div', {
        class: 'fill ' + fillClass,
        style: `width:${pct.toFixed(0)}%`
      })
    ),

    /* ---------- Bar label ---------- */
    el('div', {
      style:
        'display:flex;justify-content:space-between;' +
        'font-size:11px;color:var(--ink-3);' +
        'margin-top:6px;font-weight:500'
    },
      el('span', {}, 'Attendance'),
      el('span', { class: 'mono' }, pct.toFixed(1) + '%')
    )
  );
}

/**
 * Build a single stat item inside the 4-column grid.
 */
function statItem(num, lbl) {
  return el('div', { class: 'item' },
    el('div', { class: 'num' }, String(num)),
    el('div', { class: 'lbl' }, lbl)
  );
}
