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
  
  -- Default to 'STUDENT' unless specified or if root admin email
  IF NEW.email = 'labadmin@campus.edu' THEN
    user_role := 'ADMIN';
  ELSE
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');
  END IF;

  user_dept := COALESCE(NEW.raw_user_meta_data->>'department', 'Campus General Body');

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
  code TEXT UNIQUE NOT NULL, -- e.g. LAB-302
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
CREATE POLICY "Labs viewable by authenticated users" ON public.labs FOR SELECT USING (true);
CREATE POLICY "Admins can modify labs" ON public.labs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- 4. WORKSTATIONS (LAB PCs)
CREATE TABLE IF NOT EXISTS public.workstations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_num TEXT NOT NULL, -- e.g. PC-01
  lab_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ONLINE', 'OCCUPIED', 'UNDER_REPAIR')) DEFAULT 'ONLINE',
  current_user TEXT,
  ip_address TEXT,
  specs TEXT,
  last_ping_at TIMESTAMPTZ DEFAULT NOW(),
  active_issue TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lab_code, pc_num)
);

ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workstations viewable by everyone" ON public.workstations FOR SELECT USING (true);
CREATE POLICY "Admins and techs can update workstations" ON public.workstations FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
);

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
CREATE POLICY "Tickets viewable by authenticated users" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Technicians and Admins can update tickets" ON public.tickets FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('TECHNICIAN', 'ADMIN')
);

-- 6. ESP32 IOT TELEMETRY NODES
CREATE TABLE IF NOT EXISTS public.esp32_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id TEXT UNIQUE NOT NULL, -- e.g. ESP-NODE-302A
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
CREATE POLICY "ESP32 nodes viewable by authenticated users" ON public.esp32_nodes FOR SELECT USING (true);
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
CREATE POLICY "Loaner items viewable by all" ON public.loaner_items FOR SELECT USING (true);

ALTER TABLE public.loaner_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loaner requests viewable by all" ON public.loaner_requests FOR SELECT USING (true);
CREATE POLICY "Students can request loaners" ON public.loaner_requests FOR INSERT WITH CHECK (true);
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
CREATE POLICY "Allowlist viewable by authenticated users" ON public.whitelisted_technicians FOR SELECT USING (auth.uid() IS NOT NULL);
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
CREATE POLICY "Lockout status viewable by anyone" ON public.account_lockouts FOR SELECT USING (true);
CREATE POLICY "Service role can manage lockouts" ON public.account_lockouts FOR ALL USING (true);


