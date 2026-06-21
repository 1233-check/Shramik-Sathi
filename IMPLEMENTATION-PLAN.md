# Shramik Sathi — Worker Portal Completion: Implementation Plan

**Status:** for sign-off. Nothing is changed in the database or code until you approve.
**Delivery:** backend = migration SQL you paste into the Supabase SQL Editor (no service key); frontend = commits → Vercel auto-deploy.

---

## 0. Principles ("clean backend, no messy structure")

- **One additive foundation migration (`010`)** — we do **not** rewrite the already-applied 001–009 (that's unsafe on a live DB with real data). Instead 010 adds the new structure cleanly and tightens integrity. The end state is documented in a new **`SCHEMA.md`** so the structure is legible.
- **Integrity in the DB** (foreign keys, checks, indexes), **access via RLS** (no recursive/dead policies — we already removed one recursion bug), **logic in `SECURITY DEFINER` helpers** where cross-table checks are needed.
- **Single source of truth for "onboarded"** = `employees.company_id IS NOT NULL` (+ `status='Active'`). Everything gates on that.
- Frontend: escape all DB values (fix the XSS finding), consistent loading/empty/error states.

---

## PHASE A — Backend foundation · `migration 010` (run in SQL Editor)

### A1. Unique worker ID (`ss_uid`)
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ss_uid TEXT UNIQUE;
CREATE SEQUENCE IF NOT EXISTS worker_uid_seq START 100001;
CREATE OR REPLACE FUNCTION ss_assign_worker_uid() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ss_uid IS NULL THEN
    NEW.ss_uid := 'SS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('worker_uid_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_worker_uid ON employees;
CREATE TRIGGER trg_worker_uid BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION ss_assign_worker_uid();
-- backfill existing rows
UPDATE employees SET ss_uid = 'SS-' || to_char(COALESCE(created_at,now()),'YYYY') || '-' || lpad(nextval('worker_uid_seq')::text,6,'0')
WHERE ss_uid IS NULL;
```
Portable, permanent, race-safe (DB sequence). Distinct from `emp_id` (the employer's internal code).

### A2. Onboarding marker
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
```
The onboarding trigger (from 007, `ss_onboard_confirmed_applicant`) is extended to also set `onboarded_at = now()` when a worker confirms an offer — so the gate has a clean timestamp and the flow stays atomic.

### A3. Announcements / news
```sql
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,   -- NULL = platform-wide
  title TEXT NOT NULL,
  body TEXT,
  category TEXT CHECK (category IN ('Payroll Update','Safety Alert','Health & Wellness','Policy','General')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- workers read platform-wide + their own employer's posts
CREATE POLICY "read relevant announcements" ON announcements FOR SELECT USING (
  company_id IS NULL OR company_id IN (SELECT company_id FROM employees WHERE auth_user_id = auth.uid())
);
-- employers manage their own
CREATE POLICY "employers manage own announcements" ON announcements FOR ALL USING (
  company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
) WITH CHECK (...same...);
-- + seed 2–3 platform-wide welcome posts so the page isn't empty
CREATE INDEX idx_announcements_company ON announcements(company_id);
```

### A4. Profile-photo storage (`avatars` bucket)
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT (id) DO NOTHING;
-- public read; each user writes only inside their own folder /{auth.uid()}/...
DROP POLICY IF EXISTS "avatars read" ON storage.objects;
CREATE POLICY "avatars read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
DROP POLICY IF EXISTS "avatars write own" ON storage.objects;
CREATE POLICY "avatars write own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
-- + matching UPDATE/DELETE own policies
```
(`employees.photo_url` already exists — we just populate it.)

### A5. KYC documents — let workers upload their own
```sql
-- documents table exists; allow worker self-insert/read of own docs
CREATE POLICY "workers manage own documents" ON documents FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
) WITH CHECK (...same...);
-- + a private 'kyc-docs' storage bucket with owner-scoped policies (NOT public)
```

### A6. Notifications
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT, title TEXT NOT NULL, body TEXT,
  link TEXT, read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers read/update own notifications" ON notifications FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE INDEX idx_notifications_employee ON notifications(employee_id, read);
```
DB triggers insert a notification on: offer extended, worker confirmed/onboarded, wage record created.

