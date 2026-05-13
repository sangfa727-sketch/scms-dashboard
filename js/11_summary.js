/**
 * SCMS v10.2 — 11_summary.js
 * Monthly summary cards.
 */

'use strict';

let _sumClass = 'All';

function renderSummary() {
  const el = document.getElementById('summaryClassChips');
  if (!el) return;

  const classes = ['All', ...[...new Set(
    window.APP.monthlySummary.map(s => s.class).filter(Boolean)
  )].sort()];

  el.innerHTML = classes.map(c =>
    `<button class="chip${c === _sumClass ? ' active' : ''}"
      onclick="filterSumClass('${c}')">${c}</button>`
  ).join('');

  _renderSummaryList();
}

window.filterSumClass = function(cls) {
  _sumClass = cls;
  document.querySelectorAll('#summaryClassChips .chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === cls)
  );
  _renderSummaryList();
};

function _renderSummaryList() {
  const el = document.getElementById('summaryList');
  if (!el) return;

  let list = window.APP.monthlySummary;
  if (_sumClass !== 'All') list = list.filter(s => s.class === _sumClass);

  if (!list.length) {
    el.innerHTML = emptyState('📊', 'No summary data yet', 'Generated automatically each month');
    return;
  }

  const gradeColor = { A:'#059669', B:'#0891B2', C:'#D97706', D:'#DC2626', F:'#7C3AED' };

  el.innerHTML = list.map(s => {
    const gColor = gradeColor[s.overall_grade?.toUpperCase()] || '#6B7280';
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-info">
            <div class="card-name">${s.name_en || s.student_id}</div>
            <div class="card-sub">${s.class || '—'} · Absent: ${s.absent_days ?? '—'} days · HW: ${s.hw_assigned ?? '—'}</div>
            ${s.notes ? `<div class="card-note">${s.notes}</div>` : ''}
          </div>
          ${s.overall_grade ? `<span class="grade-badge" style="color:${gColor}">${s.overall_grade}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}
