/* ============================================================
   SCMS v10 — 03_utils.js
   DOM helpers, formatters, escape utilities, modal/sheet system,
   and shared UI primitives used by every page renderer.
   ============================================================ */

/* ============================================================
   DOM QUERY HELPERS
   ============================================================ */

/** Shorthand for document.querySelector. */
function $(selector, root = document) {
  return root.querySelector(selector);
}

/** Shorthand for document.querySelectorAll → real array. */
function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/**
 * Element builder.
 *
 * Usage:
 *   el('div', { class: 'card', onclick: () => {} },
 *     el('span', {}, 'Hello'),
 *     'plain text'
 *   );
 *
 * Special keys:
 *   class      → className
 *   html       → innerHTML
 *   data       → object of dataset entries
 *   onClick…   → addEventListener
 *   (others)   → setAttribute
 */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') {
      node.className = v;
    } else if (k === 'html') {
      node.innerHTML = v;
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'data' && typeof v === 'object') {
      Object.entries(v).forEach(([dk, dv]) => {
        node.dataset[dk] = dv;
      });
    } else if (v != null) {
      node.setAttribute(k, v);
    }
  }

  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }

  return node;
}

/* ============================================================
   ESCAPE / FORMAT HELPERS
   ============================================================ */

/** HTML-escape a string for safe insertion via innerHTML. */
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':  '&amp;',
    '<':  '&lt;',
    '>':  '&gt;',
    '"':  '&quot;',
    "'":  '&#39;'
  }[c]));
}

/** First-letter initials from a name (max 2 letters). */
function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

/** Map a house-color string → CSS class suffix. */
function houseClass(h) {
  if (!h) return '';
  const s = String(h).toLowerCase();
  if (s.includes('blue'))   return 'h-blue';
  if (s.includes('yellow')) return 'h-yellow';
  if (s.includes('green'))  return 'h-green';
  if (s.includes('red'))    return 'h-red';
  return '';
}

/** Format a date string as "Dec 1, 2025". */
function formatDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric'
    });
  } catch (e) {
    return String(d);
  }
}

/** Format a time string "08:00:00" → "08:00". */
function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

/* ============================================================
   TOAST
   ============================================================ */

/**
 * Show a transient toast at the bottom of the screen.
 * Types: '', 'success', 'error'
 */
function showToast(msg, type = '') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => t.classList.remove('show'), 2500);
}

/** Update the connection indicator dot (green when online, gray when off). */
function setConn(online) {
  const d = $('#connDot');
  if (d) d.classList.toggle('off', !online);
}

/* ============================================================
   MODAL / BOTTOM SHEET
   ============================================================ */

/**
 * Open a bottom sheet with the given title and body element.
 * Tapping the dim overlay or pressing ESC closes it.
 *
 * Usage:
 *   openSheet('Edit Student',
 *     el('div', {}, …form contents…)
 *   );
 */
function openSheet(title, body) {
  const overlay = $('#modalOverlay');
  overlay.innerHTML = '';

  const closeBtn = el('button', {
    class: 'sheet-close',
    onclick: closeSheet,
    'aria-label': 'Close'
  });
  closeBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<path d="M18 6 6 18M6 6l12 12"/>' +
    '</svg>';

  const sheet = el('div', { class: 'sheet' },
    el('div', { class: 'sheet-handle' }),
    el('div', { class: 'sheet-header' },
      el('div', { class: 'sheet-title' }, title),
      closeBtn
    ),
    el('div', { class: 'sheet-body' }, body)
  );

  overlay.appendChild(sheet);
  overlay.classList.add('open');
  document.body.classList.add('no-scroll');
  haptic('light');

  // Dismiss when tapping outside the sheet
  overlay.onclick = (e) => {
    if (e.target === overlay) closeSheet();
  };
}

/** Close any open bottom sheet. */
function closeSheet() {
  const overlay = $('#modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */

/**
 * Build a stat card.
 *
 * Usage:
 *   statCard(42, 'Students')        // normal card
 *   statCard('17/20', 'Marked', true) // accent card (brand color)
 */
function statCard(value, label, accent = false) {
  return el('div', { class: 'stat-card' + (accent ? ' accent' : '') },
    el('div', { class: 'stat-value' }, String(value)),
    el('div', { class: 'stat-label' }, label)
  );
}

/**
 * Build a filter chip with optional count badge.
 *
 * Usage:
 *   makeChip('P4', 'P4 Online', 7, isActive, () => { … })
 */
function makeChip(value, label, count, active, onClick) {
  const chip = el('button', {
    class: 'chip' + (active ? ' active' : ''),
    onclick: () => { haptic('selection'); onClick(); }
  },
    el('span', {}, label)
  );
  if (count != null) {
    chip.appendChild(el('span', { class: 'chip-count' }, String(count)));
  }
  return chip;
}

/**
 * Build an empty-state placeholder.
 *
 * Usage:
 *   emptyState('No students', 'Add one with +', '👥')
 */
function emptyState(title, text, icon = '📋') {
  return el('div', { class: 'empty' },
    el('div', { class: 'empty-icon' }, icon),
    el('div', { class: 'empty-title' }, title),
    el('div', { class: 'empty-text' }, text)
  );
}

/** Return sorted unique class names from State.students. */
function getClasses() {
  return [...new Set(State.students.map(s => s.class).filter(Boolean))].sort();
}

/* ============================================================
   ICON LIBRARY (for action buttons in detail sheets)
   ============================================================ */

const ICONS = {
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  msg:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  alert:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  plus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  book:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
};

/** Look up an icon by name. Returns SVG string or empty string. */
function icon(name) {
  return ICONS[name] || '';
}

/**
 * Build an action button with an icon and label.
 * Used in student-detail sheets.
 */
function actionBtn(label, iconHTML, onclick) {
  const btn = el('button', { class: 'action-btn', onclick });
  btn.innerHTML = iconHTML;
  btn.appendChild(el('span', {}, label));
  return btn;
}
