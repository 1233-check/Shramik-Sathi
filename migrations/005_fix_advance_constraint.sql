-- Shramik Sathi — Migration 005: Add 'Advance' to leave_type CHECK constraint
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- The get-hired.html dashboard submits Salary Advance requests by inserting
-- into the leave_requests table with leave_type = 'Advance'.
-- The original CHECK constraint did not allow 'Advance', causing silent failures.

DO $$
DECLARE
  const_name TEXT;
BEGIN
  -- 1. Find the auto-generated check constraint name for leave_type
  SELECT conname INTO const_name
  FROM pg_constraint
  WHERE conrelid = 'leave_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%leave_type%';

  -- 2. Drop the old constraint if it exists
  IF const_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE leave_requests DROP CONSTRAINT ' || const_name;
  END IF;

  -- 3. Add the new named constraint including 'Advance'
  ALTER TABLE leave_requests 
  ADD CONSTRAINT leave_requests_leave_type_check 
  CHECK (leave_type IN ('Casual','Sick','Earned','Compensatory','Unpaid','Advance'));
END $$;
