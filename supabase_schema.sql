-- ==============================================================================
-- LABASSIST SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT', 'TECHNICIAN', 'ADMIN')) DEFAULT 'STUDENT',
  avatar TEXT,
  department TEXT DEFAULT 'Undergraduate Engineering',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

-- 2. AUTOMATIC PROFILE CREATION TRIGGER (On Email Signup or Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role TEXT;
  user_dept TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Default to 'STUDENT' unless specified or if root admin / technician email
  IF NEW.email = 'labadmin@campus.edu' OR NEW.email = 'labadmin@gmail.com' OR NEW.email = 'labassist4umak@gmail.com' THEN
    user_role := 'ADMIN';
    user_dept := COALESCE(NEW.raw_user_meta_data->>'department', 'Laboratory Administration');
  ELSIF NEW.email = 'umak.labassist@gmail.com' THEN
    user_role := 'TECHNICIAN';
    user_dept := COALESCE(NEW.raw_user_meta_data->>'department', 'Hardware Maintenance Div.');
  ELSE
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');
    user_dept := COALESCE(NEW.raw_user_meta_data->>'department', 'Campus General Body');
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. LAB ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g. LAB-101
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 20,
  active_stations INT NOT NULL DEFAULT 20,
  cluster_master TEXT,
  status TEXT NOT NULL CHECK (status IN ('OPERATIONAL', 'MAINTENANCE')) DEFAULT 'OPERATIONAL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Labs viewable by authenticated users" ON public.labs;
CREATE POLICY "Labs viewable by authenticated users" ON public.labs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify labs" ON public.labs;
CREATE POLICY "Admins can modify labs" ON public.labs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- 4. WORKSTATIONS (LAB PCs)
CREATE TABLE IF NOT EXISTS public.workstations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_num TEXT NOT NULL, -- e.g. PC-01
  lab_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ONLINE', 'OCCUPIED', 'UNDER_REPAIR')) DEFAULT 'ONLINE',
  assigned_user TEXT,
  ip_address TEXT,
  specs TEXT,
  last_ping_at TIMESTAMPTZ DEFAULT NOW(),
  active_issue TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lab_code, pc_num)
);

ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workstations viewable by everyone" ON public.workstations;
CREATE POLICY "Workstations viewable by everyone" ON public.workstations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and techs can update workstations" ON public.workstations;
CREATE POLICY "Admins and techs can update workstations" ON public.workstations FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
);

DROP POLICY IF EXISTS "Authenticated users can insert workstations" ON public.workstations;
CREATE POLICY "Authenticated users can insert workstations" ON public.workstations FOR INSERT WITH CHECK (true);

-- 5. TICKETS (INCIDENT REPORTS)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT UNIQUE NOT NULL, -- e.g. TKT-2401
  lab_id TEXT NOT NULL,
  pc_num TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('DISPLAY', 'PERIPHERALS', 'POWER/UPS', 'NET/SOFTWARE')),
  key TEXT NOT NULL CHECK (key IN ('A', 'B', 'C', 'D')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'DISPATCHED', 'RESOLVED')) DEFAULT 'PENDING',
  reporter TEXT NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tickets viewable by authenticated users" ON public.tickets;
CREATE POLICY "Tickets viewable by authenticated users" ON public.tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Technicians and Admins can update tickets" ON public.tickets;
CREATE POLICY "Technicians and Admins can update tickets" ON public.tickets FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
);

-- 6. ESP32 IOT TELEMETRY NODES
CREATE TABLE IF NOT EXISTS public.esp32_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id TEXT UNIQUE NOT NULL, -- e.g. ESP-NODE-101A
  name TEXT NOT NULL,
  lab_room TEXT NOT NULL,
  cluster TEXT NOT NULL,
  mac_address TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  rssi INT DEFAULT -60,
  power_source TEXT DEFAULT 'AC Mains',
  ping_ms INT DEFAULT 15,
  uptime TEXT DEFAULT '1d 00h',
  firmware TEXT DEFAULT 'v2.4.2-iot',
  status TEXT NOT NULL CHECK (status IN ('ONLINE', 'DEGRADED', 'OFFLINE')) DEFAULT 'ONLINE',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  assigned_stations TEXT
);

