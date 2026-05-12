/* ============================================================
   SCMS v10.1 — 15_settings.js  (NEW)
   School configuration editor (admin only):
     • Subjects management (CRUD with color)
     • Houses management (name + emoji + color)
     • Grades / Genders / Statuses / Types lists
     • Week start (Mon / Sun / Sat)
     • School days (which days of the week)
     • Local language, currency, date format

   Access: open via "School Settings" in More page.
   Admin-only — non-admins see a read-only banner.
   ============================================================ */

/* ============================================================
   ENTRY: openSchoolSettings()
   ============================================================ */

/**
 * Open the school settings sheet.
 * Shows section list; tap each to open a focused editor.
 */
function openSchoolSettings() {
  const isAdmin =
    State.user.role === 'Admin' ||
    State.user.role === 'Principal' ||
    State.user.role === 'HT';

  const body = el('div', {});

  /* ---------- Role banner ---------- */
  if (!isAdmin) {
    body.appendChild(el('div', {
      class: 'entry-card',
      style: 'background:var(--brand-soft);border-color:var(--brand);margin-bottom:12px'
    },
      el('div', { style: 'font-size:13px;color:var(--brand-deep);font-weight:600' },
        '🔒 View only — admin role required to edit.'
      )
    ));
  }

  /* ---------- Section list ---------- */
  const sections = [
    { icon: '📚', title: 'Subjects',       desc: getConfigList('subjects').length + ' subjects',         key: 'subjects' },
    { icon: '🏠', title: 'Houses',         desc: getHouses().length + ' houses',                          key: 'houses' },
    { icon: '🎓', title: 'Grade Levels',   desc: getConfigList('grades').length + ' grades',              key: 'grades' },
    { icon: '👤', title: 'Genders',        desc: getConfigList('genders').join(', '),                     key: 'genders' },
    { icon: '🟢', title: 'Student Status', desc: getConfigList('student_statuses').length + ' statuses',  key: 'student_statuses' },
    { icon: '📋', title: 'Homework Types', desc: getConfigList('homework_types').length + ' types',       key: 'homework_types' },
    { icon: '⚡', title: 'Incident Types', desc: getConfigList('incident_types').length + ' types',       key: 'incident_types' },
    { icon: '💬', title: 'Comm Types',     desc: getConfigList('comm_types').length + ' types',           key: 'comm_types' },
    { icon: '✓ ', title: 'Attendance Codes', desc: getConfigList('attendance_codes').length + ' codes',   key: 'attendance_codes' },
    { icon: '📅', title: 'Week & Schedule', desc: 'Start: ' + getConfigValue('week_start') + ' · ' + getSchoolDays().length + ' school days', key: 'schedule' },
    { icon: '🌐', title: 'Locale',          desc: getConfigValue('local_language') + ' · ' + getConfigValue('currency'), key: 'locale' }
  ];

  sections.forEach(s => {
    body.appendChild(el('div', {
      class: 'student-card',
      onclick: () => {
        haptic('selection');
        if (!isAdmin) {
          showToast('Admin role required', 'error');
          return;
        }
        openConfigEditor(s.key, s.title, s.icon);
      }
    },
      el('div', {
        class: 'avatar',
        style: 'background:var(--line-2);color:var(--ink-2);font-size:18px'
      }, s.icon),
      el('div', { class: 'info' },
        el('div', { class: 'name' }, s.title),
        el('div', { class: 'name-mm' }, s.desc)
      )
    ));
  });

  openSheet('School Settings', body);
}

/* ============================================================
   CONFIG EDITOR (routes to the right editor by key)
   ============================================================ */

function openConfigEditor(key, title, icon) {
  /* Special editors with custom UI */
  if (key === 'subjects')         return openSubjectsEditor();
  if (key === 'houses')           return openHousesEditor();
  if (key === 'attendance_codes') return openAttendanceCodesEditor();
  if (key === 'schedule')         return openScheduleEditor();
  if (key === 'locale')           return openLocaleEditor();

  /* Generic simple-list editor */
  return openSimpleListEditor(key, title);
}

/* ============================================================
   GENERIC LIST EDITOR  (string array: grades, genders, statuses, types)
   ============================================================ */

