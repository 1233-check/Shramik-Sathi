-- ============================================
-- Shramik Sathi — Migration 008: Richer company profile
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Adds the fields collected by the multi-step employer onboarding wizard
-- (employer-register.html). Additive + idempotent — safe to re-run and
-- does not touch existing data.
--
-- ⚠️  Run this BEFORE deploying the new employer-register.html, otherwise
--     company creation will fail on the unknown columns.
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry            TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_size        TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person      TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_designation TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city                TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state               TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pin_code            TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gst_no              TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website             TEXT;

-- ─────────────────────────────────────────────
-- Drop the legacy GLOBAL unique constraint on companies.email.
-- The old email/password flow keyed companies by email; the current
-- flow keys them by auth_user_id (one company per signed-in user, enforced
-- by the onboarding guard). A global UNIQUE on email otherwise lets one
-- tenant's address (or a seed row) dead-end another tenant's registration.
-- ─────────────────────────────────────────────
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_email_key;

-- ============================================
-- DONE — company profile columns added.
-- ============================================
