/**
 * SCMS v10.2 — 15_settings.js
 * Settings panel: no URL/key setup needed (multi-tenant auto-detect).
 * Only developer-level overrides available here for testing.
 */

'use strict';

// Settings panel — opened from header settings icon (removed in v10.2)
// Kept as no-op for compatibility

window.openSettings = function() {
  const html = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <h3 class="modal-title">About SCMS</h3>

      <div class="info-row"><span>Version</span><span>v${SCMS_CONFIG.VERSION}</span></div>
      <div class="info-row"><span>School</span><span>${window.APP.school_name}</span></div>
      <div class="info-row"><span>Teacher</span><span>${window.APP.teacher_name}</span></div>
      <div class="info-row"><span>Role</span><span>${window.APP.teacher_role}</span></div>
      <div class="info-row"><span>Mode</span><span>${window.APP.demo ? 'Demo (preview)' : 'Live'}</span></div>

      <p style="font-size:12px;color:var(--muted);margin-top:16px;line-height:1.6">
        SCMS is managed by your school administrator.
        For changes to school settings, contact your admin
        or use the Telegram bot commands.
      </p>

      <button class="btn-secondary mt16" onclick="closeModal()">Close</button>
    </div>`;

  openModal(html);
};
