/* ============================================================
   SCMS v10 — 06_daily.js
   Daily reports page:
     • Filterable list grouped/sorted by date
     • Entry cards showing mood / meal / nap / teacher note
     • Form sheet with 8-emoji mood picker, meal dropdown,
       nap minutes, and free-text note
   ============================================================ */

/* ============================================================
   PAGE: DAILY REPORTS
   ============================================================ */

/**
 * Re-render the daily-reports page from State.
 */
function renderDaily() {
  const f       = State.filters.daily;
  const list    = $('#dailyList');
  const reports = State.dailyReports;

  /* ---------- Class chips ---------- */
  const classes  = getClasses();
  const chipsRow = $('#dailyClassChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All', reports.length, f.class === 'ALL',
    () => { f.class = 'ALL'; renderDaily(); }
  ));

  classes.forEach(cls => {
    const cnt = reports.filter(r => r.class === cls).length;
    chipsRow.appendChild(makeChip(
      cls, cls, cnt, f.class === cls,
      () => { f.class = cls; renderDaily(); }
    ));
  });

  /* ---------- Apply filter ---------- */
  let filtered = reports;
  if (f.class !== 'ALL') {
    filtered = filtered.filter(r => r.class === f.class);
  }

  /* ---------- Render list ---------- */
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No reports yet',
      'Tap + to write a daily report.',
      '📝'
    ));
    return;
  }

  filtered
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .forEach(r => {
      list.appendChild(el('div', { class: 'entry-card' },
        el('div', { class: 'entry-meta' },
          el('span', { class: 'tag' }, r.class || '—'),
          el('span', { class: 'entry-date mono' }, formatDate(r.date))
        ),
        el('div', { class: 'entry-title' }, r.name_en || r.student_id),
        r.behaviour_note
          ? el('div', { class: 'entry-text' }, r.behaviour_note)
          : null,
        el('div', { class: 'entry-footer' },
          r.mood    ? el('span', {}, '😊 ' + r.mood)               : null,
          r.meal    ? el('span', {}, '🍽 ' + r.meal)                : null,
          r.nap_min ? el('span', {}, '💤 ' + r.nap_min + ' min')   : null
        )
      ));
    });
}

/* ============================================================
   DAILY REPORT FORM SHEET
   ============================================================ */

/**
 * Open the daily-report form.
 * If `student` is passed, that student is pre-selected.
 *
 * Saves through writeAction('save_daily_report') which routes
 * through n8n where OpenAI polishes the note into a warm parent
 * message and the bot can deliver it.
 */
function openDailyReportForm(student = null) {
  const studentList = State.students;
  let selectedMood  = '';

  /* ---------- Student dropdown ---------- */
  const studentSelect = el('select', { class: 'form-select', id: 'drStudent' });
  studentList.forEach(s => {
    const opt = el('option', { value: s.student_id },
      `${s.name_en || s.name_mm} (${s.class})`
    );
    if (student?.student_id === s.student_id) opt.selected = true;
    studentSelect.appendChild(opt);
  });

  /* ---------- Mood picker (8 emojis) ---------- */
  const moodPicker = el('div', { class: 'mood-pick' });
  const moods = [
    ['😊', 'Happy'],
    ['😐', 'OK'],
    ['😕', 'Quiet'],
    ['😴', 'Tired'],
    ['🤩', 'Excited'],
    ['😢', 'Upset'],
    ['😤', 'Frustrated'],
    ['🤒', 'Unwell']
  ];

  moods.forEach(([emoji, label]) => {
    const btn = el('button', {
      class:   'mood-btn',
      type:    'button',
      onclick: () => {
        selectedMood = label;
        $$('.mood-btn', moodPicker).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        haptic('selection');
      }
    },
      el('span', { class: 'emoji' }, emoji),
      el('span', { class: 'label' }, label)
    );
    moodPicker.appendChild(btn);
  });

  /* ---------- Build sheet body ---------- */
  const mealSelect = el('select', { class: 'form-select', id: 'drMeal' });
  mealSelect.innerHTML =
    '<option value="">—</option>' +
    '<option>Good</option>' +
    '<option>OK</option>' +
    '<option>Picky</option>' +
    '<option>None</option>';

  const body = el('div', {},
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Student'),
      studentSelect
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Mood'),
      moodPicker
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Meal'),
        mealSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Nap (min)'),
        el('input', {
          class:       'form-input',
          type:        'number',
          id:          'drNap',
          placeholder: '0',
          min:         0
        })
      )
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Note'),
      el('textarea', {
        class:       'form-textarea',
        id:          'drNote',
        placeholder: 'How did the day go? What did they learn?'
      })
    ),

    /* ---------- Save button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {
        const sid = studentSelect.value;
        const s   = State.students.find(x => x.student_id === sid);

        const data = {
          date:           todayISO(),
          student_id:     sid,
          name_en:        s?.name_en || '',
          class:          s?.class   || '',
          meal:           $('#drMeal').value || null,
          nap_min:        parseInt($('#drNap').value, 10) || 0,
          mood:           selectedMood,
          behaviour_note: $('#drNote').value.trim(),
          teacher_id:     State.user.id || 'T001'
        };

        /* ---------- Validation ---------- */
        if (!data.behaviour_note && !data.mood) {
          showToast('Add at least a note or mood', 'error');
          haptic('error');
          return;
        }

        showToast('Saving…');

        try {
          const r = await writeAction('save_daily_report', { data });
          if (r.ok) {
            showToast('✓ Report saved', 'success');
            haptic('success');

            /* Optimistic local insert */
            State.dailyReports.unshift(data);
            closeSheet();
            renderDaily();
          } else {
            throw new Error(r.error || 'unknown');
          }
        } catch (e) {
          console.error('save daily error:', e);
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Report')
  );

  openSheet('Daily Report', body);
}
