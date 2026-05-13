/**
 * SCMS v10.2 — 02_api.js
 * All data operations. Read = Supabase anon. Write = n8n TWA webhook.
 * Every call automatically includes school_id + teacher_id from APP context.
 */

'use strict';

const API = {

  // ─── BOOTSTRAP ───────────────────────────────────────────────────────────

  /**
   * Bootstrap: calls rpc_bootstrap via n8n webhook.
   * Returns full school context + cached data for offline use.
   */
  async bootstrap(telegram_id, school_id) {
    const resp = await fetch(SCMS_CONFIG.N8N_BOOTSTRAP, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:      'bootstrap',
        telegram_id,
        school_id:   school_id || undefined,
        initData:    window.APP.initData,
      }),
    });
    if (!resp.ok) throw new Error(`Bootstrap failed: ${resp.status}`);
    const result = await resp.json();
    // n8n returns { ok, schoolConfig, config, currentTerm, user, students, ... }
    return result;
  },

  // ─── ATTENDANCE ──────────────────────────────────────────────────────────

  /** Save attendance batch via n8n TWA webhook (rpc_save_attendance). */
  async saveAttendance(cls, date, records) {
    // records = [{student_id, status}]
    return twaPost('save_attendance', {
      class:   cls,
      date,
      records,
    });
  },

  /** Read recent attendance (last 30 days) for school. */
  async getAttendance(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000)
      .toISOString().slice(0, 10);
    return sbQuery(
      'attendance',
      `school_id=eq.${window.APP.school_id}&date=gte.${since}&order=date.desc,class`
    );
  },

  // ─── STUDENTS ────────────────────────────────────────────────────────────

  async getStudents() {
    return sbQuery(
      'students',
      `school_id=eq.${window.APP.school_id}&status=eq.Active&order=class,name_en`
    );
  },

  /** Register new student (generates student_id via RPC). */
  async registerStudent(data) {
    return twaPost('register_student', data);
  },

  // ─── DAILY REPORTS ───────────────────────────────────────────────────────

  async saveDailyReport(data) {
    return twaPost('save_daily_report', {
      ...data,
      date: data.date || new Date().toISOString().slice(0, 10),
    });
  },

  async getDailyReports(daysBack = 7) {
    const since = new Date(Date.now() - daysBack * 86400000)
      .toISOString().slice(0, 10);
    return sbQuery(
      'daily_reports',
      `school_id=eq.${window.APP.school_id}&date=gte.${since}&order=date.desc,name_en`
    );
  },

  // ─── HOMEWORK ────────────────────────────────────────────────────────────

  async saveHomework(data) {
    return twaPost('save_homework', {
      ...data,
      date: data.date || new Date().toISOString().slice(0, 10),
      school_id:  window.APP.school_id,
      teacher_id: window.APP.teacher_id,
    });
  },

  async getHomework(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000)
      .toISOString().slice(0, 10);
    return sbQuery(
      'homework_log',
      `school_id=eq.${window.APP.school_id}&date=gte.${since}&order=date.desc`
    );
  },

  // ─── INCIDENTS ───────────────────────────────────────────────────────────

  async saveIncident(data) {
    return twaPost('save_incident', {
      ...data,
      date: data.date || new Date().toISOString().slice(0, 10),
      school_id:  window.APP.school_id,
      teacher_id: window.APP.teacher_id,
    });
  },

  async getIncidents(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000)
      .toISOString().slice(0, 10);
    return sbQuery(
      'incidents',
      `school_id=eq.${window.APP.school_id}&date=gte.${since}&order=date.desc`
    );
  },

  // ─── PARENT COMMS ────────────────────────────────────────────────────────

  async sendParentComm(data) {
    return twaPost('send_parent_comm', {
      ...data,
      school_id:  window.APP.school_id,
      teacher_id: window.APP.teacher_id,
    });
  },

  async getParentComms(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000)
      .toISOString().slice(0, 10);
    return sbQuery(
      'parent_comms',
      `school_id=eq.${window.APP.school_id}&date=gte.${since}&order=date.desc`
    );
  },

  // ─── TIMETABLE ───────────────────────────────────────────────────────────

  async getTimetable() {
    return sbQuery(
      'timetable',
      `school_id=eq.${window.APP.school_id}&order=day,period`
    );
  },

  // ─── MONTHLY SUMMARY ─────────────────────────────────────────────────────

  async getMonthlySummary(yearMonth) {
    const ym = yearMonth || new Date().toISOString().slice(0, 7);
    return sbQuery(
      'monthly_summary',
      `school_id=eq.${window.APP.school_id}&year_month=eq.${ym}&order=class,name_en`
    );
  },

  // ─── SCHOOL CONFIG ───────────────────────────────────────────────────────

  async updateSchoolConfig(patch) {
    return twaPost('update_school_config', { patch });
  },

  // ─── REFRESH ALL ─────────────────────────────────────────────────────────

  /** Re-fetch live data from Supabase and update APP cache. */
  async refreshAll() {
    const [students, attendance, dailyReports, homework, parentComms, incidents, timetable] =
      await Promise.allSettled([
        API.getStudents(),
        API.getAttendance(30),
        API.getDailyReports(30),
        API.getHomework(30),
        API.getParentComms(30),
        API.getIncidents(30),
        API.getTimetable(),
      ]);

    if (students.status     === 'fulfilled') window.APP.students     = students.value     || [];
    if (attendance.status   === 'fulfilled') window.APP.attendance   = attendance.value   || [];
    if (dailyReports.status === 'fulfilled') window.APP.dailyReports = dailyReports.value || [];
    if (homework.status     === 'fulfilled') window.APP.homework     = homework.value     || [];
    if (parentComms.status  === 'fulfilled') window.APP.parentComms  = parentComms.value  || [];
    if (incidents.status    === 'fulfilled') window.APP.incidents    = incidents.value    || [];
    if (timetable.status    === 'fulfilled') window.APP.timetable    = timetable.value    || [];

    return window.APP;
  },
};

window.API = API;
