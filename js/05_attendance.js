/* ============================================================
   SCMS v10 — 05_attendance.js
   Attendance page:
     • ±3-day date strip with selected highlight
     • Class chips (one tap to switch class)
     • Live stats (Present / Absent / Marked X of Y)
     • Per-student row with P/A/L/T status pills
     • Batch save through writeAction('save_attendance')
   ============================================================ */

/* ============================================================
   PAGE: ATTENDANCE
   ============================================================ */

/**
 * Re-render the attendance page from State.
 * Pre-fills any already-saved marks for the selected date.
 */
function renderAttendance() {
  const { students } = State;
  const f = State.filters;

  /* ---------- ±3 day date strip ---------- */
  const strip = $('#dateStrip');
  strip.innerHTML = '';

  const today = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

    const cell = el('div', {
      class:
        'date-cell' +
        (i === 0 ? ' today' : '') +
        (dateStr === f.attendDate ? ' selected' : ''),
      onclick: () => {
        haptic('selection');
        f.attendDate  = dateStr;
        f.attendDraft = {};   // reset unsaved edits on date change
        renderAttendance();
      }
    },
      el('div', { class: 'dow' }, dow),
      el('div', { class: 'day' }, String(d.getDate()))
    );
    strip.appendChild(cell);
  }

  /* ---------- Class chips ---------- */
  const classes = getClasses();
  if (!f.attendClass && classes[0]) f.attendClass = classes[0];

  const chipsRow = $('#attendClassChips');
  chipsRow.innerHTML = '';
  classes.forEach(cls => {
    chipsRow.appendChild(makeChip(
      cls,
      cls,
      students.filter(s => s.class === cls).length,
      f.attendClass === cls,
      () => {
        f.attendClass = cls;
        f.attendDraft = {};   // reset unsaved edits on class change
        renderAttendance();
      }
    ));
  });

  /* ---------- Students in selected class ---------- */
  const classStudents = students.filter(s => s.class === f.attendClass);

  /* ---------- Pre-fill from existing attendance ---------- */
  // Build effective draft: saved marks for this date, overlaid with any
  // unsaved edits the teacher made in attendDraft.
  const existing = State.attendance.filter(a => a.date === f.attendDate);
  const draftMap = { ...f.attendDraft };
  existing.forEach(a => {
    if (!(a.student_id in draftMap)) draftMap[a.student_id] = a.status;
  });

  /* ---------- Stats ---------- */
  const counts = { P: 0, A: 0, L: 0, T: 0 };
  classStudents.forEach(s => {
    const st = draftMap[s.student_id];
    if (st) counts[st] = (counts[st] || 0) + 1;
  });
  const marked = counts.P + counts.A + counts.L + counts.T;

  const stats = $('#attendStats');
  stats.innerHTML = '';
  stats.append(
    statCard(counts.P, 'Present'),
    statCard(counts.A, 'Absent'),
    statCard(`${marked}/${classStudents.length}`, 'Marked', true)
  );

  /* ---------- Subtitle ---------- */
  $('#attendSubtitle').textContent =
    `${formatDate(f.attendDate)} • ${f.attendClass || '—'}`;

  /* ---------- Per-student rows with pills ---------- */
  const list = $('#attendList');
  list.innerHTML = '';

  if (!classStudents.length) {
    list.appendChild(emptyState(
      'No students',
      'Pick a different class above.',
      '👥'
    ));
    return;
  }

  classStudents.forEach(s => {
    const current = draftMap[s.student_id] || '';
    const row = el('div', { class: 'attend-row' },
      el('div', { class: 'avatar ' + houseClass(s.house_color) },
        initials(s.name_en || s.name_mm)
      ),
      el('div', { class: 'info' },
        el('div', { class: 'name'  }, s.name_en || s.name_mm || s.student_id),
        el('div', { class: 'class' },
          s.name_mm && s.name_en ? s.name_mm : (s.student_id || '')
        )
      ),
      buildPills(s.student_id, current, (status) => {
        f.attendDraft[s.student_id] = status;
        haptic('selection');
        renderAttendance();
      })
    );
    list.appendChild(row);
  });
}

/* ============================================================
   STATUS PILLS  (Present / Absent / Leave / Tardy)
   ============================================================ */

/**
 * Build the P/A/L/T pill group for one student row.
 * The active pill is colored according to its status:
 *   P = green, A = red, L = blue, T = brand (amber)
 */
function buildPills(sid, current, onPick) {
  const wrap  = el('div', { class: 'status-pills' });
  const codes = ['P', 'A', 'L', 'T'];
  const aria  = { P: 'Present', A: 'Absent', L: 'Leave', T: 'Tardy' };

  codes.forEach(st => {
    wrap.appendChild(el('button', {
      class:        'pill' + (current === st ? ' active' : ''),
      data:         { status: st },
      onclick:      () => onPick(st),
      'aria-label': aria[st]
    }, st));
  });

  return wrap;
}

/* ============================================================
   SAVE ATTENDANCE  (batch upsert through writeAction)
   ============================================================ */

/**
 * Save all unsaved marks for the selected date.
 * Calls writeAction('save_attendance') which routes through the
 * n8n webhook (or falls back to direct Supabase upsert).
 *
 * On success, optimistically merges records into State.attendance
 * so the UI updates immediately.
 */
async function saveAttendance() {
  const f = State.filters;

  /* ---------- Build records array ---------- */
  const records = Object.entries(f.attendDraft).map(([sid, status]) => {
    const s = State.students.find(x => x.student_id === sid);
    return {
      date:         f.attendDate,
      day_of_week:  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(f.attendDate).getDay()],
      student_id:   sid,
      name_en:      s?.name_en || '',
      class:        s?.class || f.attendClass,
      status:       status,
      teacher_id:   State.user.id || 'T001'
    };
  });

  if (!records.length) {
    showToast('Nothing to save', 'error');
    haptic('error');
    return;
  }

  showToast('Saving…');

  try {
    const r = await writeAction('save_attendance', { records });

    if (r.ok) {
      showToast(`✓ Saved ${records.length} records`, 'success');
      haptic('success');

      /* ---------- Optimistic local merge ---------- */
      records.forEach(rec => {
        const idx = State.attendance.findIndex(a =>
          a.date === rec.date && a.student_id === rec.student_id
        );
        if (idx >= 0) State.attendance[idx] = rec;
        else          State.attendance.push(rec);
      });

      f.attendDraft = {};
      renderAttendance();
    } else {
      throw new Error(r.error || 'unknown error');
    }
  } catch (e) {
    console.error('saveAttendance error:', e);
    showToast('Save failed', 'error');
    haptic('error');
  }
}
