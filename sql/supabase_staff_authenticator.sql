-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist: authenticator app (Google Authenticator) for viewing PC credentials (2026-10-22)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Each admin/technician links an authenticator app once; every credential reveal then needs the
-- current 6-digit code. The secret is encrypted by the server (CREDENTIALS_KEY) before it is stored.
-- RLS on with no policies = only the server's service-role key can read or write this table.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.staff_authenticators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_enc TEXT NOT NULL,          -- encrypted TOTP secret, never plain text
  confirmed_at TIMESTAMPTZ,          -- NULL until the user enters a first code from the app
  last_used_step BIGINT,             -- time step of the last accepted code (a code can't be reused)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.staff_authenticators ENABLE ROW LEVEL SECURITY;

-- The access log also records authenticator setup and resets
ALTER TABLE public.credential_access_log DROP CONSTRAINT IF EXISTS credential_access_log_action_check;
ALTER TABLE public.credential_access_log
  ADD CONSTRAINT credential_access_log_action_check CHECK (action IN ('REVEAL', 'SET', 'CLEAR', 'AUTH_SETUP', 'AUTH_RESET'));

NOTIFY pgrst, 'reload schema';
