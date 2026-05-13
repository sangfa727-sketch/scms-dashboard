/**
 * SCMS v10.2 — 10_timetable.js
 * Weekly timetable view with day tabs.
 */

'use strict';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
let _ttDay = DAYS[Math.min(new Date().getDay() - 1, 4)];
if (_ttDay < 0 || isNaN(_ttDay)) _ttDay = DAYS[0];
if (typeof _ttDay === 'number') _ttDay = DAYS[_ttDay] || DAYS[0];

function renderTimetable() {
  _renderDayTabs();
  _renderTtClassChips();
}

function _renderDayTabs() {
  const el = document.getElementById('dayTabs');
  if (!el) return;

  const today = DAYS[Math.min(new Date().getDay() - 1, 4)];

  el.innerHTML = DAYS.map(d => `
    <button class="day-tab ${d === _ttDay ? 'active' : ''} ${d === today ? 'today' : ''}"
      onclick="selectTtDay('${d}')">${d.slice(0,3)}</button>
  `).join('');
}

window.selectTtDay = function(day) {
  _ttDay = day;
  document.querySelectorAll('.day-tab').forEach(b =>
    b.classList.toggle('active', b.textContent === day.slice(0,3))
  );
  _renderTtList();
};

function _renderTtClassChips() {
  const el = document.getElementById('ttClassChips');
  if (!el) return;
  el.innerHTML = ''; // Class chips optional — show all by default
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
      <div class="tt-period">${t.period || '?'}</div>
      <div class="tt-info">
        <div class="tt-subject">${t.subject || '—'}</div>
        <div class="tt-meta">${t.class || '—'} ${t.room ? '· Room ' + t.room : ''}</div>
      </div>
      <div class="tt-time">${t.start_time || ''}</div>
    </div>`
  ).join('');

  const sub = document.getElementById('timetableSubtitle');
  if (sub) sub.textContent = `${entries.length} period${entries.length !== 1 ? 's' : ''} on ${_ttDay}`;
}
