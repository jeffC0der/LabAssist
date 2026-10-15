-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist security patch 2 (2026-10-16)
-- Run once in the Supabase SQL Editor AFTER supabase_security_patch.sql. Safe to re-run.
--
-- 1. Closes direct database reads with the public key: until now anyone (even signed out)
--    could read every ticket, loan request (with locker PINs), repair (names, emails, phones),
--    invoice and user profile straight from Supabase, bypassing the app's API.
--    All existing policies on those tables are replaced with least-privilege ones.
-- 2. verified_sessions table for server-enforced two-factor login.
-- 3. Locks the unused legacy public.users table.
-- (Loan requests are left unchanged for now — that feature is still a placeholder.)
-- ════════════════════════════════════════════════════════════════════════════

-- Helper: the caller's role, read without triggering RLS (avoids policy recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE'
$$;

-- Remove every existing policy on the tables being locked down (some live policies are not in the schema file)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'tickets', 'device_repairs', 'repair_invoices', 'whitelisted_technicians', 'workstations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 1a. PROFILES: everyone reads/edits only their own row; admins can read/edit all
--     (role/status/email changes are still blocked for non-admins by the protect_profile_privileges trigger)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: own row or admin" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_app_role() = 'ADMIN');
CREATE POLICY "Profiles: insert own row" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own row or admin" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.current_app_role() = 'ADMIN');

-- 1b. TICKETS: direct access for staff only (students go through /api/tickets, which hides other students' details)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets: staff read" ON public.tickets FOR SELECT
  USING (public.current_app_role() IN ('TECHNICIAN', 'ADMIN'));
CREATE POLICY "Tickets: staff update" ON public.tickets FOR UPDATE
  USING (public.current_app_role() IN ('TECHNICIAN', 'ADMIN'));

-- 1d. DEVICE REPAIRS: staff see all; clients see only their own
ALTER TABLE public.device_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Repairs: staff or own" ON public.device_repairs FOR SELECT
  USING (
    public.current_app_role() IN ('TECHNICIAN', 'ADMIN')
    OR user_id = auth.uid()
    OR lower(client_email) = lower(auth.jwt() ->> 'email')
  );
CREATE POLICY "Repairs: staff update" ON public.device_repairs FOR UPDATE
  USING (public.current_app_role() IN ('TECHNICIAN', 'ADMIN'));

-- 1e. REPAIR INVOICES: staff only directly (clients get their invoice details via /api/repairs)
ALTER TABLE public.repair_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices: staff read" ON public.repair_invoices FOR SELECT
  USING (public.current_app_role() IN ('TECHNICIAN', 'ADMIN'));

-- 1f. TECHNICIAN ALLOWLIST: admins only
ALTER TABLE public.whitelisted_technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowlist: admins" ON public.whitelisted_technicians FOR ALL
  USING (public.current_app_role() = 'ADMIN')
  WITH CHECK (public.current_app_role() = 'ADMIN');

-- 1g. WORKSTATIONS: status stays public (lab maps); only staff may change rows, nobody inserts directly
ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workstations: readable" ON public.workstations FOR SELECT USING (true);
CREATE POLICY "Workstations: staff update" ON public.workstations FOR UPDATE
  USING (public.current_app_role() IN ('TECHNICIAN', 'ADMIN'));

-- 2. TWO-FACTOR LOGIN: sessions that passed the emailed code (server-only table)
CREATE TABLE IF NOT EXISTS public.verified_sessions (
  session_id UUID PRIMARY KEY,           -- Supabase session id (the JWT session_id claim)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.verified_sessions ENABLE ROW LEVEL SECURITY;

-- 3. LEGACY public.users TABLE (empty, no longer used by the app): no browser access at all
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.users FROM anon, authenticated';
  END IF;
END $$;

-- Make the API see the new table/columns immediately
NOTIFY pgrst, 'reload schema';
