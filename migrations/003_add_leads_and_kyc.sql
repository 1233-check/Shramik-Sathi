-- Shramik Sathi — Migration 003: Leads table, Employee KYC columns
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- 1. LEADS TABLE (Landing Page Enquiry Capture)
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT,
  mobile TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('employer', 'worker')),
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Converted', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. EMPLOYEE TABLE UPDATES
-- ============================================
-- Add PAN number column for KYC compliance
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_no TEXT;

-- Make company_id nullable so workers can self-register
-- without being assigned to a company yet
ALTER TABLE employees ALTER COLUMN company_id DROP NOT NULL;

-- ============================================
-- 3. ROW LEVEL SECURITY — LEADS
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous/unauthenticated) can submit a lead
CREATE POLICY "Anyone can submit leads" ON leads FOR INSERT WITH CHECK (true);

-- Only authenticated employer users can view leads
CREATE POLICY "Employers can view leads" ON leads FOR SELECT USING (
  auth.uid() IN (SELECT auth_user_id FROM companies)
);

-- ============================================
-- 4. EMPLOYEE SELF-REGISTRATION RLS
-- ============================================
-- Workers can insert their own employee record during registration
CREATE POLICY "Workers can create own profile" ON employees FOR INSERT WITH CHECK (
  auth.uid() = auth_user_id
);

-- Workers can update their own employee record
CREATE POLICY "Workers can update own profile" ON employees FOR UPDATE USING (
  auth.uid() = auth_user_id
);
