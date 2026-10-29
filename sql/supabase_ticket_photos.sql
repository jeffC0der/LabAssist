-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist: photos attached to a lab PC ticket (2026-10-30)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- When reporting a broken lab PC, a student may attach up to 3 photos (the error on screen, the
-- broken part...). Files go in the same PRIVATE bucket as repair photos (under tickets/); the app only
-- hands out short-lived signed links to the reporter and to staff. RLS on with no policies = server-only.
-- Requires sql/supabase_repair_photos.sql (it creates the private bucket).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ticket_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,                 -- e.g. TKT-2670
  storage_path TEXT NOT NULL UNIQUE,       -- path inside the repair-photos bucket (tickets/...)
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_photos_ticket ON public.ticket_photos (ticket_id, created_at);
ALTER TABLE public.ticket_photos ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
