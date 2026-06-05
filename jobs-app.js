// Shramik Sathi — Employer Jobs & Hiring module
// Lazy-loaded job posting + applicant review for the employer portal.
// Loaded by hire.html after hire-app.js. Relies on the global showView()
// and the #jobsPanel markup; all data is RLS-scoped to the employer's company.

(function () {
  const sb = getSupabaseClient();

  let _companyId = null;
  let _companyName = '';
  let _loaded = false;
  let _currentJob = null; // job currently open in the applicants view

  // ── DOM ──
  const panel        = document.getElementById('jobsPanel');
  const jobsBtn      = document.getElementById('jobsBtn');
  const postJobBtn   = document.getElementById('postJobBtn');
  const jobsList     = document.getElementById('jobsList');
  const jobsEmpty    = document.getElementById('jobsEmpty');
  const jobsListView = document.getElementById('jobsListView');
  const applicantsView   = document.getElementById('applicantsView');
  const applicantsBack   = document.getElementById('applicantsBack');
  const applicantsHeader = document.getElementById('applicantsHeader');
  const applicantsList   = document.getElementById('applicantsList');
  // modal
  const jobModal      = document.getElementById('jobModal');
  const jobForm       = document.getElementById('jobForm');
  const jobModalClose = document.getElementById('jobModalClose');

  if (!panel) return; // not on this page

  // ============================================
  // COMPANY CONTEXT
  // ============================================
  async function getCompany() {
    if (_companyId) return _companyId;
    // hire-app.js publishes the company once loaded — reuse it.
    if (window.SSEmployer && window.SSEmployer.companyId) {
      _companyId = window.SSEmployer.companyId;
      _companyName = window.SSEmployer.companyName || '';
      return _companyId;
    }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data } = await sb.from('companies')
      .select('id, name').eq('auth_user_id', session.user.id).maybeSingle();
    if (data) { _companyId = data.id; _companyName = data.name; }
    return _companyId;
  }

  // ============================================
  // NAVIGATION
  // ============================================
  jobsBtn && jobsBtn.addEventListener('click', () => { open(); });

  async function open() {
    if (typeof showView === 'function') showView(panel);
    showJobsList();
    await loadJobs();
  }

  function showJobsList() {
    applicantsView.classList.add('hidden');
    applicantsView.classList.remove('flex');
    jobsListView.classList.remove('hidden');
  }

  applicantsBack && applicantsBack.addEventListener('click', () => {
    showJobsList();
    loadJobs();
  });

  // ============================================
  // LOAD + RENDER JOBS (with live applicant counts)
  // ============================================
  async function loadJobs() {
    const companyId = await getCompany();
    if (!companyId) return;

    jobsList.innerHTML = skeletonCards(2);

    const { data, error } = await sb
      .from('jobs')
      .select('*, applications:job_applications(count)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) { console.error('[Jobs] loadJobs', error); jobsList.innerHTML = ''; return; }

    if (!data || data.length === 0) {
      jobsList.innerHTML = '';
      jobsEmpty.classList.remove('hidden');
      return;
    }
    jobsEmpty.classList.add('hidden');

    jobsList.innerHTML = data.map(jobCard).join('');
    if (window.lucide) lucide.createIcons();

    // wire per-card buttons
    jobsList.querySelectorAll('[data-view-applicants]').forEach(btn => {
      btn.addEventListener('click', () => {
        const job = data.find(j => j.id === btn.dataset.viewApplicants);
        if (job) openApplicants(job);
      });
    });
    jobsList.querySelectorAll('[data-toggle-job]').forEach(btn => {
      btn.addEventListener('click', () => toggleJobStatus(btn.dataset.toggleJob, btn.dataset.next));
    });
  }

  function jobCard(j) {
    const applicants = (j.applications && j.applications[0] && j.applications[0].count) || 0;
    const statusStyle = {
      Open:   'bg-emerald-100 text-emerald-700 border-emerald-300',
      Filled: 'bg-blue-100 text-blue-700 border-blue-300',
      Closed: 'bg-slate-100 text-slate-600 border-slate-300',
      Draft:  'bg-amber-100 text-amber-700 border-amber-300',
    }[j.status] || 'bg-slate-100 text-slate-600 border-slate-300';

    const wage = j.wage_amount ? `₹${Number(j.wage_amount).toLocaleString('en-IN')}/${j.wage_period || 'day'}` : '—';
    const toggleLabel = j.status === 'Open' ? 'Close' : 'Reopen';
    const toggleNext  = j.status === 'Open' ? 'Closed' : 'Open';

    return `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-lg font-bold text-primary leading-tight">${esc(j.title)}</h3>
          <p class="text-sm text-slate-500 mt-0.5">${esc(j.designation || j.category || '—')}${j.location ? ' · ' + esc(j.location) : ''}</p>
        </div>
        <span class="${statusStyle} text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap">${j.status}</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span class="inline-flex items-center gap-1.5"><i data-lucide="indian-rupee" class="w-4 h-4 text-emerald-600"></i> ${wage}</span>
        <span class="inline-flex items-center gap-1.5"><i data-lucide="users" class="w-4 h-4 text-blue-600"></i> ${j.positions_filled || 0}/${j.positions || 1} filled</span>
        ${j.urgent ? '<span class="inline-flex items-center gap-1 text-amber-600 font-semibold"><i data-lucide="zap" class="w-4 h-4"></i> Urgent</span>' : ''}
      </div>
      <div class="flex items-center gap-2 pt-1">
        <button data-view-applicants="${j.id}" class="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2">
          <i data-lucide="user-search" class="w-4 h-4"></i> ${applicants} Applicant${applicants === 1 ? '' : 's'}
        </button>
        <button data-toggle-job="${j.id}" data-next="${toggleNext}" class="text-sm font-semibold text-slate-600 border border-slate-300 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition">${toggleLabel}</button>
      </div>
    </div>`;
  }

  async function toggleJobStatus(jobId, next) {
    await sb.from('jobs').update({ status: next }).eq('id', jobId);
    loadJobs();
  }

  // ============================================
  // APPLICANTS
  // ============================================
  async function openApplicants(job) {
    _currentJob = job;
    jobsListView.classList.add('hidden');
    applicantsView.classList.remove('hidden');
    applicantsView.classList.add('flex');

    applicantsHeader.innerHTML = `
      <h2 class="text-xl font-bold text-primary">${esc(job.title)}</h2>
      <p class="text-sm text-slate-500 mt-0.5">${esc(job.designation || job.category || '')}${job.location ? ' · ' + esc(job.location) : ''}</p>`;
    applicantsList.innerHTML = skeletonRows(3);

    const { data, error } = await sb
      .from('job_applications')
      .select('*, employees(full_name, emp_id, category, designation, mobile)')
      .eq('job_id', job.id)
      .order('applied_at', { ascending: false });

    if (error) { console.error('[Jobs] applicants', error); applicantsList.innerHTML = ''; return; }

    if (!data || data.length === 0) {
      applicantsList.innerHTML = `<div class="text-center text-slate-400 py-12">
        <i data-lucide="users" class="w-8 h-8 mx-auto mb-2"></i>
        <p class="text-sm">No applicants yet.</p></div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    applicantsList.innerHTML = data.map(applicantRow).join('');
    if (window.lucide) lucide.createIcons();

    applicantsList.querySelectorAll('[data-app-action]').forEach(btn => {
      btn.addEventListener('click', () => setStatus(btn.dataset.appId, btn.dataset.appAction));
    });
  }

  function applicantRow(a) {
    const e = a.employees || {};
    const initials = (e.full_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const statusStyle = {
      Applied:     'bg-slate-100 text-slate-600',
      Shortlisted: 'bg-blue-100 text-blue-700',
      Accepted:    'bg-amber-100 text-amber-700',
      Confirmed:   'bg-emerald-100 text-emerald-700',
      Rejected:    'bg-red-100 text-red-700',
      Withdrawn:   'bg-slate-100 text-slate-400',
    }[a.status] || 'bg-slate-100 text-slate-600';

    // Available actions depend on the current stage.
    let actions = '';
    if (a.status === 'Applied' || a.status === 'Shortlisted') {
      if (a.status === 'Applied') actions += actionBtn(a.id, 'Shortlisted', 'Shortlist', 'border-blue-300 text-blue-700 hover:bg-blue-50');
      actions += actionBtn(a.id, 'Accepted', 'Make Offer', 'border-emerald-300 text-emerald-700 hover:bg-emerald-50');
      actions += actionBtn(a.id, 'Rejected', 'Reject', 'border-red-300 text-red-600 hover:bg-red-50');
    } else if (a.status === 'Accepted') {
      actions = '<span class="text-xs text-amber-600 font-semibold inline-flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Awaiting worker confirmation</span>';
    } else if (a.status === 'Confirmed') {
      actions = '<span class="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Hired &amp; onboarded</span>';
    }

    return `<div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">${initials}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-primary truncate">${esc(e.full_name || 'Unknown')}</span>
          <span class="${statusStyle} text-[11px] font-bold px-2 py-0.5 rounded-full">${a.status}</span>
        </div>
        <p class="text-xs text-slate-500 mt-0.5 truncate">${esc(e.designation || '—')} · ${esc(e.category || '—')}${e.mobile ? ' · ' + esc(e.mobile) : ''}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">${actions}</div>
    </div>`;
  }

  function actionBtn(id, action, label, classes) {
    return `<button data-app-action="${action}" data-app-id="${id}" class="text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition ${classes}">${label}</button>`;
  }

  async function setStatus(appId, status) {
    const { error } = await sb.from('job_applications').update({ status }).eq('id', appId);
    if (error) { console.error('[Jobs] setStatus', error); alert('Could not update: ' + error.message); return; }
    if (_currentJob) openApplicants(_currentJob);
  }

  // ============================================
  // POST A JOB (modal)
  // ============================================
  postJobBtn && postJobBtn.addEventListener('click', () => openModal());
  jobModalClose && jobModalClose.addEventListener('click', () => closeModal());
  jobModal && jobModal.addEventListener('click', (e) => { if (e.target === jobModal) closeModal(); });

  function openModal() {
    jobForm.reset();
    jobModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
  function closeModal() { jobModal.classList.add('hidden'); }

  jobForm && jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const companyId = await getCompany();
    if (!companyId) { alert('Could not determine your company. Please re-login.'); return; }

    const btn = jobForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Posting…`;
    if (window.lucide) lucide.createIcons();

    const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const payload = {
      company_id: companyId,
      company_name: _companyName || null,
      title: v('jobTitle'),
      designation: v('jobDesignation') || null,
      category: v('jobCategory') || null,
      location: v('jobLocation') || null,
      wage_amount: v('jobWage') ? Number(v('jobWage')) : null,
      wage_period: v('jobWagePeriod') || 'day',
      positions: v('jobPositions') ? parseInt(v('jobPositions'), 10) : 1,
      urgent: document.getElementById('jobUrgent') ? document.getElementById('jobUrgent').checked : false,
      description: v('jobDescription') || null,
      status: 'Open',
    };

    if (!payload.title) { btn.disabled = false; btn.innerHTML = orig; alert('Job title is required.'); return; }

    const { error } = await sb.from('jobs').insert(payload);
    btn.disabled = false; btn.innerHTML = orig;
    if (window.lucide) lucide.createIcons();

    if (error) { console.error('[Jobs] postJob', error); alert('Could not post job: ' + error.message); return; }
    closeModal();
    loadJobs();
  });

  // ============================================
  // HELPERS
  // ============================================
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function skeletonCards(n) {
    return Array.from({ length: n }).map(() =>
      '<div class="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse h-40"></div>').join('');
  }
  function skeletonRows(n) {
    return Array.from({ length: n }).map(() =>
      '<div class="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-16"></div>').join('');
  }
})();
