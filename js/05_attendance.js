/**
 * SCMS v10.2 — 05_attendance.js
 * Attendance marking: class picker → student grid → save via n8n RPC.
 */

'use strict';

let _attendClass   = null;
let _attendDate    = new Date().toISOString().slice(0, 10);
let _attendMarks   = {};   // { student_id: status_code }

function renderAttendance() {
  _renderDateStrip();
  _renderAttendClassChips();
  _renderAttendStats();
}

// ─── Date strip (last 7 days) ─────────────────────────────────────────────

function _renderDateStrip() {
  const strip = document.getElementById('dateStrip');
  if (!strip) return;
  const today = new Date();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const num = d.getDate();
    const active = iso === _attendDate ? ' active' : '';
    html += `<button class="date-chip${active}" onclick="selectAttendDate('${iso}')">${day}<span>${num}</span></button>`;
  }
  strip.innerHTML = html;
}

window.selectAttendDate = function(iso) {
  _attendDate  = iso;
  _attendMarks = {};
  _renderDateStrip();
  if (_attendClass) _renderAttendGrid(_attendClass);
};

// ─── Class chips ──────────────────────────────────────────────────────────

function _renderAttendClassChips() {
  const el = document.getElementById('attendClassChips');
  if (!el) return;

  const classes = [...new Set(
    window.APP.students
      .filter(s => s.status === 'Active')
      .map(s => s.class).filter(Boolean)
  )].sort();

  if (!classes.length) {
    el.innerHTML = '<span class="chip-empty">No classes — add students first</span>';
    return;
  }

  if (!_attendClass) _attendClass = classes[0];

  el.innerHTML = classes.map(c => `
    <button class="chip${c === _attendClass ? ' active' : ''}" onclick="selectAttendClass('${c}')">
      ${c}
    </button>
  `).join('');

  _renderAttendGrid(_attendClass);
}

window.selectAttendClass = function(cls) {
  _attendClass = cls;
  _attendMarks = {};
  document.querySelectorAll('#attendClassChips .chip').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === cls);
  });
  _renderAttendGrid(cls);
};

// ─── Attendance grid ──────────────────────────────────────────────────────

function _renderAttendGrid(cls) {
  const el = document.getElementById('attendList');
  if (!el) return;

  const students = window.APP.students.filter(s => s.class === cls && s.status === 'Active');
  if (!students.length) {
    el.innerHTML = emptyState('📋', `No active students in ${cls}`);
    return;
  }

  // Pre-fill marks from existing attendance data
  const existing = window.APP.attendance.filter(
    a => a.class === cls && a.date === _attendDate
  );
  existing.forEach(a => { _attendMarks[a.student_id] = a.status; });

  const codes = window.APP.config?.attendance_codes || [
    { code: 'P', label: 'Present', color: '#10B981' },
    { code: 'A', label: 'Absent',  color: '#EF4444' },
    { code: 'L', label: 'Leave',   color: '#3B82F6' },
    { code: 'T', label: 'Tardy',   color: '#F59E0B' },
    { code: 'S', label: 'Sick',    color: '#EF4444' },
  ];

  el.innerHTML = students.map(s => {
    const current = _attendMarks[s.student_id] || 'P';
    const btns = codes.map(c => {
      const sel = c.code === current ? ' sel' : '';
      return `<button class="att-code${sel}" style="--att-color:${c.color}"
        onclick="markAttend('${s.student_id}','${c.code}')" title="${c.label}">${c.code}</button>`;
    }).join('');

    return `
      <div class="attend-row" id="arow-${s.student_id}">
        <div class="attend-name">
          <span class="att-avatar">${(s.name_en||'?')[0]}</span>
          <span>${s.name_en || s.name_local || s.student_id}</span>
        </div>
        <div class="att-codes">${btns}</div>
      </div>`;
  }).join('');

  _renderAttendStats();
}

window.markAttend = function(studentId, code) {
  _attendMarks[studentId] = code;

  // Update button visuals
  const row = document.getElementById(`arow-${studentId}`);
  if (row) {
    row.querySelectorAll('.att-code').forEach(b => {
      b.classList.toggle('sel', b.textContent === code);
    });
  }
  _renderAttendStats();
};

// ─── Stats bar ─────────────────────────────────────────────────────────────

function _renderAttendStats() {
  const el = document.getElementById('attendStats');
  if (!el || !_attendClass) return;

  const students = window.APP.students.filter(s => s.class === _attendClass && s.status === 'Active');
  const total = students.length;
  const marked = Object.keys(_attendMarks).length;
  const present = Object.values(_attendMarks).filter(v => v === 'P').length;
  const absent  = Object.values(_attendMarks).filter(v => ['A', 'S'].includes(v)).length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${total}</div>
      <div class="stat-lbl">Total</div>
    </div>
    <div class="stat-card green">
      <div class="stat-num">${present}</div>
      <div class="stat-lbl">Present</div>
    </div>
    <div class="stat-card red">
      <div class="stat-num">${absent}</div>
      <div class="stat-lbl">Absent</div>
    </div>
    <div class="stat-card muted">
      <div class="stat-num">${marked}/${total}</div>
      <div class="stat-lbl">Marked</div>
    </div>
  `;
}

// ─── Save attendance ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnSaveAttendance');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!_attendClass) { showToast('Select a class first'); return; }

    const students = window.APP.students.filter(s => s.class === _attendClass && s.status === 'Active');
    if (!students.length) { showToast('No students in this class'); return; }

    // Build records — default unmarked to 'P'
    const records = students.map(s => ({
      student_id: s.student_id,
      status:     _attendMarks[s.student_id] || 'P',
    }));

    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      await API.saveAttendance(_attendClass, _attendDate, records);

      // Update local cache
      const existing = window.APP.attendance.filter(
        a => !(a.class === _attendClass && a.date === _attendDate)
      );
      const newRows = records.map(r => ({
        ...r,
        class:      _attendClass,
        date:       _attendDate,
        school_id:  window.APP.school_id,
        teacher_id: window.APP.teacher_id,
      }));
      window.APP.attendance = [...existing, ...newRows];

      showToast(`✓ Attendance saved for ${_attendClass} — ${_attendDate}`);
      _renderAttendStats();

      if (window.APP.tg?.HapticFeedback) {
        window.APP.tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (e) {
      showToast('Save failed: ' + (e.message || 'Network error'));
      if (window.APP.tg?.HapticFeedback) {
        window.APP.tg.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
      </svg>Save Attendance`;
    }
  });
});