ALTER TABLE public.esp32_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ESP32 nodes viewable by authenticated users" ON public.esp32_nodes;
CREATE POLICY "ESP32 nodes viewable by authenticated users" ON public.esp32_nodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage nodes" ON public.esp32_nodes;
CREATE POLICY "Admins can manage nodes" ON public.esp32_nodes FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- 7. LOANER ITEMS & HARDWARE REQUESTS
CREATE TABLE IF NOT EXISTS public.loaner_items (
  id TEXT PRIMARY KEY, -- e.g. LOAN-01
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Dev Kit', 'Adapter', 'Tool', 'Sensor')),
  available INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  image TEXT,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loaner_requests (
  id TEXT PRIMARY KEY, -- e.g. REQ-8821
  item_id TEXT REFERENCES public.loaner_items(id),
  item_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  lab_room TEXT NOT NULL,
  duration TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('APPROVED', 'CHECKED_OUT', 'RETURNED')) DEFAULT 'APPROVED',
  locker_code TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ
);

ALTER TABLE public.loaner_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Loaner items viewable by all" ON public.loaner_items;
CREATE POLICY "Loaner items viewable by all" ON public.loaner_items FOR SELECT USING (true);

ALTER TABLE public.loaner_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Loaner requests viewable by all" ON public.loaner_requests;
CREATE POLICY "Loaner requests viewable by all" ON public.loaner_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students can request loaners" ON public.loaner_requests;
CREATE POLICY "Students can request loaners" ON public.loaner_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Techs can update loaners" ON public.loaner_requests;
CREATE POLICY "Admins and Techs can update loaners" ON public.loaner_requests FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
);

-- 8. TECHNICIAN ONBOARDING INVITE PASSCODES
CREATE TABLE IF NOT EXISTS public.technician_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g. TECH-AUTH-8821-4FA2
  department TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'TECHNICIAN',
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  claimed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.technician_invite_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.technician_invite_codes;
CREATE POLICY "Admins can manage invite codes" ON public.technician_invite_codes FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- 9. TECHNICIAN EMAIL ALLOWLIST (Strategy 2 Automated Role Assignment)
CREATE TABLE IF NOT EXISTS public.whitelisted_technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,          -- lowercase email to match on signup/login
  department TEXT DEFAULT 'Hardware Maintenance Div.',
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whitelisted_technicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowlist viewable by authenticated users" ON public.whitelisted_technicians;
CREATE POLICY "Allowlist viewable by authenticated users" ON public.whitelisted_technicians FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage allowlist" ON public.whitelisted_technicians;
CREATE POLICY "Admins can manage allowlist" ON public.whitelisted_technicians FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- 10. ACCOUNT SECURITY LOCKOUTS (6 Failed Attempts -> 15 Min Lockout & Brevo Alert)
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  email TEXT PRIMARY KEY,               -- lowercase email
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ DEFAULT NOW(),
  email_notified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lockout status viewable by anyone" ON public.account_lockouts;
CREATE POLICY "Lockout status viewable by anyone" ON public.account_lockouts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage lockouts" ON public.account_lockouts;
CREATE POLICY "Service role can manage lockouts" ON public.account_lockouts FOR ALL USING (true);

-- ==============================================================================
-- 11. INITIAL SEED DATA FOR LAB ROOMS (LAB-101 to LAB-105)
-- ==============================================================================
INSERT INTO public.labs (code, name, building, floor, capacity, active_stations, cluster_master, status)
VALUES
  ('LAB-101', 'Embedded Systems & IoT Lab', 'Turing Engineering Hall', '1st Floor', 24, 22, 'ESP-NODE-101A', 'OPERATIONAL'),
  ('LAB-102', 'Introductory Computing Lab', 'Turing Engineering Hall', '1st Floor', 20, 19, 'ESP-NODE-102A', 'OPERATIONAL'),
  ('LAB-103', 'Digital Logic & Circuitry', 'Shannon Tech Center', '1st Floor', 18, 17, 'ESP-NODE-103A', 'OPERATIONAL'),
  ('LAB-104', 'Microcontroller Design Lab', 'Shannon Tech Center', '1st Floor', 24, 23, 'ESP-NODE-104A', 'OPERATIONAL'),
  ('LAB-105', 'AI & High Performance Studio', 'Von Neumann Center', '1st Floor', 16, 16, 'ESP-NODE-105A', 'OPERATIONAL')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  building = EXCLUDED.building,
  floor = EXCLUDED.floor,
  capacity = EXCLUDED.capacity,
  active_stations = EXCLUDED.active_stations,
  cluster_master = EXCLUDED.cluster_master,
  status = EXCLUDED.status;

-- ==============================================================================
-- 12. INITIAL SEED DATA FOR WORKSTATIONS (PC-01 to PC-20 for each Lab)
-- ==============================================================================
DO $$
DECLARE
  l RECORD;
  i INT;
  formatted_pc TEXT;
  st TEXT;
  iss TEXT;
