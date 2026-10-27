-- Room layouts for the Live Workstation Grid (table rows per side, front-of-room marker).
-- Saved by admins/technicians from the grid's Edit Layout button; NULL = default grid.
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS layout jsonb;
