-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist PC admin credentials (2026-10-19)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- 1. pc_credentials: each room's local admin account (and optional per-PC overrides).
--    Passwords are encrypted by the server (AES-256-GCM, CREDENTIALS_KEY) before they are stored.
-- 2. credential_access_log: every reveal (and failed attempt) — who, what, when, why, from where.
-- 3. Allows SECURITY notifications (admins are notified of each reveal).
-- RLS on with no policies = only the server's service-role key can read or write these tables.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. CREDENTIALS
CREATE TABLE IF NOT EXISTS public.pc_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_code TEXT NOT NULL,                                                   -- room
  workstation_id UUID REFERENCES public.workstations(id) ON DELETE CASCADE, -- NULL = room default; set = one PC's override
  username TEXT NOT NULL,
  password_enc TEXT NOT NULL,                                               -- encrypted, never plain text
  reveal_count INT NOT NULL DEFAULT 0,                                      -- reveals since the password was last changed
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One default per room, one override per PC
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_credentials_room_default ON public.pc_credentials (lab_code) WHERE workstation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_credentials_pc_override ON public.pc_credentials (workstation_id) WHERE workstation_id IS NOT NULL;
ALTER TABLE public.pc_credentials ENABLE ROW LEVEL SECURITY;

-- 2. ACCESS LOG (audited by admins)
CREATE TABLE IF NOT EXISTS public.credential_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL DEFAULT 'REVEAL' CHECK (action IN ('REVEAL', 'SET', 'CLEAR')),  -- reveal, or an admin changing credentials
  scope TEXT NOT NULL CHECK (scope IN ('PC', 'ROOM', 'ALL')),
  lab_code TEXT,                 -- room (scope PC / ROOM)
  pc_num TEXT,                   -- PC (scope PC)
  pcs_count INT NOT NULL DEFAULT 0,
  reason TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credential_access_log_created ON public.credential_access_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_access_log_user ON public.credential_access_log (user_id, created_at DESC);
ALTER TABLE public.credential_access_log ENABLE ROW LEVEL SECURITY;

-- 3. NOTIFICATIONS: add the SECURITY category (admin alerts for credential reveals)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check CHECK (category IN ('TICKET', 'REPAIR', 'PAYMENT', 'SECURITY'));

-- Make the API see the new tables immediately
NOTIFY pgrst, 'reload schema';
