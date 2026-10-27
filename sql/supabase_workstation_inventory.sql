-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist PC Inventory (2026-10-18)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Records who last edited a PC's details (specs, IP address, room) and when,
-- shown as "Last updated" in the PC Inventory tab.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workstations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.workstations ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Make the API see the new columns immediately
NOTIFY pgrst, 'reload schema';
