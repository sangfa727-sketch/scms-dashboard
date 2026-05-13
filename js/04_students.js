/**
 * SCMS v10.2 — 04_students.js
 * Student roster: list, search, filter by class, add new student modal.
 */

'use strict';

let _stuClass  = 'All';
let _stuSearch = '';

function renderStudents() {
  _renderStudentStats();
  _renderClassChips();
  _renderStudentList();
}

// ─── Stats ────────────────────────────────────────────────────────────────

function _renderStudentStats() {
  const el = document.getElementById('studentStats');
  if (!el) return;

  const active   = window.APP.students.filter(s => s.status === 'Active').length;
  const classes  = new Set(window.APP.students.map(s => s.class).filter(Boolean)).size;
  const today    = new Date().toISOString().slice(0, 10);
  const presents = window.APP.attendance.filter(a => a.date === today && a.status === 'P').length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${active}</div>
      <div class="stat-lbl">Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${classes}</div>
      <div class="stat-lbl">Classes</div>
    </div>
    <div class="stat-card green">
      <div class="stat-num">${presents}</div>
      <div class="stat-lbl">Here today</div>
    </div>
  `;

  const subtitle = document.getElementById('studentsSubtitle');
  if (subtitle) subtitle.textContent = `${active} active students across ${classes} class${classes !== 1 ? 'es' : ''}`;
}

// ─── Class filter chips ────────────────────────────────────────────────────

function _renderClassChips() {
  const el = document.getElementById('classChips');
  if (!el) return;

  const classes = ['All', ...[...new Set(
    window.APP.students.filter(s => s.status === 'Active').map(s => s.class).filter(Boolean)
  )].sort()];

  el.innerHTML = classes.map(c =>
    `<button class="chip${c === _stuClass ? ' active' : ''}" onclick="filterStuClass('${c}')">${c}</button>`
  ).join('');
}

window.filterStuClass = function(cls) {
  _stuClass = cls;
  document.querySelectorAll('#classChips .chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === cls)
  );
  _renderStudentList();
};

// ─── Search ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('studentSearchInput');
  const clear = document.getElementById('studentSearchClear');
  if (!input) return;

  input.addEventListener('input', () => {
    _stuSearch = input.value.trim().toLowerCase();
    clear.style.display = _stuSearch ? 'flex' : 'none';
    _renderStudentList();
  });

  clear.addEventListener('click', () => {
    input.value = '';
    _stuSearch  = '';
    clear.style.display = 'none';
    _renderStudentList();
  });
});

// ─── Student list ──────────────────────────────────────────────────────────

function _renderStudentList() {
  const el = document.getElementById('studentList');
  if (!el) return;

  let list = window.APP.students.filter(s => s.status === 'Active');

  if (_stuClass !== 'All') {
    list = list.filter(s => s.class === _stuClass);
  }
  if (_stuSearch) {
    list = list.filter(s =>
      (s.name_en    || '').toLowerCase().includes(_stuSearch) ||
      (s.name_local || '').toLowerCase().includes(_stuSearch) ||
      (s.student_id || '').toLowerCase().includes(_stuSearch) ||
      (s.class      || '').toLowerCase().includes(_stuSearch)
    );
  }

  if (!list.length) {
    el.innerHTML = emptyState('👥', 'No students found',
      _stuSearch ? 'Try a different search term' : 'Tap + to add a student');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  el.innerHTML = list.map(s => {
    const att = window.APP.attendance.find(
      a => a.date === today && a.student_id === s.student_id
    );
    const attCode  = att?.status || '—';
    const codes    = window.APP.config?.attendance_codes || [];
    const codeInfo = codes.find(c => c.code === attCode);
    const attColor = codeInfo?.color || '#999';
    const attLabel = codeInfo?.label || 'Not marked';

    return `
      <div class="list-card" onclick="openStudentDetail('${s.student_id}')">
        <div class="card-row">
          <div class="card-avatar" style="background:${_classColor(s.class)}">${(s.name_en||'?')[0]}</div>
          <div class="card-info">
            <div class="card-name">${s.name_en || s.name_local || s.student_id}</div>
            <div class="card-sub">
              <span class="class-tag">${s.class || '—'}</span>
              ${s.name_local && s.name_local !== s.name_en
                ? `<span class="name-local">${s.name_local}</span>` : ''}
            </div>
          </div>
          <span class="att-pill" style="--pill-color:${attColor}" title="${attLabel}">${attCode}</span>
        </div>
        ${s.parent_name ? `<div class="card-parent">👤 ${s.parent_name}${s.parent_phone ? ' · ' + s.parent_phone : ''}</div>` : ''}
      </div>`;
  }).join('');
}

function _classColor(cls) {
  const colors = ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED','#DB2777'];
  if (!cls) return colors[0];
  return colors[cls.charCodeAt(0) % colors.length];
}

// ─── Student detail ────────────────────────────────────────────────────────

window.openStudentDetail = function(studentId) {
  const s = window.APP.students.find(x => x.student_id === studentId);
  if (!s) return;

  const reports  = window.APP.dailyReports.filter(r => r.student_id === studentId).slice(0, 5);
  const incidents = window.APP.incidents.filter(i => i.student_id === studentId).slice(0, 3);

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="detail-header">
        <div class="detail-avatar" style="background:${_classColor(s.class)}">${(s.name_en||'?')[0]}</div>
        <div>
          <h3 class="modal-title mb0">${s.name_en || s.name_local}</h3>
          ${s.name_local && s.name_local !== s.name_en ? `<div class="detail-local">${s.name_local}</div>` : ''}
          <div class="detail-meta">
            <span class="class-tag">${s.class}</span>
            <span class="id-tag">${s.student_id}</span>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        ${_detailRow('Gender', s.gender || '—')}
        ${_detailRow('Grade',  s.grade  || '—')}
        ${_detailRow('Parent', s.parent_name  || '—')}
        ${_detailRow('Phone',  s.parent_phone || '—')}
        ${_detailRow('Telegram', s.parent_tg_id || '—')}
      </div>

      ${reports.length ? `
        <div class="detail-section">Recent reports</div>
        ${reports.map(r => `
          <div class="mini-card">${r.date} · ${r.mood || '—'} · Meal: ${r.meal || '—'}</div>`).join('')}
      ` : ''}

      ${incidents.length ? `
        <div class="detail-section">Recent incidents</div>
        ${incidents.map(i => `
          <div class="mini-card incident-card">${i.date} · ${i.type} · ${i.severity}</div>`).join('')}
      ` : ''}

      <button class="btn-secondary mt16" onclick="closeModal()">Close</button>
    </div>`;

  openModal(html);
};

