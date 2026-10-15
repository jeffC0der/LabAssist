-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist security patch (2026-10-14)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- 1. New accounts can no longer choose their own role through sign-up metadata,
--    and no email address is hardcoded as ADMIN.
-- 2. Users can no longer change their own role / status / email from the browser
--    (only admins, the server's service-role key, and the SQL editor can).
-- 3. Removes the policies that let anyone edit, delete or read login-lockout records.
-- 4. Creates the otp_codes table for one-time codes.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. NEW-ACCOUNT TRIGGER: role comes from the technician allowlist only, never from client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role TEXT := 'STUDENT';
  user_dept TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  user_dept := COALESCE(NEW.raw_user_meta_data->>'department', 'Undergraduate Engineering');

  IF EXISTS (SELECT 1 FROM public.whitelisted_technicians w WHERE lower(w.email) = lower(NEW.email)) THEN
    user_role := 'TECHNICIAN';
    user_dept := 'Hardware Maintenance Div.';
  END IF;

  INSERT INTO public.profiles (id, email, name, role, avatar, department)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    UPPER(SUBSTRING(user_name FROM 1 FOR 2)),
    user_dept
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. PROTECT PRIVILEGED PROFILE COLUMNS
-- Signed-in non-admin users may still edit their own name/department/avatar,
-- but role, status and email silently keep their stored values.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Server code using the service-role key, and the SQL editor, may change anything
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := CASE
      WHEN EXISTS (SELECT 1 FROM public.whitelisted_technicians w WHERE lower(w.email) = lower(NEW.email))
        THEN 'TECHNICIAN'
      ELSE 'STUDENT'
    END;
    NEW.status := 'ACTIVE';
  ELSE
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.email := OLD.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- 3. LOCKOUTS: only the server (service role, which bypasses RLS) manages lockout records
DROP POLICY IF EXISTS "Service role can manage lockouts" ON public.account_lockouts;

-- 4. LOCKOUT STATUS IS SERVER-ONLY TOO: the browser asks /api/auth/lockout instead of reading the table
DROP POLICY IF EXISTS "Lockout status viewable by anyone" ON public.account_lockouts;

-- 5. ONE-TIME CODES: stored in the database (hashed) so they survive restarts and work on every
--    server instance. RLS on with no policies = only the server's service-role key can access it.
CREATE TABLE IF NOT EXISTS public.otp_codes (
  email TEXT PRIMARY KEY,                -- lowercase email
  code_hash TEXT NOT NULL,               -- HMAC of the code, never the code itself
  purpose TEXT NOT NULL DEFAULT 'verification',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Make the API see the new table immediately
NOTIFY pgrst, 'reload schema';
