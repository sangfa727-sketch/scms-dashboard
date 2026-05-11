/* ============================================================
   SCMS v10 — 07_homework.js
   Homework page:
     • Filterable list of assignments (Homework / Lesson / Project / Quiz)
     • Entry cards with subject, type, LB / WB page, description, due date
     • Form sheet to assign new homework
   ============================================================ */

/* ============================================================
   PAGE: HOMEWORK
   ============================================================ */

/**
 * Re-render the homework page from State.
 */
function renderHomework() {
  const f     = State.filters.homework;
  const list  = $('#hwList');
  const items = State.homework;

  /* ---------- Class chips ---------- */
  const classes  = getClasses();
  const chipsRow = $('#hwClassChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All', items.length, f.class === 'ALL',
    () => { f.class = 'ALL'; renderHomework(); }
  ));

  classes.forEach(cls => {
    const cnt = items.filter(r => r.class === cls).length;
    chipsRow.appendChild(makeChip(
      cls, cls, cnt, f.class === cls,
      () => { f.class = cls; renderHomework(); }
    ));
  });

  /* ---------- Apply filter ---------- */
  let filtered = items;
  if (f.class !== 'ALL') {
    filtered = filtered.filter(r => r.class === f.class);
  }

  /* ---------- Render list ---------- */
  list.innerHTML = '';

  if (!filtered.length) {
    list.appendChild(emptyState(
      'No homework',
      'Tap + to assign new homework.',
      '📚'
    ));
    return;
  }

  filtered
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .forEach(r => {
      list.appendChild(el('div', { class: 'entry-card' },
        el('div', { class: 'entry-meta' },
          el('span', { class: 'tag' },      r.subject || '—'),
          el('span', { class: 'tag gray' }, r.type    || 'Homework'),
          el('span', { class: 'entry-date mono' }, formatDate(r.date))
        ),
        el('div', { class: 'entry-title' }, r.class || ''),
        r.description
          ? el('div', { class: 'entry-text' }, r.description)
          : null,
        el('div', { class: 'entry-footer' },
          r.lb_page  ? el('span', {}, 'LB p.' + r.lb_page) : null,
          r.wb_page  ? el('span', {}, 'WB p.' + r.wb_page) : null,
          r.due_date ? el('span', {}, 'Due: ' + formatDate(r.due_date)) : null
        )
      ));
    });
}

/* ============================================================
   HOMEWORK FORM SHEET
   ============================================================ */

/**
 * Open the assign-homework form sheet.
 *
 * Saves through writeAction('save_homework') which routes
 * through n8n where the bot can broadcast it to all parents
 * in the class.
 */
function openHomeworkForm() {
  const classes  = getClasses();
  const subjects = [
    'Maths',
    'Primary English',
    'Science',
    'Social Studies',
    'Myanmar',
    'Art',
    'PE',
    'Music',
    'Reading',
    'Library'
  ];

  /* ---------- Class dropdown ---------- */
  const classSelect = el('select', { class: 'form-select', id: 'hwClass' });
  classSelect.innerHTML = classes
    .map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)
    .join('');

  /* ---------- Subject dropdown ---------- */
  const subjectSelect = el('select', { class: 'form-select', id: 'hwSubject' });
  subjectSelect.innerHTML = subjects.map(s => `<option>${s}</option>`).join('');

  /* ---------- Type dropdown ---------- */
  const typeSelect = el('select', { class: 'form-select', id: 'hwType' });
  typeSelect.innerHTML =
    '<option>Homework</option>' +
    '<option>Lesson</option>' +
    '<option>Project</option>' +
    '<option>Quiz</option>' +
    '<option>Test</option>' +
    '<option>Reading</option>';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Class'),
      classSelect
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Subject'),
        subjectSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Type'),
        typeSelect
      )
    ),

    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'LB Page'),
        el('input', {
          class:       'form-input',
          type:        'text',
          id:          'hwLB',
          placeholder: 'e.g. 12'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'WB Page'),
        el('input', {
          class:       'form-input',
          type:        'text',
          id:          'hwWB',
          placeholder: 'e.g. 8'
        })
      )
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Description ', el('span', { class: 'req' }, '*')),
      el('textarea', {
        class:       'form-textarea',
        id:          'hwDesc',
        placeholder: 'What should students do?'
      })
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Due Date'),
      el('input', {
        class: 'form-input',
        type:  'date',
        id:    'hwDue'
      })
    ),

    /* ---------- Save button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {
        const data = {
          date:        todayISO(),
          class:       $('#hwClass').value,
          subject:     $('#hwSubject').value,
          type:        $('#hwType').value,
          lb_page:     $('#hwLB').value.trim(),
          wb_page:     $('#hwWB').value.trim(),
          description: $('#hwDesc').value.trim(),
          due_date:    $('#hwDue').value || null,
          teacher_id:  State.user.id || 'T001'
        };

        /* ---------- Validation ---------- */
        if (!data.description) {
          showToast('Add description', 'error');
          haptic('error');
          return;
        }

        showToast('Saving…');

        try {
          const r = await writeAction('save_homework', { data });
          if (r.ok) {
            showToast('✓ Homework assigned', 'success');
            haptic('success');

            /* Optimistic local insert */
            State.homework.unshift(data);
            closeSheet();
            renderHomework();
          } else {
            throw new Error(r.error || 'unknown');
          }
        } catch (e) {
          console.error('save homework error:', e);
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Assign Homework')
  );

  openSheet('New Homework', body);
}
