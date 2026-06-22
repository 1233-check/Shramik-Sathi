-- ============================================
-- Shramik Sathi — Migration 011: KYC document upload
--   1. employees.aadhaar_doc_path / pan_doc_path — storage paths (not URLs)
--   2. kyc-documents — PRIVATE storage bucket + owner-scoped policies
--
-- Unlike avatars (public bucket), Aadhaar/PAN scans are sensitive, so the
-- bucket is PRIVATE: there is NO public-read policy. The worker reads their
-- own files via short-lived signed URLs (createSignedUrl). Files live under
--   kyc-documents/<auth.uid()>/...  so each worker only touches their folder.
--
-- Additive & idempotent — safe to re-run; does not alter existing data.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. PATH COLUMNS  (store the storage object path, e.g. "<uid>/aadhaar.jpg")
-- ─────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aadhaar_doc_path TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_doc_path     TEXT;

-- ─────────────────────────────────────────────
-- 2. PRIVATE KYC BUCKET + owner-scoped policies
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Read: ONLY the owner (no public read). Signed URLs still require this.
DROP POLICY IF EXISTS "kyc read own" ON storage.objects;
CREATE POLICY "kyc read own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc insert own" ON storage.objects;
CREATE POLICY "kyc insert own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc update own" ON storage.objects;
CREATE POLICY "kyc update own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc delete own" ON storage.objects;
CREATE POLICY "kyc delete own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: employer read access (so the CLMS can verify a worker's KYC) is a
-- v1.1 follow-up — it needs a SECURITY DEFINER check linking employees.company_id
-- to the viewing employer. Kept out here to keep the surface minimal.

-- ── verify ──
--   SELECT id, public FROM storage.buckets WHERE id = 'kyc-documents';
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'employees' AND column_name LIKE '%_doc_path';
