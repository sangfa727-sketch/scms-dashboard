/* ============================================================
   SCMS v10 — 13_register.js
   Student registration form:
     • Myanmar name + English name (required)
     • Class dropdown with "+ New class…" option for dynamic add
     • Grade, House Color (4 colors), Gender (M/F/Other)
     • Date of birth (optional)
     • Parent name + phone (required) + phone2 + Telegram ID + email
     • Saves through writeAction('register_student') so n8n
       can notify admin and bot side stays in sync
   ============================================================ */

/* ============================================================
   STUDENT REGISTRATION FORM SHEET
   ============================================================ */

/**
 * Open the student-registration form.
 * Uses existing class list and offers "+ New class…" to add
 * a class on the fly (via prompt()).
 */
function openStudentRegistrationForm() {
  let classes = getClasses();
  // Fallback if no students yet — let teacher start from scratch
  if (!classes.length) classes = [];

  /* ---------- Class dropdown ---------- */
  const classSelect = el('select', { class: 'form-select', id: 'srClass' });
  classSelect.innerHTML =
    classes.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('') +
    '<option value="__new__">+ New class…</option>';

  /* ---------- House dropdown ---------- */
  const houseSelect = el('select', { class: 'form-select', id: 'srHouse' });
  houseSelect.innerHTML =
    '<option value="">—</option>' +
    '<option>🔵 Blue</option>' +
    '<option>🟡 Yellow</option>' +
    '<option>🟢 Green</option>' +
    '<option>🔴 Red</option>';

  /* ---------- Gender dropdown ---------- */
  const genderSelect = el('select', { class: 'form-select', id: 'srGender' });
  genderSelect.innerHTML =
    '<option value="">—</option>' +
    '<option value="M">Male</option>' +
    '<option value="F">Female</option>' +
    '<option value="Other">Other</option>';

  /* ---------- Build sheet body ---------- */
  const body = el('div', {},

    /* ---------- Row 1: Myanmar + English name ---------- */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Myanmar Name'),
        el('input', {
          class:       'form-input',
          id:          'srNameMM',
          placeholder: 'မြန်မာအမည်'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'English Name ',
          el('span', { class: 'req' }, '*')
        ),
        el('input', {
          class:       'form-input',
          id:          'srNameEN',
          placeholder: 'Display name',
          required:    true
        })
      )
    ),

    /* ---------- Row 2: Class + Grade ---------- */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'Class ',
          el('span', { class: 'req' }, '*')
        ),
        classSelect
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Grade'),
        el('input', {
          class:       'form-input',
          id:          'srGrade',
          placeholder: 'P4, GRADE2, Year 7…'
        })
      )
    ),

    /* ---------- Row 3: House + Gender ---------- */
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

    /* ---------- DOB ---------- */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Date of Birth'),
      el('input', {
        class: 'form-input',
        type:  'date',
        id:    'srDOB'
      })
    ),

    /* ---------- Parent name ---------- */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' },
        'Parent Name ',
        el('span', { class: 'req' }, '*')
      ),
      el('input', {
        class:       'form-input',
        id:          'srParentName',
        placeholder: 'U / Daw …'
      })
    ),

    /* ---------- Row 4: Phone + Phone 2 ---------- */
    el('div', { class: 'form-row' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' },
          'Parent Phone ',
          el('span', { class: 'req' }, '*')
        ),
        el('input', {
          class:       'form-input',
          id:          'srPhone',
          type:        'tel',
          placeholder: '09xxxxxxxxx'
        })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Phone 2'),
        el('input', {
          class:       'form-input',
          id:          'srPhone2',
          type:        'tel',
          placeholder: 'Optional'
        })
      )
    ),

    /* ---------- Parent Telegram ID ---------- */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Parent Telegram ID'),
      el('input', {
        class:       'form-input',
        id:          'srTGID',
        placeholder: 'Optional — for notifications'
      })
    ),

    /* ---------- Parent email ---------- */
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Parent Email'),
      el('input', {
        class:       'form-input',
        type:        'email',
        id:          'srEmail',
        placeholder: 'Optional'
      })
    ),

    /* ---------- Save button ---------- */
    el('button', {
      class:   'btn-primary',
      onclick: async () => {

        /* ---------- Handle "+ New class…" ---------- */
        let cls = $('#srClass').value;
        if (cls === '__new__') {
          cls = prompt('New class name?');
          if (!cls) return;       // user cancelled
          cls = cls.trim();
          if (!cls) return;
        }

        /* ---------- Build data ---------- */
        const data = {
          name_mm:         $('#srNameMM').value.trim(),
          name_en:         $('#srNameEN').value.trim(),
          class:           cls,
          grade:           $('#srGrade').value.trim() ||
                              cls.toUpperCase().replace(/\s+/g, ''),
          house_color:     $('#srHouse').value,
          gender:          $('#srGender').value || '',
          date_of_birth:   $('#srDOB').value || null,
          enrollment_date: todayISO(),
          parent_name:     $('#srParentName').value.trim(),
          parent_phone:    $('#srPhone').value.trim(),
          parent_phone2:   $('#srPhone2').value.trim(),
          parent_tg_id:    $('#srTGID').value.trim(),
          parent_email:    $('#srEmail').value.trim(),
          status:          'Active',
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