BEGIN
  FOR l IN SELECT code, capacity FROM public.labs LOOP
    FOR i IN 1..l.capacity LOOP
      formatted_pc := 'PC-' || LPAD(i::text, 2, '0');
      
      -- Default online, assign sample statuses to match realistic lab
      IF (l.code = 'LAB-101' AND i = 7) THEN
        st := 'UNDER_REPAIR';
        iss := 'Monitor backlight failure';
      ELSIF (l.code = 'LAB-101' AND i = 18) THEN
        st := 'UNDER_REPAIR';
        iss := 'Power supply fault';
      ELSIF (l.code = 'LAB-102' AND i = 12) THEN
        st := 'UNDER_REPAIR';
        iss := 'Ethernet DHCP warning';
      ELSIF (i % 4 = 0) THEN
        st := 'OCCUPIED';
        iss := NULL;
      ELSE
        st := 'ONLINE';
        iss := NULL;
      END IF;

      INSERT INTO public.workstations (pc_num, lab_code, status, ip_address, specs, active_issue)
      VALUES (
        formatted_pc,
        l.code,
        st,
        '10.12.' || SUBSTRING(l.code FROM 5) || '.' || (10 + i)::text,
        'Intel Core i7 · 32GB RAM · RTX 4060',
        iss
      )
      ON CONFLICT (lab_code, pc_num) DO UPDATE SET
        status = EXCLUDED.status,
        active_issue = EXCLUDED.active_issue;
    END LOOP;
  END LOOP;
END $$;

-- ==============================================================================
-- 13. ENABLE SUPABASE REALTIME REPLICATION FOR LIVE SYNC
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workstations, public.tickets, public.labs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

-- ==============================================================================
-- 14. REPAIR REQUESTS & INTAKE EVALUATION TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,                       -- e.g. REQ-2026-0928-01
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- 1. Client & Contact Profile
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_department TEXT DEFAULT 'Undergraduate Engineering',

  -- 2. Device Metadata
  device_type TEXT NOT NULL CHECK (device_type IN ('Laptop', 'Desktop', 'Other')) DEFAULT 'Laptop',
  device_model TEXT NOT NULL,                               -- e.g. Lenovo Legion 5 15ARH05
  serial_number TEXT NOT NULL,                              -- e.g. PF2X9Y8Z
  os_specs TEXT,                                            -- e.g. Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050
  reported_issue TEXT NOT NULL,                             -- Primary owner complaint

  -- 3. Physical & Pre-Diagnostic Intake Inspection (Dispute Protection)
  inspection_scratches_dents BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_missing_screws_feet BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_screen_damage_dead_pixels BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_liquid_damage_indicators BOOLEAN NOT NULL DEFAULT FALSE,
  additional_inspection_notes TEXT,                         -- Accompanying accessories & remarks

  -- 4. Intake Request Status
  request_status TEXT NOT NULL CHECK (
    request_status IN (
      'PENDING_EVALUATION',
      'UNDER_EVALUATION',
      'EVALUATED',
      'JOB_CONFIRMED',
      'REJECTED',
      'CANCELLED'
    )
  ) DEFAULT 'PENDING_EVALUATION',

  -- 5. Evaluation Details (Technician Assessment & Scheduling)
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  technician_evaluation TEXT,                               -- Technician diagnostic evaluation / assessment
  repair_feasibility TEXT CHECK (
    repair_feasibility IN ('FEASIBLE', 'NOT_FEASIBLE', 'BER_BEYOND_ECONOMIC_REPAIR', 'PENDING')
  ) DEFAULT 'PENDING',
  parts_availability TEXT CHECK (
    parts_availability IN ('IN_STOCK', 'TO_ORDER', 'CLIENT_PROVIDED', 'NOT_AVAILABLE')
  ) DEFAULT 'IN_STOCK',
  confirmed_date DATE,                                      -- Confirmed service date
  confirmed_time TIME,                                      -- Confirmed service time
  confirmed_location TEXT,                                  -- Confirmed repair location/room (e.g. LAB-101)
  evaluated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on repair_requests
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Repair requests viewable by all authenticated users" ON public.repair_requests;
CREATE POLICY "Repair requests viewable by all authenticated users"
  ON public.repair_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create repair requests" ON public.repair_requests;
CREATE POLICY "Users can create repair requests"
  ON public.repair_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Techs and Admins can update repair requests" ON public.repair_requests;
CREATE POLICY "Techs and Admins can update repair requests"
  ON public.repair_requests FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
    OR auth.uid() = user_id
  );

