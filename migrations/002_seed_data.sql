-- Shramik Sathi — Seed Data
-- Seeds the database with realistic mock data matching the existing hire.html UI

-- 1. Insert demo company
INSERT INTO companies (id, name, email, phone, address, clra_license_no, license_expiry) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tata Steel Ltd.', 'admin@tatasteel.com', '+91 657 2431234', 'Sakchi, Jamshedpur, Jharkhand 831001', 'CLRA/JH/2024/0041', '2027-03-31');

-- 2. Insert employees (matching hire.html data)
INSERT INTO employees (company_id, emp_id, full_name, father_name, aadhar_no, designation, category, uan_no, gate_pass_no, gate_pass_issue_date, gate_pass_valid_upto, gate_pass_area, medical_exam_date, medical_valid_until, medical_fitness, medical_doctor, blood_group, status, basic_wage, da_allowance, hra, date_of_joining, mobile, state, pin_code) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20147', 'Rajendra Mahto', 'Shivnath Mahto', 'XXXX-XXXX-4821', 'Mechanical Fitter', 'Skilled', '101145782390', 'GP-2026-04821', '2026-04-01', '2027-03-31', 'LD Shop, BF-5', '2026-01-10', '2027-01-09', 'Fit', 'Dr. S.K. Sinha', 'B+', 'Active', 380, 190, 61, '2022-06-15', '9876543201', 'Jharkhand', '831001'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20148', 'Sunil Oraon', 'Mangal Oraon', 'XXXX-XXXX-7356', 'Rigger Grade-I', 'Skilled', '101298456710', 'GP-2025-07356', '2025-10-01', '2026-09-30', 'CRM, HSM', '2025-09-22', '2026-09-21', 'Fit', 'Dr. S.K. Sinha', 'O+', 'Active', 350, 175, 56, '2023-01-10', '9876543202', 'Jharkhand', '831002'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20152', 'Birsa Munda', 'Sugna Munda', 'XXXX-XXXX-1903', 'Crane Operator', 'Highly Skilled', '100876543219', 'GP-2026-01903', '2025-12-16', '2026-12-15', 'Steel Yard, BOF', '2026-03-05', '2027-03-04', 'Fit', 'Dr. P. Murmu', 'A+', 'Active', 440, 220, 70, '2021-08-20', '9876543203', 'Jharkhand', '831003'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20155', 'Manoj Tiwari', 'Ramchandra Tiwari', 'XXXX-XXXX-5547', 'TIG Welder', 'Skilled', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pending Exam', NULL, 'AB+', 'Pending', 400, 200, 64, '2026-05-01', '9876543204', 'Jharkhand', '831004'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20159', 'Lakshmi Devi Hembrom', 'Late Soren Hembrom', 'XXXX-XXXX-8834', 'Safety Steward', 'Skilled', '101034567812', 'GP-2026-08834', '2026-03-01', '2027-02-28', 'All Zones', '2026-02-18', '2027-02-17', 'Conditionally Fit', 'Dr. P. Murmu', 'O-', 'Active', 350, 175, 56, '2023-04-01', '9876543205', 'Jharkhand', '831005'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20163', 'Pramod Yadav', 'Baleshwar Yadav', 'XXXX-XXXX-2210', 'Electrician Grade-II', 'Skilled', '100654321098', 'GP-2024-02210', '2025-01-02', '2026-01-01', 'Power House, Substation', NULL, NULL, 'Fit', NULL, 'B+', 'Inactive', 370, 185, 59, '2020-11-10', '9876543206', 'Jharkhand', '831006'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20170', 'Ranjit Hansda', 'Doman Hansda', 'XXXX-XXXX-6691', 'Scaffolder', 'Skilled', '101456789023', 'GP-2026-06691', '2026-07-01', '2027-06-30', 'All Zones', '2026-06-01', '2027-05-31', 'Fit', 'Dr. S.K. Sinha', 'B-', 'Active', 350, 175, 56, '2022-03-15', '9876543207', 'Jharkhand', '831007'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20174', 'Santosh Gope', 'Dashrath Gope', 'XXXX-XXXX-3378', 'General Helper', 'Unskilled', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pending Exam', NULL, 'A-', 'Pending', 300, 150, 48, '2026-05-10', '9876543208', 'Jharkhand', '831008');

-- 3. Insert PF/ESI challans
INSERT INTO pf_esi_challans (company_id, month, financial_year, pf_challan_no, pf_amount, pf_status, esi_challan_no, esi_amount, esi_status, filing_date) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'May 2026', '2026-2027', 'TRRN/2026/05/0048172', 182460, 'Paid', 'ESI/JH/2026/05/3391', 47320, 'Paid', '2026-05-15'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Apr 2026', '2026-2027', 'TRRN/2026/04/0047891', 178920, 'Paid', 'ESI/JH/2026/04/3287', 46110, 'Paid', '2026-04-14'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mar 2026', '2025-2026', 'TRRN/2026/03/0047502', 185100, 'Paid', 'ESI/JH/2026/03/3190', 48050, 'Paid', '2026-03-15'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Feb 2026', '2025-2026', 'TRRN/2026/02/0047103', 174680, 'Paid', 'ESI/JH/2026/02/3098', 44790, 'Paid', '2026-02-14');

-- 4. Insert B-Pass / C-Pass
INSERT INTO passes (company_id, pass_type, pass_no, contractor_name, work_area, workers_covered, issue_date, expiry_date, status) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'C-Pass', 'CP-2026-0041', 'Shramik Sathi Pvt. Ltd.', 'LD Shop, BF-5, CRM', 47, '2026-04-01', '2027-03-31', 'Active'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'B-Pass', 'BP-2026-0118', 'Shramik Sathi Pvt. Ltd.', 'New BOF Extension Block', 12, '2026-02-15', '2026-08-14', 'Active'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'B-Pass', 'BP-2025-0094', 'Shramik Sathi Pvt. Ltd.', 'Power House Maintenance', 5, '2025-07-01', '2025-12-31', 'Expired');

-- 5. Insert sample wage records for May 2026
INSERT INTO wage_records (employee_id, wage_month, days_worked, basic, da, hra, overtime_pay, gross, pf_deduction, esi_deduction, net_pay, status)
SELECT e.id, 'May 2026', v.days, v.basic, v.da, v.hra, v.ot, v.gross, v.pf, v.esi, v.net, 'Paid'
FROM employees e
JOIN (VALUES
  ('20147', 26, 9880, 4940, 1580, 1200, 17600, 2112, 132, 15356),
  ('20148', 24, 9120, 4560, 1460, 0, 15140, 1817, 114, 13209),
  ('20152', 26, 11440, 5720, 1830, 2400, 21390, 2567, 160, 18663),
  ('20159', 25, 8750, 4375, 1400, 600, 15125, 1815, 113, 13197),
  ('20170', 26, 9100, 4550, 1456, 1800, 16906, 2029, 127, 14750),
  ('20174', 22, 6600, 3300, 1056, 0, 10956, 1315, 82, 9559)
) AS v(emp_id, days, basic, da, hra, ot, gross, pf, esi, net) ON e.emp_id = v.emp_id;
