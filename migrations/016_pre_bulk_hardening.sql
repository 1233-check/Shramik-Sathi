-- ============================================
-- Shramik Sathi — Migration 016: pre-bulk-onboarding hardening
-- Run BEFORE opening registration to real workers at volume.
--
--   1. Stop duplicate employee rows per auth user (double-submit / retry safety)
--   2. One worker per Aadhaar (data integrity / dedupe)
--   3. Tighten the over-broad reports INSERT policy
--
-- NOTE on step 1's de-dupe: it keeps the EARLIEST row per auth_user_id and
-- removes later duplicates so the UNIQUE constraint can be added. Safe on a
-- pre-launch / low-data DB; review first if you already have real duplicate data.
-- Idempotent where possible.
-- ============================================

-- 1. One employee row per auth user ------------------------------------------
DELETE FROM employees a
USING employees b
WHERE a.auth_user_id = b.auth_user_id
  AND a.auth_user_id IS NOT NULL
  AND a.ctid > b.ctid;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_auth_user_id_key;
ALTER TABLE employees ADD CONSTRAINT employees_auth_user_id_key UNIQUE (auth_user_id);

-- 2. One worker per Aadhaar (partial — ignores rows without an Aadhaar) -------
--    First de-dupe: a duplicate Aadhaar means the same person registered more
--    than once (Aadhaar is unique per individual), so keep the EARLIEST row and
--    remove the rest. Then the unique index can be created.
DELETE FROM employees a
USING employees b
WHERE a.aadhar_no = b.aadhar_no
  AND a.aadhar_no IS NOT NULL
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_aadhar
  ON employees (aadhar_no) WHERE aadhar_no IS NOT NULL;

-- 3. Tighten reports: drop the "anyone can insert any report" policy.
--    The worker-scoped "Workers submit own reports" policy (migration 001)
--    already covers legitimate submissions, so this only removes the loophole
--    that let a caller insert a report against ANY employee_id.
DROP POLICY IF EXISTS "Anyone can submit reports" ON reports;

-- ── verify ──
--   SELECT conname FROM pg_constraint WHERE conrelid = 'employees'::regclass AND contype = 'u';
--   SELECT indexname FROM pg_indexes WHERE tablename = 'employees' AND indexname = 'uq_employees_aadhar';
