-- ============================================
-- Shramik Sathi — EMERGENCY FIX: Migration 006
-- Run this NOW in Supabase SQL Editor to unblock worker registration
-- This combines all missing schema changes from migrations 003, 004, 005
-- ============================================

-- ─── 1. ADD MISSING COLUMNS TO EMPLOYEES ───
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_no TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS police_verification_status TEXT DEFAULT 'Pending';

-- ─── 2. MAKE company_id NULLABLE (workers self-register without a company) ───
ALTER TABLE employees ALTER COLUMN company_id DROP NOT NULL;

-- ─── 3. LEADS TABLE (for landing page enquiry form) ───
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT,
  mobile TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('employer', 'worker')),
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Converted', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. LEADS RLS ───
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can submit leads') THEN
    CREATE POLICY "Anyone can submit leads" ON leads FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employers can view leads') THEN
    CREATE POLICY "Employers can view leads" ON leads FOR SELECT USING (
      auth.uid() IN (SELECT auth_user_id FROM companies)
    );
  END IF;
END $$;

-- ─── 5. EMPLOYEE SELF-REGISTRATION RLS ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can create own profile') THEN
    CREATE POLICY "Workers can create own profile" ON employees FOR INSERT WITH CHECK (
      auth.uid() = auth_user_id
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can update own profile') THEN
    CREATE POLICY "Workers can update own profile" ON employees FOR UPDATE USING (
      auth.uid() = auth_user_id
    );
  END IF;
END $$;

-- ─── 6. UNIQUE CONSTRAINT FOR ATTENDANCE UPSERT ───
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_emp_date
  ON attendance(employee_id, attendance_date);

-- ─── 7. WORKERS CAN UPDATE OWN ATTENDANCE (for upsert) ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers update own attendance') THEN
    CREATE POLICY "Workers update own attendance" ON attendance FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    );
  END IF;
END $$;

-- ─── 8. FIX ADVANCE SALARY CONSTRAINT ───
DO $$
DECLARE
  const_name TEXT;
BEGIN
  SELECT conname INTO const_name
  FROM pg_constraint
  WHERE conrelid = 'leave_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%leave_type%';

  IF const_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE leave_requests DROP CONSTRAINT ' || const_name;
  END IF;

  ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('Casual','Sick','Earned','Compensatory','Unpaid','Advance'));
END $$;

-- ============================================
-- DONE! All schema changes applied.
-- ============================================
