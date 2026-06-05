-- ============================================
-- Shramik Sathi — Migration 007: Job Marketplace
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Adds the jobs marketplace that connects the employer & worker portals:
--   • employers post vacancies (jobs)
--   • workers apply (job_applications)
--   • on worker confirmation, a trigger onboards them into the company
--
-- This migration is ADDITIVE — it does not alter existing tables.
-- It is safe to re-run (idempotent).
-- ============================================

-- ─────────────────────────────────────────────
-- 1. JOBS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT,   -- denormalized: workers cannot read the companies table under RLS
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('Unskilled','Semi-skilled','Skilled','Highly Skilled')),
  designation TEXT,
  location TEXT,
  work_area TEXT,
  wage_amount NUMERIC(10,2),
  wage_period TEXT DEFAULT 'day' CHECK (wage_period IN ('day','month')),
  positions INT DEFAULT 1,
  positions_filled INT DEFAULT 0,
  urgent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Draft','Open','Filled','Closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. JOB APPLICATIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied','Shortlisted','Accepted','Confirmed','Rejected','Withdrawn')),
  cover_note TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, employee_id)   -- one application per worker per job
);

-- ─────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_company   ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category   ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_applications_job      ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_employee ON job_applications(employee_id);

-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- JOBS — any authenticated worker can browse OPEN jobs
DROP POLICY IF EXISTS "Authenticated can view open jobs" ON jobs;
CREATE POLICY "Authenticated can view open jobs" ON jobs FOR SELECT USING (
  auth.role() = 'authenticated' AND status = 'Open'
);

-- JOBS — a worker can always read a job they've applied to (even once Filled/Closed),
-- so "My Applications" can show the job details.
DROP POLICY IF EXISTS "Workers view jobs they applied to" ON jobs;
CREATE POLICY "Workers view jobs they applied to" ON jobs FOR SELECT USING (
  id IN (
    SELECT a.job_id FROM job_applications a
    JOIN employees e ON e.id = a.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

-- JOBS — an employer has full control over their own company's jobs
DROP POLICY IF EXISTS "Employers manage own jobs" ON jobs;
CREATE POLICY "Employers manage own jobs" ON jobs FOR ALL USING (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
) WITH CHECK (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
);

-- APPLICATIONS — a worker fully manages their own applications
-- (apply = INSERT, withdraw/confirm = UPDATE, view = SELECT)
DROP POLICY IF EXISTS "Workers manage own applications" ON job_applications;
CREATE POLICY "Workers manage own applications" ON job_applications FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
) WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);

-- APPLICATIONS — an employer can read applications to their own jobs
DROP POLICY IF EXISTS "Employers view applications to own jobs" ON job_applications;
CREATE POLICY "Employers view applications to own jobs" ON job_applications FOR SELECT USING (
  job_id IN (
    SELECT j.id FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE c.auth_user_id = auth.uid()
  )
);

-- APPLICATIONS — an employer can update (shortlist/accept/reject) applications to their own jobs
DROP POLICY IF EXISTS "Employers update applications to own jobs" ON job_applications;
CREATE POLICY "Employers update applications to own jobs" ON job_applications FOR UPDATE USING (
  job_id IN (
    SELECT j.id FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE c.auth_user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────
-- 5. updated_at MAINTENANCE TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION ss_set_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON job_applications;
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION ss_set_updated_at();

-- ─────────────────────────────────────────────
-- 6. ONBOARDING TRIGGER
-- When a worker confirms an offer (status → 'Confirmed'), atomically:
--   • attach them to the hiring company (employees.company_id + Active)
--   • bump the job's filled count and close it when full
-- SECURITY DEFINER so it can write across tables regardless of the
-- worker's RLS, keeping the whole hand-off atomic and race-free.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_onboard_confirmed_applicant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_positions  INT;
  v_filled     INT;
BEGIN
  SELECT company_id, positions, positions_filled
    INTO v_company_id, v_positions, v_filled
  FROM jobs WHERE id = NEW.job_id;

  -- Onboard the applicant into the hiring company.
  UPDATE employees
     SET company_id      = v_company_id,
         status          = 'Active',
         date_of_joining = COALESCE(date_of_joining, current_date),
         updated_at      = now()
   WHERE id = NEW.employee_id;

  -- Track the vacancy; auto-close the job once all positions are filled.
  UPDATE jobs
     SET positions_filled = v_filled + 1,
         status = CASE WHEN v_filled + 1 >= v_positions THEN 'Filled' ELSE status END
   WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_confirmed ON job_applications;
CREATE TRIGGER trg_application_confirmed
  AFTER UPDATE ON job_applications
  FOR EACH ROW
  WHEN (NEW.status = 'Confirmed' AND OLD.status IS DISTINCT FROM 'Confirmed')
  EXECUTE FUNCTION ss_onboard_confirmed_applicant();

-- ============================================
-- DONE — jobs marketplace schema applied.
-- ============================================
