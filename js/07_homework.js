/**
 * SCMS v11 — 07_homework.js
 * Homework log: list by class, add homework modal, save via n8n TWA.
 */

'use strict';

let _hwClass = null;

function renderHomework() {
  const el = document.getElementById('hwClassChips');
  if (!el) return;

  const classes = [...new Set(
    window.APP.students.filter(s => s.status === 'Active').map(s => s.class).filter(Boolean)
  )].sort();

  if ((!_hwClass || !classes.includes(_hwClass)) && classes.length) _hwClass = classes[0];

  el.innerHTML = classes.map(c =>
    `<button class="chip${c === _hwClass ? ' active' : ''}" data-class="${esc(c)}" onclick="selectHwClass('${esc(c)}')">${esc(c)}</button>`
  ).join('');

  _renderHwList();
}

window.selectHwClass = function(cls) {
  _hwClass = cls;
  document.querySelectorAll('#hwClassChips .chip').forEach(b =>
    b.classList.toggle('active', b.dataset.class === cls)
  );
  _renderHwList();
};

function _renderHwList() {
  const el = document.getElementById('hwList');
  if (!el) return;

  const list = window.APP.homework
    .filter(h => !_hwClass || h.class === _hwClass)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!list.length) {
    el.innerHTML = emptyState('📚', 'No homework recorded', 'Tap + to add');
    return;
  }

  const typeColors = { Homework:'#4F46E5', Lesson:'#0891B2', Test:'#DC2626', Quiz:'#D97706', Project:'#059669' };

  el.innerHTML = list.map(h => {
    const color = typeColors[h.type] || '#6B7280';
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="hw-type-dot" style="background:${color}"></div>
          <div class="card-info">
            <div class="card-name">${esc(h.subject || '—')} <span class="type-tag" style="color:${color}">${esc(h.type || '')}</span></div>
            <div class="card-sub">${esc(h.class || '—')} · ${esc(h.date || '—')}${h.due_date ? ' · Due: '+esc(h.due_date) : ''}</div>
            ${h.description ? `<div class="card-note">${esc(h.description)}</div>` : ''}
          </div>
        </div>
        ${h.lb_page || h.wb_page ? `
          <div class="hw-pages">
            ${h.lb_page ? `📖 LB p.${esc(h.lb_page)}` : ''}
            ${h.wb_page ? `📔 WB p.${esc(h.wb_page)}` : ''}
          </div>` : ''}
      </div>`;
  }).join('');
}

window.openHomeworkModal = function() {
  const subjects = window.APP.config?.subjects || ['Mathematics','English','Science','Social Studies'];
  const types    = window.APP.config?.homework_types || ['Homework','Lesson','Test','Quiz','Project','Worksheet'];
  const classes  = [...new Set(window.APP.students.map(s => s.class).filter(Boolean))].sort();

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">Add Homework / Lesson</h3>

      <label class="field-label">Subject</label>
      <select class="form-input" id="hwSubject">
        ${subjects.map(s => `<option>${esc(s)}</option>`).join('')}
      </select>

      <label class="field-label">Class</label>
      <select class="form-input" id="hwClass">
        ${classes.map(c => `<option ${c === _hwClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>

      <label class="field-label">Type</label>
      <div class="pill-group" id="hwTypePills">
        ${types.map((t, i) => `<button type="button" class="pill ${i===0?'active':''}" onclick="togglePill(this,'hwTypePills')">${esc(t)}</button>`).join('')}
      </div>

      <label class="field-label">Description</label>
      <textarea class="form-textarea" id="hwDesc" rows="2" placeholder="What was assigned…"></textarea>

      <div class="form-row">
        <div class="form-col">
          <label class="field-label">LB page <span class="optional">(opt)</span></label>
          <input class="form-input" id="hwLb" placeholder="e.g. 42">
        </div>
        <div class="form-col">
          <label class="field-label">WB page <span class="optional">(opt)</span></label>
          <input class="form-input" id="hwWb" placeholder="e.g. 18">
        </div>
      </div>

      <label class="field-label">Due date <span class="optional">(optional)</span></label>
      <input class="form-input" id="hwDue" type="date">

      <button class="btn-primary mt16" id="saveHwBtn" onclick="saveHomework()">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(html);
};

window.saveHomework = async function() {
  const btn = document.getElementById('saveHwBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    const data = {
      subject:     document.getElementById('hwSubject').value,
      class:       document.getElementById('hwClass').value,
      type:        document.querySelector('#hwTypePills .pill.active')?.textContent.trim() || 'Homework',
      description: document.getElementById('hwDesc').value.trim(),
      lb_page:     document.getElementById('hwLb').value.trim(),
      wb_page:     document.getElementById('hwWb').value.trim(),
      due_date:    document.getElementById('hwDue').value || null,
      date:        new Date().toISOString().slice(0, 10),
      teacher_id:  window.APP.teacher_id,
      school_id:   window.APP.school_id,
    };

    await API.saveHomework(data);
    window.APP.homework.unshift(data);

    closeModal();
    _renderHwList();
    showToast('✓ Homework saved');
    if (window.APP.tg?.HapticFeedback) window.APP.tg.HapticFeedback.notificationOccurred('success');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save';
    showToast('Save failed: ' + (e.message || 'error'));
  }
};
