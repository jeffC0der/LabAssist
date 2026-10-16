-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist notifications (2026-10-16)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- One row per notification for a user: created by the server when something happens to
-- their report, repair or payment. The bell shows the short title; the Notifications tab
-- shows the full message. RLS on with no policies = only the server (service role) reads
-- or writes it; users get their own notifications through /api/notifications.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('TICKET', 'REPAIR', 'PAYMENT')),
  title TEXT NOT NULL,          -- short line shown in the bell
  message TEXT NOT NULL,        -- full details shown in the Notifications tab
  link_tab TEXT,                -- student portal tab to open (SUBMIT_TICKET, REPAIR_SERVICE, ...)
  ref_id TEXT,                  -- ticket id or job order number
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Make the API see the new table immediately
NOTIFY pgrst, 'reload schema';
