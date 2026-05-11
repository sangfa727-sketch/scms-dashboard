/* ============================================================
   SCMS v10 — 01_config.js
   Configuration, localStorage persistence, Telegram WebApp init,
   global app state, and demo data.
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
      VERSION:       '10.0.0'
    };
  } catch (e) {
    return {
      SUPABASE_URL:  '',
      SUPABASE_ANON: '',
      WEBHOOK_URL:   '',
      SCHOOL_ID:     'SCH001',
      DEMO:          false,
      VERSION:       '10.0.0'
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
  } catch (e) {
    console.warn('Telegram WebApp init failed:', e);
  }
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
  } catch (e) {
    /* silent fail outside Telegram */
  }
}

/* ============================================================
   GLOBAL APP STATE
   ============================================================ */
const State = {
  /* User session info */
  user: {
    id:    null,    // teacher_id (e.g. "T001")
    name:  '',      // display name
    role:  'AT',    // Admin/HT/AT/Teacher
    tg_id: null     // Telegram user ID
  },

  /* School metadata */
  schoolConfig: {},

  /* Data buckets — populated by API layer */
  students:       [],
  attendance:     [],
  dailyReports:   [],
  homework:       [],
  parentComms:    [],
  incidents:      [],
  timetable:      [],
  monthlySummary: [],

  /* UI filters per page */
  filters: {
    students:    { class: 'ALL', search: '' },
    attendDate:  todayISO(),
    attendClass: null,
    attendDraft: {},                // { student_id: 'P'|'A'|'L'|'T' }
    daily:       { class: 'ALL' },
    homework:    { class: 'ALL' },
    comms:       { type:  'ALL' },
    incidents:   { type:  'ALL' },
    timetable:   { day: getDayName(), class: 'ALL' },
    summary:     { class: 'ALL' }
  },

  currentPage: 'students'
};

/* ---------- Date helpers used during State init ---------- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getDayName(d = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

/* ============================================================
   DEMO DATA
   Used when DEMO mode is on or backend is unreachable.
   ============================================================ */
const DEMO = {
  schoolConfig: {
    school_id:     'SCH001',
    school_name:   'Example International School',
    academic_year: '2025-2026',
    status:        'active'
  },

  user: {
    teacher_id:   'T001',
    teacher_name: 'Ma Aye Myat Thu',
    role:         'AT'
  },

  students: [
    { student_id: 'A1', name_mm: 'Aung Chan Nyein',     name_en: 'Adam',    class: 'P4 Online', grade: 'P4',     house_color: '🔵 Blue',   gender: 'M', date_of_birth: '2015-06-12', enrollment_date: '2025-06-01', parent_name: 'U Aung Thu',   parent_phone: '09400541xxx', parent_phone2: '09450026xxx', status: 'Active' },
    { student_id: 'E1', name_mm: 'Eaint Twal Tar Khin', name_en: 'Ruby',    class: 'P4 Online', grade: 'P4',     house_color: '🟡 Yellow', gender: 'F', date_of_birth: '2015-03-22', enrollment_date: '2025-06-01', parent_name: 'Daw Khin May', parent_phone: '095409xxx', status: 'Active' },
    { student_id: 'H6', name_mm: 'Hannah Chit',         name_en: 'Hannah',  class: 'P4 Online', grade: 'P4',     house_color: '🟡 Yellow', gender: 'F', date_of_birth: '2015-09-05', enrollment_date: '2025-06-01', parent_name: 'U Chit Ko',    parent_phone: '094445xxx', status: 'Active' },
    { student_id: 'H7', name_mm: 'Hein Zayar Htet',     name_en: 'Sid',     class: 'P4 Online', grade: 'P4',     house_color: '🟢 Green',  gender: 'M', date_of_birth: '2015-11-18',                                  parent_name: 'Daw Aye Myat', parent_phone: '097876xxx', status: 'Active' },
    { student_id: 'H8', name_mm: 'Hsu Htoo Zayar',      name_en: 'Laura',   class: 'P4 Online', grade: 'P4',     house_color: '🟢 Green',  gender: 'F',                                                              parent_name: 'U Htoo Zayar', parent_phone: '099724xxx', status: 'Active' },
    { student_id: 'H9', name_mm: 'Hsu Manaw Phyu',      name_en: 'Heather', class: 'P4 Online', grade: 'P4',     house_color: '🔵 Blue',   gender: 'F',                                                              parent_name: 'Daw Manaw',    parent_phone: '097999xxx', status: 'Active' },
    { student_id: 'S1', name_mm: 'မောင်မောင်',          name_en: 'mg mg',   class: 'Grade2',    grade: 'GRADE2', house_color: '🔴 Red',    gender: 'M',                                                              parent_name: 'U khant',      parent_phone: '094654xxx', status: 'Active' }
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
