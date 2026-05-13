/**
 * SCMS v10.2 — 12_more.js
 * More menu: quick actions, admin tools, school info.
 */

'use strict';

function renderMore() {
  const el = document.getElementById('moreMenu');
  if (!el) return;

  const isAdmin = window.APP.is_admin;

  el.innerHTML = `
    <!-- Profile card -->
    <div class="profile-card">
      <div class="profile-avatar">${(window.APP.teacher_name || '?')[0]}</div>
      <div class="profile-info">
        <div class="profile-name">${window.APP.teacher_name || '—'}</div>
        <div class="profile-role">${window.APP.teacher_role || '—'} · ${window.APP.school_name || '—'}</div>
        <div class="profile-id">${window.APP.teacher_id || '—'}</div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="more-section-title">Quick Actions</div>
    <div class="more-grid">
      <button class="more-tile" onclick="openParentCommModal()">
        <span class="more-icon">💬</span>
        <span>Message parent</span>
      </button>
      <button class="more-tile" onclick="openIncidentModal()">
        <span class="more-icon">⚡</span>
        <span>Log incident</span>
      </button>
      <button class="more-tile" onclick="openHomeworkModal()">
        <span class="more-icon">📚</span>
        <span>Add homework</span>
      </button>
      <button class="more-tile" onclick="openAddStudentModal()">
        <span class="more-icon">➕</span>
        <span>Add student</span>
      </button>
    </div>

    ${isAdmin ? `
    <!-- Admin tools -->
    <div class="more-section-title">Admin Tools</div>
    <div class="more-list">
      <button class="more-row" onclick="showAdminInfo()">
        <span class="more-row-icon">🏫</span>
        <span class="more-row-label">School settings</span>
        <span class="more-row-chevron">›</span>
      </button>
      <button class="more-row" onclick="showToast('Teacher management — coming soon')">
        <span class="more-row-icon">👥</span>
        <span class="more-row-label">Manage teachers</span>
        <span class="more-row-chevron">›</span>
      </button>
      <button class="more-row" onclick="showToast('Export to CSV — coming soon')">
        <span class="more-row-icon">📤</span>
        <span class="more-row-label">Export data</span>
        <span class="more-row-chevron">›</span>
      </button>
    </div>` : ''}

    <!-- School info -->
    <div class="more-section-title">School</div>
    <div class="more-info-card">
      <div class="info-row"><span>School ID</span><code>${window.APP.school_id || '—'}</code></div>
      <div class="info-row"><span>Students</span><span>${window.APP.students.filter(s=>s.status==='Active').length}</span></div>
      <div class="info-row"><span>Term</span><span>${window.APP.currentTerm?.term_name || '—'}</span></div>
      <div class="info-row"><span>Version</span><span>v${SCMS_CONFIG.VERSION}</span></div>
    </div>

    <div style="height: 40px;"></div>
  `;
}

window.showAdminInfo = function() {
  const cfg = window.APP.config || {};
  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">School Settings</h3>
      <div class="info-row"><span>School ID</span><code>${window.APP.school_id}</code></div>
      <div class="info-row"><span>School Name</span><span>${window.APP.school_name}</span></div>
      <div class="info-row"><span>Subjects</span><span>${(cfg.subjects || []).length}</span></div>
      <div class="info-row"><span>Att. codes</span><span>${(cfg.attendance_codes || []).map(c=>c.code).join(', ')}</span></div>
      <div class="info-row"><span>Currency</span><span>${cfg.currency || 'USD'}</span></div>
      <p style="font-size:12px;color:var(--muted);margin-top:16px">
        To update config, use /menu in the Telegram bot.
      </p>
      <button class="btn-secondary mt16" onclick="closeModal()">Close</button>
    </div>`;
  openModal(html);
};
