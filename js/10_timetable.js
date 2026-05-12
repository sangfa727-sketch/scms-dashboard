/* ============================================================
   SCMS v10.1 — 10_timetable.js
   Timetable page:
     • Day tabs ordered by school's week_start (Monday or Sunday)
     • Only school_days shown (no Sat/Sun if school is Mon-Fri)
     • Class chips with per-class period counts
     • Period cards sorted by period number
     • Subject color stripe on each card (if subject has color)
     • Form sheet to add a new period

   NEW IN v10.1:
     • Day list driven by State.config.school_days
     • Week starts on State.config.week_start (Mon/Sun)
     • Subjects from getSubjects() — no longer hardcoded
     • Subject color shown as left border on period card
   ============================================================ */

/* ============================================================
   PAGE: TIMETABLE
   ============================================================ */

/**
 * Re-render the timetable page from State.
 */
function renderTimetable() {
  const f     = State.filters.timetable;
  const items = State.timetable;

  /* ---------- Determine which days to show ---------- */
  const allDays   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                     'Thursday', 'Friday', 'Saturday'];
  const weekStart = getConfigValue('week_start', 'Monday');
  const schoolDays = getSchoolDays();   /* e.g. ['Mon','Tue','Wed','Thu','Fri'] */

  /* Rotate allDays so weekStart comes first */
  const startIdx = allDays.indexOf(weekStart);
  const orderedDays = startIdx >= 0
    ? [...allDays.slice(startIdx), ...allDays.slice(0, startIdx)]
    : allDays;

  /* Keep only school_days */
  const displayDays = orderedDays.filter(d => schoolDays.includes(d));

  /* If current f.day isn't in display days, switch to first one */
  if (!displayDays.includes(f.day) && displayDays.length) {
    f.day = displayDays[0];
  }

  /* ---------- Day tabs ---------- */
  const dayTabs = $('#dayTabs');
  dayTabs.innerHTML = '';

  displayDays.forEach(d => {
    dayTabs.appendChild(el('button', {
      class: 'day-tab' + (d === f.day ? ' active' : ''),
      onclick: () => {
        haptic('selection');
        f.day = d;
        renderTimetable();
      }
    }, d.slice(0, 3)));
  });

  /* ---------- Class chips ---------- */
  const classes = [...new Set(items.map(r => r.class).filter(Boolean))].sort();

  const chipsRow = $('#ttClassChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All',
    items.filter(r => r.day === f.day).length,
    f.class === 'ALL',
    () => { f.class = 'ALL'; renderTimetable(); }
  ));

  classes.forEach(cls => {
    const cnt = items.filter(r => r.day === f.day && r.class === cls).length;
    chipsRow.appendChild(makeChip(
      cls, cls, cnt, f.class === cls,
      () => { f.class = cls; renderTimetable(); }
    ));
  });

  /* ---------- Apply filters ---------- */
  let filtered = items.filter(r => r.day === f.day);
  if (f.class !== 'ALL') {
    filtered = filtered.filter(r => r.class === f.class);
  }
  filtered.sort((a, b) => (a.period || 0) - (b.period || 0));

  /* ---------- Subtitle ---------- */
  $('#timetableSubtitle').textContent =
    `${f.day} • ${f.class === 'ALL' ? 'All classes' : f.class}`;

  /* ---------- Build subject color lookup ---------- */
  const subjectColors = {};
  getSubjects().forEach(s => {
    if (s.subject_color) {
      subjectColors[s.subject_name] = s.subject_color;
      subjectColors[s.subject_code] = s.subject_color;
    }
  });

  /* ---------- Render period cards ---------- */
  const list = $('#timetableList');
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No periods',
      'No classes scheduled for this day.',
      '📅'
    ));
    return;
  }

  filtered.forEach(p => {
    const color = subjectColors[p.subject];

    const card = el('div', { class: 'period-card' },
      el('div', { class: 'time' },
        el('div', { class: 'start' }, formatTime(p.start_time)),
        el('div', {},                 formatTime(p.end_time))
      ),
      el('div', { class: 'info' },
        el('div', { class: 'subject' }, p.subject || '—'),
        el('div', { class: 'meta' },
          el('span', {}, p.class || ''),
          p.room ? el('span', {}, '· ' + p.room) : null
        )
      ),
      el('div', { class: 'badge-num' }, String(p.period || ''))
    );

    /* Apply subject color stripe (left border) */
    if (color) {
      card.style.borderLeft = '4px solid ' + color;
    }

    list.appendChild(card);
  });
}

