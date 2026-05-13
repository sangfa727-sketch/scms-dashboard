/**
 * SCMS v10.2 — 09_incidents.js
 * Incident recording: list, filter, add modal, save via n8n TWA.
 */

'use strict';

let _incidentType = 'All';

function renderIncidents() {
  _renderIncidentTypeChips();
  _renderIncidentList();
}

function _renderIncidentTypeChips() {
  const el = document.getElementById('incidentTypeChips');
  if (!el) return;

  const types = ['All', ...(window.APP.config?.incident_types ||
    ['Good Behaviour','Participation','Achievement','Concern','Health','Other'])];

  el.innerHTML = types.map(t =>
    `<button class="chip${t === _incidentType ? ' active' : ''}" onclick="filterIncidentType('${t}')">${t}</button>`
  ).join('');
}

window.filterIncidentType = function(type) {
  _incidentType = type;
  document.querySelectorAll('#incidentTypeChips .chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === type)
  );
  _renderIncidentList();
};

function _renderIncidentList() {
  const el = document.getElementById('incidentList');
  if (!el) return;

  let list = [...window.APP.incidents].sort((a, b) => b.date?.localeCompare(a.date));
  if (_incidentType !== 'All') list = list.filter(i => i.type === _incidentType);

  if (!list.length) {
    el.innerHTML = emptyState('⚡', 'No incidents recorded', 'Tap + to log one');
    return;
  }

  const sevColor = { Info:'#6B7280', Low:'#0891B2', Medium:'#D97706', High:'#DC2626', Critical:'#7C3AED' };
  const typeIcon  = { 'Good Behaviour':'⭐','Participation':'🙋','Achievement':'🏆','Concern':'⚠️','Health':'🏥','Other':'📋','Bullying':'🚫','Injury':'🩹' };

  el.innerHTML = list.map(i => {
    const color = sevColor[i.severity] || '#6B7280';
    const icon  = typeIcon[i.type]     || '📋';

    return `
      <div class="list-card">
        <div class="card-row">
          <div class="incident-icon">${icon}</div>
          <div class="card-info">
            <div class="card-name">${i.name_en || i.student_id || '—'}</div>
            <div class="card-sub">
              ${i.type} ·
              <span class="sev-badge" style="color:${color}">${i.severity}</span>
              · ${i.date || '—'}
            </div>
          </div>
          ${i.parent_notified ? '<span class="notif-badge" title="Parent notified">✓</span>' : ''}
        </div>
        ${i.description   ? `<div class="card-note">${i.description}</div>` : ''}
        ${i.action_taken  ? `<div class="card-action">Action: ${i.action_taken}</div>` : ''}
      </div>`;
  }).join('');
}

window.openIncidentModal = function(prefillStudent = '') {
  const students   = window.APP.students.filter(s => s.status === 'Active');
  const types      = window.APP.config?.incident_types ||
    ['Good Behaviour','Participation','Achievement','Concern','Conflict','Health','Other'];
  const severities = window.APP.config?.severities || ['Info','Low','Medium','High'];

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">Log Incident / Note</h3>

      <label class="field-label">Student</label>
      <input class="form-input" id="incStu" placeholder="Student name or ID" list="incStudentList"
        value="${prefillStudent}">
      <datalist id="incStudentList">
        ${students.map(s => `<option value="${s.name_en}">${s.name_en} (${s.class})</option>`).join('')}
      </datalist>

      <label class="field-label">Type</label>
      <div class="pill-group" id="incTypePills">
        ${types.map((t, i) => `<button class="pill ${i===0?'active':''}" onclick="togglePill(this,'incTypePills')">${t}</button>`).join('')}
      </div>

      <label class="field-label">Severity</label>
      <div class="pill-group" id="incSevPills">
        ${severities.map((s, i) => `<button class="pill ${i===0?'active':''}" onclick="togglePill(this,'incSevPills')">${s}</button>`).join('')}
      </div>

      <label class="field-label">Description</label>
      <textarea class="form-textarea" id="incDesc" rows="3" placeholder="What happened…"></textarea>

      <label class="field-label">Action taken <span class="optional">(optional)</span></label>
      <input class="form-input" id="incAction" placeholder="e.g. Spoke with student, sent note home…">

      <label class="field-label toggle-row">
        <span>Notify parent</span>
        <input type="checkbox" id="incNotify" class="toggle-check">
      </label>

      <button class="btn-primary mt16" id="saveIncBtn" onclick="saveIncident()">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(html);
};

window.saveIncident = async function() {
  const btn = document.getElementById('saveIncBtn');
  const stuName = document.getElementById('incStu').value.trim();

  if (!stuName) { showToast('Student name is required'); return; }

  btn.disabled = true; btn.textContent = 'Saving…';

  const stu = window.APP.students.find(s =>
    s.name_en?.toLowerCase() === stuName.toLowerCase() ||
    s.student_id?.toLowerCase() === stuName.toLowerCase()
  );

  try {
    const data = {
      student_id:     stu?.student_id || stuName,
      name_en:        stu?.name_en    || stuName,
      class:          stu?.class      || '',
      type:           document.querySelector('#incTypePills .pill.active')?.textContent.trim() || 'Other',
      severity:       document.querySelector('#incSevPills .pill.active')?.textContent.trim() || 'Info',
      description:    document.getElementById('incDesc').value.trim(),
      action_taken:   document.getElementById('incAction').value.trim(),
      parent_notified: document.getElementById('incNotify').checked,
      date:           new Date().toISOString().slice(0, 10),
      teacher_id:     window.APP.teacher_id,
      school_id:      window.APP.school_id,
    };

    await API.saveIncident(data);
    window.APP.incidents.unshift(data);

    closeModal();
    _renderIncidentList();
    showToast('✓ Incident logged');
    if (window.APP.tg?.HapticFeedback) window.APP.tg.HapticFeedback.notificationOccurred('success');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save';
    showToast('Save failed: ' + (e.message || 'error'));
  }
};
