/**
 * SCMS v11 — 10_timetable.js
 * Weekly timetable view with day tabs.
 */

'use strict';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
let _ttDay = DAYS[Math.min(Math.max(new Date().getDay() - 1, 0), 4)];

function renderTimetable() {
  _renderDayTabs();
  _renderTtClassChips();
}

function _renderDayTabs() {
  const el = document.getElementById('dayTabs');
  if (!el) return;

  const today = DAYS[Math.min(Math.max(new Date().getDay() - 1, 0), 4)];

  el.innerHTML = DAYS.map(d => `
    <button class="day-tab ${d === _ttDay ? 'active' : ''} ${d === today ? 'today' : ''}"
      data-day="${d}" onclick="selectTtDay('${d}')">${d.slice(0,3)}</button>
  `).join('');
}

window.selectTtDay = function(day) {
  _ttDay = day;
  document.querySelectorAll('.day-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.day === day)
  );
  _renderTtList();
};

function _renderTtClassChips() {
  const el = document.getElementById('ttClassChips');
  if (!el) return;
  el.innerHTML = '';
  _renderTtList();
}

function _renderTtList() {
  const el = document.getElementById('timetableList');
  if (!el) return;

  const entries = window.APP.timetable.filter(t => t.day === _ttDay)
    .sort((a, b) => (a.period || 0) - (b.period || 0));

  if (!entries.length) {
    el.innerHTML = emptyState('📅', `No classes on ${_ttDay}`, 'Admin manages the timetable');
    return;
  }

  el.innerHTML = entries.map(t => `
    <div class="tt-row">
      <div class="tt-period">${esc(String(t.period || '?'))}</div>
      <div class="tt-info">
        <div class="tt-subject">${esc(t.subject || '—')}</div>
        <div class="tt-meta">${esc(t.class || '—')} ${t.room ? '· Room ' + esc(t.room) : ''}</div>
      </div>
      <div class="tt-time">${esc(t.start_time || '')}</div>
    </div>`
  ).join('');

  const sub = document.getElementById('timetableSubtitle');
  if (sub) sub.textContent = `${entries.length} period${entries.length !== 1 ? 's' : ''} on ${_ttDay}`;
}
