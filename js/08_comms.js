/**
 * SCMS v10.2 — 08_comms.js
 * Parent communications list + broadcast modal.
 */

'use strict';

let _commsType = 'All';

function renderComms() {
  const el = document.getElementById('commsTypeChips');
  if (!el) return;

  const types = ['All','General','Absent Alert','Daily Report','Praise','Incident','Homework','Broadcast'];
  el.innerHTML = types.map(t =>
    `<button class="chip${t === _commsType ? ' active' : ''}"
      onclick="filterCommsType('${t}')">${t}</button>`
  ).join('');

  _renderCommsList();
}

window.filterCommsType = function(type) {
  _commsType = type;
  document.querySelectorAll('#commsTypeChips .chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === type)
  );
  _renderCommsList();
};

function _renderCommsList() {
  const el = document.getElementById('commsList');
  if (!el) return;

  let list = [...window.APP.parentComms].sort((a, b) => b.date?.localeCompare(a.date));
  if (_commsType !== 'All') list = list.filter(c => c.type === _commsType);

  if (!list.length) {
    el.innerHTML = emptyState('💬', 'No messages yet', 'Comms will appear here after you send them');
    return;
  }

  const typeIcon = { 'Daily Report':'📋','Absent Alert':'🚨','Praise':'⭐','Incident':'⚡','Homework':'📚','Broadcast':'📢','General':'💬' };

  el.innerHTML = list.map(c => `
    <div class="list-card">
      <div class="card-row">
        <div class="comm-icon">${typeIcon[c.type] || '💬'}</div>
        <div class="card-info">
          <div class="card-name">${c.name_en || 'Class broadcast'}</div>
          <div class="card-sub">${c.type} · ${fmtDate(c.date)}</div>
          ${c.message_preview ? `<div class="card-note">${c.message_preview.slice(0, 80)}${c.message_preview.length > 80 ? '…' : ''}</div>` : ''}
        </div>
        <span class="status-dot ${c.status === 'Sent' ? 'dot-sent' : 'dot-queued'}" title="${c.status}"></span>
      </div>
    </div>`
  ).join('');
}

window.openParentCommModal = function() {
  const students = window.APP.students.filter(s => s.status === 'Active');
  const classes  = [...new Set(students.map(s => s.class).filter(Boolean))].sort();

  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">Send Parent Message</h3>

      <label class="field-label">Send to</label>
      <div class="pill-group" id="commTargetPills">
        <button class="pill active" onclick="togglePill(this,'commTargetPills');toggleCommTarget('class')">Class</button>
        <button class="pill" onclick="togglePill(this,'commTargetPills');toggleCommTarget('student')">Individual</button>
      </div>

      <div id="commClassTarget">
        <label class="field-label">Class</label>
        <select class="form-input" id="commClass">
          ${classes.map(c => `<option>${c}</option>`).join('')}
        </select>
      </div>
      <div id="commStudentTarget" style="display:none">
        <label class="field-label">Student</label>
        <input class="form-input" id="commStu" placeholder="Student name" list="commStuList">
        <datalist id="commStuList">
          ${students.map(s => `<option value="${s.name_en}">${s.name_en} (${s.class})</option>`).join('')}
        </datalist>
      </div>

      <label class="field-label">Message</label>
      <textarea class="form-textarea" id="commMsg" rows="4" placeholder="Type your message to parents…"></textarea>

      <button class="btn-primary mt16" id="sendCommBtn" onclick="sendParentComm()">Send Message</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(html);
};

window.toggleCommTarget = function(target) {
  document.getElementById('commClassTarget').style.display   = target === 'class'   ? 'block' : 'none';
  document.getElementById('commStudentTarget').style.display = target === 'student' ? 'block' : 'none';
};

window.sendParentComm = async function() {
  const btn = document.getElementById('sendCommBtn');
  const msg = document.getElementById('commMsg').value.trim();
  if (!msg) { showToast('Message is required'); return; }

  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await API.sendParentComm({
      message_preview: msg,
      class:           document.getElementById('commClass')?.value || '',
      name_en:         document.getElementById('commStu')?.value   || '',
      type:            'General',
    });
    closeModal();
    showToast('✓ Message sent');
    if (window.APP.tg?.HapticFeedback) window.APP.tg.HapticFeedback.notificationOccurred('success');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Send Message';
    showToast('Failed: ' + (e.message || 'error'));
  }
};
