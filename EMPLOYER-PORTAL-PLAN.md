# Employer Portal — Implementation Plan & Checklist

Fixes for the gaps found in the real-world readiness audit of the employer portal
(`hire.html`, `hire-app.js`, `jobs-app.js`, `wage-engine.js`, `payroll.js`,
`pdf-generator.js`, `manual-compliance.html`, and the standalone CLMS pages).

**Key finding:** the hiring + payroll + attendance/leave spine works; the gaps are
(a) manual employee-add doesn't save, (b) Compliance Reports is hardcoded fake
data, (c) the gate-pass / medical / PF-ESI / passes tabs are display-only with no
data entry, (d) per-tab search boxes are decorative, (e) no pagination.

**Good news:** RLS already allows employer writes to `employees`, `pf_esi_challans`,
and `passes` (`Employers see own … FOR ALL`), so **almost everything is frontend
only — no new migration** except the optional "attach existing worker" RPC (E1-A).

Delivery convention (same as the worker portal): one branch+PR per phase, bump
`sw.js` cache, verify in preview, then merge.

---

## Phase E1 — Manual employee onboarding  🔴 BLOCKER
**Problem:** "Add New Employee" → Option 1 is a dead button; Option 2 →
`manual-compliance.html`, a full form with **zero Supabase wiring** (saves nothing).
No `employees.insert` exists anywhere. An employer cannot onboard a worker manually.

### E1-A · Attach an existing Shramik Sathi worker  *(needs migration)*
- [ ] Migration 017: `SECURITY DEFINER` function `ss_attach_worker(p_identifier text)`
      that finds an **unattached** worker by `ss_uid` / `aadhar_no` / `mobile` and
      sets `company_id = (caller's company)` + `onboarded_at = now()`, `status='Active'`.
      (Needed because the employer's RLS can't SELECT workers not yet in their company.)
- [ ] Wire the modal's "Onboard via Shramik Sathi" button → a small lookup input
      (SS-ID / Aadhaar / mobile) → call the RPC → refresh Employee Master.
- [ ] Handle: not found, already attached elsewhere, success toast.
- **Files:** `migrations/017_*.sql`, `hire.html` (modal), `hire-app.js`.
- **Done when:** entering a registered worker's SS-ID attaches them to the company and they appear in Employee Master.

### E1-B · Add a new external (non-Shramik) employee  *(no migration)*
- [ ] Wire `manual-compliance.html` (or a focused inline modal form) to **insert**
      into `employees`: `company_id` = employer's company, `auth_user_id = NULL`,
      `status='Active'`, mapped KYC/bank/trade fields. `ss_uid` auto-assigns via trigger.
- [ ] Load `supabase-config.js` + `getSupabaseClient()` on `manual-compliance.html`
      (currently has no backend) and the employer's `company_id`.
- [ ] Client validation (Aadhaar 12-digit, IFSC, mobile) + **duplicate-Aadhaar**
      handling: if the unique index rejects it, show "already registered — use
      Onboard via Shramik Sathi to attach instead."
- [ ] Success → redirect to `hire.html` Employee Master (new row visible).
- **Files:** `manual-compliance.html`, `hire.html` (modal copy), `hire-app.js`.
- **Done when:** an employer can create a worker record that persists and shows in Employee Master + the worker can later claim/login (link by Aadhaar).

---

## Phase E2 — Real Compliance Reports  🔴 (fake data → liability)
**Problem:** the Compliance Reports tab is 100% hardcoded ("93% score", "TRRN/2026…",
"Labour Inspector, East Singhbhum"). No DB loader.
- [ ] Remove the fabricated rows/score/audit line.
- [ ] Build `loadComplianceReports()` computing **live** metrics from real data:
      total workforce, active vs expired gate passes, medical due/expired,
      KYC-incomplete count, PF/ESI challans filed vs pending (latest month),
      workers pending onboarding. (`loadComplianceStats` already computes the 4
      stat boxes — extend the same pattern for the detail table.)
