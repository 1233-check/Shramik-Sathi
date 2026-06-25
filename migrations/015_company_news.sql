-- ============================================
-- Shramik Sathi — Migration 015: live company news feed
--   company_news — posts an employer publishes to their workers
--     (company_id NULL = platform-wide news visible to all onboarded workers)
--   RLS: workers read their company's news (+ global); employer manages own.
-- Replaces the previously hardcoded worker-news content. Idempotent.
-- ============================================

CREATE TABLE IF NOT EXISTS company_news (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = platform-wide
  title       text NOT NULL,
  body        text,
  category    text NOT NULL DEFAULT 'General'
              CHECK (category IN ('Payroll','Safety','Health','Policy','General')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid
);

CREATE INDEX IF NOT EXISTS idx_company_news ON company_news (company_id, created_at DESC);

ALTER TABLE company_news ENABLE ROW LEVEL SECURITY;

-- Workers: read news for the company they're attached to, plus platform-wide news
DROP POLICY IF EXISTS "news worker read" ON company_news;
CREATE POLICY "news worker read" ON company_news
  FOR SELECT TO authenticated USING (
    company_id IS NULL
    OR company_id IN (SELECT company_id FROM employees WHERE auth_user_id = auth.uid())
  );

-- Employer: read + manage their own company's news
DROP POLICY IF EXISTS "news employer read" ON company_news;
CREATE POLICY "news employer read" ON company_news
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "news employer insert" ON company_news;
CREATE POLICY "news employer insert" ON company_news
  FOR INSERT TO authenticated WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "news employer delete" ON company_news;
CREATE POLICY "news employer delete" ON company_news
  FOR DELETE TO authenticated USING (
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

-- ── verify ──
--   SELECT count(*) FROM company_news;