-- ==============================================================================
-- 15. CONFIRMED JOB ORDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_order_number TEXT UNIQUE NOT NULL,                    -- e.g. JO-2026-0928-01 / 01-LP-2026-0928
  repair_request_id UUID UNIQUE REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Repair Execution Status
  status TEXT NOT NULL CHECK (
    status IN (
      'CONFIRMED',
      'IN_DIAGNOSTICS',
      'AWAITING_PARTS',
      'REPAIR_IN_PROGRESS',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED'
    )
  ) DEFAULT 'CONFIRMED',
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',

  -- Diagnostics & Work Bench Logs
  diagnostic_findings TEXT,
  technician_notes TEXT,
  parts_replaced TEXT,
  estimated_completion TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  pickup_location TEXT,

  -- Completion Information
  device_released_to TEXT,                                  -- Person / student who claimed the device
  completed_at TIMESTAMPTZ,                                 -- Completion date/time

  -- Cancellation Information
  cancellation_reason TEXT,                                 -- Reason category
  cancellation_description TEXT,                            -- Detailed cancellation remarks
  cancelled_at TIMESTAMPTZ,                                 -- Date/time of cancellation
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Technician who cancelled

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on job_orders
ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job orders viewable by all authenticated users" ON public.job_orders;
CREATE POLICY "Job orders viewable by all authenticated users"
  ON public.job_orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Techs and Admins can insert job orders" ON public.job_orders;
CREATE POLICY "Techs and Admins can insert job orders"
  ON public.job_orders FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
    OR true
  );

DROP POLICY IF EXISTS "Techs and Admins can update job orders" ON public.job_orders;
CREATE POLICY "Techs and Admins can update job orders"
  ON public.job_orders FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
  );

-- ==============================================================================
-- 16. INVOICES TABLE (Billing Header & Payment Terms)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,                      -- e.g. INV-2026-0042
  job_order_id UUID NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Payment Terms & Status
  payment_timing TEXT NOT NULL CHECK (
    payment_timing IN ('PAY_NOW', 'PAY_AFTER_REPAIR')
  ) DEFAULT 'PAY_AFTER_REPAIR',
  payment_status TEXT NOT NULL CHECK (
    payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'REFUNDED')
  ) DEFAULT 'UNPAID',
  payment_method TEXT CHECK (
    payment_method IN ('CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'CAMPUS_ACCOUNT', 'FREE_LAB_SUBSIDY')
  ),

  -- Monetary Figures & Settlement
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  online_payment_reference TEXT,                            -- GCash / Maya / Bank transfer reference number
  settlement_date TIMESTAMPTZ,                              -- Date & time when payment was fully settled
  billing_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoices viewable by authenticated users" ON public.invoices;
CREATE POLICY "Invoices viewable by authenticated users"
  ON public.invoices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Techs and Admins can manage invoices" ON public.invoices;
CREATE POLICY "Techs and Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
    OR true
  );

-- Function to generate next sequential Invoice Number (INV-[QUEUE]-[YEAR]-[MMDD])
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_mmdd TEXT;
  v_pattern TEXT;
  v_max_queue INT;
  v_next_queue INT;
  v_inv_number TEXT;
BEGIN
  v_year := TO_CHAR(COALESCE(p_date, CURRENT_DATE), 'YYYY');
  v_mmdd := TO_CHAR(COALESCE(p_date, CURRENT_DATE), 'MMDD');
  v_pattern := '^INV-([0-9]+)-' || v_year || '-' || v_mmdd || '$';

  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '^INV-([0-9]+)-')::INT), 0)
  INTO v_max_queue
  FROM public.invoices
  WHERE invoice_number ~ v_pattern;

  v_next_queue := v_max_queue + 1;
  v_inv_number := 'INV-' || LPAD(v_next_queue::TEXT, 2, '0') || '-' || v_year || '-' || v_mmdd;
  
  RETURN v_inv_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 17. INVOICE ITEMS TABLE (Line-Item Normalized Bill of Materials & Scope)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  work_scope TEXT NOT NULL CHECK (
    work_scope IN ('DIAGNOSTICS', 'LABOR_SERVICE', 'HARDWARE_PART', 'CONSUMABLE', 'OTHER')
  ),
  item_name TEXT,                                           -- Optional specific part or item name
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),          -- Optional quantity
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,            -- Cost per unit
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,           -- quantity * unit_cost
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoice items viewable by authenticated users" ON public.invoice_items;
CREATE POLICY "Invoice items viewable by authenticated users"
  ON public.invoice_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Techs and Admins can manage invoice items" ON public.invoice_items;
CREATE POLICY "Techs and Admins can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
    OR true
  );

