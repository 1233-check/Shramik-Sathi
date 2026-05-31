-- ============================================
-- Shramik Sathi — Migration 004: Schema Fixes
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- ⚠️  IMPORTANT: BEFORE deploying, set up Google OAuth in Supabase:
--
--    STEP 1 — Google Cloud Console (https://console.cloud.google.com):
--      a) Create a new project (or use existing)
--      b) Go to APIs & Services → Credentials → Create Credentials → OAuth Client ID
--      c) Application type: Web application
--      d) Authorized redirect URI: https://ecplvcnaonnxzpwbzrix.supabase.co/auth/v1/callback
--      e) Copy the Client ID and Client Secret
--
--    STEP 2 — Supabase Dashboard:
--      a) Go to Authentication → Providers → Google
--      b) Toggle ON "Enable Google provider"
--      c) Paste your Google Client ID and Client Secret
--      d) Save
--
--    STEP 3 — Supabase Dashboard (Redirect URLs):
--      a) Go to Authentication → URL Configuration
--      b) Add to "Redirect URLs":
--         - https://www.shramiksathi.com/worker-login.html
--         - http://localhost:3000/worker-login.html (for local dev)

-- ============================================
-- 1. ADD MISSING COLUMNS TO EMPLOYEES
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS police_verification_status TEXT DEFAULT 'Pending';

-- ============================================
-- 2. UNIQUE CONSTRAINT FOR ATTENDANCE UPSERT
-- ============================================
-- The dashboard uses upsert with onConflict: 'employee_id,attendance_date'
-- This requires a unique constraint on those columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_emp_date
  ON attendance(employee_id, attendance_date);

-- ============================================
-- 3. RLS: WORKERS CAN UPDATE OWN ATTENDANCE
-- ============================================
-- Needed for upsert to work (upsert = INSERT + UPDATE on conflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Workers update own attendance'
  ) THEN
    CREATE POLICY "Workers update own attendance" ON attendance FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    );
  END IF;
END $$;
