/* ============================================================
   SCMS v10 — 04_students.js
   Students page: filterable list grouped by class, search,
   class chips with counts, and a detail bottom-sheet with
   quick-action buttons (Daily Report / Attendance / Message / Incident).
   ============================================================ */

/* ============================================================
   PAGE: STUDENTS
   ============================================================ */

/**
 * Re-render the students page from State.
 * Called by switchPage('students') and after data changes.
 */
function renderStudents() {
  const { students } = State;
  const f = State.filters.students;

  /* ---------- Subtitle ---------- */
  $('#studentsSubtitle').textContent = students.length
    ? `${students.length} students • Tap any card for details.`
    : 'No students loaded.';

  /* ---------- Stat cards ---------- */
  const classes = getClasses();
  const houses  = students.filter(s => s.house_color).length;

  const stats = $('#studentStats');
  stats.innerHTML = '';
  stats.append(
    statCard(students.length, 'Students', true),
    statCard(classes.length,  'Classes'),
    statCard(houses,          'Housed')
  );

  /* ---------- Class chips ---------- */
  const chipsRow = $('#classChips');
  chipsRow.innerHTML = '';

  const counts = {};
  students.forEach(s => {
    counts[s.class] = (counts[s.class] || 0) + 1;
  });

  chipsRow.appendChild(
    makeChip('ALL', 'All', students.length, f.class === 'ALL', () => {
      f.class = 'ALL';
      renderStudents();
    })
  );
  classes.forEach(cls => {
    chipsRow.appendChild(
      makeChip(cls, cls, counts[cls], f.class === cls, () => {
        f.class = cls;
        renderStudents();
      })
    );
  });

  /* ---------- Apply filters ---------- */
  let filtered = students;
  if (f.class !== 'ALL') {
    filtered = filtered.filter(s => s.class === f.class);
  }
  if (f.search) {
    const q = f.search.toLowerCase().trim();
    filtered = filtered.filter(s =>
      String(s.name_en    || '').toLowerCase().includes(q) ||
      String(s.name_mm    || '').toLowerCase().includes(q) ||
      String(s.class      || '').toLowerCase().includes(q) ||
      String(s.student_id || '').toLowerCase().includes(q)
    );
  }

  /* ---------- Render list ---------- */
  const list = $('#studentList');
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No students found',
      'Try a different filter or search term.',
      '👀'
    ));
    return;
  }

  // Group by class within the filtered set
  const grouped = {};
  filtered.forEach(s => {
    const k = s.class || 'Unassigned';
    (grouped[k] ||= []).push(s);
  });

  Object.keys(grouped).sort().forEach(cls => {
    list.appendChild(el('div', { class: 'group-header' },
      el('div', { class: 'group-title' },
        el('div', { class: 'swatch' }),
        cls
      ),
      el('div', { class: 'group-count' }, String(grouped[cls].length))
    ));

    const cardWrap = el('div', { class: 'student-list' });
    grouped[cls].forEach(s => cardWrap.appendChild(studentCard(s)));
    list.appendChild(cardWrap);
  });
}

/* ============================================================
   STUDENT CARD
   ============================================================ */

/**
 * Build a single student card.
 * Tapping it opens the detail sheet.
 */
function studentCard(s) {
  return el('div', {
    class: 'student-card',
    onclick: () => openStudentDetail(s)
  },
    el('div', { class: 'avatar ' + houseClass(s.house_color) },
      initials(s.name_en || s.name_mm)
    ),
    el('div', { class: 'info' },
      el('div', { class: 'name' }, s.name_en || s.name_mm || 'Unnamed'),
      el('div', { class: 'name-mm' },
        s.name_mm && s.name_en ? s.name_mm : (s.student_id || '')
      )
    ),
    el('div', { class: 'badges' },
      el('span', { class: 'tag' }, s.class || '—')
    )
  );
}

/* ============================================================
   STUDENT DETAIL SHEET
   ============================================================ */

/**
 * Open a bottom sheet showing the student's profile and
 * quick-action buttons for Daily / Attendance / Message / Incident.
 */
function openStudentDetail(s) {
  const body = el('div', {});

  /* ---------- Hero (avatar + name + tags) ---------- */
  body.appendChild(el('div', { class: 'detail-hero' },
    el('div', { class: 'avatar ' + houseClass(s.house_color) },
      initials(s.name_en || s.name_mm)
    ),
    el('div', { class: 'info' },
      el('div', { class: 'name-en' }, s.name_en || 'Unnamed'),
      s.name_mm ? el('div', { class: 'name-mm' }, s.name_mm) : null,
      el('div', { class: 'meta-tags' },
        el('span', { class: 'tag' }, s.class || '—'),
        s.grade        ? el('span', { class: 'tag gray' }, s.grade)       : null,
        s.gender       ? el('span', { class: 'tag gray' }, s.gender)      : null,
        s.house_color  ? el('span', { class: 'tag gray' }, s.house_color) : null
      )
    )
  ));

  /* ---------- Info grid ---------- */
  const grid = el('div', { class: 'detail-grid' });

  const items = [
    { label: 'Student ID',     value: s.student_id,                  mono: true        },
    { label: 'Date of Birth',  value: formatDate(s.date_of_birth)                      },
    { label: 'Enrolled',       value: formatDate(s.enrollment_date)                    },
    { label: 'Status',         value: s.status || '—'                                  },
    { label: 'Parent',         value: s.parent_name,                                 full: true },
    { label: 'Phone',          value: s.parent_phone                                   },
    { label: 'Phone 2',        value: s.parent_phone2 || '—'                           },
    { label: 'Email',          value: s.parent_email  || '—',                       full: true },
    { label: 'Parent TG ID',   value: s.parent_tg_id  || '—',          mono: true, full: true }
  ];

  items.forEach(it => {
    if (it.value == null || it.value === '') return;
    grid.appendChild(el('div', { class: 'detail-item' + (it.full ? ' full' : '') },
      el('div', { class: 'label' }, it.label),
      el('div', { class: 'value' + (it.mono ? ' mono' : '') }, String(it.value))
    ));
  });
  body.appendChild(grid);

  /* ---------- Action buttons ---------- */
  body.appendChild(el('div', { class: 'action-row' },
    actionBtn('Daily Report', icon('clipboard'), () => {
      closeSheet();
      openDailyReportForm(s);
    }),
    actionBtn('Mark Attendance', icon('check'), () => {
      closeSheet();
      State.filters.attendClass = s.class;
      switchPage('attend');
    }),
    actionBtn('Send Parent', icon('msg'), () => {
      closeSheet();
      openParentMessageForm(s);
    }),
    actionBtn('Add Incident', icon('alert'), () => {
      closeSheet();
      openIncidentForm(s);
    })
  ));

  openSheet(s.name_en || 'Student', body);
}
