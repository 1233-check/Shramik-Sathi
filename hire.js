document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hireForm');
  const steps = Array.from(document.querySelectorAll('.form-step'));
  const indicators = Array.from(document.querySelectorAll('.stepper .step'));
  const nextBtns = document.querySelectorAll('.next-btn');
  const prevBtns = document.querySelectorAll('.prev-btn');
  let currentStep = 0;

  // Mobile nav toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Next Button
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const inputs = steps[currentStep].querySelectorAll('input[required], select[required], textarea[required]');
      let isValid = true;
      inputs.forEach(input => {
        if (!input.checkValidity()) {
          isValid = false;
          input.classList.add('error');
          input.reportValidity();
        } else {
          input.classList.remove('error');
        }
      });
      if (isValid && currentStep < steps.length - 1) {
        currentStep++;
        updateFormSteps();
      }
    });
  });

  // Prev Button
  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) { currentStep--; updateFormSteps(); }
    });
  });

  // Form Submit → Supabase
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.textContent = 'Saving to Database...';
    submitBtn.disabled = true;

    const sb = getSupabaseClient();
    const v = (id) => document.getElementById(id)?.value?.trim() || null;

    // Get the company_id (first company or from session)
    const { data: companies } = await sb.from('companies').select('id').limit(1);
    const companyId = companies?.[0]?.id || null;

    // Auto-generate emp_id
    const { data: lastEmp } = await sb.from('employees').select('emp_id').order('emp_id', { ascending: false }).limit(1);
    const nextId = lastEmp?.[0] ? String(Number(lastEmp[0].emp_id) + 1) : '20180';

    const employee = {
      company_id: companyId,
      emp_id: nextId,
      full_name: v('inp_name'),
      father_name: v('inp_father'),
      aadhar_no: v('inp_aadhar'),
      dob: v('inp_dob'),
      gender: v('inp_gender'),
      blood_group: v('inp_blood'),
      identity_mark: v('inp_mark'),
      voter_id: v('inp_voter'),
      vendor_code: v('inp_vendor'),
      work_order_no: v('inp_workorder'),
      department: v('inp_dept'),
      date_of_joining: v('inp_doj'),
      category: v('inp_category'),
      designation: v('inp_designation'),
      employee_type: v('inp_emptype'),
      shift_duty: v('inp_shift') === 'Yes',
      uan_no: v('inp_uan'),
      esi_no: v('inp_esi'),
      basic_wage: parseFloat(v('inp_basic')) || 0,
      da_allowance: parseFloat(v('inp_da')) || 0,
      bank_name: v('inp_bank'),
      account_no: v('inp_accno'),
      ifsc_code: v('inp_ifsc'),
      mobile: v('inp_mobile'),
      emergency_contact: v('inp_emergency'),
      address: v('inp_address'),
      state: v('inp_state'),
      pin_code: v('inp_pin'),
      status: 'Pending'
    };

    const { data, error } = await sb.from('employees').insert([employee]).select();

    if (error) {
      submitBtn.textContent = 'Complete Onboarding';
      submitBtn.disabled = false;
      alert('Error saving: ' + error.message);
      return;
    }

    // Upload files if present
    const fileInputs = [
      { el: form.querySelector('input[accept="image/*"][required]'), type: 'photo' },
      { el: form.querySelectorAll('input[accept="image/*,.pdf"]')[0], type: 'aadhar' },
      { el: form.querySelectorAll('input[accept="image/*,.pdf"]')[1], type: 'bank_passbook' },
      { el: form.querySelectorAll('input[accept="image/*,.pdf"]')[2], type: 'police_verification' }
    ];

    const empId = data[0].id;
    for (const fi of fileInputs) {
      if (fi.el?.files?.[0]) {
        const file = fi.el.files[0];
        const path = `employees/${empId}/${fi.type}_${file.name}`;
        const { error: uploadErr } = await sb.storage.from('documents').upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = sb.storage.from('documents').getPublicUrl(path);
          await sb.from('documents').insert({
            employee_id: empId,
            doc_type: fi.type,
            file_url: urlData.publicUrl,
            file_name: file.name
          });
        }
      }
    }

    // Show success
    document.querySelector('#step4 .form-grid').style.display = 'none';
    document.getElementById('finalActions').style.display = 'none';
    document.getElementById('successMessage').style.display = 'block';
    document.querySelector('.page-header h1').textContent = 'Success!';
    document.querySelector('.page-header p').textContent = `Employee ${employee.full_name} (ID: ${nextId}) saved to database.`;
  });

  function updateFormSteps() {
    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
    indicators.forEach((indicator, index) => {
      if (index < currentStep) {
        indicator.classList.add('active', 'completed');
      } else if (index === currentStep) {
        indicator.classList.add('active');
        indicator.classList.remove('completed');
      } else {
        indicator.classList.remove('active', 'completed');
      }
    });
    document.querySelector('.wizard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('error')) e.target.classList.remove('error');
  });
});
