-- Automated service fee for device repair invoices.
-- The admin sets the amount in Revenue Analytics; every NEW invoice gets it as a fixed "Service Fee"
-- line (the amount is saved on that invoice, so later changes never alter existing invoices).
-- Only the server (service role) reads and writes these tables.

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),          -- a single settings row
  service_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0 AND service_fee <= 100000),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.billing_settings (id, service_fee) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- Who changed the fee, when, and from what to what
CREATE TABLE IF NOT EXISTS public.billing_fee_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  old_fee numeric(10, 2),
  new_fee numeric(10, 2) NOT NULL,
  changed_by text,
  changed_by_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_fee_changes ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: browsers can't read or change these tables directly.
