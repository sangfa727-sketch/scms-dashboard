/* ============================================================
   SCMS v10.1 — 13_register.js
   Student registration form:
     • Myanmar / Local name + English name
     • Class dropdown with "+ New class…" option
     • Grade dropdown with "+ New grade…" option (from config)
     • House dropdown (from config — supports custom colors + emojis)
     • Gender dropdown (from config — supports Non-binary, etc.)
     • Date of birth (optional)
     • Parent name + phone (required) + phone2 + Telegram ID + email
     • Status dropdown (from config — Active / Probation / etc.)

   NEW IN v10.1:
     • All dropdowns driven by State.config (school-customizable)
     • Houses render with emoji + name + color preview
     • "+ New grade…" option to add ad-hoc grade levels
     • Status field (was always 'Active' before)
     • Local name label adapts to school's local_language
   ============================================================ */

/* ============================================================
   STUDENT REGISTRATION FORM SHEET
   ============================================================ */

/**
 * Open the student-registration form.
 * All dropdowns are sourced from State.config so each school can
 * customize their lists via Settings.
 */
function openStudentRegistrationForm() {
  /* ---------- Pull lists from config ---------- */
  const classes      = getClasses();
  const grades       = getConfigList('grades');
  const houses       = getHouses();              /* normalized {name,emoji,color,display} */
  const genders      = getConfigList('genders');
  const statuses     = getConfigList('student_statuses');
  const localLang    = getConfigValue('local_language', 'Local');

  /* ---------- Class dropdown ---------- */
  const classSelect = el('select', { class: 'form-select', id: 'srClass' });
  classSelect.innerHTML =
    classes.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('') +
    '<option value="__new__">+ New class…</option>';

  /* ---------- Grade dropdown ---------- */
  const gradeSelect = el('select', { class: 'form-select', id: 'srGrade' });
  gradeSelect.innerHTML =
    '<option value="">—</option>' +
    grades.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('') +
    '<option value="__new__">+ New grade…</option>';

  /* ---------- House dropdown ---------- */
  const houseSelect = el('select', { class: 'form-select', id: 'srHouse' });
  houseSelect.innerHTML =
    '<option value="">—</option>' +
    houses.map(h =>
      `<option value="${escapeHTML(h.display)}">${escapeHTML(h.display)}</option>`
    ).join('');

  /* ---------- Gender dropdown ---------- */
  /* Build label map: 'M' → 'Male', 'F' → 'Female', others verbatim */
  const genderLabel = (g) => {
    if (g === 'M') return 'Male';
    if (g === 'F') return 'Female';
    return g;
  };
  const genderSelect = el('select', { class: 'form-select', id: 'srGender' });
  genderSelect.innerHTML =
    '<option value="">—</option>' +
    genders.map(g =>
      `<option value="${escapeHTML(g)}">${escapeHTML(genderLabel(g))}</option>`
    ).join('');

  /* ---------- Status dropdown ---------- */
  const statusSelect = el('select', { class: 'form-select', id: 'srStatus' });
  statusSelect.innerHTML = statuses
    .map(s => `<option value="${escapeHTML(s)}"${s === 'Active' ? ' selected' : ''}>${escapeHTML(s)}</option>`)
    .join('');

  /* ---------- Local name label ---------- */
  const localLabel = localLang && localLang !== 'English'
    ? `${localLang} Name`
    : 'Local Name';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},

    /* Row 1: Local + English name */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, localLabel),
        el('input', {
          class: 'form-input', id: 'srNameMM',
          placeholder: localLang === 'Myanmar' ? 'မြန်မာအမည်' : 'Native name'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'English Name ', el('span', { class: 'req' }, '*')
        ),
        el('input', {
          class: 'form-input', id: 'srNameEN',
          placeholder: 'Display name', required: true
        })
      )
    ),

    /* Row 2: Class + Grade */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'Class ', el('span', { class: 'req' }, '*')
        ),
        classSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Grade'),
        gradeSelect
      )
    ),

    /* Row 3: House + Gender */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'House'),
        houseSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Gender'),
        genderSelect
      )
    ),

    /* Row 4: DOB + Status */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Date of Birth'),
        el('input', { class: 'form-input', type: 'date', id: 'srDOB' })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Status'),
        statusSelect
      )
    ),

    /* Parent name */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' },
        'Parent Name ', el('span', { class: 'req' }, '*')
      ),
      el('input', {
        class: 'form-input', id: 'srParentName',
        placeholder: 'e.g. U / Daw / Mr. / Mrs. / Ms.'
      })
    ),

    /* Row 5: Phone + Phone 2 */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'Parent Phone ', el('span', { class: 'req' }, '*')
        ),
        el('input', {
          class: 'form-input', id: 'srPhone', type: 'tel',
          placeholder: 'Primary contact'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Phone 2'),
        el('input', {
          class: 'form-input', id: 'srPhone2', type: 'tel',
          placeholder: 'Optional'
        })
      )
    ),

    /* Parent Telegram ID */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Parent Telegram ID'),
      el('input', {
        class: 'form-input', id: 'srTGID',
        placeholder: 'Optional — for notifications'
      })
    ),

    /* Parent email */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Parent Email'),
      el('input', {
        class: 'form-input', type: 'email', id: 'srEmail',
        placeholder: 'Optional'
      })
    ),

    /* Save button */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {

        /* ---------- Handle "+ New class…" ---------- */
        let cls = $('#srClass').value;
        if (cls === '__new__') {
          cls = prompt('New class name? (e.g. P5 Online / Year 8 / Grade 11)');
          if (!cls) return;
          cls = cls.trim();
          if (!cls) return;
        }

        /* ---------- Handle "+ New grade…" ---------- */
        let grade = $('#srGrade').value;
        if (grade === '__new__') {
          grade = prompt('New grade level? (e.g. Year 8 / Grade 11)');
          if (!grade) grade = '';   // user cancelled grade only — okay
          else        grade = grade.trim();
        }

        /* ---------- Auto-fill grade from class if empty ---------- */
        if (!grade) {
          grade = cls.toUpperCase().replace(/\s+/g, '');
        }

        /* ---------- Build data ---------- */
        const data = {
          name_mm:         $('#srNameMM').value.trim(),       /* legacy column */
          name_local:      $('#srNameMM').value.trim(),       /* new in v10.1 */
          name_en:         $('#srNameEN').value.trim(),
          class:           cls,
          grade:           grade,
          house_color:     $('#srHouse').value,
          gender:          $('#srGender').value || '',
          date_of_birth:   $('#srDOB').value || null,
          enrollment_date: todayISO(),
          parent_name:     $('#srParentName').value.trim(),
          parent_phone:    $('#srPhone').value.trim(),
          parent_phone2:   $('#srPhone2').value.trim(),
          parent_tg_id:    $('#srTGID').value.trim(),
          parent_email:    $('#srEmail').value.trim(),
          status:          $('#srStatus').value || 'Active',
          notes:           'Registered via TWA'
        };

        /* ---------- Validation ---------- */
        if (!data.name_en) {
          showToast('English name required', 'error');
          haptic('error');
          return;
        }
        if (!data.class) {
          showToast('Class required', 'error');
          haptic('error');
          return;
        }
        if (!data.parent_name) {
          showToast('Parent name required', 'error');
          haptic('error');
          return;
        }
        if (!data.parent_phone) {
          showToast('Parent phone required', 'error');
          haptic('error');
          return;
        }

        showToast('Registering…');

        try {
          const r = await writeAction('register_student', { data });
          if (r.ok) {
            showToast('✓ Student registered', 'success');
            haptic('success');

            /* Optimistic local insert with generated ID */
            const newStudent = {
              ...data,
              student_id: r.student_id || ('S' + Date.now())
            };
            State.students.unshift(newStudent);

            closeSheet();
            renderStudents();
          } else {
            throw new Error(r.error || 'unknown');
          }
        } catch (e) {
          console.error('register student error:', e);
          showToast('Registration failed', 'error');
          haptic('error');
        }
      }
    }, 'Register Student')
  );

  openSheet('Register New Student', body);
}
