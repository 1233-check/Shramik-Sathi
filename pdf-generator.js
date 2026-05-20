// Shramik Sathi — PDF Document Generator
// Uses jsPDF to generate Appointment Letters, ID Cards, Experience Certificates, Wage Slips

(function() {
  function getJsPDF() {
    if (window.jspdf) return new window.jspdf.jsPDF();
    console.error('jsPDF library not loaded');
    return null;
  }
  function getJsPDFOpts(opts) {
    if (window.jspdf) return new window.jspdf.jsPDF(opts);
    return null;
  }

  window.SSPdf = {

    // ============================================
    // APPOINTMENT LETTER
    // ============================================
    appointmentLetter(emp) {
      const doc = getJsPDF(); if (!doc) return;
      const w = doc.internal.pageSize.getWidth();
      const m = 20; // margin

      // Header band
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 35, 'F');
      doc.setTextColor(255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 16, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Sakchi, Jamshedpur, Jharkhand 831001 | CIN: U74999JH2020PTC012345', w/2, 24, { align: 'center' });
      doc.text('Phone: +91 8317585795 | Email: greencircletechnolegal@gmail.com', w/2, 30, { align: 'center' });

      // Title
      doc.setTextColor(0); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('APPOINTMENT LETTER', w/2, 50, { align: 'center' });

      // Underline
      doc.setDrawColor(0, 85, 165); doc.setLineWidth(0.8);
      doc.line(w/2 - 40, 52, w/2 + 40, 52);

      // Reference & Date
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Ref: SS/APT/${emp.emp_id}/${new Date().getFullYear()}`, m, 65);
      doc.text(`Date: ${today}`, w - m, 65, { align: 'right' });

      // To
      doc.setFont('helvetica', 'bold');
      doc.text('To,', m, 78);
      doc.text(emp.full_name, m, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`S/o / D/o ${emp.father_name || 'N/A'}`, m, 91);
      doc.text(emp.address || 'Address on record', m, 97);

      // Subject
      let y = 110;
      doc.setFont('helvetica', 'bold');
      doc.text('Subject: Letter of Appointment', m, y);

      // Body
      y += 12;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const body = [
        `Dear ${emp.full_name},`,
        '',
        `With reference to your application and subsequent interview, we are pleased to appoint you as "${emp.designation || 'Worker'}" in our organization, effective from ${emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}) : 'the date of joining'}.`,
        '',
        'The terms and conditions of your appointment are as follows:',
        '',
        `1. DESIGNATION: You will be designated as "${emp.designation || 'Worker'}" under the category "${emp.category || 'Skilled'}" as per the Industrial Relations Code, 2020.`,
        '',
        `2. PLACE OF WORK: You will be posted at the work site as assigned by the company. Your current department/location is: ${emp.department || 'As assigned'}.`,
        '',
        `3. WAGES: Your basic wage shall be ₹${emp.basic_wage || 0}/day plus applicable Dearness Allowance (DA) as per Jharkhand State Minimum Wages notification. All statutory deductions (PF, ESI) shall be applicable.`,
        '',
        `4. UAN: ${emp.uan_no || 'To be assigned'} | ESI: ${emp.esi_no || 'To be assigned'}`,
        '',
        '5. WORKING HOURS: As per the Occupational Safety, Health and Working Conditions Code, 2020. Overtime shall be payable at twice the ordinary rate of wages.',
        '',
        '6. LEAVE: You shall be entitled to leave as per the applicable labour laws and company policy.',
        '',
        '7. TERMINATION: Either party may terminate this appointment by giving 30 days notice or wages in lieu thereof.',
        '',
        'Please acknowledge receipt of this letter and confirm your acceptance by signing the duplicate copy.',
        '',
        'We wish you a successful and fulfilling career with Shramik Sathi.',
      ];

      body.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(line, w - 2*m);
        doc.text(lines, m, y);
        y += lines.length * 5 + 1;
      });

      // Signature
      y += 15;
      if (y > 255) { doc.addPage(); y = 30; }
      doc.setFont('helvetica', 'bold');
      doc.text('For Shramik Sathi Pvt. Ltd.', m, y);
      y += 20;
      doc.text('________________________', m, y);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', m, y + 6);

      doc.text('________________________', w - m - 50, y);
      doc.text(`${emp.full_name}`, w - m - 50, y + 6);
      doc.text('(Employee Signature)', w - m - 50, y + 12);

      // Footer
      doc.setFontSize(7); doc.setTextColor(128);
      doc.text('This is a system-generated document from Shramik Sathi CLMS. | Industrial Relations Code, 2020 compliant.', w/2, 290, { align: 'center' });

      doc.save(`Appointment_Letter_${emp.emp_id}_${emp.full_name.replace(/\s/g,'_')}.pdf`);
    },

    // ============================================
    // EMPLOYMENT ID CARD
    // ============================================
    idCard(emp) {
      const doc = getJsPDFOpts({ orientation: 'landscape', unit: 'mm', format: [86, 54] }); // CR80 card size
      if (!doc) return;
      const w = 86, h = 54;

      // Front side
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 14, 'F');
      doc.setTextColor(255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 6, { align: 'center' });
      doc.setFontSize(5); doc.setFont('helvetica', 'normal');
      doc.text('EMPLOYEE IDENTITY CARD', w/2, 11, { align: 'center' });

      // Photo placeholder
      doc.setFillColor(230); doc.setDrawColor(180);
      doc.rect(5, 17, 18, 22, 'FD');
      doc.setFontSize(5); doc.setTextColor(150);
      doc.text('PHOTO', 14, 29, { align: 'center' });

      // Details
      doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(emp.full_name || 'Employee Name', 27, 21);
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(`ID: ${emp.emp_id}`, 27, 26);
      doc.text(`Designation: ${emp.designation || '—'}`, 27, 30);
      doc.text(`Blood Group: ${emp.blood_group || '—'}`, 27, 34);
      doc.text(`UAN: ${emp.uan_no || 'Pending'}`, 27, 38);

      // Bottom band
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 44, w, 10, 'F');
      doc.setTextColor(255); doc.setFontSize(5);
      doc.text(`Gate Pass: ${emp.gate_pass_no || 'Pending'} | Valid: ${emp.gate_pass_valid_upto ? new Date(emp.gate_pass_valid_upto).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}`, w/2, 49, { align: 'center' });

      // Real QR code (right side)
      try {
        const qrUrl = `${window.location.origin}/worker-profile.html?id=${emp.emp_id}`;
        const qr = qrcode(0, 'M');
        qr.addData(qrUrl);
        qr.make();
        const qrDataUrl = qr.createDataURL(4, 0);
        doc.addImage(qrDataUrl, 'GIF', 66, 17, 16, 16);
      } catch (e) {
        doc.setFillColor(240); doc.setDrawColor(200);
        doc.rect(66, 17, 16, 16, 'FD');
        doc.setFontSize(4); doc.setTextColor(150);
        doc.text('QR CODE', 74, 26, { align: 'center' });
      }

      doc.save(`ID_Card_${emp.emp_id}_${emp.full_name.replace(/\s/g,'_')}.pdf`);
    },

    // ============================================
    // EXPERIENCE CERTIFICATE
    // ============================================
    experienceCertificate(emp) {
      const doc = getJsPDF(); if (!doc) return;
      const w = doc.internal.pageSize.getWidth();
      const m = 25;

      // Header
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 35, 'F');
      doc.setTextColor(255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 16, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Sakchi, Jamshedpur, Jharkhand 831001', w/2, 24, { align: 'center' });
      doc.text('CIN: U74999JH2020PTC012345', w/2, 30, { align: 'center' });

      // Title
      doc.setTextColor(0); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('EXPERIENCE CERTIFICATE', w/2, 55, { align: 'center' });
      doc.setDrawColor(0, 85, 165); doc.setLineWidth(0.8);
      doc.line(w/2 - 45, 58, w/2 + 45, 58);

      // Ref
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Ref: SS/EXP/${emp.emp_id}/${new Date().getFullYear()}`, m, 72);
      doc.text(`Date: ${today}`, w - m, 72, { align: 'right' });

      // To whom it may concern
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('TO WHOM IT MAY CONCERN', w/2, 90, { align: 'center' });

      // Body
      let y = 108;
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      const doj = emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}) : '______';
      const dol = emp.date_of_leaving ? new Date(emp.date_of_leaving).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}) : today;

      const paras = [
        `This is to certify that Mr./Ms. ${emp.full_name}, S/o / D/o ${emp.father_name || '______'}, has been employed with Shramik Sathi Pvt. Ltd. from ${doj} to ${dol}.`,
        '',
        `During this period, ${emp.gender === 'female' ? 'she' : 'he'} was designated as "${emp.designation || 'Worker'}" under the "${emp.category || 'Skilled'}" category.`,
        '',
        `${emp.gender === 'female' ? 'Her' : 'His'} Employee ID was ${emp.emp_id} and UAN (PF) number is ${emp.uan_no || 'N/A'}.`,
        '',
        `${emp.gender === 'female' ? 'She' : 'He'} has performed ${emp.gender === 'female' ? 'her' : 'his'} duties with sincerity and dedication throughout the tenure. We found ${emp.gender === 'female' ? 'her' : 'his'} conduct to be satisfactory.`,
        '',
        `We wish ${emp.gender === 'female' ? 'her' : 'him'} all the best for future endeavours.`,
      ];

      paras.forEach(p => {
        const lines = doc.splitTextToSize(p, w - 2*m);
        doc.text(lines, m, y);
        y += lines.length * 6 + 2;
      });

      // Signature
      y += 25;
      doc.setFont('helvetica', 'bold');
      doc.text('For Shramik Sathi Pvt. Ltd.', m, y);
      y += 20;
      doc.text('________________________', m, y);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', m, y + 6);
      doc.text('(Company Seal)', m, y + 12);

      doc.setFontSize(7); doc.setTextColor(128);
      doc.text('This is a system-generated certificate from Shramik Sathi CLMS.', w/2, 290, { align: 'center' });

      doc.save(`Experience_Certificate_${emp.emp_id}_${emp.full_name.replace(/\s/g,'_')}.pdf`);
    },

    // ============================================
    // WAGE SLIP
    // ============================================
    wageSlip(emp, wage) {
      const doc = getJsPDF(); if (!doc) return;
      const w = doc.internal.pageSize.getWidth();
      const m = 15;

      // Header
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 28, 'F');
      doc.setTextColor(255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`WAGE SLIP — ${wage.wage_month}`, w/2, 22, { align: 'center' });

      // Employee info
      let y = 40;
      doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const info = [
        ['Employee Name', emp.full_name, 'Emp ID', emp.emp_id],
        ['Designation', emp.designation || '—', 'Category', emp.category || '—'],
        ['UAN', emp.uan_no || '—', 'ESI', emp.esi_no || '—'],
        ['Bank', emp.bank_name || '—', 'A/C No', emp.account_no ? 'XXXXXX' + emp.account_no.slice(-4) : '—'],
        ['Days Worked', String(wage.days_worked), 'Wage Month', wage.wage_month]
      ];

      info.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.text(row[0] + ':', m, y);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1], m + 35, y);
        doc.setFont('helvetica', 'bold');
        doc.text(row[2] + ':', w/2 + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(row[3], w/2 + 35, y);
        y += 7;
      });

      // Earnings / Deductions table
      y += 8;
      doc.setDrawColor(0, 85, 165); doc.setLineWidth(0.5);
      doc.line(m, y, w - m, y);
      y += 6;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text('EARNINGS', m + 20, y);
      doc.text('DEDUCTIONS', w/2 + 25, y);
      y += 3;
      doc.line(m, y, w - m, y);
      y += 7;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const fmt = n => '₹ ' + Number(n || 0).toLocaleString('en-IN');

      const earnings = [
        ['Basic', fmt(wage.basic)],
        ['DA', fmt(wage.da)],
        ['HRA', fmt(wage.hra)],
        ['Overtime', fmt(wage.overtime_pay)],
        ['Bonus', fmt(wage.bonus)],
      ];
      const deductions = [
        ['PF (12%)', fmt(wage.pf_deduction)],
        ['ESI (0.75%)', fmt(wage.esi_deduction)],
        ['Advance', fmt(wage.advance_deduction)],
        ['Fine', fmt(wage.fine_deduction)],
      ];

      const maxRows = Math.max(earnings.length, deductions.length);
      for (let i = 0; i < maxRows; i++) {
        if (earnings[i]) {
          doc.text(earnings[i][0], m, y);
          doc.text(earnings[i][1], m + 55, y, { align: 'right' });
        }
        if (deductions[i]) {
          doc.text(deductions[i][0], w/2 + 5, y);
          doc.text(deductions[i][1], w - m, y, { align: 'right' });
        }
        y += 7;
      }

      // Totals
      y += 3;
      doc.line(m, y, w - m, y);
      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('GROSS PAY', m, y);
      doc.text(fmt(wage.gross), m + 55, y, { align: 'right' });
      doc.text('TOTAL DEDUCTIONS', w/2 + 5, y);
      const totalDed = Number(wage.pf_deduction||0) + Number(wage.esi_deduction||0) + Number(wage.advance_deduction||0) + Number(wage.fine_deduction||0);
      doc.text(fmt(totalDed), w - m, y, { align: 'right' });

      y += 12;
      doc.setFillColor(236, 253, 245);
      doc.rect(m, y - 5, w - 2*m, 14, 'F');
      doc.setFontSize(12); doc.setTextColor(4, 120, 87);
      doc.text(`NET PAY: ${fmt(wage.net_pay)}`, w/2, y + 3, { align: 'center' });

      // Leave balance
      if (wage.leave_balance !== undefined) {
        y += 18;
        doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(`Leave Balance: ${wage.leave_balance} days`, m, y);
      }

      doc.setFontSize(7); doc.setTextColor(128);
      doc.text('Computer generated wage slip from Shramik Sathi CLMS. | Code on Wages, 2019 compliant.', w/2, 285, { align: 'center' });

      doc.save(`Wage_Slip_${emp.emp_id}_${wage.wage_month.replace(/\s/g,'_')}.pdf`);
    },

    // ============================================
    // PROMOTION LETTER
    // ============================================
    promotionLetter(emp, newDesignation, newWage, effectiveDate) {
      const doc = getJsPDF(); if (!doc) return;
      const w = doc.internal.pageSize.getWidth();
      const m = 20;

      // Header
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 35, 'F');
      doc.setTextColor(255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 16, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Sakchi, Jamshedpur, Jharkhand 831001 | CIN: U74999JH2020PTC012345', w/2, 24, { align: 'center' });
      doc.text('Phone: +91 8317585795 | Email: greencircletechnolegal@gmail.com', w/2, 30, { align: 'center' });

      doc.setTextColor(0); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('PROMOTION LETTER', w/2, 50, { align: 'center' });
      doc.setDrawColor(0, 85, 165); doc.setLineWidth(0.8);
      doc.line(w/2 - 35, 52, w/2 + 35, 52);

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`Ref: SS/PROMO/${emp.emp_id}/${new Date().getFullYear()}`, m, 65);
      doc.text(`Date: ${today}`, w - m, 65, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text('To,', m, 78); doc.text(emp.full_name, m, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`Emp ID: ${emp.emp_id}`, m, 91);

      let y = 105;
      doc.setFont('helvetica', 'bold');
      doc.text('Subject: Letter of Promotion', m, y);
      y += 12;

      const effDate = effectiveDate || today;
      const body = [
        `Dear ${emp.full_name},`,
        '',
        `We are pleased to inform you that, based on your performance and contribution, the management has decided to promote you from the position of "${emp.designation || 'Current Designation'}" to "${newDesignation || 'New Designation'}", effective from ${effDate}.`,
        '',
        `Your revised basic wage shall be ₹${newWage || emp.basic_wage || 0}/day, plus applicable DA and other allowances as per company policy and Jharkhand State Minimum Wages notification.`,
        '',
        'All other terms and conditions of your original appointment letter shall remain unchanged unless specifically modified herein.',
        '',
        'We congratulate you on this well-deserved promotion and look forward to your continued excellent performance.',
      ];

      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      body.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(line, w - 2*m);
        doc.text(lines, m, y); y += lines.length * 5 + 1;
      });

      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('For Shramik Sathi Pvt. Ltd.', m, y);
      y += 20;
      doc.text('________________________', m, y);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', m, y + 6);

      doc.setFontSize(7); doc.setTextColor(128);
      doc.text('System-generated document from Shramik Sathi CLMS.', w/2, 290, { align: 'center' });
      doc.save(`Promotion_Letter_${emp.emp_id}_${emp.full_name.replace(/\s/g,'_')}.pdf`);
    },

    // ============================================
    // FULL & FINAL SETTLEMENT
    // ============================================
    fullFinalSettlement(emp, settlement) {
      const doc = getJsPDF(); if (!doc) return;
      const w = doc.internal.pageSize.getWidth();
      const m = 15;

      // settlement = { lastWorkingDay, daysWorked, basicDue, daDue, hraDue, otDue, leaveEncash, bonusDue, gratuityDue, pfDue, esiDue, advanceRecovery, otherDeductions, noticePay }

      // Header
      doc.setFillColor(0, 85, 165);
      doc.rect(0, 0, w, 28, 'F');
      doc.setTextColor(255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('SHRAMIK SATHI PVT. LTD.', w/2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text('FULL & FINAL SETTLEMENT STATEMENT', w/2, 22, { align: 'center' });

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      let y = 38;
      doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${today}`, w - m, y, { align: 'right' });
      doc.text(`Ref: SS/FNF/${emp.emp_id}/${new Date().getFullYear()}`, m, y);

      y += 12;
      const info = [
        ['Employee Name', emp.full_name || '—', 'Emp ID', emp.emp_id || '—'],
        ['Designation', emp.designation || '—', 'Category', emp.category || '—'],
        ['Date of Joining', emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB') : '—', 'Last Working Day', settlement.lastWorkingDay || today],
        ['UAN', emp.uan_no || '—', 'ESI', emp.esi_no || '—'],
      ];
      info.forEach(row => {
        doc.setFont('helvetica', 'bold'); doc.text(row[0] + ':', m, y);
        doc.setFont('helvetica', 'normal'); doc.text(row[1], m + 35, y);
        doc.setFont('helvetica', 'bold'); doc.text(row[2] + ':', w/2 + 5, y);
        doc.setFont('helvetica', 'normal'); doc.text(row[3], w/2 + 42, y);
        y += 7;
      });

      const s = settlement;
      const fmt = n => '₹ ' + Number(n || 0).toLocaleString('en-IN');

      // Earnings section
      y += 8;
      doc.setFillColor(240, 249, 255);
      doc.rect(m, y - 4, w - 2*m, 10, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 85, 165);
      doc.text('A. EARNINGS / DUES', m + 2, y + 2); y += 12;

      doc.setTextColor(0); doc.setFontSize(9);
      const earnings = [
        ['Basic Wages Due (last period)', fmt(s.basicDue)],
        ['DA Due', fmt(s.daDue)],
        ['HRA Due', fmt(s.hraDue)],
        ['Overtime Pay', fmt(s.otDue)],
        ['Leave Encashment (unavailed leave)', fmt(s.leaveEncash)],
        ['Bonus (proportionate)', fmt(s.bonusDue)],
        ['Gratuity (if ≥5 years)', fmt(s.gratuityDue)],
        ['Notice Period Pay (if applicable)', fmt(s.noticePay)],
      ];

      earnings.forEach(row => {
        doc.setFont('helvetica', 'normal'); doc.text(row[0], m + 2, y);
        doc.text(row[1], w - m, y, { align: 'right' }); y += 6;
      });

      const totalEarnings = [s.basicDue, s.daDue, s.hraDue, s.otDue, s.leaveEncash, s.bonusDue, s.gratuityDue, s.noticePay]
        .reduce((a, b) => a + Number(b || 0), 0);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL EARNINGS:', m + 2, y);
      doc.text(fmt(totalEarnings), w - m, y, { align: 'right' }); y += 10;

      // Deductions section
      doc.setFillColor(255, 245, 245);
      doc.rect(m, y - 4, w - 2*m, 10, 'F');
      doc.setTextColor(180, 30, 30);
      doc.text('B. DEDUCTIONS / RECOVERIES', m + 2, y + 2); y += 12;

      doc.setTextColor(0);
      const deductions = [
        ['PF Employee Contribution (final)', fmt(s.pfDue)],
        ['ESI Deduction (final)', fmt(s.esiDue)],
        ['Advance Recovery', fmt(s.advanceRecovery)],
        ['Other Deductions', fmt(s.otherDeductions)],
      ];
      deductions.forEach(row => {
        doc.setFont('helvetica', 'normal'); doc.text(row[0], m + 2, y);
        doc.text(row[1], w - m, y, { align: 'right' }); y += 6;
      });

      const totalDed = [s.pfDue, s.esiDue, s.advanceRecovery, s.otherDeductions]
        .reduce((a, b) => a + Number(b || 0), 0);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL DEDUCTIONS:', m + 2, y);
      doc.text(fmt(totalDed), w - m, y, { align: 'right' }); y += 14;

      // Net settlement
      const net = totalEarnings - totalDed;
      doc.setFillColor(236, 253, 245);
      doc.rect(m, y - 5, w - 2*m, 16, 'F');
      doc.setFontSize(13); doc.setTextColor(4, 120, 87);
      doc.text(`NET SETTLEMENT PAYABLE: ${fmt(net)}`, w/2, y + 5, { align: 'center' });

      // Signatures
      y += 28;
      doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('________________________', m, y);
      doc.text('Authorized Signatory', m, y + 6);
      doc.text('________________________', w/2, y, { align: 'center' });
      doc.text('HR / Accounts Dept.', w/2, y + 6, { align: 'center' });
      doc.text('________________________', w - m - 40, y);
      doc.text(`${emp.full_name}`, w - m - 40, y + 6);

      doc.setFontSize(7); doc.setTextColor(128);
      doc.text('Full & Final Settlement as per Code on Wages, 2019 and Payment of Gratuity Act, 1972.', w/2, 290, { align: 'center' });
      doc.save(`FnF_Settlement_${emp.emp_id}_${emp.full_name.replace(/\s/g,'_')}.pdf`);
    }

  }; // end SSPdf
})();