-- ==============================================================================
-- 18. LEGACY COMPATIBILITY & BACKWARD-COMPATIBLE DEVICE REPAIRS TABLE
-- ==============================================================================
-- Ensures existing code querying `device_repairs` remains 100% operational
-- while exposing all new workflow attributes.
CREATE TABLE IF NOT EXISTS public.device_repairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_number TEXT UNIQUE NOT NULL,                       -- e.g. 01-LP-2026-0928
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Client & Device Profile
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_department TEXT DEFAULT 'Undergraduate Engineering',
  device_type TEXT NOT NULL CHECK (device_type IN ('Laptop', 'Desktop', 'Other')) DEFAULT 'Laptop',
  device_model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  os_specs TEXT,
  reported_issue TEXT NOT NULL,

  -- Intake Inspection Checklist
  inspection_scratches_dents BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_missing_screws_feet BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_screen_damage_dead_pixels BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_liquid_damage_indicators BOOLEAN NOT NULL DEFAULT FALSE,
  additional_inspection_notes TEXT,

  -- Workflow Status & Bench Assignment
  status TEXT NOT NULL CHECK (
    status IN (
      'RECEIVED',
      'PENDING_EVALUATION',
      'EVALUATED',
      'CONFIRMED',
      'IN_DIAGNOSTICS',
      'REPAIR_IN_PROGRESS',
      'AWAITING_PARTS',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED'
    )
  ) DEFAULT 'RECEIVED',
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  technician_name TEXT,
  technician_notes TEXT,
  parts_replaced TEXT,
  estimated_completion TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  pickup_location TEXT,

  -- Evaluation Fields
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  technician_evaluation TEXT,
  repair_feasibility TEXT DEFAULT 'PENDING',
  parts_availability TEXT DEFAULT 'IN_STOCK',
  confirmed_date DATE,
  confirmed_time TIME,
  confirmed_location TEXT,
  evaluated_at TIMESTAMPTZ,

  -- Completion Fields
  device_released_to TEXT,
  completed_at TIMESTAMPTZ,

  -- Cancellation Fields
  cancellation_reason TEXT,
  cancellation_description TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Billing Snapshot Fields
  payment_timing TEXT DEFAULT 'PAY_AFTER_REPAIR',
  payment_status TEXT DEFAULT 'UNPAID',
  payment_method TEXT,
  total_amount NUMERIC(10,2) DEFAULT 0.00,
  amount_paid NUMERIC(10,2) DEFAULT 0.00,
  online_payment_reference TEXT,
  settlement_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on device_repairs
ALTER TABLE public.device_repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Repairs are viewable by authenticated users" ON public.device_repairs;
CREATE POLICY "Repairs are viewable by authenticated users"
  ON public.device_repairs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can submit device repair intake" ON public.device_repairs;
CREATE POLICY "Users can submit device repair intake"
  ON public.device_repairs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Technicians and Admins can update repair job cards" ON public.device_repairs;
CREATE POLICY "Technicians and Admins can update repair job cards"
  ON public.device_repairs FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
    OR auth.uid() = user_id
  );

