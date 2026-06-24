-- ============================================
-- Shramik Sathi — Migration 014: employer-approved profile edits
--   1. profile_edit_requests — a worker's proposed changes, pending review
--   2. RLS: worker owns their requests; the employer they're attached to reviews
--   3. BEFORE-UPDATE trigger: on Approve, apply whitelisted fields to employees
--   4. notification triggers: new request -> employer; decision -> worker
--
-- Flow: an onboarded worker's profile edits become a Pending request instead of
-- writing straight to employees. The employer approves/rejects; on approval the
-- trigger copies the allowed fields onto the employees row. Idempotent.
-- ============================================

CREATE TABLE IF NOT EXISTS profile_edit_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  changes      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid
);

CREATE INDEX IF NOT EXISTS idx_per_employee ON profile_edit_requests (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_per_status   ON profile_edit_requests (status, requested_at DESC);

ALTER TABLE profile_edit_requests ENABLE ROW LEVEL SECURITY;

-- Worker: create + read their own requests
DROP POLICY IF EXISTS "per worker insert" ON profile_edit_requests;
CREATE POLICY "per worker insert" ON profile_edit_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "per worker read own" ON profile_edit_requests;
CREATE POLICY "per worker read own" ON profile_edit_requests
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

-- Employer: read + decide on requests from workers attached to their company
DROP POLICY IF EXISTS "per employer read" ON profile_edit_requests;
CREATE POLICY "per employer read" ON profile_edit_requests
  FOR SELECT TO authenticated
  USING (employee_id IN (
    SELECT e.id FROM employees e JOIN companies c ON c.id = e.company_id
    WHERE c.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "per employer update" ON profile_edit_requests;
CREATE POLICY "per employer update" ON profile_edit_requests
  FOR UPDATE TO authenticated
  USING (employee_id IN (
    SELECT e.id FROM employees e JOIN companies c ON c.id = e.company_id
    WHERE c.auth_user_id = auth.uid()))
  WITH CHECK (employee_id IN (
    SELECT e.id FROM employees e JOIN companies c ON c.id = e.company_id
    WHERE c.auth_user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- Apply on approval (whitelisted fields only)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_apply_profile_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  allowed text[] := ARRAY['mobile','emergency_contact','address','state','pin_code','bank_name','account_no','ifsc_code'];
  k text; v text;
BEGIN
  IF NEW.status = 'Approved' AND OLD.status IS DISTINCT FROM 'Approved' THEN
    FOR k, v IN SELECT key, value FROM jsonb_each_text(NEW.changes) LOOP
      IF k = ANY(allowed) THEN
        EXECUTE format('UPDATE employees SET %I = $1 WHERE id = $2', k) USING v, NEW.employee_id;
      END IF;
    END LOOP;
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  ELSIF NEW.status = 'Rejected' AND OLD.status IS DISTINCT FROM 'Rejected' THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_profile_edit ON profile_edit_requests;
CREATE TRIGGER trg_apply_profile_edit
  BEFORE UPDATE ON profile_edit_requests
  FOR EACH ROW EXECUTE FUNCTION ss_apply_profile_edit();

-- ─────────────────────────────────────────────
-- Notifications (reuses migration 012's notifications table)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_notify_edit_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_worker text;
BEGIN
  SELECT c.auth_user_id, e.full_name INTO v_owner, v_worker
  FROM employees e JOIN companies c ON c.id = e.company_id
  WHERE e.id = NEW.employee_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO notifications (recipient_auth_id, type, title, body, link)
    VALUES (v_owner, 'edit_request', 'Profile change request',
            COALESCE(v_worker,'A worker') || ' requested profile changes for your review.', 'hire.html');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_edit_request ON profile_edit_requests;
CREATE TRIGGER trg_notify_edit_request
  AFTER INSERT ON profile_edit_requests
  FOR EACH ROW EXECUTE FUNCTION ss_notify_edit_request();

CREATE OR REPLACE FUNCTION ss_notify_edit_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_worker_auth uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('Approved','Rejected') THEN
    SELECT auth_user_id INTO v_worker_auth FROM employees WHERE id = NEW.employee_id;
    IF v_worker_auth IS NOT NULL THEN
      INSERT INTO notifications (recipient_auth_id, type, title, body, link)
      VALUES (v_worker_auth, 'edit_decision',
              CASE NEW.status WHEN 'Approved' THEN 'Profile changes approved' ELSE 'Profile changes declined' END,
              CASE NEW.status WHEN 'Approved' THEN 'Your employer approved your profile changes.'
                              ELSE 'Your employer declined your profile changes. Contact them for details.' END,
              'worker-profile.html');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_edit_decision ON profile_edit_requests;
CREATE TRIGGER trg_notify_edit_decision
  AFTER UPDATE ON profile_edit_requests
  FOR EACH ROW EXECUTE FUNCTION ss_notify_edit_decision();

-- ── verify ──
--   SELECT count(*) FROM profile_edit_requests;
