-- ============================================
-- Shramik Sathi — Migration 013: CV / resume attachment
--   1. employees.cv_path — storage path of the worker's CV (not a URL)
--   2. cv-documents — PRIVATE storage bucket + policies
--        • worker reads/writes their own folder
--        • the employer the worker is attached to (company_id) can READ it
--
-- CVs are private (viewed via short-lived signed URLs). Files live under
--   cv-documents/<worker auth uid>/cv.<ext>
-- Additive & idempotent. Mirrors the KYC pattern (011) + adds employer read.
-- ============================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS cv_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-documents', 'cv-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Owner (the worker) — full control of their own folder
DROP POLICY IF EXISTS "cv read own" ON storage.objects;
CREATE POLICY "cv read own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cv insert own" ON storage.objects;
CREATE POLICY "cv insert own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cv update own" ON storage.objects;
CREATE POLICY "cv update own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cv delete own" ON storage.objects;
CREATE POLICY "cv delete own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Employer read: an employer can read the CV of any worker attached to one of
-- their companies. The object's first folder is the worker's auth uid.
DROP POLICY IF EXISTS "cv employer read" ON storage.objects;
CREATE POLICY "cv employer read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'cv-documents' AND EXISTS (
      SELECT 1 FROM employees e
      JOIN companies c ON c.id = e.company_id
      WHERE e.auth_user_id::text = (storage.foldername(name))[1]
        AND c.auth_user_id = auth.uid()
    )
  );

-- ── verify ──
--   SELECT id, public FROM storage.buckets WHERE id = 'cv-documents';
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'employees' AND column_name = 'cv_path';