/**
 * Edit a simple list of strings. Used for:
 *   grades, genders, student_statuses, homework_types,
 *   incident_types, comm_types
 */
function openSimpleListEditor(key, title) {
  let items = [...getConfigList(key)];

  const renderList = (container) => {
    container.innerHTML = '';
    if (!items.length) {
      container.appendChild(emptyState('No items', 'Tap + to add one.', '➕'));
      return;
    }
    items.forEach((item, idx) => {
      container.appendChild(el('div', {
        class: 'student-card',
        style: 'padding:10px 12px'
      },
        el('div', { class: 'info' },
          el('div', { class: 'name' }, String(item))
        ),
        el('button', {
          class: 'icon-btn',
          onclick: () => {
            items.splice(idx, 1);
            renderList(container);
            haptic('warning');
          },
          'aria-label': 'Remove'
        }, Object.assign(document.createElement('span'), { textContent: '✕' }))
      ));
    });
  };

  const listContainer = el('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px' });
  renderList(listContainer);

  const newInput = el('input', {
    class: 'form-input',
    id: 'newListItem',
    placeholder: 'Add new item…'
  });

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Tap ✕ to remove. Add new items below.'
    ),

    listContainer,

    el('div', { class: 'form-row' },
      newInput,
      el('button', {
        class: 'btn-secondary',
        style: 'width:auto;padding:11px 18px;flex-shrink:0',
        onclick: () => {
          const val = newInput.value.trim();
          if (!val) return;
          if (items.includes(val)) {
            showToast('Already in list', 'error');
            return;
          }
          items.push(val);
          newInput.value = '';
          renderList(listContainer);
          haptic('selection');
        }
      }, 'Add')
    ),

    el('div', { style: 'height:14px' }),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        showToast('Saving…');
        const r = await saveSchoolConfig({ [key]: items });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Changes')
  );

  openSheet(title, body);
}

/* ============================================================
   SUBJECTS EDITOR (richer: name + color)
   ============================================================ */

function openSubjectsEditor() {
  let items = getConfigList('subjects').map(s =>
    typeof s === 'string' ? s : s.name || s
  );

  const renderList = (container) => {
    container.innerHTML = '';
    if (!items.length) {
      container.appendChild(emptyState('No subjects', 'Tap + to add one.', '📚'));
      return;
    }
    items.forEach((item, idx) => {
      container.appendChild(el('div', {
        class: 'student-card',
        style: 'padding:10px 12px'
      },
        el('div', { class: 'info' },
          el('div', { class: 'name' }, String(item))
        ),
        el('button', {
          class: 'icon-btn',
          onclick: () => { items.splice(idx, 1); renderList(container); haptic('warning'); }
        }, Object.assign(document.createElement('span'), { textContent: '✕' }))
      ));
    });
  };

  const listContainer = el('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px' });
  renderList(listContainer);

  const newInput = el('input', {
    class: 'form-input',
    placeholder: 'e.g. Mathematics, Chemistry, Quran…'
  });

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Subjects are what teachers pick when assigning homework or planning the timetable. To set per-subject colors, ask your DB admin to update the subjects table.'
    ),

    listContainer,

    el('div', { class: 'form-row' },
      newInput,
      el('button', {
        class: 'btn-secondary',
        style: 'width:auto;padding:11px 18px;flex-shrink:0',
        onclick: () => {
          const val = newInput.value.trim();
          if (!val) return;
          if (items.includes(val)) { showToast('Already in list', 'error'); return; }
          items.push(val);
          newInput.value = '';
          renderList(listContainer);
          haptic('selection');
        }
      }, 'Add')
    ),

    el('div', { style: 'height:14px' }),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        showToast('Saving…');
        const r = await saveSchoolConfig({ subjects: items });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Subjects')
  );

  openSheet('Subjects', body);
}

/* ============================================================
   HOUSES EDITOR (name + emoji + color)
   ============================================================ */

