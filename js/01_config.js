/* ============================================================
   SCMS v10.1 — 01_config.js
   Configuration, localStorage persistence, Telegram WebApp init,
   global app state, demo data, and school-config helpers.

   NEW IN v10.1:
     • State.config        — school-customizable lists (subjects,
                              houses, grades, roles, attendance codes...)
     • State.subjects      — normalized subject records
     • State.terms         — academic terms
     • State.currentTerm   — active term
     • getConfigList(key)  — safe getter with built-in fallbacks
     • CONFIG_DEFAULTS     — used when school config is empty
   ============================================================ */

/* ---------- LOCAL STORAGE KEY ---------- */
const STORAGE_KEY = 'scms_config_v10';

/* ---------- LOAD CONFIG (from localStorage or window globals) ---------- */
function loadConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      SUPABASE_URL:  stored.SUPABASE_URL  || window.SCMS_SUPABASE_URL  || '',
      SUPABASE_ANON: stored.SUPABASE_ANON || window.SCMS_SUPABASE_ANON || '',
      WEBHOOK_URL:   stored.WEBHOOK_URL   || window.SCMS_WEBHOOK_URL   || '',
      SCHOOL_ID:     stored.SCHOOL_ID     || window.SCMS_SCHOOL_ID     || 'SCH001',
      DEMO:          !!stored.DEMO,
      VERSION:       '10.1.0'
    };
  } catch (e) {
    return {
      SUPABASE_URL:  '',
      SUPABASE_ANON: '',
      WEBHOOK_URL:   '',
      SCHOOL_ID:     'SCH001',
      DEMO:          false,
      VERSION:       '10.1.0'
    };
  }
}

/* ---------- SAVE CONFIG ---------- */
function saveConfig(patch) {
  Object.assign(CONFIG, patch);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      SUPABASE_URL:  CONFIG.SUPABASE_URL,
      SUPABASE_ANON: CONFIG.SUPABASE_ANON,
      WEBHOOK_URL:   CONFIG.WEBHOOK_URL,
      SCHOOL_ID:     CONFIG.SCHOOL_ID,
      DEMO:          CONFIG.DEMO
    }));
  } catch (e) {
    console.warn('Failed to save config:', e);
  }
}

/* ---------- GLOBAL CONFIG ---------- */
const CONFIG = loadConfig();

/* ============================================================
   SCHOOL CONFIG DEFAULTS
   These mirror rpc_get_school_config() defaults so DEMO mode
   and offline mode behave identically to live mode.
   ============================================================ */
const CONFIG_DEFAULTS = {
  subjects: [
    'Mathematics', 'English', 'Science', 'Social Studies',
    'Art', 'Music', 'PE', 'Reading', 'Library'
  ],
  houses: [
    { name: 'Blue',   emoji: '🔵', color: '#3B82F6' },
    { name: 'Yellow', emoji: '🟡', color: '#F59E0B' },
    { name: 'Green',  emoji: '🟢', color: '#10B981' },
    { name: 'Red',    emoji: '🔴', color: '#EF4444' }
  ],
  grades: [
    'KG', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
    'Year 7', 'Year 8', 'Year 9', 'Year 10',
    'Year 11', 'Year 12', 'Year 13'
  ],
  roles: [
    'Admin', 'Principal', 'Vice Principal', 'HT', 'Coordinator',
    'Teacher', 'AT', 'TA', 'Counselor', 'SENCO', 'Substitute'
  ],
  genders: ['M', 'F', 'Other', 'Non-binary', 'Prefer not to say'],
  student_statuses: [
    'Active', 'Inactive', 'Withdrawn', 'Graduated',
    'Transferred', 'On Leave', 'Suspended', 'Probation'
  ],
  teacher_statuses: [
    'pending', 'active', 'rejected', 'inactive', 'probation', 'substitute'
  ],
  homework_types: [
    'Homework', 'Lesson', 'Project', 'Quiz', 'Test',
    'Reading', 'Assignment', 'Essay', 'Lab', 'Practice', 'Worksheet'
  ],
  attendance_codes: [
    { code: 'P', label: 'Present',  color: '#10B981' },
    { code: 'A', label: 'Absent',   color: '#EF4444' },
    { code: 'L', label: 'Leave',    color: '#3B82F6' },
    { code: 'T', label: 'Tardy',    color: '#F59E0B' },
    { code: 'E', label: 'Excused',  color: '#8B5CF6' },
    { code: 'H', label: 'Half-day', color: '#EC4899' },
    { code: 'S', label: 'Sick',     color: '#EF4444' },
    { code: 'M', label: 'Medical',  color: '#EF4444' }
  ],
  severities: ['Info', 'Low', 'Medium', 'High', 'Critical'],
  comm_types: [
    'General', 'Absent Alert', 'Daily Report', 'Reminder',
    'Praise', 'Incident', 'Homework', 'Broadcast',
    'Achievement', 'Meeting', 'Newsletter'
  ],
  incident_types: [
    'Good Behaviour', 'Participation', 'Achievement',
    'Concern', 'Conflict', 'Health', 'Other',
    'Bullying', 'Late', 'Uniform', 'Equipment'
  ],
  week_start: 'Monday',
  school_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  local_language: 'English',
  currency: 'USD',
  date_format: 'YYYY-MM-DD'
};

