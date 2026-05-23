-- Shramik Sathi — Database Schema Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- 1. COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  clra_license_no TEXT,
  license_expiry DATE,
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  emp_id TEXT,
  full_name TEXT NOT NULL,
  father_name TEXT,
  aadhar_no TEXT,
  dob DATE,
  gender TEXT,
  blood_group TEXT,
  identity_mark TEXT,
  designation TEXT,
  category TEXT CHECK (category IN ('Unskilled','Semi-skilled','Skilled','Highly Skilled')),
  employee_type TEXT DEFAULT 'Contractual',
  vendor_code TEXT,
  work_order_no TEXT,
  department TEXT,
  shift_duty BOOLEAN DEFAULT true,
  uan_no TEXT,
  esi_no TEXT,
  basic_wage NUMERIC(10,2),
  da_allowance NUMERIC(10,2),
  hra NUMERIC(10,2),
  bank_name TEXT,
  account_no TEXT,
  ifsc_code TEXT,
  mobile TEXT,
  emergency_contact TEXT,
  address TEXT,
  state TEXT,
  pin_code TEXT,
  photo_url TEXT,
  voter_id TEXT,
  gate_pass_no TEXT,
  gate_pass_issue_date DATE,
  gate_pass_valid_upto DATE,
  gate_pass_area TEXT,
  medical_exam_date DATE,
  medical_valid_until DATE,
  medical_fitness TEXT DEFAULT 'Pending Exam',
  medical_doctor TEXT,
  date_of_joining DATE,
  date_of_leaving DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Pending','Inactive','Separated')),
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. WAGE VARIABLES AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS wage_variables_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  effective_date DATE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  method TEXT DEFAULT 'manual' CHECK (method IN ('manual','fingerprint','punch_card','face_recognition','online')),
  check_in TIME,
  check_out TIME,
  hours_worked NUMERIC(4,2),
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  status TEXT DEFAULT 'Present' CHECK (status IN ('Present','Absent','Half Day','Holiday','Leave')),
  geo_lat NUMERIC(10,7),
  geo_lng NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. WAGE RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  wage_month TEXT NOT NULL,
  days_worked INT,
  basic NUMERIC(10,2),
  da NUMERIC(10,2),
  hra NUMERIC(10,2),
  overtime_pay NUMERIC(10,2) DEFAULT 0,
  bonus NUMERIC(10,2) DEFAULT 0,
  arrear_da NUMERIC(10,2) DEFAULT 0,
  gross NUMERIC(10,2),
  pf_deduction NUMERIC(10,2),
  esi_deduction NUMERIC(10,2),
  advance_deduction NUMERIC(10,2) DEFAULT 0,
  fine_deduction NUMERIC(10,2) DEFAULT 0,
  other_deductions NUMERIC(10,2) DEFAULT 0,
  net_pay NUMERIC(10,2),
  leave_balance NUMERIC(4,1) DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Calculated','Paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. LEAVE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT CHECK (leave_type IN ('Casual','Sick','Earned','Compensatory','Unpaid')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INT,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  leave_balance_after NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. REPORTS / GRIEVANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Unsafe Condition','Unhealthy Condition','Near Miss','Unsafe Behaviour','Suggestion','Grievance','Sexual Harassment','Others')),
  department TEXT,
  route_to TEXT CHECK (route_to IN ('Department','POSH Committee','Grievance Committee','Safety & OH')),
  description TEXT,
  action_taken TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Escalated','Resolved','Closed')),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('photo','aadhar','bank_passbook','police_verification','medical','appointment_letter','experience_certificate','gate_pass','other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. PF/ESI CHALLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pf_esi_challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  pf_challan_no TEXT,
  pf_amount NUMERIC(12,2),
  pf_status TEXT DEFAULT 'Pending',
  esi_challan_no TEXT,
  esi_amount NUMERIC(12,2),
  esi_status TEXT DEFAULT 'Pending',
  filing_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. B-PASS / C-PASS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  pass_type TEXT CHECK (pass_type IN ('B-Pass','C-Pass')),
  pass_no TEXT,
  contractor_name TEXT,
  work_area TEXT,
  workers_covered INT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Expired','Under Process')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_wage_records_employee ON wage_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_esi_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_variables_log ENABLE ROW LEVEL SECURITY;

-- Employer policies (company users see their own company data)
CREATE POLICY "Companies own data" ON companies FOR ALL USING (auth.uid() = auth_user_id);
CREATE POLICY "Employers see own employees" ON employees FOR ALL USING (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Employers see own attendance" ON attendance FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Employers see own wages" ON wage_records FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Employers see own leaves" ON leave_requests FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Anyone can submit reports" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Employers see own reports" ON reports FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Employers see own docs" ON documents FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Employers see own challans" ON pf_esi_challans FOR ALL USING (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Employers see own passes" ON passes FOR ALL USING (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Employers see own wage log" ON wage_variables_log FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);

-- Worker self-access policies
CREATE POLICY "Workers see own data" ON employees FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Workers see own attendance" ON attendance FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Workers see own wages" ON wage_records FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Workers manage own leaves" ON leave_requests FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Workers submit own reports" ON reports FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Workers see own reports" ON reports FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Employers update own reports" ON reports FOR UPDATE USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Workers see own docs" ON documents FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
-- Workers can mark attendance
CREATE POLICY "Workers mark own attendance" ON attendance FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
