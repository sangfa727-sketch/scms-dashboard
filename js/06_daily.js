/**
 * SCMS v10.2 — 06_daily.js
 * Daily reports: list view + modal form + save via n8n TWA.
 */

'use strict';

let _dailyClass = null;

function renderDaily() {
  _renderDailyClassChips();
}

// ─── Class chips ──────────────────────────────────────────────────────────

function _renderDailyClassChips() {
  const el = document.getElementById('dailyClassChips');
  if (!el) return;

  const classes = [...new Set(
    window.APP.students.filter(s => s.status === 'Active').map(s => s.class).filter(Boolean)
  )].sort();

  if (!classes.length) {
    el.innerHTML = '';
    document.getElementById('dailyList').innerHTML = emptyState('📋', 'No classes yet', 'Add students first');
    return;
  }

  if (!_dailyClass) _dailyClass = classes[0];

  el.innerHTML = classes.map(c =>
    `<button class="chip${c === _dailyClass ? ' active' : ''}" onclick="selectDailyClass('${c}')">${c}</button>`
  ).join('');

  _renderDailyList(_dailyClass);
}

window.selectDailyClass = function(cls) {
  _dailyClass = cls;
  document.querySelectorAll('#dailyClassChips .chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === cls)
  );
  _renderDailyList(cls);
};

// ─── Daily report list ────────────────────────────────────────────────────

function _renderDailyList(cls) {
  const el = document.getElementById('dailyList');
  if (!el) return;

  const today = new Date().toISOString().slice(0, 10);
  const students = window.APP.students.filter(s => s.class === cls && s.status === 'Active');

  if (!students.length) {
    el.innerHTML = emptyState('📋', `No students in ${cls}`);
    return;
  }

  el.innerHTML = students.map(s => {
    const report = window.APP.dailyReports.find(
      r => r.date === today && (r.student_id === s.student_id || r.name_en === s.name_en)
    );

    const done = !!report;
    const mood = report?.mood || '';
    const moodMap = { Happy: '😊', OK: '😐', Tired: '😴', Sad: '😢', Energetic: '⚡' };
    const moodIcon = moodMap[mood] || mood;

    return `
      <div class="list-card ${done ? 'card-done' : ''}">
        <div class="card-row">
          <div class="card-avatar">${(s.name_en || '?')[0]}</div>
          <div class="card-info">
            <div class="card-name">${s.name_en || s.name_local}</div>
            ${done
              ? `<div class="card-sub">${moodIcon} ${mood} · Meal: ${report.meal || '—'} · Nap: ${report.nap_min ?? '—'}min</div>`
              : `<div class="card-sub card-sub-pending">Report not yet filled</div>`
            }
          </div>
          <button class="btn-icon-round ${done ? 'btn-edit' : 'btn-add'}"
            onclick="openDailyModal('${s.student_id}','${s.name_en || s.name_local}')">
            ${done ? '✎' : '+'}
          </button>
        </div>
        ${done && report.behaviour_note
          ? `<div class="card-note">${report.behaviour_note}</div>`
          : ''}
      </div>`;
  }).join('');
}

// ─── Daily report modal ───────────────────────────────────────────────────

window.openDailyModal = function(studentId, studentName) {
  const existing = window.APP.dailyReports.find(
    r => r.date === new Date().toISOString().slice(0, 10) &&
         (r.student_id === studentId || r.name_en === studentName)
  );

  const meals     = ['Full', 'Half', 'Little', 'None'];
  const moods     = ['Happy', 'OK', 'Tired', 'Sad', 'Energetic'];
  const moodEmoji = { Happy:'😊', OK:'😐', Tired:'😴', Sad:'😢', Energetic:'⚡' };

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">Daily Report — ${studentName}</h3>

      <label class="field-label">Meal today</label>
      <div class="pill-group" id="mealPills">
        ${meals.map(m => `
          <button class="pill ${existing?.meal === m ? 'active' : ''}"
            onclick="togglePill(this,'mealPills')">${m}</button>`).join('')}
      </div>

      <label class="field-label">Nap (minutes)</label>
      <input class="form-input" id="napInput" type="number" min="0" max="180" step="5"
        value="${existing?.nap_min ?? 45}" placeholder="0–180">

      <label class="field-label">Mood</label>
      <div class="pill-group" id="moodPills">
        ${moods.map(m => `
          <button class="pill ${existing?.mood === m ? 'active' : ''}"
            onclick="togglePill(this,'moodPills')">${moodEmoji[m]} ${m}</button>`).join('')}
      </div>

      <label class="field-label">Behaviour note <span class="optional">(optional)</span></label>
      <textarea class="form-textarea" id="noteInput" rows="3"
        placeholder="e.g. Very focused today, helped classmates…">${existing?.behaviour_note || ''}</textarea>

      <label class="field-label">Toilet OK? <span class="optional">(optional)</span></label>
      <div class="pill-group" id="toiletPills">
        <button class="pill ${existing?.toilet_ok === true ? 'active' : ''}"
          onclick="togglePill(this,'toiletPills')">✓ Yes</button>
        <button class="pill ${existing?.toilet_ok === false ? 'active' : ''}"
          onclick="togglePill(this,'toiletPills')">✗ No</button>
      </div>

      <button class="btn-primary mt16" id="saveDailyBtn"
        onclick="saveDailyReport('${studentId}','${studentName}')">
        Save Report
      </button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(html);
};

window.togglePill = function(btn, groupId) {
  document.querySelectorAll(`#${groupId} .pill`).forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
};

window.saveDailyReport = async function(studentId, studentName) {
  const btn = document.getElementById('saveDailyBtn');
  const meal   = document.querySelector('#mealPills .pill.active')?.textContent.trim() || '';
  const napRaw = document.getElementById('napInput')?.value;
  const mood   = document.querySelector('#moodPills .pill.active')?.textContent.trim().replace(/^\S+\s/, '') || '';
  const note   = document.getElementById('noteInput')?.value.trim() || '';
  const toilet = document.querySelector('#toiletPills .pill.active')?.textContent.includes('Yes') ?? null;

  if (!meal) { showToast('Please select a meal option'); return; }
  if (!mood) { showToast('Please select a mood'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const data = {
    student_id:     studentId,
    name_en:        studentName,
    class:          _dailyClass || '',
    date:           new Date().toISOString().slice(0, 10),
    meal,
    nap_min:        parseInt(napRaw, 10) || 0,
    mood,
    behaviour_note: note,
    toilet_ok:      toilet,
    teacher_id:     window.APP.teacher_id,
    school_id:      window.APP.school_id,
  };

  try {
    await API.saveDailyReport(data);

    // Update local cache
    window.APP.dailyReports = window.APP.dailyReports.filter(
      r => !(r.student_id === studentId && r.date === data.date)
    );
    window.APP.dailyReports.push(data);

    closeModal();
    _renderDailyList(_dailyClass);
    showToast(`✓ Report saved for ${studentName}`);

    if (window.APP.tg?.HapticFeedback) {
      window.APP.tg.HapticFeedback.notificationOccurred('success');
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Save Report';
    showToast('Save failed: ' + (e.message || 'Network error'));
  }
};

window.openDailyReportModal = openDailyModal.bind(null, '', '');