function openHousesEditor() {
  let items = getHouses().map(h => ({
    name:  h.name  || '',
    emoji: h.emoji || '',
    color: h.color || '#3B82F6'
  }));

  const renderList = (container) => {
    container.innerHTML = '';
    if (!items.length) {
      container.appendChild(emptyState('No houses', 'Tap + to add one.', '🏠'));
      return;
    }
    items.forEach((h, idx) => {
      container.appendChild(el('div', {
        class: 'student-card',
        style: 'padding:10px 12px'
      },
        el('div', {
          style: 'width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;background:' + h.color + '22;border:2px solid ' + h.color
        }, h.emoji || '?'),
        el('div', { class: 'info' },
          el('div', { class: 'name' }, h.name || '(unnamed)'),
          el('div', { class: 'name-mm', style: 'font-family:monospace' }, h.color)
        ),
        el('button', {
          class: 'icon-btn',
          onclick: () => { items.splice(idx, 1); renderList(container); haptic('warning'); }
        }, Object.assign(document.createElement('span'), { textContent: '✕' }))
      ));
    });
  };

  const listContainer = el('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px' });
  renderList(listContainer);

  const nameInput  = el('input', { class: 'form-input', placeholder: 'House name' });
  const emojiInput = el('input', { class: 'form-input', placeholder: '🔵', maxlength: 4 });
  const colorInput = el('input', { class: 'form-input', type: 'color', value: '#3B82F6' });

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Add competitive houses for your school. Each house has a name, emoji, and color.'
    ),

    listContainer,

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'New House'),
      el('div', { style: 'display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px' },
        nameInput, emojiInput, colorInput
      )
    ),

    el('button', {
      class: 'btn-secondary',
      onclick: () => {
        const name  = nameInput.value.trim();
        const emoji = emojiInput.value.trim();
        const color = colorInput.value;
        if (!name) { showToast('House name required', 'error'); return; }
        if (items.find(h => h.name === name)) { showToast('Already exists', 'error'); return; }
        items.push({ name, emoji, color });
        nameInput.value = ''; emojiInput.value = ''; colorInput.value = '#3B82F6';
        renderList(listContainer);
        haptic('selection');
      }
    }, '+ Add House'),

    el('div', { style: 'height:14px' }),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        showToast('Saving…');
        const r = await saveSchoolConfig({ houses: items });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Houses')
  );

  openSheet('Houses', body);
}

/* ============================================================
   ATTENDANCE CODES EDITOR (code + label + color)
   ============================================================ */

function openAttendanceCodesEditor() {
  let items = getConfigList('attendance_codes').map(c =>
    typeof c === 'string'
      ? { code: c.charAt(0), label: c, color: '#64748B' }
      : { code: c.code, label: c.label, color: c.color || '#64748B' }
  );

  const renderList = (container) => {
    container.innerHTML = '';
    items.forEach((c, idx) => {
      container.appendChild(el('div', {
        class: 'student-card',
        style: 'padding:10px 12px'
      },
        el('div', {
          style: 'width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;background:' + c.color + ';color:#fff'
        }, c.code),
        el('div', { class: 'info' },
          el('div', { class: 'name' }, c.label),
          el('div', { class: 'name-mm', style: 'font-family:monospace' }, c.code + ' · ' + c.color)
        ),
        el('button', {
          class: 'icon-btn',
          onclick: () => { items.splice(idx, 1); renderList(container); haptic('warning'); }
        }, Object.assign(document.createElement('span'), { textContent: '✕' }))
      ));
    });
  };

  const listContainer = el('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px' });
  renderList(listContainer);

  const codeInput  = el('input', { class: 'form-input', placeholder: 'P', maxlength: 2 });
  const labelInput = el('input', { class: 'form-input', placeholder: 'Present' });
  const colorInput = el('input', { class: 'form-input', type: 'color', value: '#10B981' });

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Codes are short letters teachers tap for each student (P=Present, A=Absent…).'
    ),

    listContainer,

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'New Code'),
      el('div', { style: 'display:grid;grid-template-columns:1fr 2fr 1fr;gap:6px' },
        codeInput, labelInput, colorInput
      )
    ),

    el('button', {
      class: 'btn-secondary',
      onclick: () => {
        const code  = codeInput.value.trim().toUpperCase();
        const label = labelInput.value.trim();
        const color = colorInput.value;
        if (!code || !label) { showToast('Code & label required', 'error'); return; }
        if (items.find(c => c.code === code)) { showToast('Code exists', 'error'); return; }
        items.push({ code, label, color });
        codeInput.value = ''; labelInput.value = ''; colorInput.value = '#10B981';
        renderList(listContainer);
        haptic('selection');
      }
    }, '+ Add Code'),

    el('div', { style: 'height:14px' }),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        showToast('Saving…');
        const r = await saveSchoolConfig({ attendance_codes: items });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Codes')
  );

  openSheet('Attendance Codes', body);
}

