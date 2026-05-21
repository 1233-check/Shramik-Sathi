/**
 * Shramik Sathi — Payroll Calculation & Wage Register Module
 *
 * Compliant with:
 *   • Code on Wages, 2019
 *   • EPF Act — 12% employee contribution on (Basic + DA), ₹15,000 wage ceiling (max ₹1,800/month)
 *   • ESI Act — 0.75% employee + 3.25% employer, ₹21,000 gross ceiling
 *
 * Depends on: supabase-config.js (getSupabaseClient)
 */
window.SSPayroll = (function () {
  'use strict';

  const sb = getSupabaseClient();

  /* ──────────────────────────── Constants ──────────────────────────── */

  /** PF wage ceiling per month (₹15,000 × days factor is ignored; statutory cap is flat ₹15,000) */
  const PF_WAGE_CEILING = 15000;
  /** Maximum PF employee contribution per month (12% of ₹15,000) */
  const PF_MAX_MONTHLY  = 1800;
  /** PF contribution rate */
  const PF_RATE = 0.12;

  /** ESI employee contribution rate */
  const ESI_EMPLOYEE_RATE = 0.0075;
  /** ESI employer contribution rate (stored for reference; not deducted from employee) */
  const ESI_EMPLOYER_RATE = 0.0325;
  /** ESI applicability gross ceiling per month */
  const ESI_GROSS_CEILING = 21000;

  /** Statutory bonus rate under the Payment of Bonus Act (minimum 8.33%) */
  const BONUS_RATE = 0.0833;

  /** Overtime multiplier as per Code on Wages (2× normal hourly rate) */
  const OT_MULTIPLIER = 2;

  /** Standard working hours per day */
  const STANDARD_HOURS_PER_DAY = 8;

  /* ──────────────────────────── Helpers ──────────────────────────── */

  /**
   * Build a date range string pair for a given month/year.
   * @param {number} month - 1-indexed month (1 = January)
   * @param {number} year
   * @returns {{ startDate: string, endDate: string }} ISO date strings
   */
  function _monthRange(month, year) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0); // last day of the month
    const pad   = (n) => String(n).padStart(2, '0');
    return {
      startDate: `${year}-${pad(month)}-01`,
      endDate:   `${year}-${pad(month)}-${pad(end.getDate())}`,
    };
  }

  /**
   * Round a number to 2 decimal places (paise precision).
   * @param {number} n
   * @returns {number}
   */
  function _r(n) {
    return Math.round(n * 100) / 100;
  }

  /* ────────────────────── Core Wage Calculation ────────────────────── */

  /**
   * Calculate the monthly wage for a single employee.
   *
   * **Calculation logic**
   * | Component        | Formula                                                              |
   * |------------------|----------------------------------------------------------------------|
   * | days_worked      | count('Present') + 0.5 × count('Half-Day')                          |
   * | basic            | basic_wage × days_worked                                             |
   * | da               | da_allowance × days_worked                                           |
   * | hra              | employee.hra OR 10% of basic                                         |
   * | overtime_pay     | (basic_wage / 8) × 2 × total_overtime_hours                          |
   * | bonus            | 8.33% of (basic + da)                                                |
   * | gross            | basic + da + hra + overtime_pay + bonus                               |
   * | pf_deduction     | 12% of (basic + da), capped at ₹1,800                                |
   * | esi_deduction    | 0.75% of gross (only if gross ≤ ₹21,000)                             |
   * | net_pay          | gross − pf − esi − advance_deduction − fine_deduction                |
   *
   * @param {string} empId - The `emp_id` value from the employees table.
   * @param {number} month - 1-indexed month (1 = January … 12 = December).
   * @param {number} year  - Four-digit year.
   * @returns {Promise<Object>} The full wage record object ready for DB upsert.
   * @throws Will throw / return an error object on Supabase failures.
   */
  async function calculateMonthlyWage(empId, month, year) {
    console.log(`[SSPayroll] calculateMonthlyWage — emp: ${empId}, period: ${month}/${year}`);

    try {
      /* ── 1. Fetch employee master ── */
      const { data: emp, error: empErr } = await sb
        .from('employees')
        .select('id, emp_id, full_name, designation, category, basic_wage, da_allowance, hra, status')
        .eq('emp_id', empId)
        .single();

      if (empErr) {
        console.error('[SSPayroll] Employee fetch error:', empErr);
        throw new Error(`Employee ${empId} not found — ${empErr.message}`);
      }

      console.log(`[SSPayroll] Employee: ${emp.full_name} (${emp.emp_id}), Basic/day: ₹${emp.basic_wage}, DA/day: ₹${emp.da_allowance}`);

      /* ── 2. Fetch attendance for the month ── */
      const { startDate, endDate } = _monthRange(month, year);

      const { data: attendance, error: attErr } = await sb
        .from('attendance')
        .select('status, overtime_hours')
        .eq('employee_id', emp.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (attErr) {
        console.error('[SSPayroll] Attendance fetch error:', attErr);
        throw new Error(`Attendance fetch failed — ${attErr.message}`);
      }

      console.log(`[SSPayroll] Attendance records found: ${attendance.length}`);

      /* ── 3. Aggregate attendance ── */
      let presentDays  = 0;
      let halfDays     = 0;
      let totalOTHours = 0;

      for (const rec of attendance) {
        const s = (rec.status || '').trim();
        if (s === 'Present') {
          presentDays += 1;
        } else if (s === 'Half Day' || s === 'Half-Day') {
          halfDays += 1;
        }
        totalOTHours += parseFloat(rec.overtime_hours) || 0;
      }

      const daysWorked = presentDays + 0.5 * halfDays;
      console.log(`[SSPayroll] Days: Present=${presentDays}, Half-Day=${halfDays}, Effective=${daysWorked}, OT hrs=${totalOTHours}`);

      /* ── 4. Earnings ── */
      const basicWagePerDay = parseFloat(emp.basic_wage) || 0;
      const daPerDay        = parseFloat(emp.da_allowance) || 0;
      const empHRA          = parseFloat(emp.hra);

      const basic       = _r(basicWagePerDay * daysWorked);
      const da          = _r(daPerDay * daysWorked);
      const hra         = _r(!isNaN(empHRA) && empHRA > 0 ? empHRA : basic * 0.10);
      const overtimePay = _r((basicWagePerDay / STANDARD_HOURS_PER_DAY) * OT_MULTIPLIER * totalOTHours);
      const bonus       = _r(BONUS_RATE * (basic + da));    // proportionate monthly bonus
      const gross       = _r(basic + da + hra + overtimePay + bonus);

      console.log(`[SSPayroll] Earnings — Basic: ₹${basic}, DA: ₹${da}, HRA: ₹${hra}, OT: ₹${overtimePay}, Bonus: ₹${bonus}, Gross: ₹${gross}`);

      /* ── 5. Deductions ── */
      // PF: 12% of (basic + da), capped at ₹1,800/month (wage ceiling ₹15,000)
      const pfBase      = basic + da;
      const pfDeduction = _r(Math.min(pfBase * PF_RATE, PF_MAX_MONTHLY));

      // ESI: 0.75% of gross, applicable only when gross ≤ ₹21,000/month
      const esiDeduction = gross <= ESI_GROSS_CEILING ? _r(gross * ESI_EMPLOYEE_RATE) : 0;

      // Advance & fine deductions — fetch from existing wage_records if previously saved, else 0
      let advanceDeduction = 0;
      let fineDeduction    = 0;
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const wageMonth = `${monthNames[month - 1]} ${year}`;

      const { data: existingRec } = await sb
        .from('wage_records')
        .select('advance_deduction, fine_deduction')
        .eq('employee_id', emp.id)
        .eq('wage_month', wageMonth)
        .maybeSingle();

      if (existingRec) {
        advanceDeduction = parseFloat(existingRec.advance_deduction) || 0;
        fineDeduction    = parseFloat(existingRec.fine_deduction) || 0;
      }

      const totalDeductions = _r(pfDeduction + esiDeduction + advanceDeduction + fineDeduction);
      const netPay          = _r(gross - totalDeductions);

      console.log(`[SSPayroll] Deductions — PF: ₹${pfDeduction}, ESI: ₹${esiDeduction}, Advance: ₹${advanceDeduction}, Fine: ₹${fineDeduction}`);
      console.log(`[SSPayroll] Net Pay: ₹${netPay}`);

      /* ── 6. Compute leave balance ── */
      const leaveYear = year;
      const LEAVE_QUOTA = { Casual: 12, Sick: 6, Earned: 15 };
      let leaveBalance = 0;
      try {
        const { data: leavesTaken } = await sb.from('leave_requests')
          .select('leave_type, days').eq('employee_id', emp.id)
          .eq('status', 'Approved').gte('from_date', `${leaveYear}-01-01`);
        const used = { Casual: 0, Sick: 0, Earned: 0 };
        (leavesTaken || []).forEach(l => { if (used[l.leave_type] !== undefined) used[l.leave_type] += (l.days || 0); });
        leaveBalance = (LEAVE_QUOTA.Casual - used.Casual) + (LEAVE_QUOTA.Sick - used.Sick) + (LEAVE_QUOTA.Earned - used.Earned);
      } catch (e) { console.warn('[SSPayroll] Leave balance calc skipped:', e.message); }

      /* ── 7. Build wage record ── */
      const wageRecord = {
        employee_id:       emp.id,
        wage_month:        wageMonth,
        days_worked:       daysWorked,
        basic:             basic,
        da:                da,
        hra:               hra,
        overtime_pay:      overtimePay,
        bonus:             bonus,
        gross:             gross,
        pf_deduction:      pfDeduction,
        esi_deduction:     esiDeduction,
        advance_deduction: advanceDeduction,
        fine_deduction:    fineDeduction,
        net_pay:           netPay,
        leave_balance:     leaveBalance,
      };

      // Attach useful metadata for caller (not stored in DB)
      wageRecord._meta = {
        emp_id:            emp.emp_id,
        full_name:         emp.full_name,
        designation:       emp.designation,
        category:          emp.category,
        present_days:      presentDays,
        half_days:         halfDays,
        total_ot_hours:    totalOTHours,
        pf_base:           pfBase,
        esi_applicable:    gross <= ESI_GROSS_CEILING,
      };

      return { success: true, data: wageRecord };

    } catch (err) {
      console.error('[SSPayroll] calculateMonthlyWage FAILED:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /* ────────────────── Bulk Payroll Generation ────────────────── */

  /**
   * Generate monthly payroll for **all active employees**.
   *
   * For each active employee the method calls `calculateMonthlyWage`, then
   * upserts the computed wage record into the `wage_records` table (conflict
   * resolution on `employee_id` + `wage_month`).
   *
   * @param {number} month - 1-indexed month.
   * @param {number} year  - Four-digit year.
   * @returns {Promise<Object>} Summary object:
   *   `{ success, processed, failed, totals: { gross, deductions, net }, records, errors }`
   */
  async function generateMonthlyPayroll(month, year) {
    console.log(`[SSPayroll] generateMonthlyPayroll — period: ${month}/${year}`);

    try {
      /* ── 1. Fetch all active employees ── */
      const { data: employees, error: listErr } = await sb
        .from('employees')
        .select('emp_id')
        .eq('status', 'Active');

      if (listErr) {
        console.error('[SSPayroll] Employee list error:', listErr);
        throw new Error(`Failed to fetch employees — ${listErr.message}`);
      }

      console.log(`[SSPayroll] Active employees: ${employees.length}`);

      if (employees.length === 0) {
        return {
          success: true,
          processed: 0,
          failed: 0,
          totals: { gross: 0, deductions: 0, net: 0 },
          records: [],
          errors: [],
        };
      }

      /* ── 2. Calculate wages for each employee ── */
      const records = [];
      const errors  = [];
      let totalGross      = 0;
      let totalDeductions  = 0;
      let totalNet         = 0;

      for (const emp of employees) {
        const result = await calculateMonthlyWage(emp.emp_id, month, year);

        if (result.success) {
          records.push(result.data);
          totalGross      += result.data.gross;
          totalDeductions += _r(result.data.pf_deduction + result.data.esi_deduction + result.data.advance_deduction + result.data.fine_deduction);
          totalNet        += result.data.net_pay;
        } else {
          errors.push({ emp_id: emp.emp_id, error: result.error });
          console.warn(`[SSPayroll] Skipping ${emp.emp_id}: ${result.error}`);
        }
      }

      /* ── 3. Upsert wage records into DB ── */
      if (records.length > 0) {
        // Strip _meta before upserting (not a DB column)
        const dbRows = records.map(({ _meta, ...row }) => row);

        const { error: upsertErr } = await sb
          .from('wage_records')
          .upsert(dbRows, {
            onConflict: 'employee_id,wage_month',
            ignoreDuplicates: false,
          });

        if (upsertErr) {
          console.error('[SSPayroll] Upsert error:', upsertErr);
          throw new Error(`Wage records upsert failed — ${upsertErr.message}`);
        }

        console.log(`[SSPayroll] Upserted ${dbRows.length} wage records.`);
      }

      /* ── 4. Build summary ── */
      const summary = {
        success:   true,
        period:    `${String(month).padStart(2, '0')}/${year}`,
        processed: records.length,
        failed:    errors.length,
        totals: {
          gross:      _r(totalGross),
          deductions: _r(totalDeductions),
          net:        _r(totalNet),
        },
        records: records,
        errors:  errors,
      };

      console.log(`[SSPayroll] Payroll complete — Processed: ${summary.processed}, Failed: ${summary.failed}`);
      console.log(`[SSPayroll] Totals — Gross: ₹${summary.totals.gross}, Deductions: ₹${summary.totals.deductions}, Net: ₹${summary.totals.net}`);

      return summary;

    } catch (err) {
      console.error('[SSPayroll] generateMonthlyPayroll FAILED:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /* ────────────────── Payroll Summary / Report ────────────────── */

  /**
   * Retrieve and aggregate the payroll summary for a given month from
   * previously generated `wage_records`.
   *
   * @param {number} month - 1-indexed month.
   * @param {number} year  - Four-digit year.
   * @returns {Promise<Object>} Aggregated summary:
   *   `{ success, period, employee_count, total_gross, total_deductions, total_net, avg_wage, records }`
   */
  async function getPayrollSummary(month, year) {
    console.log(`[SSPayroll] getPayrollSummary — period: ${month}/${year}`);

    try {
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const wageMonth = `${monthNames[month - 1]} ${year}`;

      const { data: records, error: fetchErr } = await sb
        .from('wage_records')
        .select(`
          id,
          employee_id,
          wage_month,
          days_worked,
          basic,
          da,
          hra,
          overtime_pay,
          bonus,
          gross,
          pf_deduction,
          esi_deduction,
          advance_deduction,
          fine_deduction,
          net_pay,
          leave_balance,
          payment_date,
          payment_mode,
          employees ( emp_id, full_name, designation, category )
        `)
        .eq('wage_month', wageMonth);

      if (fetchErr) {
        console.error('[SSPayroll] Summary fetch error:', fetchErr);
        throw new Error(`Failed to fetch wage records — ${fetchErr.message}`);
      }

      if (!records || records.length === 0) {
        console.warn(`[SSPayroll] No wage records found for ${wageMonth}`);
        return {
          success:          true,
          period:           wageMonth,
          employee_count:   0,
          total_gross:      0,
          total_deductions: 0,
          total_net:        0,
          avg_wage:         0,
          records:          [],
        };
      }

      /* ── Aggregate ── */
      let totalGross      = 0;
      let totalDeductions  = 0;
      let totalNet         = 0;

      for (const r of records) {
        const gross = parseFloat(r.gross) || 0;
        const pf    = parseFloat(r.pf_deduction) || 0;
        const esi   = parseFloat(r.esi_deduction) || 0;
        const adv   = parseFloat(r.advance_deduction) || 0;
        const fine  = parseFloat(r.fine_deduction) || 0;
        const net   = parseFloat(r.net_pay) || 0;

        totalGross      += gross;
        totalDeductions += (pf + esi + adv + fine);
        totalNet        += net;
      }

      const summary = {
        success:          true,
        period:           wageMonth,
        employee_count:   records.length,
        total_gross:      _r(totalGross),
        total_deductions: _r(totalDeductions),
        total_net:        _r(totalNet),
        avg_wage:         _r(totalNet / records.length),
        records:          records,
      };

      console.log(`[SSPayroll] Summary — Employees: ${summary.employee_count}, Gross: ₹${summary.total_gross}, Net: ₹${summary.total_net}, Avg: ₹${summary.avg_wage}`);

      return summary;

    } catch (err) {
      console.error('[SSPayroll] getPayrollSummary FAILED:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /* ────────────────── Public API ────────────────── */

  console.log('[SSPayroll] Module loaded ✓');

  return {
    calculateMonthlyWage,
    generateMonthlyPayroll,
    getPayrollSummary,

    /** Expose constants for reference / UI display */
    CONSTANTS: Object.freeze({
      PF_RATE,
      PF_WAGE_CEILING,
      PF_MAX_MONTHLY,
      ESI_EMPLOYEE_RATE,
      ESI_EMPLOYER_RATE,
      ESI_GROSS_CEILING,
      BONUS_RATE,
      OT_MULTIPLIER,
      STANDARD_HOURS_PER_DAY,
    }),
  };

})();
