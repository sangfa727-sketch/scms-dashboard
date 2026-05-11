/* ============================================================
   SCMS v10 — 09_incidents.js
   Incidents page:
     • Filterable list (Good Behaviour / Participation / Concern / etc.)
     • Severity color-coding (Info=green, Medium=gray, High/Critical=red)
     • Form sheet with type + severity + description + action taken
   ============================================================ */

/* ============================================================
   PAGE: INCIDENTS
   ============================================================ */

/**
 * Re-render the incidents page from State.
 */
function renderIncidents() {
  const f     = State.filters.incidents;
  const list  = $('#incidentList');
  const items = State.incidents;

  /* ---------- Type chips ---------- */
  const types    = [...new Set(items.map(r => r.type).filter(Boolean))];
  const chipsRow = $('#incidentTypeChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All', items.length, f.type === 'ALL',
    () => { f.type = 'ALL'; renderIncidents(); }
  ));

  types.forEach(t => {
    const cnt = items.filter(r => r.type === t).length;
    chipsRow.appendChild(makeChip(
      t, t, cnt, f.type === t,
      () => { f.type = t; renderIncidents(); }
    ));
  });

  /* ---------- Apply filter ---------- */
  let filtered = items;
  if (f.type !== 'ALL') {
    filtered = filtered.filter(r => r.type === f.type);
  }

  /* ---------- Render list ---------- */
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No incidents',
      'Tap + to record one.',
      '⚡'
    ));
    return;
  }

  filtered
    .sort((a, b) =>
      String(b.timestamp || b.date).localeCompare(String(a.timestamp || a.date))
    )
    .forEach(r => {
      /* Severity color */
      const sev = (r.severity || '').toLowerCase();
      const sevColor =
        sev.includes('critical') || sev.includes('high') ? 'red'  :
        sev.includes('medium')                            ? 'gray' :
                                                            'green';

      list.appendChild(el('div', { class: 'entry-card' },
        el('div', { class: 'entry-meta' },
          el('span', { class: 'tag ' + sevColor }, r.type || '—'),
          r.severity
            ? el('span', { class: 'tag gray' }, r.severity)
            : null,
          el('span', { class: 'entry-date mono' }, formatDate(r.date))
        ),
        el('div', { class: 'entry-title' },
          (r.name_en || r.student_id) + ' — ' + (r.class || '')
        ),
        r.description
          ? el('div', { class: 'entry-text' }, r.description)
          : null,
        r.action_taken
          ? el('div', { class: 'entry-footer' },
              el('span', {}, '🛠 ' + r.action_taken)
            )
          : null
      ));
    });
}

/* ============================================================
   INCIDENT FORM SHEET
   ============================================================ */

/**
 * Open the incident-form sheet.
 * If `student` is passed, that student is pre-selected.
 *
 * Saves through writeAction('save_incident') which routes
 * through n8n where high-severity records auto-notify parent.
 */
function openIncidentForm(student = null) {
  const studentList = State.students;

  /* ---------- Student dropdown ---------- */
  const studentSelect = el('select', { class: 'form-select', id: 'icStudent' });
  studentList.forEach(s => {
    const opt = el('option', { value: s.student_id },
      `${s.name_en || s.name_mm} (${s.class})`
    );
    if (student?.student_id === s.student_id) opt.selected = true;
    studentSelect.appendChild(opt);
  });

  /* ---------- Type dropdown ---------- */
  const typeSelect = el('select', { class: 'form-select', id: 'icType' });
  typeSelect.innerHTML =
    '<option>Good Behaviour</option>' +
    '<option>Participation</option>' +
    '<option>Achievement</option>' +
    '<option>Concern</option>' +
    '<option>Conflict</option>' +
    '<option>Health</option>' +
    '<option>Other</option>';

  /* ---------- Severity dropdown ---------- */
  const sevSelect = el('select', { class: 'form-select', id: 'icSev' });
  sevSelect.innerHTML =
    '<option>Info</option>' +
    '<option>Low</option>' +
    '<option>Medium</option>' +
    '<option>High</option>' +
    '<option>Critical</option>';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Student'),
      studentSelect
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Type'),
        typeSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Severity'),
        sevSelect
      )
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Description ', el('span', { class: 'req' }, '*')),
      el('textarea', {
        class:       'form-textarea',
        id:          'icDesc',
        placeholder: 'What happened?'
      })
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Action Taken'),
      el('input', {
        class:       'form-input',
        type:        'text',
        id:          'icAction',
        placeholder: 'How was it handled?'
      })
    ),

    /* ---------- Save button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {
        const sid = studentSelect.value;
        const s   = State.students.find(x => x.student_id === sid);

        const data = {
          timestamp:       new Date().toISOString(),
          date:            todayISO(),
          student_id:      sid,
          name_en:         s?.name_en || '',
          class:           s?.class   || '',
          type:            $('#icType').value,
          severity:        $('#icSev').value,
          description:     $('#icDesc').value.trim(),
          action_taken:    $('#icAction').value.trim(),
          teacher_id:      State.user.id || 'T001'
        };

        /* ---------- Validation ---------- */
        if (!data.description) {
          showToast('Add description', 'error');
          haptic('error');
          return;
        }

        showToast('Saving…');

        try {
          const r = await writeAction('save_incident', { data });
          if (r.ok) {
            showToast('✓ Incident recorded', 'success');
            haptic('success');

            /* Optimistic local insert */
            State.incidents.unshift(data);
            closeSheet();
            renderIncidents();
          } else {
            throw new Error(r.error || 'unknown');
          }
        } catch (e) {
          console.error('save incident error:', e);
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Incident')
  );

  openSheet('Record Incident', body);
}