/* ============================================================
   SCHEDULE EDITOR (week_start + school_days)
   ============================================================ */

function openScheduleEditor() {
  const allDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let weekStart  = getConfigValue('week_start', 'Monday');
  let schoolDays = [...getSchoolDays()];

  const weekStartSelect = el('select', { class: 'form-select' });
  weekStartSelect.innerHTML = allDays
    .map(d => `<option${d === weekStart ? ' selected' : ''}>${d}</option>`).join('');
  weekStartSelect.onchange = () => { weekStart = weekStartSelect.value; };

  /* ---------- School days checkbox grid ---------- */
  const renderDays = (container) => {
    container.innerHTML = '';
    allDays.forEach(d => {
      const isOn = schoolDays.includes(d);
      const chip = el('button', {
        type: 'button',
        class: 'chip' + (isOn ? ' active' : ''),
        onclick: () => {
          haptic('selection');
          if (isOn) schoolDays = schoolDays.filter(x => x !== d);
          else      schoolDays = [...schoolDays, d];
          renderDays(container);
        }
      }, d.slice(0, 3));
      container.appendChild(chip);
    });
  };

  const daysContainer = el('div', { class: 'chips-row', style: 'margin:0 0 14px' });
  renderDays(daysContainer);

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Pick which day starts the week (most schools: Monday; UAE/Saudi: Sunday) and which days students attend.'
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Week Starts On'),
      weekStartSelect
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'School Days'),
      daysContainer
    ),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        if (!schoolDays.length) {
          showToast('Pick at least one day', 'error');
          haptic('error');
          return;
        }
        showToast('Saving…');
        const r = await saveSchoolConfig({
          week_start:  weekStart,
          school_days: schoolDays
        });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Schedule')
  );

  openSheet('Week & Schedule', body);
}

/* ============================================================
   LOCALE EDITOR (local_language + currency + date_format)
   ============================================================ */

function openLocaleEditor() {
  const langInput     = el('input', {
    class: 'form-input',
    value: getConfigValue('local_language', 'English'),
    placeholder: 'Myanmar / Thai / Arabic / Mandarin…'
  });

  const currencyInput = el('input', {
    class: 'form-input',
    value: getConfigValue('currency', 'USD'),
    placeholder: 'USD / EUR / MMK / THB / AED…'
  });

  const dateFormatSelect = el('select', { class: 'form-select' });
  dateFormatSelect.innerHTML =
    ['YYYY-MM-DD','DD/MM/YYYY','MM/DD/YYYY','DD MMM YYYY']
      .map(f => `<option${f === getConfigValue('date_format') ? ' selected' : ''}>${f}</option>`)
      .join('');

  const body = el('div', {},
    el('p', { style: 'color:var(--ink-3);font-size:12.5px;margin-bottom:14px' },
      'Locale settings affect labels and date display.'
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Local Language'),
      langInput
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Currency'),
      currencyInput
    ),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Date Format'),
      dateFormatSelect
    ),

    el('button', {
      class: 'btn-primary',
      onclick: async () => {
        showToast('Saving…');
        const r = await saveSchoolConfig({
          local_language: langInput.value.trim() || 'English',
          currency:       currencyInput.value.trim() || 'USD',
          date_format:    dateFormatSelect.value
        });
        if (r.ok) {
          showToast('✓ Saved', 'success');
          haptic('success');
          closeSheet();
        } else {
          showToast('Save failed', 'error');
          haptic('error');
        }
      }
    }, 'Save Locale')
  );

  openSheet('Locale', body);
}
