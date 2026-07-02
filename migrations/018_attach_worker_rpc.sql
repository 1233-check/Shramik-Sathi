-- ============================================
-- Shramik Sathi — Migration 018: ss_attach_worker()  (employer manual onboarding)
--
-- Lets an employer attach an ALREADY-REGISTERED Shramik Sathi worker to their
-- company by SS-… id / Aadhaar / mobile, without the full job-application loop.
-- SECURITY DEFINER because the employer's RLS can't SELECT a worker who isn't
-- yet in their company. Safe: it only attaches workers who are unattached (or
-- already the caller's), and always to the CALLER's own company. Attaching sets
-- company_id on the worker's OWN row, so the two portals then share that row
-- (employer manages it, worker sees it → attendance/leave stay in sync).
-- ============================================

CREATE OR REPLACE FUNCTION ss_attach_worker(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_emp     employees%ROWTYPE;
BEGIN
  IF p_identifier IS NULL OR btrim(p_identifier) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter an SS ID, Aadhaar, or mobile number.');
  END IF;
  p_identifier := btrim(p_identifier);

  SELECT id INTO v_company FROM companies WHERE auth_user_id = auth.uid();
  IF v_company IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No employer company is linked to your account.');
  END IF;

  SELECT * INTO v_emp FROM employees
   WHERE ss_uid = p_identifier OR aadhar_no = p_identifier OR mobile = p_identifier
   ORDER BY (ss_uid = p_identifier) DESC, (aadhar_no = p_identifier) DESC
   LIMIT 1;

  IF v_emp.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No worker found with that SS ID / Aadhaar / mobile.');
  END IF;

  IF v_emp.company_id IS NOT NULL AND v_emp.company_id <> v_company THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That worker is already attached to another employer.');
  END IF;

  UPDATE employees
     SET company_id   = v_company,
         onboarded_at = COALESCE(onboarded_at, now()),
         status       = 'Active'
   WHERE id = v_emp.id;

  RETURN jsonb_build_object('ok', true, 'name', v_emp.full_name, 'ss_uid', v_emp.ss_uid, 'emp_id', v_emp.emp_id);
END $$;

GRANT EXECUTE ON FUNCTION ss_attach_worker(text) TO authenticated;

-- ── verify ──
--   SELECT ss_attach_worker('SS-2026-100001');   -- as a signed-in employer