/* ============================================================
   TELEGRAM WEB APP INIT
   ============================================================ */
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    if (tg.themeParams?.bg_color) {
      document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color);
    }
  } catch (e) { console.warn('Telegram WebApp init failed:', e); }
}

/* Haptic feedback wrapper */
function haptic(type = 'light') {
  try {
    if (tg?.HapticFeedback) {
      if (['success', 'warning', 'error'].includes(type)) {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch (e) { /* silent fail outside Telegram */ }
}

/* ============================================================
   GLOBAL APP STATE
   ============================================================ */
const State = {
  user: {
    id:    null,
    name:  '',
    role:  'AT',
    tg_id: null
  },

  schoolConfig: {},

  /* NEW v10.1: school-customizable lists */
  config: { ...CONFIG_DEFAULTS },

  /* NEW v10.1: academic terms */
  terms:       [],
  currentTerm: null,

  /* Data buckets */
  students:       [],
  attendance:     [],
  dailyReports:   [],
  homework:       [],
  parentComms:    [],
  incidents:      [],
  timetable:      [],
  subjects:       [],          // NEW v10.1
  monthlySummary: [],

  filters: {
    students:    { class: 'ALL', search: '' },
    attendDate:  todayISO(),
    attendClass: null,
    attendDraft: {},
    daily:       { class: 'ALL' },
    homework:    { class: 'ALL' },
    comms:       { type:  'ALL' },
    incidents:   { type:  'ALL' },
    timetable:   { day: getDayName(), class: 'ALL' },
    summary:     { class: 'ALL' }
  },

  currentPage: 'students'
};

/* ---------- Date helpers ---------- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getDayName(d = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

/* ============================================================
   CONFIG HELPERS  (NEW in v10.1)
   ============================================================ */

/**
 * Safely get a config list, falling back to defaults if missing.
 *
 * @param {string} key  - e.g. 'subjects', 'houses', 'genders'
 * @returns {Array}     - the list (never null/undefined)
 *
 * Usage:
 *   getConfigList('subjects')   → ['Mathematics', 'English', ...]
 *   getConfigList('houses')     → [{name,emoji,color}, ...]
 */
function getConfigList(key) {
  const fromState   = State.config?.[key];
  const fromDefault = CONFIG_DEFAULTS[key];
  if (Array.isArray(fromState) && fromState.length) return fromState;
  if (Array.isArray(fromDefault))                   return fromDefault;
  return [];
}

/**
 * Get a scalar config value (week_start, currency, date_format, etc.)
 */
function getConfigValue(key, fallback = '') {
  return State.config?.[key] ?? CONFIG_DEFAULTS[key] ?? fallback;
}

/**
 * Get the active subjects list.
 * Prefers normalized State.subjects (from `subjects` table — richer:
 * has code/color/applies_to); falls back to config_json `subjects`
 * (just strings).
 *
 * @returns {Array<{subject_code, subject_name, subject_color?, applies_to?}>}
 */
function getSubjects() {
  if (Array.isArray(State.subjects) && State.subjects.length) {
    return State.subjects.map(s => ({
      subject_code:  s.subject_code,
      subject_name:  s.subject_name,
      subject_color: s.subject_color || null,
      applies_to:    s.applies_to || null
    }));
  }
  return getConfigList('subjects').map(name => ({
    subject_code:  name.toUpperCase().replace(/\s+/g, '').slice(0, 6),
    subject_name:  name,
    subject_color: null,
    applies_to:    null
  }));
}

/**
 * Get the house list as objects (always {name, emoji, color, display}).
 * Handles both new format ({name,emoji,color}) and legacy string format
 * ("🔵 Blue").
 */
function getHouses() {
  const raw = getConfigList('houses');
  return raw.map(h => {
    if (typeof h === 'string') {
      const m = h.match(/^(\p{Emoji})\s*(.+)$/u);
      return m
        ? { name: m[2], emoji: m[1], color: null, display: h }
        : { name: h,    emoji: '',   color: null, display: h };
    }
    return {
      name:    h.name    || '',
      emoji:   h.emoji   || '',
      color:   h.color   || null,
      display: (h.emoji ? h.emoji + ' ' : '') + (h.name || '')
    };
  });
}

/**
 * Get the school's working days (for timetable filtering).
 */
function getSchoolDays() {
  return getConfigList('school_days');
}

/* ============================================================
   DEMO DATA
   ============================================================ */
const DEMO = {
  schoolConfig: {
    school_id:     'SCH001',
    school_name:   'Example International School',
    academic_year: '2025-2026',
    status:        'active'
  },

  config: { ...CONFIG_DEFAULTS },

  currentTerm: {
    id: 1, school_id: 'SCH001', academic_year: '2025-2026',
    term_name: 'Term 1', term_order: 1,
    start_date: '2025-09-01', end_date: '2025-12-20', is_current: true
  },

  terms: [
    { id: 1, school_id: 'SCH001', academic_year: '2025-2026',
      term_name: 'Term 1', term_order: 1,
      start_date: '2025-09-01', end_date: '2025-12-20', is_current: true }
  ],

  user: { teacher_id: 'T001', teacher_name: 'Ma Aye Myat Thu', role: 'AT' },

  students: [
    { student_id: 'A1', name_mm: 'Aung Chan Nyein',     name_en: 'Adam',    class: 'P4 Online', grade: 'P4',     house_color: '🔵 Blue',   gender: 'M', date_of_birth: '2015-06-12', enrollment_date: '2025-06-01', parent_name: 'U Aung Thu',   parent_phone: '09400541xxx', parent_phone2: '09450026xxx', status: 'Active' },
    { student_id: 'E1', name_mm: 'Eaint Twal Tar Khin', name_en: 'Ruby',    class: 'P4 Online', grade: 'P4',     house_color: '🟡 Yellow', gender: 'F', date_of_birth: '2015-03-22', enrollment_date: '2025-06-01', parent_name: 'Daw Khin May', parent_phone: '095409xxx', status: 'Active' },
    { student_id: 'H6', name_mm: 'Hannah Chit',         name_en: 'Hannah',  class: 'P4 Online', grade: 'P4',     house_color: '🟡 Yellow', gender: 'F', date_of_birth: '2015-09-05', enrollment_date: '2025-06-01', parent_name: 'U Chit Ko',    parent_phone: '094445xxx', status: 'Active' },
    { student_id: 'H7', name_mm: 'Hein Zayar Htet',     name_en: 'Sid',     class: 'P4 Online', grade: 'P4',     house_color: '🟢 Green',  gender: 'M', date_of_birth: '2015-11-18',                                  parent_name: 'Daw Aye Myat', parent_phone: '097876xxx', status: 'Active' },
    { student_id: 'H8', name_mm: 'Hsu Htoo Zayar',      name_en: 'Laura',   class: 'P4 Online', grade: 'P4',     house_color: '🟢 Green',  gender: 'F',                                                              parent_name: 'U Htoo Zayar', parent_phone: '099724xxx', status: 'Active' },
    { student_id: 'H9', name_mm: 'Hsu Manaw Phyu',      name_en: 'Heather', class: 'P4 Online', grade: 'P4',     house_color: '🔵 Blue',   gender: 'F',                                                              parent_name: 'Daw Manaw',    parent_phone: '097999xxx', status: 'Active' },
    { student_id: 'S1', name_mm: 'မောင်မောင်',          name_en: 'mg mg',   class: 'Grade2',    grade: 'GRADE2', house_color: '🔴 Red',    gender: 'M',                                                              parent_name: 'U khant',      parent_phone: '094654xxx', status: 'Active' }
  ],

  subjects: [
    { subject_code: 'MATH', subject_name: 'Mathematics',        subject_color: '#3B82F6' },
    { subject_code: 'ENG',  subject_name: 'English Language',   subject_color: '#10B981' },
    { subject_code: 'SCI',  subject_name: 'Science',            subject_color: '#8B5CF6' },
    { subject_code: 'SOC',  subject_name: 'Social Studies',     subject_color: '#F59E0B' },
    { subject_code: 'ART',  subject_name: 'Art',                subject_color: '#EC4899' },
    { subject_code: 'PE',   subject_name: 'Physical Education', subject_color: '#EF4444' }
  ],

  attendance: [
    { date: '2025-12-01', student_id: 'A1', name_en: 'Adam',   class: 'P4 Online', status: 'P', teacher_id: 'T001' },
    { date: '2025-12-01', student_id: 'E1', name_en: 'Ruby',   class: 'P4 Online', status: 'P', teacher_id: 'T001' },
    { date: '2025-12-01', student_id: 'H6', name_en: 'Hannah', class: 'P4 Online', status: 'A', note: 'Sick', teacher_id: 'T001' }
  ],

  dailyReports: [
    { date: '2025-12-01', student_id: 'A1', name_en: 'Adam', class: 'P4 Online', meal: 'Good', nap_min: 45, mood: 'Happy',  behaviour_note: 'Excellent participation in class', teacher_id: 'T001' },
    { date: '2025-12-01', student_id: 'E1', name_en: 'Ruby', class: 'P4 Online', meal: 'OK',   nap_min: 30, mood: 'Active', behaviour_note: 'Worked well in groups',           teacher_id: 'T001' }
  ],

  homework: [
    { date: '2025-12-01', class: 'P4 Online', subject: 'Maths',           type: 'Homework', lb_page: '12', wb_page: '8',  description: 'Addition and subtraction word problems', due_date: '2025-12-03', teacher_id: 'T001' },
    { date: '2025-12-01', class: 'P4 Online', subject: 'Primary English', type: 'Lesson',   lb_page: '15', wb_page: '10', description: 'Phonics: short vowel sounds',                                  teacher_id: 'T001' },
    { date: '2025-12-02', class: 'Grade2',    subject: 'Science',         type: 'Homework',                               description: 'Plant lifecycle drawing',                due_date: '2025-12-04', teacher_id: 'T001' }
  ],

  parentComms: [
    { timestamp: '2025-12-01T08:10:00Z', date: '2025-12-01', student_id: 'H6', name_en: 'Hannah', type: 'Absent Alert',  message_preview: 'Hannah did not come to school today.',          status: 'Sent' },
    { timestamp: '2025-12-01T16:00:00Z', date: '2025-12-01', student_id: 'A1', name_en: 'Adam',   type: 'Daily Report',  message_preview: 'Dear Parent, Adam had a wonderful day today.',  status: 'Sent' }
  ],

  incidents: [
    { timestamp: '2025-12-01T09:30:00Z', date: '2025-12-01', student_id: 'H7', name_en: 'Sid',  class: 'P4 Online', type: 'Good Behaviour', severity: 'Info', description: 'Helped classmate with activity' },
    { timestamp: '2025-12-01T10:15:00Z', date: '2025-12-01', student_id: 'A1', name_en: 'Adam', class: 'P4 Online', type: 'Participation',  severity: 'Info', description: 'Excellent answer during class discussion' }
  ],

  timetable: [
    { class: 'P4 Online', day: 'Monday',  period: 1, start_time: '08:00', end_time: '09:00', subject: 'Maths',           room: 'Online' },
    { class: 'P4 Online', day: 'Monday',  period: 2, start_time: '09:00', end_time: '10:00', subject: 'Primary English', room: 'Online' },
    { class: 'P4 Online', day: 'Monday',  period: 3, start_time: '10:30', end_time: '11:30', subject: 'Science',         room: 'Online' },
    { class: 'P4 Online', day: 'Tuesday', period: 1, start_time: '08:00', end_time: '09:00', subject: 'Social Studies',  room: 'Online' },
    { class: 'P4 Online', day: 'Tuesday', period: 2, start_time: '09:00', end_time: '10:00', subject: 'Maths',           room: 'Online' },
    { class: 'Grade2',    day: 'Monday',  period: 1, start_time: '08:00', end_time: '08:45', subject: 'English',         room: 'Room 2A' },
    { class: 'Grade2',    day: 'Monday',  period: 2, start_time: '08:45', end_time: '09:30', subject: 'Maths',           room: 'Room 2A' }
  ],

  monthlySummary: [
    { student_id: 'A1', name_en: 'Adam',   class: 'P4 Online', total_school_days: 18, present_days: 17, leave_days: 1, absent_days: 0, attendance_pct: 0.944, reports_sent: 17, hw_assigned: 24, incidents_count: 1, overall_grade: 'A'  },
    { student_id: 'E1', name_en: 'Ruby',   class: 'P4 Online', total_school_days: 18, present_days: 18, leave_days: 0, absent_days: 0, attendance_pct: 1.0,   reports_sent: 18, hw_assigned: 24, incidents_count: 0, overall_grade: 'A'  },
    { student_id: 'H6', name_en: 'Hannah', class: 'P4 Online', total_school_days: 18, present_days: 15, leave_days: 1, absent_days: 2, attendance_pct: 0.833, reports_sent: 15, hw_assigned: 24, incidents_count: 0, overall_grade: 'B+' }
  ]
};
