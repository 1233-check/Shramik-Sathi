// Shramik Sathi — Wage Variable Engine
// Handles employee wage updates, change tracking (audit trail), and auto-calculations

(function() {
  const sb = getSupabaseClient();

  window.SSWage = {

    // ============================================
    // MASTER UPDATE: Update employee wage variables
    // ============================================
    /**
     * Update one or more fields on an employee record.
     * Every change is logged to wage_variables_log with old/new values.
     * @param {string} employeeUUID — employees.id (UUID)
     * @param {Object} changes — { field: newValue, ... }
     * @param {string} effectiveDate — YYYY-MM-DD
     * @returns {Object} { success, updated, logs }
     */
    async masterUpdate(employeeUUID, changes, effectiveDate) {
      try {
        // 1. Fetch current employee data for audit
        const { data: current, error: fetchErr } = await sb
          .from('employees').select('*').eq('id', employeeUUID).single();
        if (fetchErr || !current) throw new Error('Employee not found: ' + (fetchErr?.message || ''));

        // 2. Get current auth user
        const { data: { user } } = await sb.auth.getUser();
        const userId = user?.id || null;

        // 3. Build audit log entries
        const logEntries = [];
        const updatePayload = {};

        for (const [field, newValue] of Object.entries(changes)) {
          const oldValue = current[field];
          // Only log if value actually changed
          if (String(oldValue || '') !== String(newValue || '')) {
            logEntries.push({
              employee_id: employeeUUID,
              field_changed: field,
              old_value: String(oldValue ?? ''),
              new_value: String(newValue ?? ''),
              effective_date: effectiveDate || new Date().toISOString().slice(0, 10),
              changed_by: userId
            });
            updatePayload[field] = newValue;
          }
        }

        if (Object.keys(updatePayload).length === 0) {
          return { success: true, updated: 0, logs: 0, message: 'No changes detected' };
        }

        // 4. Update employee record
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateErr } = await sb
          .from('employees').update(updatePayload).eq('id', employeeUUID);
        if (updateErr) throw new Error('Update failed: ' + updateErr.message);

        // 5. Insert audit log entries
        const { error: logErr } = await sb.from('wage_variables_log').insert(logEntries);
        if (logErr) console.warn('Audit log insert warning:', logErr.message);

        console.log(`[SSWage] Updated ${Object.keys(updatePayload).length} fields, logged ${logEntries.length} changes for employee ${current.emp_id}`);
        return { success: true, updated: Object.keys(updatePayload).length, logs: logEntries.length };

      } catch (e) {
        console.error('[SSWage] masterUpdate error:', e);
        return { success: false, error: e.message };
      }
    },

    // ============================================
    // AUDIT TRAIL: Get change history for an employee
    // ============================================
    async getAuditTrail(employeeUUID) {
      const { data, error } = await sb
        .from('wage_variables_log')
        .select('*')
        .eq('employee_id', employeeUUID)
        .order('changed_at', { ascending: false });
      if (error) { console.error('[SSWage] getAuditTrail error:', error); return []; }
      return data || [];
    },

    // ============================================
    // AUTO-CALCULATIONS: Statutory wage computations
    // ============================================

    /**
     * Calculate PF contribution (12% of Basic+DA, capped at ₹15000 ceiling)
     * @param {number} basicPerDay
     * @param {number} daPerDay
     * @param {number} daysWorked
     * @returns {Object} { employeePF, employerPF, total }
     */
    calculatePF(basicPerDay, daPerDay, daysWorked) {
      const monthlyBasicDA = (basicPerDay + daPerDay) * daysWorked;
      const pfWage = Math.min(monthlyBasicDA, 15000); // ₹15000 ceiling
      const employeePF = Math.round(pfWage * 0.12);
      const employerPF = Math.round(pfWage * 0.12); // 3.67% to EPF + 8.33% to EPS
      return { employeePF, employerPF, total: employeePF + employerPF, pfWage };
    },

    /**
     * Calculate ESI contribution (0.75% employee, 3.25% employer)
     * Applicable if gross ≤ ₹21000/month
     * @param {number} gross - Monthly gross wage
     * @returns {Object} { employeeESI, employerESI, total, applicable }
     */
    calculateESI(gross) {
      const applicable = gross <= 21000;
      if (!applicable) return { employeeESI: 0, employerESI: 0, total: 0, applicable: false };
      const employeeESI = Math.round(gross * 0.0075);
      const employerESI = Math.round(gross * 0.0325);
      return { employeeESI, employerESI, total: employeeESI + employerESI, applicable: true };
    },

    /**
     * Calculate Bonus (8.33% min — 20% max of Basic+DA, per Payment of Bonus Act)
     * Applicable if wages ≤ ₹21000/month; calculation ceiling ₹7000 or actual, whichever is higher
     * @param {number} basicMonthly
     * @param {number} daMonthly
     * @param {number} rate — Bonus rate (8.33 to 20, default 8.33)
     * @returns {number} Monthly bonus amount
     */
    calculateBonus(basicMonthly, daMonthly, rate = 8.33) {
      const bonusWage = Math.min(basicMonthly + daMonthly, 7000); // Calculation ceiling
      return Math.round(bonusWage * (rate / 100));
    },

    /**
     * Calculate Overtime Pay (2× ordinary rate per Code on Wages, 2019)
     * @param {number} basicPerDay
     * @param {number} otHours — Total overtime hours in the month
     * @returns {number} OT pay
     */
    calculateOT(basicPerDay, otHours) {
      const hourlyRate = basicPerDay / 8; // Standard 8-hour day
      return Math.round(hourlyRate * 2 * otHours);
    },

    /**
     * Calculate Gratuity (Payment of Gratuity Act, 1972)
     * Eligible after 5 years of continuous service
     * @param {number} lastDrawnBasicDA — Last drawn monthly Basic+DA
     * @param {number} yearsOfService — Completed years
     * @returns {Object} { eligible, amount }
     */
    calculateGratuity(lastDrawnBasicDA, yearsOfService) {
      if (yearsOfService < 5) return { eligible: false, amount: 0 };
      // Formula: (15/26) × last drawn salary × years of service
      const amount = Math.round((15 / 26) * lastDrawnBasicDA * yearsOfService);
      return { eligible: true, amount };
    },

    /**
     * Apply Minimum Wages revision — update all employees of a category
     * @param {string} category — 'Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled'
     * @param {number} newBasic — New minimum basic wage per day
     * @param {number} newDA — New DA per day
     * @param {string} effectiveDate — YYYY-MM-DD
     * @returns {Object} { success, count }
     */
    async applyMinWageRevision(category, newBasic, newDA, effectiveDate) {
      try {
        const { data: employees } = await sb
          .from('employees')
          .select('id, emp_id, basic_wage, da_allowance')
          .eq('category', category)
          .eq('status', 'Active');
        if (!employees || employees.length === 0) return { success: true, count: 0 };

        let updated = 0;
        for (const emp of employees) {
          // Only update if new wage is higher (minimum wages can only go up)
          if (newBasic > (emp.basic_wage || 0) || newDA > (emp.da_allowance || 0)) {
            const changes = {};
            if (newBasic > (emp.basic_wage || 0)) changes.basic_wage = newBasic;
            if (newDA > (emp.da_allowance || 0)) changes.da_allowance = newDA;
            await this.masterUpdate(emp.id, changes, effectiveDate);
            updated++;
          }
        }

        console.log(`[SSWage] Min Wage revision applied: ${updated} ${category} workers updated`);
        return { success: true, count: updated };
      } catch (e) {
        console.error('[SSWage] applyMinWageRevision error:', e);
        return { success: false, error: e.message };
      }
    },

    /**
     * Apply yearly increment (2-3% on basic wage)
     * @param {string} employeeUUID
     * @param {number} incrementPercent — e.g. 3 for 3%
     * @param {string} effectiveDate
     */
    async applyIncrement(employeeUUID, incrementPercent, effectiveDate) {
      const { data: emp } = await sb.from('employees').select('basic_wage').eq('id', employeeUUID).single();
      if (!emp) return { success: false, error: 'Employee not found' };

      const newBasic = Math.round(emp.basic_wage * (1 + incrementPercent / 100) * 100) / 100;
      return this.masterUpdate(employeeUUID, { basic_wage: newBasic }, effectiveDate);
    },

    /**
     * Performance Bonus rates per designation (monthly ₹ amount)
     * Based on industrial norms for contractual labor in heavy engineering / PSU sites
     */
    PERFORMANCE_BONUS_RATES: {
      'General Helper':       200,
      'Helper':               200,
      'Fitter':               400,
      'Mechanical Fitter':    400,
      'Welder (MIG/TIG)':     500,
      'Welder':               500,
      'Electrician':          450,
      'Crane Operator':       600,
      'Rigger':               400,
      'Scaffolder':           350,
      'Plumber':              350,
      'Mason':                350,
      'Painter':              300,
      'Safety Steward':       500,
      'Supervisor':           700,
      'Site Engineer':        800,
    },

    /**
     * Calculate Performance Bonus for an employee based on designation
     * @param {string} designation — employee designation
     * @param {number} daysWorked — days worked in the month
     * @param {number} totalWorkingDays — total working days in the month (default 26)
     * @returns {Object} { amount, rate, proRata }
     */
    calculatePerformanceBonus(designation, daysWorked, totalWorkingDays = 26) {
      const rate = this.PERFORMANCE_BONUS_RATES[designation] || 250; // Default ₹250
      const proRata = Math.round(rate * (daysWorked / totalWorkingDays));
      return { amount: proRata, rate, proRata, fullMonthAmount: rate };
    },

    // ============================================
    // UI: Render Master Update Modal (inject into DOM)
    // ============================================
    showUpdateModal(emp, onSaved) {
      // Remove existing modal if any
      const existing = document.getElementById('wageUpdateModal');
      if (existing) existing.remove();

      const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '';

      const modal = document.createElement('div');
      modal.id = 'wageUpdateModal';
      modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div class="bg-[#0055a5] text-white p-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h2 class="font-bold text-lg">Master Update — ${emp.full_name}</h2>
              <p class="text-xs text-white/70">Emp ID: ${emp.emp_id} | ${emp.designation || 'N/A'}</p>
            </div>
            <button id="closeWageModal" class="text-white/60 hover:text-white text-2xl">&times;</button>
          </div>

          <form id="wageUpdateForm" class="p-4">
            <!-- Effective Date -->
            <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <label class="block text-xs font-bold text-amber-800 mb-1">EFFECTIVE DATE (required)</label>
              <input type="date" id="wuEffDate" value="${new Date().toISOString().slice(0,10)}" required
                class="border border-amber-300 rounded px-3 py-2 text-sm w-48 font-semibold">
              <span class="text-xs text-amber-600 ml-2">All changes will be logged from this date</span>
            </div>

            <!-- Personnel Fields -->
            <fieldset class="border border-slate-200 p-3 mb-4 rounded">
              <legend class="text-xs font-bold text-slate-600 px-2">PERSONNEL</legend>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${this._field('Designation', 'wuDesignation', emp.designation, 'text')}
                ${this._field('Category', 'wuCategory', emp.category, 'select', ['Unskilled','Semi-skilled','Skilled','Highly Skilled'])}
                ${this._field('Department', 'wuDepartment', emp.department, 'text')}
                ${this._field('Employee Type', 'wuEmpType', emp.employee_type, 'select', ['Contractual','Permanent','Trainee','Probation'])}
                ${this._field('Work Order No.', 'wuWorkOrder', emp.work_order_no, 'text')}
                ${this._field('Vendor Code', 'wuVendorCode', emp.vendor_code, 'text')}
              </div>
            </fieldset>

            <!-- Wage Variables -->
            <fieldset class="border border-blue-200 p-3 mb-4 rounded bg-blue-50/30">
              <legend class="text-xs font-bold text-blue-700 px-2">WAGE VARIABLES (₹/day)</legend>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${this._field('Basic Wage', 'wuBasic', emp.basic_wage, 'number')}
                ${this._field('DA', 'wuDA', emp.da_allowance, 'number')}
                ${this._field('HRA', 'wuHRA', emp.hra, 'number')}
              </div>
              <div class="mt-2 text-xs text-blue-600" id="wuCalcPreview"></div>
            </fieldset>

            <!-- Statutory -->
            <fieldset class="border border-slate-200 p-3 mb-4 rounded">
              <legend class="text-xs font-bold text-slate-600 px-2">STATUTORY</legend>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${this._field('UAN (PF)', 'wuUAN', emp.uan_no, 'text')}
                ${this._field('ESI No.', 'wuESI', emp.esi_no, 'text')}
              </div>
            </fieldset>

            <!-- Banking -->
            <fieldset class="border border-slate-200 p-3 mb-4 rounded">
              <legend class="text-xs font-bold text-slate-600 px-2">BANKING</legend>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${this._field('Bank Name', 'wuBank', emp.bank_name, 'text')}
                ${this._field('Account No.', 'wuAccNo', emp.account_no, 'text')}
                ${this._field('IFSC Code', 'wuIFSC', emp.ifsc_code, 'text')}
              </div>
            </fieldset>

            <!-- Actions -->
            <div class="flex gap-3 justify-end pt-2 border-t">
              <button type="button" id="showAuditBtn" class="px-4 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50">
                View Audit Trail
              </button>
              <button type="submit" class="px-6 py-2 bg-[#0055a5] text-white text-sm font-bold rounded hover:bg-[#003d7a]">
                Save Changes
              </button>
            </div>
          </form>

          <!-- Audit Trail Panel (hidden by default) -->
          <div id="auditTrailPanel" class="hidden border-t">
            <div class="bg-slate-100 p-3 flex items-center justify-between">
              <h3 class="font-bold text-sm text-slate-700">Change History / Audit Trail</h3>
              <button id="closeAuditPanel" class="text-slate-400 hover:text-slate-700 text-lg">&times;</button>
            </div>
            <div id="auditTrailContent" class="p-3 max-h-60 overflow-y-auto text-xs"></div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Close modal
      document.getElementById('closeWageModal').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

      // Live preview of PF/ESI calculations
      const updatePreview = () => {
        const basic = parseFloat(document.getElementById('wuBasic')?.value) || 0;
        const da = parseFloat(document.getElementById('wuDA')?.value) || 0;
        const pf = this.calculatePF(basic, da, 26);
        const gross26 = (basic + da) * 26;
        const esi = this.calculateESI(gross26);
        document.getElementById('wuCalcPreview').innerHTML =
          `<strong>Preview (26 days):</strong> Gross ≈ ₹${gross26.toLocaleString('en-IN')} | PF Employee: ₹${pf.employeePF} | ESI: ${esi.applicable ? '₹'+esi.employeeESI : 'N/A (above ₹21K)'}`;
      };
      ['wuBasic', 'wuDA', 'wuHRA'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePreview);
      });
      updatePreview();

      // Save
      document.getElementById('wageUpdateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const effDate = document.getElementById('wuEffDate').value;
        const changes = {
          designation: document.getElementById('wuDesignation').value,
          category: document.getElementById('wuCategory').value,
          department: document.getElementById('wuDepartment').value,
          employee_type: document.getElementById('wuEmpType').value,
          work_order_no: document.getElementById('wuWorkOrder').value,
          vendor_code: document.getElementById('wuVendorCode').value,
          basic_wage: parseFloat(document.getElementById('wuBasic').value) || null,
          da_allowance: parseFloat(document.getElementById('wuDA').value) || null,
          hra: parseFloat(document.getElementById('wuHRA').value) || null,
          uan_no: document.getElementById('wuUAN').value,
          esi_no: document.getElementById('wuESI').value,
          bank_name: document.getElementById('wuBank').value,
          account_no: document.getElementById('wuAccNo').value,
          ifsc_code: document.getElementById('wuIFSC').value,
        };

        const btn = e.target.querySelector('button[type=submit]');
        btn.innerHTML = 'Saving...'; btn.disabled = true;

        const result = await this.masterUpdate(emp.id, changes, effDate);

        if (result.success) {
          btn.innerHTML = `✓ Saved (${result.updated} fields, ${result.logs} logged)`;
          btn.classList.replace('bg-[#0055a5]', 'bg-emerald-600');
          setTimeout(() => { modal.remove(); if (onSaved) onSaved(); }, 1500);
        } else {
          btn.innerHTML = 'Error: ' + result.error;
          btn.classList.replace('bg-[#0055a5]', 'bg-red-600');
          btn.disabled = false;
          setTimeout(() => {
            btn.innerHTML = 'Save Changes';
            btn.classList.replace('bg-red-600', 'bg-[#0055a5]');
          }, 2000);
        }
      });

      // Audit trail toggle
      document.getElementById('showAuditBtn').addEventListener('click', async () => {
        const panel = document.getElementById('auditTrailPanel');
        const content = document.getElementById('auditTrailContent');
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
          content.innerHTML = '<p class="text-slate-400">Loading...</p>';
          const trail = await this.getAuditTrail(emp.id);
          if (trail.length === 0) {
            content.innerHTML = '<p class="text-slate-400">No changes recorded yet.</p>';
          } else {
            content.innerHTML = `<table class="w-full text-left border-collapse">
              <thead><tr class="bg-slate-200 text-[10px] font-bold uppercase">
                <th class="p-1.5">Date</th><th class="p-1.5">Field</th>
                <th class="p-1.5">Old Value</th><th class="p-1.5">New Value</th>
                <th class="p-1.5">Effective</th>
              </tr></thead>
              <tbody>${trail.map((t, i) => `
                <tr class="${i%2?'bg-slate-50':''} border-b border-slate-200">
                  <td class="p-1.5">${new Date(t.changed_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                  <td class="p-1.5 font-semibold text-blue-700">${t.field_changed}</td>
                  <td class="p-1.5 text-red-600">${t.old_value || '—'}</td>
                  <td class="p-1.5 text-emerald-700 font-semibold">${t.new_value || '—'}</td>
                  <td class="p-1.5">${t.effective_date ? new Date(t.effective_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</td>
                </tr>`).join('')}
              </tbody></table>`;
          }
        }
      });
      document.getElementById('closeAuditPanel').addEventListener('click', () => {
        document.getElementById('auditTrailPanel').classList.add('hidden');
      });
    },

    // Helper: Generate form field HTML
    _field(label, id, value, type, options) {
      if (type === 'select') {
        return `<div>
          <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">${label}</label>
          <select id="${id}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${(options||[]).map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }
      return `<div>
        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">${label}</label>
        <input type="${type}" id="${id}" value="${value ?? ''}"
          class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" ${type === 'number' ? 'step="0.01"' : ''}>
      </div>`;
    }

  }; // end SSWage
})();