### A7. Integrity & performance sweep
- Confirm all FKs present (they are); add indexes: `employees(auth_user_id)`, `employees(status)`, `employees(ss_uid)`, announcements, notifications.
- Drop any dead/duplicate policies; verify no RLS recursion.

---

## PHASE B — Onboarding gate (frontend · `get-hired.html`)
On load, read `employees {company_id, status, ss_uid, full_name}`:
- **Not onboarded** (`company_id` null): render a clean **"Awaiting onboarding"** home — greeting, the worker's **Shramik Sathi ID**, application status, and a **Browse Jobs** CTA. Earnings / attendance / compliance / payslip are **hidden**.
- **Onboarded**: the full dashboard (current behaviour).
Enforced in UI; RLS already prevents any cross-tenant data access.

## PHASE C — Surface the unique ID
Show `ss_uid` on the profile, the worker home header, and as the value behind the **QR badge** (ties into the existing QR login on `worker-login.html`).

## PHASE D — Profile picture upload (`worker-registration.html`, `worker-profile.html`)
File picker → validate (image, ≤2 MB) → canvas resize (~512px) → upload to `avatars/{uid}/avatar.jpg` → `getPublicUrl` → save to `employees.photo_url`. Avatar then replaces the initials everywhere (home, profile, employer's view).

## PHASE E — Profile editing (`worker-profile.html`)
Make editable & savable (RLS already allows a worker to update their own row): mobile, emergency contact, address/state/PIN, bank name/account/IFSC (with the same validation as registration). **Aadhaar/PAN stay read-only** to protect verification integrity.

## PHASE F — Real news feed (`worker-news.html` + employer)
Worker page fetches `announcements` (relevant ones) instead of hardcoded cards. Employer gets a small **"Post announcement"** action in `hire.html`. (v1 can ship with seeded platform posts + read-only worker view; employer posting in v1.1 if you want to defer.)

## PHASE G — Payslip download (`get-hired.html`)
Reuse the existing `pdf-generator.js` (`SSPdf.wageSlip`) on the worker side: fetch latest `wage_records` + employee → generate the payslip PDF. Friendly message if none yet.

## PHASE H — KYC document upload (`worker-profile.html`)
Upload Aadhaar/bank/police/medical to the private `kyc-docs` bucket, insert a `documents` row, list uploaded docs with status.

## PHASE I — Worker-login OAuth race fix (`worker-login.html`)
Apply the same `onAuthStateChange` hardening already shipped for employer login (PR #7) so worker Google login can't bounce back to the sign-in screen.

## PHASE J — Notifications (`get-hired.html` bell)
Wire the bell to `notifications`: unread badge, dropdown list, mark-as-read. Populated by the A6 triggers.

## Polish (deferrable to v1.1)
Hindi / regional i18n across all worker pages · digital ID/QR card · consistent empty/error/loading states.

---

## Sequencing
1. **Phase A** (migration 010) — everything depends on it.
2. **B, C, D, E, I** — core worker experience + login reliability.
3. **F, G, H, J** — feature completeness.
4. Polish.

## Recommended v1 scope (ship the core fast)
- **Must:** A, B, C, D, E, I
- **Strong:** F, G, H
- **Defer to v1.1:** J (notifications), Hindi i18n, QR card

## Verification per phase
- **DB:** probe live after 010 — tables/policies/sequence exist, `ss_uid` auto-assigns, anon still blocked, no recursion.
- **E2E:** register → get ID + onboarding-pending home → apply → employer hires → confirm → **dashboard unlocks** + worker appears in employer CLMS. Photo upload renders. News loads. Payslip downloads.
- **Quality:** static audit (JS/links/CSS/SW), console clean, mobile + desktop responsive, XSS escaping in place.
