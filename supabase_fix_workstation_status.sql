-- ════════════════════════════════════════════════════════════════════════════
-- LabAssist fix (2026-10-16): allow the ISSUE_REPORTED workstation status
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- The live database still had an older check constraint that only allowed
-- ONLINE / OCCUPIED / UNDER_REPAIR, so every "mark this PC as issue reported"
-- update from the tickets API was silently rejected (PCs never turned yellow,
-- and room PC counts never dropped when a fault was reported).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workstations DROP CONSTRAINT IF EXISTS workstations_status_check;
ALTER TABLE public.workstations
  ADD CONSTRAINT workstations_status_check
  CHECK (status IN ('ONLINE', 'OCCUPIED', 'ISSUE_REPORTED', 'UNDER_REPAIR'));