-- ==============================================================================
-- 19. INDEXES & REALTIME PUBLICATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_repair_requests_user ON public.repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON public.repair_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_job_orders_request ON public.job_orders(repair_request_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON public.job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_tech ON public.job_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_order ON public.invoices(job_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.repair_requests, 
      public.job_orders, 
      public.invoices, 
      public.invoice_items, 
      public.device_repairs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

-- ==============================================================================
-- 20. SEED DATA DEMONSTRATING FULL NEW WORKFLOW
-- ==============================================================================

-- 1. Insert Sample Repair Requests
INSERT INTO public.repair_requests (
  id, request_number, client_name, client_email, client_phone, client_department,
  device_type, device_model, serial_number, os_specs, reported_issue,
  inspection_scratches_dents, inspection_missing_screws_feet,
  inspection_screen_damage_dead_pixels, inspection_liquid_damage_indicators,
  additional_inspection_notes, request_status, technician_evaluation,
  repair_feasibility, parts_availability, confirmed_date, confirmed_time, confirmed_location
)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'REQ-2026-0928-01',
    'Marcus Vance',
    'marcus.vance@umak.edu.ph',
    '09171234567',
    'Undergraduate Engineering',
    'Laptop',
    'Lenovo Legion 5 15ARH05',
    'PF2X9Y8Z',
    'Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050',
    'Spilled coffee on keyboard and trackpad; spacebar sticky and no display output on external HDMI port.',
    TRUE, FALSE, FALSE, TRUE,
    'Liquid residue visible near top-right palm rest. OEM 230W power brick included with unit.',
    'JOB_CONFIRMED',
    'Motherboard daughterboard corroded around HDMI redriver IC. Keyboard membrane needs replacement.',
    'FEASIBLE',
    'TO_ORDER',
    '2026-09-29',
    '09:00:00',
    'LAB-101'
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'REQ-2026-0928-02',
    'Alyssa Gomez',
    'alyssa.gomez@umak.edu.ph',
    '09189876543',
    'Computer Science Department',
    'Desktop',
    'Dell OptiPlex 7080 Micro Tower',
    'DL7080-99X4',
    'Windows 11 Pro | Intel Core i7-10700 | 32GB RAM | 512GB NVMe SSD',
    'Continuous 3 amber + 2 white power LED diagnostic code on boot. Fans spin up then immediately shut down.',
    FALSE, TRUE, FALSE, FALSE,
    'Two rear chassis thumb screws missing. Internal dust buildup in CPU cooler.',
    'JOB_CONFIRMED',
    'RAM DIMM slot 2 contact oxidation and dried thermal paste causing emergency thermal trip.',
    'FEASIBLE',
    'IN_STOCK',
    '2026-09-28',
    '13:30:00',
    'LAB-102'
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'REQ-2026-0928-03',
    'Daniel Bautista',
    'daniel.bautista@umak.edu.ph',
    '09195551234',
    'Information Technology',
    'Laptop',
    'ASUS ROG Zephyrus G14 GA402RJ',
    'G14-8841Z',
    'Windows 11 Home | Ryzen 9 6900HS | 16GB DDR5 | Radeon RX 6700S',
    'Overheating and thermal throttling under CAD workloads. CPU temps reach 96°C within 3 minutes of rendering.',
    TRUE, FALSE, FALSE, FALSE,
    'Chassis rubber feet intact. Minor scuff on anodized top lid.',
    'JOB_CONFIRMED',
    'Factory thermal paste pump-out. Vapor chamber heatsink requires repasting and fan cleaning.',
    'FEASIBLE',
    'IN_STOCK',
    '2026-09-28',
    '10:15:00',
    'LAB-101'
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    'REQ-2026-0928-04',
    'Kristine Reyes',
    'kristine.reyes@umak.edu.ph',
    '09201112233',
    'Electronics Engineering',
    'Desktop',
    'Custom Engineering Workstation (Fractal Node 202)',
    'ENG-LAB-CUST-04',
    'Ubuntu 22.04 LTS | Ryzen 7 5800X3D | 64GB ECC RAM | RTX 4070',
    'GPU PCIe slot sagging caused intermittent PCIe x16 link disconnection, causing kernel panic during CUDA training.',
    FALSE, FALSE, FALSE, FALSE,
    'Custom dual-slot GPU anti-sag bracket requested.',
    'JOB_CONFIRMED',
    'PCIe riser cable damaged due to chassis strain. Requires heavy-duty PCIe 4.0 riser replacement.',
    'FEASIBLE',
    'TO_ORDER',
    '2026-09-28',
    '15:00:00',
    'LAB-103'
  )
ON CONFLICT (request_number) DO NOTHING;

-- 2. Insert Confirmed Job Orders
INSERT INTO public.job_orders (
  id, job_order_number, repair_request_id, status, priority,
  diagnostic_findings, technician_notes, parts_replaced,
  estimated_completion, ready_at, device_released_to, completed_at,
  cancellation_reason, cancellation_description, cancelled_at
)
VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    '01-LP-2026-0928',
    'a1111111-1111-1111-1111-111111111111',
    'IN_DIAGNOSTICS',
    'HIGH',
    'Ultrasonic board wash completed for daughterboard. Testing HDMI IC solder pads under microscope.',
    'Waiting for replacement keyboard membrane from supplier.',
    'Keyboard membrane assembly (P/N: 5CB0Z21516)',
    NOW() + INTERVAL '2 days',
    NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '02-PC-2026-0928',
    'a2222222-2222-2222-2222-222222222222',
    'REPAIR_IN_PROGRESS',
    'MEDIUM',
    'Reseated DIMM slot 2. Re-applied Arctic MX-4 thermal paste.',
    'Running 24hr MemTest86 stress test suite.',
    'CMOS CR2032 battery replaced',
    NOW() + INTERVAL '1 day',
    NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    '03-LP-2026-0928',
    'a3333333-3333-3333-3333-333333333333',
    'READY_FOR_PICKUP',
    'LOW',
    'Liquid metal repasted on vapor chamber. Fan intake grills de-dusted.',
    'Stress test stable at 78°C under sustained Blender rendering.',
    'Thermal Grizzly Conductonaut liquid metal',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    NULL, NULL, NULL, NULL, NULL
  ),
  (
    'b4444444-4444-4444-4444-444444444444',
    '04-PC-2026-0928',
    'a4444444-4444-4444-4444-444444444444',
    'AWAITING_PARTS',
    'HIGH',
    'PCIe slot pins inspected with endoscope.',
    'Sourcing heavy-duty PCIe riser and CNC aluminum support pillar.',
    NULL,
    NOW() + INTERVAL '4 days',
    NULL, NULL, NULL, NULL, NULL, NULL
  )
