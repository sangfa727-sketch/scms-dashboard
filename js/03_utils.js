/**
 * SCMS v10.2 — 03_utils.js
 * Shared utility functions.
 */

'use strict';

/** Format ISO date as "Mon 12 Jan" */
window.fmtDate = function(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' });
  } catch { return iso; }
};

/** Short relative time: "2h ago", "Yesterday", etc. */
window.relTime = function(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m <   2) return 'Just now';
  if (m <  60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h <  24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d ===  1) return 'Yesterday';
  if (d <    7) return `${d} days ago`;
  return fmtDate(iso);
};

/** Debounce helper */
window.debounce = function(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/** Escape HTML */
window.esc = function(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
  );
};

/** Group array by key */
window.groupBy = function(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Other';
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
};

/** Attendance rate % */
window.attendRate = function(studentId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const records = window.APP.attendance.filter(
    a => a.student_id === studentId && a.date >= since
  );
  if (!records.length) return null;
  const present = records.filter(a => ['P', 'H'].includes(a.status)).length;
  return Math.round((present / records.length) * 100);
};