- [ ] Replace the static "statutory returns" table with a **real actionable gaps
      list** (e.g. "7 workers missing gate pass", "May PF challan: not filed").
- [ ] (Defer) a true filing tracker would need a `compliance_filings` table — out of scope for v1.
- **Files:** `hire.html` (reports panel → add `id="reportsTbody"` etc.), `hire-app.js`.
- **Done when:** the tab reflects only real data; nothing fabricated.

---

## Phase E3 — Compliance data-entry forms  🟠 (display-only → usable)
RLS already permits all of these (no migration).
- [ ] **Gate Pass:** per-employee "Edit Gate Pass" form/modal → `employees.update`
      (`gate_pass_no`, `gate_pass_issue_date`, `gate_pass_valid_upto`, `gate_pass_area`).
- [ ] **Medical:** per-employee "Add Medical Record" → `employees.update`
      (`medical_exam_date`, `medical_valid_until`, `medical_fitness`, `medical_doctor`, `blood_group`).
- [ ] **PF/ESI Challans:** "Add Challan" form → `pf_esi_challans.insert`
      (`company_id`, `month`, `pf_challan_no`, `pf_amount`, `pf_status`, `esi_*`, `filing_date`).
- [ ] **B-Pass / C-Pass:** "Add Pass" form → `passes.insert`
      (`company_id`, `pass_type`, `pass_no`, `contractor_name`, `work_area`, dates, `status`).
- [ ] Each: validation, success refresh of its tab, empty-state when none.
- **Files:** `hire.html` (a form per tab), `hire-app.js` (insert/update handlers).
- **Done when:** an employer can create each record from the UI and see it in the tab.

---

## Phase E4 — Wire per-tab search / filter  🔴 (decorative → working)
**Problem:** "Search…" inputs have no IDs and no handlers.
- [ ] Give each tab's search input an id; add an `input` handler that filters the
      already-loaded rows client-side (name / emp_id / etc.).
- [ ] Cache each tab's fetched data so filtering doesn't re-query.
- **Files:** `hire.html`, `hire-app.js`.
- **Done when:** typing filters the visible table in each tab.

---

## Phase E5 — Scale: pagination  🟡
**Problem:** Employee Master loads ALL rows with `select('*')`.
- [ ] Add range-based pagination (`.range(from,to)`) + page controls, or client-side
      paging over cached rows; wire the existing "Showing 1 to N" text.
- [ ] Apply to Employee Master (and Wage Register / others as needed).
- **Files:** `hire-app.js`, `hire.html`.
- **Done when:** thousands of employees load in pages without a heavy single fetch.

---

## Phase E6 — Employee edit / deactivate  🟡
**Problem:** beyond the wage Master-Update + delete, the employer can't correct a
worker's details or deactivate them.
- [ ] Extend the Master-Update modal (or a new edit modal) to edit core fields
      (mobile, designation, category, status) → `employees.update`.
- [ ] Activate/Deactivate toggle (`status`) instead of only hard delete.
- **Files:** `wage-engine.js` (or `hire-app.js`), `hire.html`.
- **Done when:** an employer can edit + deactivate a worker without deleting them.

---

## Cross-cutting checklist (every phase)
- [ ] XSS-escape all DB values rendered via `innerHTML` (use `escapeHtml`).
- [ ] Bump `sw.js` cache version.
- [ ] Static check: inline scripts parse, no duplicate IDs.
- [ ] Preview-verify the new UI renders (employer pages are auth-gated — use the throwaway-copy technique).
- [ ] One PR per phase; note any migration to run manually.

## Suggested order
**E1 (add employee) → E2 (real reports) → E3 (data entry) → E4 (search) → E5 (pagination) → E6 (edit/deactivate).**
E1 + E2 are the real blockers for an employer using it day one; E3 makes the
compliance tabs genuinely useful; E4–E6 are polish/scale.