/* ============================================================
   TIMETABLE FORM SHEET
   ============================================================ */

/**
 * Open the add-period form sheet.
 *
 * v10.1:
 *   - Subjects from getSubjects()
 *   - Days from State.config.school_days (week-start aware)
 *
 * Unlike other forms, this writes DIRECTLY to Supabase (not through
 * n8n webhook) because timetable changes are infrequent and don't
 * require AI processing or parent notification.
 */
function openTimetableForm() {
  const classes  = getClasses();
  const subjects = getSubjects();
  const allDays  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                    'Thursday', 'Friday', 'Saturday'];
  const weekStart = getConfigValue('week_start', 'Monday');
  const schoolDays = getSchoolDays();

  /* Order days the same way as renderTimetable */
  const startIdx = allDays.indexOf(weekStart);
  const orderedDays = startIdx >= 0
    ? [...allDays.slice(startIdx), ...allDays.slice(0, startIdx)]
    : allDays;
  const days = orderedDays.filter(d => schoolDays.includes(d));

  /* ---------- Class dropdown ---------- */
  const classSelect = el('select', { class: 'form-select', id: 'ttClass' });
  classSelect.innerHTML = classes.length
    ? classes.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')
    : '<option value="">— Register a student first —</option>';

  /* ---------- Day dropdown ---------- */
  const daySelect = el('select', { class: 'form-select', id: 'ttDay' });
  daySelect.innerHTML = days.map(d => `<option>${d}</option>`).join('');
  daySelect.value = State.filters.timetable.day || days[0] || 'Monday';

  /* ---------- Subject dropdown ---------- */
  const subjectSelect = el('select', { class: 'form-select', id: 'ttSubject' });
  subjectSelect.innerHTML = subjects.length
    ? subjects.map(s => `<option value="${escapeHTML(s.subject_name)}">${escapeHTML(s.subject_name)}</option>`).join('')
    : '<option value="">— Configure subjects in Settings —</option>';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Class'),
        classSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Day'),
        daySelect
      )
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Period'),
        el('input', {
          class: 'form-input', type: 'number', id: 'ttPeriod', min: 1, value: 1
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Subject'),
        subjectSelect
      )
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'Start ', el('span', { class: 'req' }, '*')
        ),
        el('input', { class: 'form-input', type: 'time', id: 'ttStart' })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'End ', el('span', { class: 'req' }, '*')
        ),
        el('input', { class: 'form-input', type: 'time', id: 'ttEnd' })
      )
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Room'),
      el('input', {
        class: 'form-input', id: 'ttRoom',
        placeholder: 'e.g. Room 2A / Online'
      })
    ),

    /* ---------- Save button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {
        const data = {
          class:      $('#ttClass').value,
          day:        $('#ttDay').value,
          period:     parseInt($('#ttPeriod').value, 10) || 1,
          subject:    $('#ttSubject').value,
          start_time: $('#ttStart').value,
          end_time:   $('#ttEnd').value,
          room:       $('#ttRoom').value.trim(),
          teacher_id: State.user.id || 'T001'
        };

        /* ---------- Validation ---------- */
        if (!data.class) {
          showToast('Pick a class', 'error');
          haptic('error');
          return;
        }
        if (!data.subject) {
          showToast('Pick a subject', 'error');
          haptic('error');
          return;
        }
        if (!data.start_time || !data.end_time) {
          showToast('Set start & end times', 'error');
          haptic('error');
          return;
        }
        if (data.start_time >= data.end_time) {
          showToast('End must be after start', 'error');
          haptic('error');
          return;
        }

        showToast('Saving…');

        try {
          /* DEMO mode: local state only */
          if (CONFIG.DEMO || !supa) {
            State.timetable.push({ ...data });
          } else {
            /* Direct Supabase upsert */
            const { error } = await supa
              .from('timetable')
              .upsert(
                { ...data, school_id: CONFIG.SCHOOL_ID },
                { onConflict: 'school_id,class,day,period' }
              );
            if (error) throw error;

            /* Optimistic local merge */
            const idx = State.timetable.findIndex(t =>
              t.class === data.class &&
              t.day   === data.day &&
              t.period === data.period
            );
            if (idx >= 0) State.timetable[idx] = data;
            else          State.timetable.push(data);
          }

          showToast('✓ Period saved', 'success');
          haptic('success');
          closeSheet();
          renderTimetable();
        } catch (e) {
          console.error('save timetable error:', e);
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Period')
  );

  openSheet('Add Timetable Period', body);
}
