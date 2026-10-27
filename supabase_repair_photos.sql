-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist: photos attached to a device repair request (2026-10-27)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Students may attach up to 3 photos of the reported issue and up to 3 of the device's physical
-- condition. Files live in a PRIVATE storage bucket; the app only hands out short-lived signed links
-- to the student who owns the repair and to staff. RLS on with no policies = server-only access.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Private bucket (5 MB per file, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('repair-photos', 'repair-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Which photo belongs to which repair, and to which part of the intake
CREATE TABLE IF NOT EXISTS public.repair_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_number TEXT NOT NULL,                                   -- the repair's job order number
  kind TEXT NOT NULL CHECK (kind IN ('ISSUE', 'CONDITION')),  -- reported issue | physical inspection
  storage_path TEXT NOT NULL UNIQUE,                          -- path inside the repair-photos bucket
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_photos_rma ON public.repair_photos (rma_number, kind, created_at);
ALTER TABLE public.repair_photos ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
