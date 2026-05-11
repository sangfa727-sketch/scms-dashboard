/* ============================================================
   SCMS v10 — 10_timetable.js
   Timetable page:
     • 7-day tabs (Monday → Sunday) — defaults to today
     • Class chips with per-class period counts
     • Period cards sorted by period number, with time / subject /
       class / room / period badge
     • Form sheet to add a new period (uses direct Supabase upsert
       since timetable rarely changes and doesn't need AI/parent notify)
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

  /* ---------- Day tabs ---------- */
  const days =
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const dayTabs = $('#dayTabs');
  dayTabs.innerHTML = '';

  days.forEach(d => {
    dayTabs.appendChild(el('button', {
      class: 'day-tab' + (d === f.day ? ' active' : ''),
      onclick: () => {
        haptic('selection');
        f.day = d;
        renderTimetable();
      }
    }, d.slice(0, 3)));   // "Mon", "Tue", ...
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
    list.appendChild(el('div', { class: 'period-card' },
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
    ));
  });
}

/* ============================================================
   TIMETABLE FORM SHEET
   ============================================================ */

/**
 * Open the add-period form sheet.
 *
 * Unlike other forms, this writes directly to Supabase (not through
 * the n8n webhook) because timetable changes are infrequent and
 * don't require AI processing or parent notification.
 */
function openTimetableForm() {
  const classes  = getClasses();
  const days     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const subjects = [
    'Maths', 'Primary English', 'Science', 'Social Studies',
    'Myanmar', 'Art', 'PE', 'Music', 'Reading', 'Library'
  ];

  /* ---------- Class dropdown ---------- */
  const classSelect = el('select', { class: 'form-select', id: 'ttClass' });
  classSelect.innerHTML = classes.length
    ? classes.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')
    : '<option value="P4 Online">P4 Online</option><option value="Grade2">Grade2</option>';

  /* ---------- Day dropdown ---------- */
  const daySelect = el('select', { class: 'form-select', id: 'ttDay' });
  daySelect.innerHTML = days.map(d => `<option>${d}</option>`).join('');
  daySelect.value = State.filters.timetable.day || days[0];

  /* ---------- Subject dropdown ---------- */
  const subjectSelect = el('select', { class: 'form-select', id: 'ttSubject' });
  subjectSelect.innerHTML = subjects.map(s => `<option>${s}</option>`).join('');

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
          class: 'form-input',
          type:  'number',
          id:    'ttPeriod',
          min:   1,
          value: 1
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Subject'),
        subjectSelect
      )
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Start ', el('span', { class: 'req' }, '*')),
        el('input', {
          class: 'form-input',
          type:  'time',
          id:    'ttStart'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'End ', el('span', { class: 'req' }, '*')),
        el('input', {
          class: 'form-input',
          type:  'time',
          id:    'ttEnd'
        })
      )
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Room'),
      el('input', {
        class:       'form-input',
        id:          'ttRoom',
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
          /* ---------- DEMO mode: just update local state ---------- */
          if (CONFIG.DEMO || !supa) {
            State.timetable.push({ ...data });
          } else {
            /* ---------- Direct Supabase upsert ---------- */
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
              t.day === data.day &&
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
