-- ============================================
-- Shramik Sathi — Migration 009: FIX infinite recursion in jobs RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- BUG (Postgres 42P17): migration 007 created cross-referencing policies —
--   • jobs."Workers view jobs they applied to"  reads job_applications
--   • job_applications."Employers view/update …" reads jobs
-- Evaluating a SELECT on either table recursed into the other's policies and
-- back again, so EVERY query to jobs / job_applications returned HTTP 500.
-- This broke the whole job marketplace + the employer "Jobs & Hiring" panel.
--
-- FIX: do the cross-table checks inside SECURITY DEFINER functions. These run
-- with the function-owner's rights and bypass RLS on the tables they read, so
-- the policies no longer reference each other → no recursion.
--
-- Idempotent & additive — safe to re-run.
-- ============================================

-- ─── 1. SECURITY DEFINER helpers (bypass RLS → break the cycle) ───
CREATE OR REPLACE FUNCTION ss_employer_owns_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE j.id = p_job_id
      AND c.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION ss_worker_applied_to_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM job_applications a
    JOIN employees e ON e.id = a.employee_id
    WHERE a.job_id = p_job_id
      AND e.auth_user_id = auth.uid()
  );
$$;

-- ─── 2. JOBS — rewrite the recursive policy to use the helper ───
DROP POLICY IF EXISTS "Workers view jobs they applied to" ON jobs;
CREATE POLICY "Workers view jobs they applied to" ON jobs FOR SELECT
  USING ( ss_worker_applied_to_job(id) );
-- (kept as-is, no recursion: "Authenticated can view open jobs", "Employers manage own jobs")

-- ─── 3. JOB_APPLICATIONS — rewrite the recursive employer policies ───
DROP POLICY IF EXISTS "Employers view applications to own jobs" ON job_applications;
CREATE POLICY "Employers view applications to own jobs" ON job_applications FOR SELECT
  USING ( ss_employer_owns_job(job_id) );

DROP POLICY IF EXISTS "Employers update applications to own jobs" ON job_applications;
CREATE POLICY "Employers update applications to own jobs" ON job_applications FOR UPDATE
  USING ( ss_employer_owns_job(job_id) );
-- (kept as-is, no recursion: "Workers manage own applications")

-- ============================================
-- DONE — jobs & job_applications are now queryable without recursion.
-- Verify: SELECT * FROM jobs LIMIT 1;  (should return rows / empty, not a 500)
-- ============================================
