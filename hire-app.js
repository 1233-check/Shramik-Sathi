// Shramik Sathi — Employer Portal Supabase Integration
// Handles auth, employee data loading, and dynamic table rendering

(function () {
  const sb = getSupabaseClient();

  // Cache DOM
  const dashboardView = document.getElementById('dashboardView');
  const navUser = document.getElementById('navUser');
  const logoutBtn = document.getElementById('logoutBtn');

  let _company = null; // the signed-in employer's company

  // ============================================
  // AUTH: Guard the page — must be a signed-in employer
  // with a company. Otherwise route to login / onboarding.
  // ============================================
  async function checkSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.replace('employer-login.html');
      return;
    }

    // Load the company linked to this auth user.
    const { data: company, error } = await sb
      .from('companies')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (error) console.error('Company load failed:', error);
    if (!company) {
      // Authenticated but no company yet — finish onboarding.
      window.location.replace('employer-register.html');
      return;
    }

    _company = company;
    applyCompanyToUI(company);
    navUser.classList.remove('hidden');
    showView(dashboardView);
    loadAllData();
  }
  checkSession();

  // ============================================
  // UI: Reflect the real signed-in company
  // ============================================
  function applyCompanyToUI(company) {
    const name = (company.name || 'Your Company').trim();
    const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'CO';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('navCompanyName', name);
    set('navAvatar', initials);
    set('welcomeCompany', name);

    const filter = document.getElementById('companyFilter');
    if (filter) filter.innerHTML = `<option selected>${name}</option>`;
  }

  // ============================================
  // AUTH: Logout
  // ============================================
  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.replace('employer-login.html');
  });

  // ============================================
  // DATA: Load all tab data
  // ============================================
  async function loadAllData() {
    await Promise.all([
      loadEmployees(),
      loadGatePasses(),
      loadPfEsi(),
      loadWageRegister(),
      loadMedical(),
      loadPasses(),
      loadComplianceStats()
    ]);
  }

  // ============================================
  // EMPLOYEES: Fetch & render
  // ============================================
  let _employees = []; // cache for PDF generation

  async function loadEmployees() {
    const tbody = document.getElementById('employeeTbody');
    if (!tbody) return;

    const { data, error } = await sb.from('employees').select('*').order('emp_id');
    if (error || !data) return;
    _employees = data;

    tbody.innerHTML = data.map((e, i) => {
      const statusClass = e.status === 'Active'
        ? 'bg-green-100 text-green-800 border-green-300'
        : e.status === 'Pending'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-red-100 text-red-800 border-red-300';

      const gpDate = e.gate_pass_valid_upto
        ? (new Date(e.gate_pass_valid_upto) < new Date()
          ? `<span class="text-red-600 font-semibold">Expired (${fmtDate(e.gate_pass_valid_upto)})</span>`
          : `<span class="text-[#0055a5] font-semibold">${fmtDate(e.gate_pass_valid_upto)}</span>`)
        : '<span class="text-amber-600 font-semibold">Under Process</span>';

      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';

      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200 text-center whitespace-nowrap">
          <button class="text-blue-600 hover:underline mr-1 doc-btn" data-action="appointment" data-empid="${e.emp_id}" title="Appointment Letter"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></button>
          <button class="text-emerald-600 hover:underline mr-1 doc-btn" data-action="idcard" data-empid="${e.emp_id}" title="ID Card"><i data-lucide="id-card" class="w-3.5 h-3.5"></i></button>
          <button class="text-purple-600 hover:underline mr-1 doc-btn" data-action="experience" data-empid="${e.emp_id}" title="Experience Cert"><i data-lucide="award" class="w-3.5 h-3.5"></i></button>
          <button class="text-amber-600 hover:underline mr-1 doc-btn" data-action="edit" data-empid="${e.emp_id}" title="Master Update"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button class="text-teal-600 hover:underline mr-1 doc-btn" data-action="wageslip" data-empid="${e.emp_id}" title="Wage Slip"><i data-lucide="indian-rupee" class="w-3.5 h-3.5"></i></button>
          <button class="text-red-600 hover:underline doc-btn" data-action="delete" data-empid="${e.emp_id}" title="Delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </td>
        <td class="p-2 border-r border-slate-200">${e.emp_id}</td>
        <td class="p-2 border-r border-slate-200 font-bold">${e.full_name}</td>
        <td class="p-2 border-r border-slate-200">${e.father_name || '—'}</td>
        <td class="p-2 border-r border-slate-200">${e.aadhar_no || '—'}</td>
        <td class="p-2 border-r border-slate-200">${e.designation || '—'}</td>
        <td class="p-2 border-r border-slate-200">${e.uan_no || 'Pending'}</td>
        <td class="p-2 border-r border-slate-200">${gpDate}</td>
        <td class="p-2 text-center"><span class="${statusClass} px-2 py-0.5 rounded text-xs border">${e.status}</span></td>
      </tr>`;
    }).join('');

    // Update pagination text
    const pagEl = tbody.closest('.bg-white')?.nextElementSibling?.querySelector('span') ||
                  tbody.closest('.bg-white')?.querySelector('.bg-\\[\\#f5f5f5\\] span');
    if (pagEl) pagEl.textContent = `Showing 1 to ${data.length} of ${data.length} entries`;

    lucide.createIcons();
  }

  // Document action button handler (event delegation)
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.doc-btn');
    if (!btn || !window.SSPdf) return;

    const empId = btn.dataset.empid;
    const action = btn.dataset.action;
    const emp = _employees.find(e => e.emp_id === empId);
    if (!emp) return;

    if (action === 'appointment') SSPdf.appointmentLetter(emp);
    else if (action === 'idcard') SSPdf.idCard(emp);
    else if (action === 'experience') SSPdf.experienceCertificate(emp);
    else if (action === 'wageslip') {
      // Fetch latest wage record for this employee
      sb.from('wage_records').select('*').eq('employee_id', emp.id)
        .order('created_at', { ascending: false }).limit(1).single()
        .then(({ data: wage, error }) => {
          if (wage) SSPdf.wageSlip(emp, wage);
          else alert('No wage record found. Run payroll first from Wage Register tab.');
        });
    }
    else if (action === 'edit' && window.SSWage) SSWage.showUpdateModal(emp, () => loadAllData());
    else if (action === 'delete') {
      if (confirm(`Delete ${emp.full_name} (${emp.emp_id})?`)) {
        sb.from('employees').delete().eq('id', emp.id).then(() => loadAllData());
      }
    }
  });

  // ============================================
  // GATE PASSES: Fetch & render
  // ============================================
  async function loadGatePasses() {
    const tbody = document.getElementById('gatePassTbody');
    if (!tbody) return;

    const { data } = await sb.from('employees').select('emp_id, full_name, designation, gate_pass_no, gate_pass_issue_date, gate_pass_valid_upto, gate_pass_area, status').order('emp_id');
    if (!data) return;

    tbody.innerHTML = data.map((e, i) => {
      const hasPass = !!e.gate_pass_no;
      const expired = e.gate_pass_valid_upto && new Date(e.gate_pass_valid_upto) < new Date();
      const statusText = !hasPass ? 'Under Process' : expired ? 'Expired' : 'Valid';
      const statusClass = !hasPass ? 'bg-amber-100 text-amber-800 border-amber-300'
        : expired ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-green-100 text-green-800 border-green-300';
      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';

      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200">${e.emp_id}</td>
        <td class="p-2 border-r border-slate-200 font-bold">${e.full_name}</td>
        <td class="p-2 border-r border-slate-200">${e.designation || '—'}</td>
        <td class="p-2 border-r border-slate-200">${e.gate_pass_no || '—'}</td>
        <td class="p-2 border-r border-slate-200">${fmtDate(e.gate_pass_issue_date)}</td>
        <td class="p-2 border-r border-slate-200 ${expired ? 'text-red-600' : 'text-[#0055a5]'} font-semibold">${fmtDate(e.gate_pass_valid_upto)}</td>
        <td class="p-2 border-r border-slate-200">${e.gate_pass_area || '—'}</td>
        <td class="p-2 text-center"><span class="${statusClass} px-2 py-0.5 rounded text-xs border">${statusText}</span></td>
      </tr>`;
    }).join('');
    lucide.createIcons();
  }

  // ============================================
  // PF/ESI CHALLANS: Fetch & render
  // ============================================
  async function loadPfEsi() {
    const tbody = document.getElementById('pfEsiTbody');
    if (!tbody) return;

    const { data } = await sb.from('pf_esi_challans').select('*').order('filing_date', { ascending: false });
    if (!data) return;

    tbody.innerHTML = data.map((c, i) => {
      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';
      const pfClass = c.pf_status === 'Paid' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300';
      const esiClass = c.esi_status === 'Paid' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300';

      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200 font-bold">${c.month}</td>
        <td class="p-2 border-r border-slate-200">${c.pf_challan_no || '—'}</td>
        <td class="p-2 border-r border-slate-200 text-right font-semibold">${fmtNum(c.pf_amount)}</td>
        <td class="p-2 border-r border-slate-200 text-center"><span class="${pfClass} px-2 py-0.5 rounded text-xs border">${c.pf_status}</span></td>
        <td class="p-2 border-r border-slate-200">${c.esi_challan_no || '—'}</td>
        <td class="p-2 border-r border-slate-200 text-right font-semibold">${fmtNum(c.esi_amount)}</td>
        <td class="p-2 border-r border-slate-200 text-center"><span class="${esiClass} px-2 py-0.5 rounded text-xs border">${c.esi_status}</span></td>
        <td class="p-2 text-center">${fmtDate(c.filing_date)}</td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // WAGE REGISTER: Fetch & render
  // ============================================
  async function loadWageRegister() {
    const tbody = document.getElementById('wageRegTbody');
    if (!tbody) return;

    // Dynamic current month
    const now = new Date();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    const { data } = await sb.from('wage_records')
      .select('*, employees!inner(emp_id, full_name, designation)')
      .eq('wage_month', currentMonth)
      .order('employees(emp_id)');

    let totalGross = 0, totalNet = 0;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="p-4 text-center text-slate-500">
        No wage records for ${currentMonth}.
        <button id="runPayrollBtn" class="ml-2 px-3 py-1 bg-[#0055a5] text-white text-xs rounded font-bold hover:bg-[#003d7a]">
          Run Payroll for ${currentMonth}
        </button>
      </td></tr>`;

      document.getElementById('runPayrollBtn')?.addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerHTML = 'Calculating...'; btn.disabled = true;
        if (window.SSPayroll) {
          const result = await SSPayroll.generateMonthlyPayroll(now.getMonth() + 1, now.getFullYear());
          if (result.success) {
            btn.innerHTML = `✓ ${result.summary.employee_count} records generated`;
            setTimeout(() => loadWageRegister(), 1000);
          } else {
            btn.innerHTML = 'Error: ' + result.error;
          }
        }
      });
      return;
    }

    tbody.innerHTML = data.map((w, i) => {
      totalGross += Number(w.gross); totalNet += Number(w.net_pay);
      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';
      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200">${w.employees.emp_id}</td>
        <td class="p-2 border-r border-slate-200 font-bold">${w.employees.full_name}</td>
        <td class="p-2 border-r border-slate-200">${(w.employees.designation || '').substring(0,12)}</td>
        <td class="p-2 border-r border-slate-200 text-center">${w.days_worked}</td>
        <td class="p-2 border-r border-slate-200 text-right">${fmtNum(w.basic)}</td>
        <td class="p-2 border-r border-slate-200 text-right">${fmtNum(w.da)}</td>
        <td class="p-2 border-r border-slate-200 text-right">${fmtNum(w.hra)}</td>
        <td class="p-2 border-r border-slate-200 text-right">${fmtNum(w.overtime_pay)}</td>
        <td class="p-2 border-r border-slate-200 text-right font-semibold">${fmtNum(w.gross)}</td>
        <td class="p-2 border-r border-slate-200 text-right text-red-600">${fmtNum(w.pf_deduction)}</td>
        <td class="p-2 border-r border-slate-200 text-right text-red-600">${fmtNum(w.esi_deduction)}</td>
        <td class="p-2 text-right font-bold text-emerald-700">${fmtNum(w.net_pay)}</td>
      </tr>`;
    }).join('');

    const summary = document.getElementById('wageSummary');
    if (summary) summary.textContent = `Total Gross: ₹${fmtNum(totalGross)} | Total Net: ₹${fmtNum(totalNet)} | Wage period: ${currentMonth}`;
  }

  // ============================================
  // MEDICAL: Fetch & render
  // ============================================
  async function loadMedical() {
    const tbody = document.getElementById('medicalTbody');
    if (!tbody) return;

    const { data } = await sb.from('employees').select('emp_id, full_name, designation, medical_exam_date, medical_valid_until, medical_fitness, medical_doctor, blood_group').order('emp_id');
    if (!data) return;

    tbody.innerHTML = data.map((e, i) => {
      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';
      let fitClass = 'bg-green-100 text-green-800 border-green-300';
      if (e.medical_fitness === 'Pending Exam') fitClass = 'bg-slate-100 text-slate-600 border-slate-300';
      else if (e.medical_fitness === 'Conditionally Fit') fitClass = 'bg-blue-100 text-blue-800 border-blue-300';
      else if (e.medical_valid_until && new Date(e.medical_valid_until) < new Date(Date.now() + 90*86400000))
        fitClass = 'bg-amber-100 text-amber-800 border-amber-300';

      const fitLabel = e.medical_fitness === 'Pending Exam' ? 'Pending Exam'
        : e.medical_fitness === 'Conditionally Fit' ? 'Cond. Fit'
        : (e.medical_valid_until && new Date(e.medical_valid_until) < new Date(Date.now() + 90*86400000)) ? 'Due Soon'
        : 'Fit';

      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200">${e.emp_id}</td>
        <td class="p-2 border-r border-slate-200 font-bold">${e.full_name}</td>
        <td class="p-2 border-r border-slate-200">${(e.designation || '').substring(0,14)}</td>
        <td class="p-2 border-r border-slate-200">${fmtDate(e.medical_exam_date)}</td>
        <td class="p-2 border-r border-slate-200 text-[#0055a5] font-semibold">${fmtDate(e.medical_valid_until)}</td>
        <td class="p-2 border-r border-slate-200">${e.medical_doctor || '—'}</td>
        <td class="p-2 border-r border-slate-200">${e.blood_group || '—'}</td>
        <td class="p-2 text-center"><span class="${fitClass} px-2 py-0.5 rounded text-xs border">${fitLabel}</span></td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // B-PASS / C-PASS: Fetch & render
  // ============================================
  async function loadPasses() {
    const tbody = document.getElementById('passesTbody');
    if (!tbody) return;

    const { data } = await sb.from('passes').select('*').order('issue_date', { ascending: false });
    if (!data) return;

    tbody.innerHTML = data.map((p, i) => {
      const rowBg = i % 2 === 1 ? 'bg-[#f9f9f9]' : '';
      const typeClass = p.pass_type === 'C-Pass' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';
      const statusClass = p.status === 'Active' ? 'bg-green-100 text-green-800 border-green-300'
        : 'bg-red-100 text-red-800 border-red-300';

      return `<tr class="${rowBg} border-b border-slate-200 hover:bg-[#f1f1f1]">
        <td class="p-2 border-r border-slate-200"><span class="${typeClass} px-2 py-0.5 rounded text-xs font-bold">${p.pass_type}</span></td>
        <td class="p-2 border-r border-slate-200 font-semibold">${p.pass_no}</td>
        <td class="p-2 border-r border-slate-200 font-bold">${p.contractor_name}</td>
        <td class="p-2 border-r border-slate-200">${p.work_area}</td>
        <td class="p-2 border-r border-slate-200 text-center">${p.workers_covered}</td>
        <td class="p-2 border-r border-slate-200">${fmtDate(p.issue_date)}</td>
        <td class="p-2 border-r border-slate-200 ${p.status === 'Expired' ? 'text-red-600' : 'text-[#0055a5]'} font-semibold">${fmtDate(p.expiry_date)}</td>
        <td class="p-2 text-center"><span class="${statusClass} px-2 py-0.5 rounded text-xs border">${p.status}</span></td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // COMPLIANCE STATS: Compute from live data
  // ============================================
  async function loadComplianceStats() {
    const { data } = await sb.from('employees').select('status, gate_pass_valid_upto');
    if (!data) return;

    const total = data.length;
    const activeGP = data.filter(e => e.gate_pass_valid_upto && new Date(e.gate_pass_valid_upto) > new Date()).length;
    const pending = data.filter(e => e.status === 'Pending').length;
    const inactive = data.filter(e => e.status === 'Inactive').length;

    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('statTotal', total);
    el('statActive', activeGP);
    el('statPending', pending);
    el('statNonCompliant', inactive);
  }

  // ============================================
  // UTILS
  // ============================================
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtNum(n) {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString('en-IN');
  }
})();