ON CONFLICT (job_order_number) DO NOTHING;

-- 3. Insert Invoices for Confirmed Job Orders
INSERT INTO public.invoices (
  id, invoice_number, job_order_id, issue_date,
  payment_timing, payment_status, payment_method,
  total_amount, amount_paid, online_payment_reference, settlement_date, billing_notes
)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'INV-01-2026-0928',
    'b1111111-1111-1111-1111-111111111111',
    CURRENT_DATE,
    'PAY_AFTER_REPAIR',
    'UNPAID',
    'GCASH',
    1850.00,
    0.00,
    NULL,
    NULL,
    'Includes 30-day parts warranty for keyboard membrane.'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'INV-02-2026-0928',
    'b2222222-2222-2222-2222-222222222222',
    CURRENT_DATE,
    'PAY_AFTER_REPAIR',
    'UNPAID',
    'CASH',
    650.00,
    0.00,
    NULL,
    NULL,
    'Basic diagnostic & thermal paste repasting.'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'INV-03-2026-0928',
    'b3333333-3333-3333-3333-333333333333',
    CURRENT_DATE,
    'PAY_AFTER_REPAIR',
    'PAID',
    'GCASH',
    1200.00,
    1200.00,
    'GC-20260928-9812450',
    NOW() - INTERVAL '1 hour',
    'Paid via GCash counter QR code.'
  )
ON CONFLICT (invoice_number) DO NOTHING;

-- 4. Insert Invoice Line Items
INSERT INTO public.invoice_items (
  invoice_id, work_scope, item_name, quantity, unit_cost, total_cost
)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'DIAGNOSTICS', 'Motherboard ultrasonic wash & diagnostic', 1, 350.00, 350.00),
  ('c1111111-1111-1111-1111-111111111111', 'HARDWARE_PART', 'OEM Lenovo Legion 5 Keyboard Membrane', 1, 1200.00, 1200.00),
  ('c1111111-1111-1111-1111-111111111111', 'LABOR_SERVICE', 'Keyboard replacement & internal reassembly', 1, 300.00, 300.00),

  ('c2222222-2222-2222-2222-222222222222', 'DIAGNOSTICS', 'Hardware diagnostic & RAM contact de-oxidation', 1, 300.00, 300.00),
  ('c2222222-2222-2222-2222-222222222222', 'CONSUMABLE', 'Arctic MX-4 High-Performance Thermal Paste', 1, 250.00, 250.00),
  ('c2222222-2222-2222-2222-222222222222', 'HARDWARE_PART', 'Maxell CR2032 3V Lithium Battery', 1, 100.00, 100.00),

  ('c3333333-3333-3333-3333-333333333333', 'LABOR_SERVICE', 'Thermal overhaul & heatsink deep cleaning', 1, 500.00, 500.00),
  ('c3333333-3333-3333-3333-333333333333', 'CONSUMABLE', 'Thermal Grizzly Conductonaut Liquid Metal', 1, 700.00, 700.00);

