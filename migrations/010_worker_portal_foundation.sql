-- ============================================
-- Shramik Sathi — Migration 010: Worker Portal Foundation
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Clean foundation for the worker-portal completion (v1 "Recommended core"):
--   1. ss_uid    — a unique, permanent, portable Shramik Sathi worker ID
--   2. onboarded_at — clean marker so the compliance dashboard can be gated
--   3. avatars   — storage bucket + policies for profile-picture upload
--   4. indexes   — performance/integrity sweep
--
-- Additive & idempotent — safe to re-run; does not alter existing data.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. UNIQUE WORKER ID  (ss_uid → e.g. SS-2026-000123)
-- ─────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ss_uid TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS worker_uid_seq START 100001;

CREATE OR REPLACE FUNCTION ss_assign_worker_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ss_uid IS NULL OR NEW.ss_uid = '' THEN
    NEW.ss_uid := 'SS-' || to_char(now(), 'YYYY') || '-' ||
                  lpad(nextval('worker_uid_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_worker_uid ON employees;
CREATE TRIGGER trg_worker_uid
  BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION ss_assign_worker_uid();

-- Backfill any existing workers that don't have an ID yet
UPDATE employees
   SET ss_uid = 'SS-' || to_char(COALESCE(created_at, now()), 'YYYY') || '-' ||
                lpad(nextval('worker_uid_seq')::text, 6, '0')
 WHERE ss_uid IS NULL OR ss_uid = '';

-- ─────────────────────────────────────────────
-- 2. ONBOARDING MARKER  (single source of truth for "is this worker hired?")
-- ─────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Re-define the offer-confirmation trigger function (from 007/009) so it also
-- stamps onboarded_at when a worker confirms an offer. Atomic, server-side.
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

  UPDATE employees
     SET company_id      = v_company_id,
         status          = 'Active',
         onboarded_at    = COALESCE(onboarded_at, now()),
         date_of_joining = COALESCE(date_of_joining, current_date),
         updated_at      = now()
   WHERE id = NEW.employee_id;

  UPDATE jobs
     SET positions_filled = v_filled + 1,
         status = CASE WHEN v_filled + 1 >= v_positions THEN 'Filled' ELSE status END
   WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$;
-- (the trg_application_confirmed trigger from migration 007 already calls this)

-- Backfill onboarded_at for workers already attached to a company
UPDATE employees
   SET onboarded_at = COALESCE(onboarded_at, date_of_joining::timestamptz, created_at, now())
 WHERE company_id IS NOT NULL AND onboarded_at IS NULL;

-- ─────────────────────────────────────────────
-- 3. PROFILE PICTURE STORAGE  (public-read 'avatars' bucket)
--    Files live under  avatars/<auth.uid()>/...  so each worker writes only
--    their own folder. employees.photo_url (already exists) stores the URL.
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars insert own" ON storage.objects;
CREATE POLICY "avatars insert own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars update own" ON storage.objects;
CREATE POLICY "avatars update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars delete own" ON storage.objects;
CREATE POLICY "avatars delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────
-- 4. PERFORMANCE / INTEGRITY SWEEP
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status     ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_ss_uid     ON employees(ss_uid);

-- ============================================
-- DONE. Quick checks:
--   SELECT ss_uid, full_name, company_id, onboarded_at FROM employees LIMIT 5;
--   SELECT id, public FROM storage.buckets WHERE id = 'avatars';
-- ============================================
