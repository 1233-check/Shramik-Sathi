-- ============================================
-- Shramik Sathi — Migration 012: in-app notifications (hire loop)
--   1. notifications table + owner-scoped RLS
--   2. triggers on job_applications that notify the right party when:
--        • a worker applies            → employer  ("New job application")
--        • employer shortlists/offers/rejects → worker
--        • worker confirms an offer     → employer  ("Worker confirmed")
--
-- Notifications are addressed by the recipient's auth.users id
-- (recipient_auth_id) so RLS is a simple auth.uid() = recipient_auth_id.
-- Trigger fns are SECURITY DEFINER (they insert rows the recipient can't).
-- Additive & idempotent.
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_auth_id uuid NOT NULL,
  type              text NOT NULL,
  title             text NOT NULL,
  body              text,
  link              text,
  read              boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications (recipient_auth_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read and mark-read their own notifications. No INSERT policy:
-- rows are created only by the SECURITY DEFINER triggers below.
DROP POLICY IF EXISTS "notif read own" ON notifications;
CREATE POLICY "notif read own" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = recipient_auth_id);

DROP POLICY IF EXISTS "notif update own" ON notifications;
CREATE POLICY "notif update own" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_auth_id)
  WITH CHECK (auth.uid() = recipient_auth_id);

-- ─────────────────────────────────────────────
-- New application → notify the employer
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_notify_on_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner    uuid;
  v_jobtitle text;
  v_worker   text;
BEGIN
  SELECT c.auth_user_id, j.title
    INTO v_owner, v_jobtitle
  FROM jobs j JOIN companies c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  SELECT full_name INTO v_worker FROM employees WHERE id = NEW.employee_id;

  IF v_owner IS NOT NULL THEN
    INSERT INTO notifications (recipient_auth_id, type, title, body, link)
    VALUES (v_owner, 'application_new', 'New job application',
            COALESCE(v_worker, 'A worker') || ' applied to ' || COALESCE(v_jobtitle, 'your job') || '.',
            'hire.html');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_application ON job_applications;
CREATE TRIGGER trg_notify_application
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION ss_notify_on_application();

-- ─────────────────────────────────────────────
-- Status change → notify worker (or employer on Confirmed)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ss_notify_on_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_worker_auth uuid;
  v_owner       uuid;
  v_jobtitle    text;
  v_worker      text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT title INTO v_jobtitle FROM jobs WHERE id = NEW.job_id;
  SELECT auth_user_id, full_name INTO v_worker_auth, v_worker FROM employees WHERE id = NEW.employee_id;

  IF NEW.status IN ('Shortlisted', 'Accepted', 'Rejected') AND v_worker_auth IS NOT NULL THEN
    INSERT INTO notifications (recipient_auth_id, type, title, body, link)
    VALUES (
      v_worker_auth, 'application_status',
      CASE NEW.status
        WHEN 'Accepted'    THEN 'You have a job offer!'
        WHEN 'Shortlisted' THEN 'You were shortlisted'
        ELSE                    'Application update'
      END,
      CASE NEW.status
        WHEN 'Accepted'    THEN 'You have an offer for ' || COALESCE(v_jobtitle, 'a job') || '. Open Jobs → My Applications to confirm.'
        WHEN 'Shortlisted' THEN 'You were shortlisted for ' || COALESCE(v_jobtitle, 'a job') || '.'
        ELSE                    'Your application for ' || COALESCE(v_jobtitle, 'a job') || ' was not selected this time.'
      END,
      'worker-jobs.html');

  ELSIF NEW.status = 'Confirmed' THEN
    SELECT c.auth_user_id INTO v_owner
    FROM jobs j JOIN companies c ON c.id = j.company_id
    WHERE j.id = NEW.job_id;

    IF v_owner IS NOT NULL THEN
      INSERT INTO notifications (recipient_auth_id, type, title, body, link)
      VALUES (v_owner, 'onboarded', 'Worker confirmed',
              COALESCE(v_worker, 'A worker') || ' confirmed and is now onboarded for ' || COALESCE(v_jobtitle, 'the job') || '.',
              'hire.html');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_status ON job_applications;
CREATE TRIGGER trg_notify_status
  AFTER UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION ss_notify_on_status();

-- ── verify ──
--   SELECT count(*) FROM notifications;
--   \d+ notifications