-- 5. Seed Compatibility Table (device_repairs) to guarantee legacy parity
INSERT INTO public.device_repairs (
  rma_number, client_name, client_email, client_phone, client_department,
  device_type, device_model, serial_number, os_specs, reported_issue,
  inspection_scratches_dents, inspection_missing_screws_feet,
  inspection_screen_damage_dead_pixels, inspection_liquid_damage_indicators,
  additional_inspection_notes, status, priority, technician_name,
  technician_notes, parts_replaced,
  technician_evaluation, repair_feasibility, parts_availability,
  confirmed_date, confirmed_time, confirmed_location,
  payment_timing, payment_status, payment_method, total_amount, amount_paid, online_payment_reference
)
VALUES
  (
    '01-LP-2026-0928',
    'Marcus Vance',
    'marcus.vance@umak.edu.ph',
    '09171234567',
    'Undergraduate Engineering',
    'Laptop',
    'Lenovo Legion 5 15ARH05',
    'PF2X9Y8Z',
    'Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050',
    'Spilled coffee on keyboard and trackpad; spacebar sticky and no display output on external HDMI port.',
    TRUE, FALSE, FALSE, TRUE,
    'Liquid residue visible near top-right palm rest. OEM 230W power brick included with unit.',
    'IN_DIAGNOSTICS',
    'HIGH',
    'Tech. Alex Torres',
    'Ultrasonic board wash completed for daughterboard. Testing HDMI IC solder pads under microscope.',
    'Keyboard membrane assembly ordered (P/N: 5CB0Z21516)',
    'Motherboard daughterboard corroded around HDMI redriver IC. Keyboard membrane needs replacement.',
    'FEASIBLE',
    'TO_ORDER',
    '2026-09-29',
    '09:00:00',
    'LAB-101',
    'PAY_AFTER_REPAIR',
    'UNPAID',
    'GCASH',
    1850.00,
    0.00,
    NULL
  ),
  (
    '02-PC-2026-0928',
    'Alyssa Gomez',
    'alyssa.gomez@umak.edu.ph',
    '09189876543',
    'Computer Science Department',
    'Desktop',
    'Dell OptiPlex 7080 Micro Tower',
    'DL7080-99X4',
    'Windows 11 Pro | Intel Core i7-10700 | 32GB RAM | 512GB NVMe SSD',
    'Continuous 3 amber + 2 white power LED diagnostic code on boot. Fans spin up then immediately shut down.',
    FALSE, TRUE, FALSE, FALSE,
    'Two rear chassis thumb screws missing. Internal dust buildup in CPU cooler.',
    'REPAIR_IN_PROGRESS',
    'MEDIUM',
    'Tech. Alex Torres',
    'Reseated DIMM slot 2. Re-applied Arctic MX-4 thermal paste. Testing 24hr MemTest86 run.',
    'CMOS CR2032 battery replaced',
    'RAM DIMM slot 2 contact oxidation and dried thermal paste causing emergency thermal trip.',
    'FEASIBLE',
    'IN_STOCK',
    '2026-09-28',
    '13:30:00',
    'LAB-102',
    'PAY_AFTER_REPAIR',
    'UNPAID',
    'CASH',
    650.00,
    0.00,
    NULL
  ),
  (
    '03-LP-2026-0928',
    'Daniel Bautista',
    'daniel.bautista@umak.edu.ph',
    '09195551234',
    'Information Technology',
    'Laptop',
    'ASUS ROG Zephyrus G14 GA402RJ',
    'G14-8841Z',
    'Windows 11 Home | Ryzen 9 6900HS | 16GB DDR5 | Radeon RX 6700S',
    'Overheating and thermal throttling under CAD workloads. CPU temps reach 96°C within 3 minutes of rendering.',
    TRUE, FALSE, FALSE, FALSE,
    'Chassis rubber feet intact. Minor scuff on anodized top lid.',
    'READY_FOR_PICKUP',
    'LOW',
    'Tech. Maria Santos',
    'Liquid metal repasted on vapor chamber. Fan intake grills de-dusted. Stress test stable at 78°C under sustained load.',
    'Thermal Grizzly Conductonaut liquid metal',
    'Factory thermal paste pump-out. Vapor chamber heatsink requires repasting and fan cleaning.',
    'FEASIBLE',
    'IN_STOCK',
    '2026-09-28',
    '10:15:00',
    'LAB-101',
    'PAY_AFTER_REPAIR',
    'PAID',
    'GCASH',
    1200.00,
    1200.00,
    'GC-20260928-9812450'
  ),
  (
    '04-PC-2026-0928',
    'Kristine Reyes',
    'kristine.reyes@umak.edu.ph',
    '09201112233',
    'Electronics Engineering',
    'Desktop',
    'Custom Engineering Workstation (Fractal Node 202)',
    'ENG-LAB-CUST-04',
    'Ubuntu 22.04 LTS | Ryzen 7 5800X3D | 64GB ECC RAM | RTX 4070',
    'GPU PCIe slot sagging caused intermittent PCIe x16 link disconnection, causing kernel panic during CUDA training.',
    FALSE, FALSE, FALSE, FALSE,
    'Custom dual-slot GPU anti-sag bracket requested.',
    'AWAITING_PARTS',
    'HIGH',
    'Tech. Alex Torres',
    'PCIe slot pins inspected with endoscope. Sourcing heavy-duty PCIe riser and CNC aluminum support pillar.',
    NULL,
    'PCIe riser cable damaged due to chassis strain. Requires heavy-duty PCIe 4.0 riser replacement.',
    'FEASIBLE',
    'TO_ORDER',
    '2026-09-28',
    '15:00:00',
    'LAB-103',
    'PAY_AFTER_REPAIR',
    'UNPAID',
    NULL,
    0.00,
    0.00,
    NULL
  )
ON CONFLICT (rma_number) DO NOTHING;






