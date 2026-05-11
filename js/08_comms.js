/* ============================================================
   SCMS v10 — 08_comms.js
   Parent communications page:
     • Filterable log of all parent messages (sent/queued/failed)
     • Type chips: General / Absent Alert / Daily Report / etc.
     • Compose form sheet to send a new message
   ============================================================ */

/* ============================================================
   PAGE: PARENT COMMUNICATIONS
   ============================================================ */

/**
 * Re-render the parent-comms page from State.
 */
function renderComms() {
  const f     = State.filters.comms;
  const list  = $('#commsList');
  const items = State.parentComms;

  /* ---------- Type chips ---------- */
  const types    = [...new Set(items.map(r => r.type).filter(Boolean))];
  const chipsRow = $('#commsTypeChips');
  chipsRow.innerHTML = '';

  chipsRow.appendChild(makeChip(
    'ALL', 'All', items.length, f.type === 'ALL',
    () => { f.type = 'ALL'; renderComms(); }
  ));

  types.forEach(t => {
    const cnt = items.filter(r => r.type === t).length;
    chipsRow.appendChild(makeChip(
      t, t, cnt, f.type === t,
      () => { f.type = t; renderComms(); }
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
      'No messages',
      'Send messages from any student card or tap + here.',
      '💬'
    ));
    return;
  }

  filtered
    .sort((a, b) =>
      String(b.timestamp || b.date).localeCompare(String(a.timestamp || a.date))
    )
    .forEach(r => {
      /* Status tag color */
      const statusColor =
        r.status === 'Sent'   ? 'green' :
        r.status === 'Failed' ? 'red'   :
        'gray';

      /* Type tag color (Absent Alert = red, everything else = blue) */
      const typeColor = r.type === 'Absent Alert' ? 'red' : 'blue';

      list.appendChild(el('div', { class: 'entry-card' },
        el('div', { class: 'entry-meta' },
          el('span', { class: 'tag ' + typeColor },   r.type   || '—'),
          el('span', { class: 'tag ' + statusColor }, r.status || 'Pending'),
          el('span', { class: 'entry-date mono' },    formatDate(r.date))
        ),
        el('div', { class: 'entry-title' }, r.name_en || r.student_id),
        el('div', { class: 'entry-text'  }, r.message_preview || ''),
        r.error
          ? el('div', { class: 'entry-footer' },
              el('span', { style: 'color:var(--red)' }, '⚠ ' + r.error)
            )
          : null
      ));
    });
}

/* ============================================================
   PARENT MESSAGE FORM SHEET
   ============================================================ */

/**
 * Open the compose-parent-message form sheet.
 * If `student` is passed, that student is pre-selected.
 *
 * Saves through writeAction('send_parent_comm') which:
 *   - logs the message in parent_comms
 *   - n8n actually delivers the Telegram message to the parent
 */
function openParentMessageForm(student = null) {
  const studentList = State.students;

  /* ---------- Student dropdown ---------- */
  const studentSelect = el('select', { class: 'form-select', id: 'pmStudent' });
  studentList.forEach(s => {
    const opt = el('option', { value: s.student_id },
      `${s.name_en || s.name_mm} (${s.class})`
    );
    if (student?.student_id === s.student_id) opt.selected = true;
    studentSelect.appendChild(opt);
  });

  /* ---------- Type dropdown ---------- */
  const typeSelect = el('select', { class: 'form-select', id: 'pmType' });
  typeSelect.innerHTML =
    '<option>General</option>' +
    '<option>Absent Alert</option>' +
    '<option>Daily Report</option>' +
    '<option>Reminder</option>' +
    '<option>Praise</option>' +
    '<option>Homework</option>';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Student'),
      studentSelect
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Type'),
      typeSelect
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Message ', el('span', { class: 'req' }, '*')),
      el('textarea', {
        class:       'form-textarea',
        id:          'pmMessage',
        rows:        5,
        placeholder: 'Type your message to the parent…'
      })
    ),

    /* ---------- Send button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {
        const sid = studentSelect.value;
        const s   = State.students.find(x => x.student_id === sid);

        const data = {
          timestamp:       new Date().toISOString(),
          date:            todayISO(),
          student_id:      sid,
          name_en:         s?.name_en       || '',
          parent_tg_id:    s?.parent_tg_id  || '',
          type:            $('#pmType').value,
          message_preview: $('#pmMessage').value.trim(),
          status:          'Queued',
          teacher_id:      State.user.id || 'T001'
        };

        /* ---------- Validation ---------- */
        if (!data.message_preview) {
          showToast('Empty message', 'error');
          haptic('error');
          return;
        }

        showToast('Sending…');

        try {
          const r = await writeAction('send_parent_comm', { data });
          if (r.ok) {
            data.status = r.status || 'Sent';
            showToast('✓ Message sent', 'success');
            haptic('success');

            /* Optimistic local insert */
            State.parentComms.unshift(data);
            closeSheet();
            renderComms();
          } else {
            throw new Error(r.error || 'unknown');
          }
        } catch (e) {
          console.error('send comm error:', e);
          showToast('Send failed', 'error');
          haptic('error');
        }
      }
    }, 'Send Message')
  );

  openSheet('Message Parent', body);
}
