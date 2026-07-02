-- ============================================
-- Shramik Sathi — Migration 017: fix employer↔employee sync bugs
--
--   (a) attendance.shift / attendance.remarks — columns the employer attendance
--       grid + CSV import write, but which never existed (writes were failing).
--   (b) Allow leave_type = 'Advance' — the worker "Advance Salary" request and the
--       employer "Advances" tab use it, but the CHECK constraint rejected it, so
--       advance requests silently failed to insert.
--
-- Pair this with the attendance.html column fix (date → attendance_date).
-- Additive & idempotent.
-- ============================================

-- (a) Missing attendance columns
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift   TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT;

-- (b) Permit 'Advance' as a leave_type
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('Casual','Sick','Earned','Compensatory','Unpaid','Advance'));

-- ── verify ──
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='attendance' AND column_name IN ('shift','remarks');
--   -- inserting a leave_requests row with leave_type='Advance' should now succeed.