function _detailRow(label, value) {
  return `<div class="detail-row"><span class="detail-lbl">${label}</span><span class="detail-val">${value}</span></div>`;
}

// ─── Add student modal ────────────────────────────────────────────────────

window.openAddStudentModal = function() {
  const grades  = window.APP.config?.grades  || ['KG','P1','P2','P3','P4','P5','P6'];
  const classes = [...new Set(window.APP.students.map(s => s.class).filter(Boolean))].sort();

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">Add New Student</h3>

      <label class="field-label">Local name (Myanmar / native)</label>
      <input class="form-input" id="newStuLocal" placeholder="ကျောင်းသားနာမည်…">

      <label class="field-label">English name</label>
      <input class="form-input" id="newStuEn" placeholder="Full English name">

      <label class="field-label">Class</label>
      <input class="form-input" id="newStuClass" placeholder="e.g. P3, KG-A" list="classList">
      <datalist id="classList">
        ${classes.map(c => `<option value="${c}">`).join('')}
      </datalist>

      <label class="field-label">Grade</label>
      <select class="form-input" id="newStuGrade">
        ${grades.map(g => `<option>${g}</option>`).join('')}
      </select>

      <label class="field-label">Gender</label>
      <div class="pill-group" id="genderPills">
        <button class="pill" onclick="togglePill(this,'genderPills')">M</button>
        <button class="pill" onclick="togglePill(this,'genderPills')">F</button>
        <button class="pill" onclick="togglePill(this,'genderPills')">Other</button>
      </div>

      <label class="field-label">Parent name</label>
      <input class="form-input" id="newStuParent" placeholder="Parent / guardian name">

      <label class="field-label">Parent phone</label>
      <input class="form-input" id="newStuPhone" type="tel" placeholder="+95 9 xxx xxx xxx">

      <label class="field-label">Parent Telegram ID <span class="optional">(optional)</span></label>
      <input class="form-input" id="newStuTg" placeholder="Telegram user ID number">

      <button class="btn-primary mt16" id="saveStudentBtn" onclick="saveNewStudent()">
        Register Student
      </button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(html);
};

window.saveNewStudent = async function() {
  const btn = document.getElementById('saveStudentBtn');

  const name_local = document.getElementById('newStuLocal').value.trim();
  const name_en    = document.getElementById('newStuEn').value.trim();
  const cls        = document.getElementById('newStuClass').value.trim();
  const grade      = document.getElementById('newStuGrade').value;
  const gender     = document.querySelector('#genderPills .pill.active')?.textContent.trim() || '';
  const parent_name  = document.getElementById('newStuParent').value.trim();
  const parent_phone = document.getElementById('newStuPhone').value.trim();
  const parent_tg_id = document.getElementById('newStuTg').value.trim();

  if (!name_en)  { showToast('English name is required'); return; }
  if (!cls)      { showToast('Class is required'); return; }

  btn.disabled = true;
  btn.textContent = 'Registering…';

  try {
    const result = await API.registerStudent({
      name_local:   name_local || name_en,
      name_mm:      name_local || name_en,
      name_en,
      class: cls,
      grade,
      gender,
      parent_name,
      parent_phone,
      parent_tg_id,
      school_id:    window.APP.school_id,
      teacher_id:   window.APP.teacher_id,
    });

    // The result from TWA should include the new student row
    const newStudent = result?.student || result?.data || {
      student_id: result?.student_id || 'STU-???',
      name_en, name_local, class: cls, grade, gender,
      parent_name, parent_phone, parent_tg_id,
      status: 'Active', school_id: window.APP.school_id,
    };

    window.APP.students.push(newStudent);

    closeModal();
    renderStudents();
    showToast(`✓ ${name_en} registered successfully`);

    if (window.APP.tg?.HapticFeedback) {
      window.APP.tg.HapticFeedback.notificationOccurred('success');
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Register Student';
    showToast('Registration failed: ' + (e.message || 'Network error'));
  }
};
