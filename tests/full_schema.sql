-- =============================================================================
-- FORGE FITNESS — FINAL UNIFIED DATABASE SCHEMA
-- Target: Supabase (PostgreSQL 15+)
-- Timezone: Asia/Kolkata (IST)
-- Concurrency-Safe, Single-Trainer High-Security Model
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. SEQUENCES
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.booking_code_seq START WITH 8910 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.lead_code_seq START WITH 110 INCREMENT BY 1;

-- =============================================================================
-- 2. TABLES DEFINITIONS
-- =============================================================================

-- Table 1: Trainer Profiles (Single Active Trainer Model)
CREATE TABLE IF NOT EXISTS public.trainer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 150),
    email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT NOT NULL CHECK (length(regexp_replace(phone, '\D', '', 'g')) >= 7),
    business_name TEXT NOT NULL DEFAULT 'FORGE FITNESS Elite Coaching',
    bio TEXT NOT NULL CHECK (length(bio) <= 2000),
    avatar_url TEXT NOT NULL DEFAULT 'assets/images/coach-haisam.jpg',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce exactly ONE active trainer at database engine level
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_trainer 
ON public.trainer_profiles ((true)) 
WHERE is_active = true;

-- Table 2: Trainer Settings & Parameters
CREATE TABLE IF NOT EXISTS public.trainer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL UNIQUE REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    default_duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (default_duration_minutes > 0),
    buffer_minutes INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutes >= 0),
    slot_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_interval_minutes >= 15),
    max_bookings_per_day INTEGER NOT NULL DEFAULT 6 CHECK (max_bookings_per_day > 0),
    consultation_type TEXT NOT NULL DEFAULT 'Video Call (Google Meet / Zoom)',
    email_new_bookings BOOLEAN NOT NULL DEFAULT true,
    email_confirmations BOOLEAN NOT NULL DEFAULT true,
    email_cancellations BOOLEAN NOT NULL DEFAULT true,
    sms_alerts BOOLEAN NOT NULL DEFAULT false,
    weekly_summary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: Weekly Recurring Availability Schedule
CREATE TABLE IF NOT EXISTS public.trainer_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    time_ranges JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(time_ranges) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_trainer_day_of_week UNIQUE (trainer_id, day_of_week)
);

-- Table 4: Availability Overrides & Holidays
CREATE TABLE IF NOT EXISTS public.availability_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT false,
    reason TEXT CHECK (reason IS NULL OR length(reason) <= 255),
    custom_slots JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(custom_slots) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_trainer_override_date UNIQUE (trainer_id, override_date)
);

-- Table 5: Consultation Bookings
CREATE TABLE IF NOT EXISTS public.consultation_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code TEXT NOT NULL UNIQUE DEFAULT ('BK-' || LPAD(nextval('public.booking_code_seq')::text, 4, '0')),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL CHECK (length(trim(client_name)) BETWEEN 2 AND 100),
    client_email TEXT NOT NULL CHECK (client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND length(client_email) <= 255),
    client_phone TEXT NOT NULL CHECK (length(regexp_replace(client_phone, '\D', '', 'g')) BETWEEN 7 AND 15),
    primary_goal TEXT NOT NULL CHECK (primary_goal IN (
        'Hypertrophy & Muscle Gain',
        'Fat Loss & Conditioning',
        'Biomechanical Rebuild',
        'Strength & Athleticism',
        'Elite Athlete Prep',
        'Intake Consultation'
    )),
    experience_level TEXT NOT NULL CHECK (experience_level IN (
        'Beginner (< 1 year)',
        'Intermediate (1–3 years)',
        'Advanced (3+ years)',
        'beginner',
        'intermediate',
        'advanced'
    )),
    booking_date DATE NOT NULL,
    booking_time_start TIME NOT NULL, -- Canonical TIME (Single Source of Truth)
    booking_time TEXT NOT NULL,       -- Synchronized formatted display string (e.g. '10:00 AM')
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Rejected', 'Cancelled')),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
    modality TEXT NOT NULL DEFAULT '100% Remote Video Call (Google Meet / Zoom)',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: Athlete Leads Pipeline
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code TEXT NOT NULL UNIQUE DEFAULT ('LD-' || LPAD(nextval('public.lead_code_seq')::text, 3, '0')),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.consultation_bookings(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT,
    goal TEXT,
    experience TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Converted', 'Not Interested')),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
    enquiry_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 7: Trainer Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_booking', 'confirmed', 'rescheduled', 'cancelled', 'lead_update', 'system')),
    title TEXT NOT NULL CHECK (length(title) <= 200),
    message TEXT NOT NULL CHECK (length(message) <= 1000),
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_booking_id UUID REFERENCES public.consultation_bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 8: Trainer Activity Audit Log (Append-Only)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) <= 200),
    detail TEXT NOT NULL CHECK (length(detail) <= 1000),
    type TEXT NOT NULL CHECK (length(type) <= 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. INDEXES & CONSTRAINTS
-- =============================================================================

-- Concurrency Partial Unique Index:
-- Physically guarantees no duplicate active booking for a slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_conflicting_bookings
ON public.consultation_bookings (trainer_id, booking_date, booking_time_start)
WHERE status IN ('Pending', 'Confirmed');

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_date ON public.consultation_bookings (trainer_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_leads_trainer_status ON public.leads (trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_trainer ON public.notifications (trainer_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_trainer ON public.activity_logs (trainer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_overrides_trainer_date ON public.availability_overrides (trainer_id, override_date);

-- =============================================================================
-- 4. UTILITIES & VALIDATION FUNCTIONS
-- =============================================================================

-- Synchronize updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trainer_profiles_updated_at ON public.trainer_profiles;
CREATE TRIGGER trg_trainer_profiles_updated_at BEFORE UPDATE ON public.trainer_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trainer_settings_updated_at ON public.trainer_settings;
CREATE TRIGGER trg_trainer_settings_updated_at BEFORE UPDATE ON public.trainer_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trainer_availability_updated_at ON public.trainer_availability;
CREATE TRIGGER trg_trainer_availability_updated_at BEFORE UPDATE ON public.trainer_availability FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_availability_overrides_updated_at ON public.availability_overrides;
CREATE TRIGGER trg_availability_overrides_updated_at BEFORE UPDATE ON public.availability_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_consultation_bookings_updated_at ON public.consultation_bookings;
CREATE TRIGGER trg_consultation_bookings_updated_at BEFORE UPDATE ON public.consultation_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Synchronize booking_time TEXT with booking_time_start TIME unconditionally
CREATE OR REPLACE FUNCTION public.sync_booking_time_text()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.booking_time := to_char(NEW.booking_time_start, 'HH12:MI AM');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_time ON public.consultation_bookings;
CREATE TRIGGER trg_sync_booking_time
BEFORE INSERT OR UPDATE OF booking_time_start, booking_time ON public.consultation_bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_time_text();

-- Guard Trainer Profile Updates (Prevent self-escalation or status tampering)
CREATE OR REPLACE FUNCTION public.guard_trainer_profile_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.id != OLD.id THEN
        RAISE EXCEPTION 'Profile ID cannot be modified' USING ERRCODE = 'restrict_violation';
    END IF;

    -- Only service_role / admin can modify is_active or email directly
    IF (NEW.is_active != OLD.is_active OR NEW.email != OLD.email) AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Modifying is_active or email requires administrative access' 
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trainer_profile_update ON public.trainer_profiles;
CREATE TRIGGER trg_guard_trainer_profile_update
BEFORE UPDATE ON public.trainer_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_trainer_profile_update();

-- Deterministic Active Trainer Resolver
CREATE OR REPLACE FUNCTION public.get_primary_trainer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.trainer_profiles WHERE is_active = true LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_primary_trainer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_primary_trainer_id() TO anon, authenticated;

-- Strict Time Parser (Handles 12-hour AM/PM and 24-hour formats cleanly)
CREATE OR REPLACE FUNCTION public.parse_and_validate_time(p_time TEXT)
RETURNS TIME
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    v_clean := upper(trim(COALESCE(p_time, '')));
    
    IF v_clean ~ '^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$' THEN
        RETURN TO_TIMESTAMP(v_clean, 'HH12:MI AM')::TIME;
    ELSIF v_clean ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
        RETURN TO_TIMESTAMP(v_clean, 'HH24:MI')::TIME;
    ELSE
        RETURN NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Validate whether a requested slot matches step cadence and fits range
CREATE OR REPLACE FUNCTION public.is_slot_in_ranges(
    p_slot_time TIME,
    p_duration_minutes INTEGER,
    p_step_minutes INTEGER,
    p_ranges JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_range TEXT;
    v_parts TEXT[];
    v_r_start TIME;
    v_r_end TIME;
    v_step_interval INTERVAL;
    v_curr TIME;
BEGIN
    IF p_slot_time IS NULL OR p_ranges IS NULL OR jsonb_typeof(p_ranges) != 'array' THEN
        RETURN FALSE;
    END IF;

    v_step_interval := (GREATEST(15, p_step_minutes) || ' minutes')::INTERVAL;

    FOR v_range IN SELECT jsonb_array_elements_text(p_ranges) LOOP
        v_parts := string_to_array(v_range, '-');
        IF array_length(v_parts, 1) = 2 THEN
            v_r_start := public.parse_and_validate_time(trim(v_parts[1]));
            v_r_end := public.parse_and_validate_time(trim(v_parts[2]));

            IF v_r_start IS NOT NULL AND v_r_end IS NOT NULL AND v_r_start < v_r_end THEN
                v_curr := v_r_start;
                WHILE (v_curr + (p_duration_minutes || ' minutes')::INTERVAL) <= v_r_end LOOP
                    IF v_curr = p_slot_time THEN
                        RETURN TRUE;
                    END IF;
                    v_curr := (v_curr + v_step_interval)::TIME;
                    IF v_curr <= v_r_start THEN
                        EXIT; -- Prevent overflow
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$;

-- Centralized Daily Capacity Enforcer Trigger
CREATE OR REPLACE FUNCTION public.enforce_daily_capacity_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_max_per_day INT := 6;
    v_active_count INT;
BEGIN
    -- Immutability check: Trainer ID cannot be changed once a booking is created
    IF TG_OP = 'UPDATE' AND OLD.trainer_id != NEW.trainer_id THEN
        RAISE EXCEPTION 'trainer_id cannot be modified once a booking is created'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- Evaluate only for active bookings
    IF NEW.status IN ('Pending', 'Confirmed') THEN
        -- Acquire Transaction-Level Advisory Lock on (trainer_id, booking_date)
        PERFORM pg_advisory_xact_lock(hashtext(NEW.trainer_id::text), hashtext(NEW.booking_date::text));

        -- Fetch daily limit
        SELECT max_bookings_per_day INTO v_max_per_day
        FROM public.trainer_settings
        WHERE trainer_id = NEW.trainer_id;
        v_max_per_day := COALESCE(v_max_per_day, 6);

        -- Count active bookings excluding current row if update
        SELECT count(*) INTO v_active_count
        FROM public.consultation_bookings
        WHERE trainer_id = NEW.trainer_id
          AND booking_date = NEW.booking_date
          AND status IN ('Pending', 'Confirmed')
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_active_count >= v_max_per_day THEN
            RAISE EXCEPTION 'Daily consultation capacity reached for date %', NEW.booking_date
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_capacity ON public.consultation_bookings;
CREATE TRIGGER trg_enforce_daily_capacity
BEFORE INSERT OR UPDATE OF booking_date, status, trainer_id ON public.consultation_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_capacity_check();

-- =============================================================================
-- 5. PUBLIC VIEW & PROFILE RPC
-- =============================================================================

-- Secure View exposing strictly non-sensitive fields
CREATE OR REPLACE VIEW public.public_trainer_profiles
WITH (security_barrier = true) AS
SELECT 
    id,
    full_name,
    title,
    business_name,
    bio,
    avatar_url
FROM public.trainer_profiles
WHERE is_active = true;

GRANT SELECT ON public.public_trainer_profiles TO anon, authenticated;

-- Public Profile RPC Function
CREATE OR REPLACE FUNCTION public.get_public_trainer_profile()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    title TEXT,
    business_name TEXT,
    bio TEXT,
    avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        p.id,
        p.full_name,
        p.title,
        p.business_name,
        p.bio,
        p.avatar_url
    FROM public.trainer_profiles p
    WHERE p.is_active = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_trainer_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_trainer_profile() TO anon, authenticated;

-- =============================================================================
-- 6. PUBLIC BOOKING & SLOT RETRIEVAL RPCs
-- =============================================================================

-- RPC 1: Retrieve Booked Slots for a Date (Zero Exposure of Client Info)
CREATE OR REPLACE FUNCTION public.get_public_booked_slots(p_date DATE)
RETURNS TABLE (booked_time TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_trainer_id UUID;
BEGIN
    v_trainer_id := public.get_primary_trainer_id();
    IF v_trainer_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT cb.booking_time
    FROM public.consultation_bookings cb
    WHERE cb.trainer_id = v_trainer_id
      AND cb.booking_date = p_date
      AND cb.status IN ('Pending', 'Confirmed');
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_booked_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(DATE) TO anon, authenticated;

-- RPC 2: Dynamic Available Slot Generator (Matches Frontend Behavior Exactly)
CREATE OR REPLACE FUNCTION public.get_public_available_slots(p_date DATE)
RETURNS TABLE (slot_time TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_trainer_id UUID;
    v_today_ist DATE;
    v_now_time_ist TIME;
    v_duration INT := 45;
    v_step INT := 60;
    v_max_per_day INT := 6;
    v_active_count INT;
    v_override RECORD;
    v_avail RECORD;
    v_dow SMALLINT;
    v_override_exists BOOLEAN := FALSE;
    v_ranges JSONB;
    v_range TEXT;
    v_parts TEXT[];
    v_r_start TIME;
    v_r_end TIME;
    v_curr TIME;
    v_step_interval INTERVAL;
BEGIN
    v_today_ist := ((now() AT TIME ZONE 'Asia/Kolkata')::date);
    v_now_time_ist := ((now() AT TIME ZONE 'Asia/Kolkata')::time);

    IF p_date < v_today_ist THEN
        RETURN;
    END IF;

    v_trainer_id := public.get_primary_trainer_id();
    IF v_trainer_id IS NULL THEN
        RETURN;
    END IF;

    -- Fetch parameters
    SELECT 
        COALESCE(default_duration_minutes, 45),
        COALESCE(slot_interval_minutes, 60),
        COALESCE(max_bookings_per_day, 6)
    INTO v_duration, v_step, v_max_per_day
    FROM public.trainer_settings 
    WHERE trainer_id = v_trainer_id;

    -- Check capacity
    SELECT count(*) INTO v_active_count
    FROM public.consultation_bookings
    WHERE trainer_id = v_trainer_id
      AND booking_date = p_date
      AND status IN ('Pending', 'Confirmed');

    IF v_active_count >= v_max_per_day THEN
        RETURN;
    END IF;

    -- Check overrides
    SELECT * INTO v_override
    FROM public.availability_overrides
    WHERE trainer_id = v_trainer_id AND override_date = p_date;

    v_override_exists := (v_override.id IS NOT NULL);

    IF v_override_exists THEN
        IF v_override.is_available = FALSE THEN
            RETURN;
        END IF;
        IF v_override.custom_slots IS NOT NULL AND jsonb_array_length(v_override.custom_slots) > 0 THEN
            v_ranges := v_override.custom_slots;
        END IF;
    END IF;

    -- Fall back to weekly schedule
    IF v_ranges IS NULL THEN
        v_dow := EXTRACT(DOW FROM p_date)::SMALLINT;
        SELECT * INTO v_avail
        FROM public.trainer_availability
        WHERE trainer_id = v_trainer_id AND day_of_week = v_dow;

        IF v_avail.id IS NULL OR (v_avail.is_enabled = FALSE AND NOT v_override_exists) THEN
            RETURN;
        END IF;
        v_ranges := v_avail.time_ranges;
    END IF;

    IF v_ranges IS NULL OR jsonb_array_length(v_ranges) = 0 THEN
        RETURN;
    END IF;

    v_step_interval := (GREATEST(15, v_step) || ' minutes')::INTERVAL;

    -- Iterate ranges and return unbooked slots
    FOR v_range IN SELECT jsonb_array_elements_text(v_ranges) LOOP
        v_parts := string_to_array(v_range, '-');
        IF array_length(v_parts, 1) = 2 THEN
            v_r_start := public.parse_and_validate_time(trim(v_parts[1]));
            v_r_end := public.parse_and_validate_time(trim(v_parts[2]));

            IF v_r_start IS NOT NULL AND v_r_end IS NOT NULL AND v_r_start < v_r_end THEN
                v_curr := v_r_start;
                WHILE (v_curr + (v_duration || ' minutes')::INTERVAL) <= v_r_end LOOP
                    -- If booking is for today, skip past times
                    IF p_date > v_today_ist OR (p_date = v_today_ist AND v_curr > v_now_time_ist) THEN
                        -- Ensure slot is not already booked
                        IF NOT EXISTS (
                            SELECT 1 FROM public.consultation_bookings
                            WHERE trainer_id = v_trainer_id
                              AND booking_date = p_date
                              AND booking_time_start = v_curr
                              AND status IN ('Pending', 'Confirmed')
                        ) THEN
                            slot_time := to_char(v_curr, 'HH12:MI AM');
                            RETURN NEXT;
                        END IF;
                    END IF;
                    v_curr := (v_curr + v_step_interval)::TIME;
                    IF v_curr <= v_r_start THEN
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_available_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_available_slots(DATE) TO anon, authenticated;

-- RPC 3: Submit Consultation Booking (Validated & Atomic)
CREATE OR REPLACE FUNCTION public.submit_consultation_booking(
    p_client_name TEXT,
    p_client_email TEXT,
    p_client_phone TEXT,
    p_primary_goal TEXT,
    p_experience_level TEXT,
    p_booking_date DATE,
    p_booking_time TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_trainer_id UUID;
    v_new_booking_id UUID;
    v_booking_code TEXT;
    v_slot_time TIME;
    v_today_ist DATE;
    v_now_time_ist TIME;
    v_duration INT := 45;
    v_step INT := 60;
    v_override RECORD;
    v_avail RECORD;
    v_dow SMALLINT;
    v_override_exists BOOLEAN := FALSE;
    v_is_slot_valid BOOLEAN := FALSE;
BEGIN
    -- 1. Date Check in Asia/Kolkata
    v_today_ist := ((now() AT TIME ZONE 'Asia/Kolkata')::date);
    IF p_booking_date < v_today_ist THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation date cannot be in the past.');
    END IF;

    -- 2. Validate Client Data Bounds
    IF trim(COALESCE(p_client_name, '')) = '' OR length(trim(p_client_name)) < 2 OR length(trim(p_client_name)) > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Full name must be between 2 and 100 characters.');
    END IF;

    IF trim(COALESCE(p_client_email, '')) = '' OR p_client_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR length(p_client_email) > 255 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a valid email format.');
    END IF;

    IF trim(COALESCE(p_client_phone, '')) = '' OR length(regexp_replace(p_client_phone, '\D', '', 'g')) < 7 OR length(p_client_phone) > 30 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a valid phone number with 7 to 15 digits.');
    END IF;

    IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Notes cannot exceed 1000 characters.');
    END IF;

    -- 3. Parse and Validate Slot Time Format
    v_slot_time := public.parse_and_validate_time(p_booking_time);
    IF v_slot_time IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid consultation time format. Use HH:MM AM/PM.');
    END IF;

    -- Intraday past-time check: If booking for today, time must be in future
    IF p_booking_date = v_today_ist THEN
        v_now_time_ist := ((now() AT TIME ZONE 'Asia/Kolkata')::time);
        IF v_slot_time <= v_now_time_ist THEN
            RETURN jsonb_build_object('success', false, 'error', 'Consultation time cannot be in the past.');
        END IF;
    END IF;

    -- 4. Securely Resolve Single Active Trainer
    v_trainer_id := public.get_primary_trainer_id();
    IF v_trainer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trainer profile is currently unavailable.');
    END IF;

    -- 5. Load Trainer Parameters with Null Safety
    SELECT 
        COALESCE(default_duration_minutes, 45),
        COALESCE(slot_interval_minutes, 60)
    INTO v_duration, v_step
    FROM public.trainer_settings 
    WHERE trainer_id = v_trainer_id;

    v_duration := COALESCE(v_duration, 45);
    v_step := COALESCE(v_step, 60);

    -- 6. Check Availability Overrides & Holidays
    SELECT * INTO v_override
    FROM public.availability_overrides
    WHERE trainer_id = v_trainer_id AND override_date = p_booking_date;

    v_override_exists := (v_override.id IS NOT NULL);

    IF v_override_exists THEN
        IF v_override.is_available = FALSE THEN
            RETURN jsonb_build_object('success', false, 'error', 'The trainer is unavailable on this date.');
        END IF;

        IF v_override.custom_slots IS NOT NULL AND jsonb_array_length(v_override.custom_slots) > 0 THEN
            v_is_slot_valid := public.is_slot_in_ranges(v_slot_time, v_duration, v_step, v_override.custom_slots);
        END IF;
    END IF;

    -- 7. Check Weekly Schedule if not resolved by custom override slots
    IF NOT v_is_slot_valid AND (NOT v_override_exists OR v_override.custom_slots IS NULL OR jsonb_array_length(v_override.custom_slots) = 0) THEN
        v_dow := EXTRACT(DOW FROM p_booking_date)::SMALLINT;

        SELECT * INTO v_avail
        FROM public.trainer_availability
        WHERE trainer_id = v_trainer_id AND day_of_week = v_dow;

        IF v_avail.id IS NULL OR (v_avail.is_enabled = FALSE AND NOT v_override_exists) THEN
            RETURN jsonb_build_object('success', false, 'error', 'The coach does not accept consultations on this day.');
        END IF;

        v_is_slot_valid := public.is_slot_in_ranges(v_slot_time, v_duration, v_step, v_avail.time_ranges);
    END IF;

    IF v_is_slot_valid = FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'The requested time slot (' || to_char(v_slot_time, 'HH12:MI AM') || ') is not an available opening.');
    END IF;

    -- 8. Atomic Insert (Protected by Unique Index & Centralized Capacity Trigger)
    BEGIN
        INSERT INTO public.consultation_bookings (
            trainer_id,
            client_name,
            client_email,
            client_phone,
            primary_goal,
            experience_level,
            booking_date,
            booking_time_start,
            booking_time,
            status,
            notes,
            modality
        ) VALUES (
            v_trainer_id,
            trim(p_client_name),
            trim(p_client_email),
            trim(p_client_phone),
            p_primary_goal,
            p_experience_level,
            p_booking_date,
            v_slot_time,
            to_char(v_slot_time, 'HH12:MI AM'),
            'Pending',
            trim(p_notes),
            '100% Remote Video Call (Google Meet / Zoom)'
        )
        RETURNING id, booking_code INTO v_new_booking_id, v_booking_code;

    EXCEPTION 
        WHEN unique_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'This exact time slot was just booked by another athlete. Please select an alternate time.');
        WHEN check_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Daily consultation capacity reached for this date. Please pick another date.');
    END;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_booking_id,
        'booking_code', v_booking_code,
        'date', p_booking_date,
        'time', to_char(v_slot_time, 'HH12:MI AM'),
        'status', 'Pending'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_consultation_booking(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_consultation_booking(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO anon, authenticated;

-- =============================================================================
-- 7. AUTOMATED WORKFLOW TRIGGERS
-- =============================================================================

-- Workflow 1: Auto-generate Lead, Notification, Activity Log upon Booking Creation
CREATE OR REPLACE FUNCTION public.handle_new_booking_event()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.leads (
        trainer_id,
        booking_id,
        full_name,
        email,
        phone,
        goal,
        experience,
        status,
        notes,
        enquiry_date
    ) VALUES (
        NEW.trainer_id,
        NEW.id,
        NEW.client_name,
        NEW.client_email,
        NEW.client_phone,
        NEW.primary_goal,
        NEW.experience_level,
        'New',
        COALESCE('Website booking intake. Obstacle: ' || NULLIF(NEW.notes, ''), 'Website intake submission.'),
        NEW.booking_date
    );

    INSERT INTO public.notifications (
        trainer_id,
        type,
        title,
        message,
        related_booking_id
    ) VALUES (
        NEW.trainer_id,
        'new_booking',
        'New Consultation Request',
        NEW.client_name || ' requested a call for ' || to_char(NEW.booking_date, 'Mon DD, YYYY') || ' at ' || NEW.booking_time || '.',
        NEW.id
    );

    INSERT INTO public.activity_logs (
        trainer_id,
        title,
        detail,
        type
    ) VALUES (
        NEW.trainer_id,
        'New Consultation Request',
        NEW.client_name || ' (' || NEW.booking_code || ') requested strategy call for ' || NEW.booking_date || ' at ' || NEW.booking_time,
        'new'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_booking_created ON public.consultation_bookings;
CREATE TRIGGER trg_on_booking_created
AFTER INSERT ON public.consultation_bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_event();

-- Workflow 2: Auto-Log Booking Status Changes (Confirmed, Rejected, Cancelled)
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.activity_logs (
            trainer_id,
            title,
            detail,
            type
        ) VALUES (
            NEW.trainer_id,
            'Booking ' || NEW.status,
            NEW.client_name || ' (' || NEW.booking_code || ') marked as ' || NEW.status,
            lower(NEW.status)
        );

        INSERT INTO public.notifications (
            trainer_id,
            type,
            title,
            message,
            related_booking_id
        ) VALUES (
            NEW.trainer_id,
            CASE WHEN NEW.status = 'Confirmed' THEN 'confirmed'
                 WHEN NEW.status = 'Rejected' THEN 'cancelled'
                 ELSE 'cancelled' END,
            'Booking ' || NEW.status,
            'Consultation with ' || NEW.client_name || ' on ' || to_char(NEW.booking_date, 'Mon DD, YYYY') || ' at ' || NEW.booking_time || ' is now ' || NEW.status || '.',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_booking_status_updated ON public.consultation_bookings;
CREATE TRIGGER trg_on_booking_status_updated
AFTER UPDATE OF status ON public.consultation_bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();

-- =============================================================================
-- 8. ADMIN-CONTROLLED TRAINER PROVISIONING
-- =============================================================================

-- Explicit administrative procedure to provision the single authorized coach
CREATE OR REPLACE FUNCTION public.admin_provision_trainer(
    p_auth_user_id UUID,
    p_full_name TEXT DEFAULT 'Coach Haisam',
    p_email TEXT DEFAULT 'coach.haisam@forgefitness.com',
    p_phone TEXT DEFAULT '+91 98765 43210'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Initialize Profile
    INSERT INTO public.trainer_profiles (id, full_name, title, email, phone, is_active)
    VALUES (
        p_auth_user_id, 
        p_full_name, 
        'Head Strength Coach & Biomechanics Specialist', 
        p_email, 
        p_phone, 
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_active = true,
        updated_at = now();

    -- 2. Initialize Settings
    INSERT INTO public.trainer_settings (trainer_id)
    VALUES (p_auth_user_id)
    ON CONFLICT (trainer_id) DO NOTHING;

    -- 3. Initialize Standard Monday-Friday Schedule
    INSERT INTO public.trainer_availability (trainer_id, day_of_week, is_enabled, time_ranges) VALUES
        (p_auth_user_id, 0, false, '[]'::jsonb),
        (p_auth_user_id, 1, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
        (p_auth_user_id, 2, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
        (p_auth_user_id, 3, true,  '["09:00 - 12:00", "14:00 - 17:00"]'::jsonb),
        (p_auth_user_id, 4, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
        (p_auth_user_id, 5, true,  '["09:00 - 13:00"]'::jsonb),
        (p_auth_user_id, 6, false, '["10:00 - 13:00"]'::jsonb)
    ON CONFLICT (trainer_id, day_of_week) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_trainer(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_provision_trainer(UUID, TEXT, TEXT, TEXT) TO service_role;

-- =============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES & PRIVILEGES
-- =============================================================================

-- Revoke all direct privileges on base tables from public roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Enable RLS on all tables
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 9.1 trainer_profiles
-- -----------------------------------------------------------------------------
-- Restrict trainer profile updates to safe marketing columns only
GRANT SELECT ON public.trainer_profiles TO authenticated;
GRANT UPDATE (full_name, title, business_name, bio, avatar_url, phone) ON public.trainer_profiles TO authenticated;

DROP POLICY IF EXISTS "Trainer can view own profile" ON public.trainer_profiles;
CREATE POLICY "Trainer can view own profile" 
ON public.trainer_profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Trainer can update own profile" ON public.trainer_profiles;
CREATE POLICY "Trainer can update own profile" 
ON public.trainer_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 9.2 trainer_availability
-- -----------------------------------------------------------------------------
-- Private to authenticated trainer only (Zero direct anonymous access)
GRANT ALL ON public.trainer_availability TO authenticated;

DROP POLICY IF EXISTS "Trainer can manage availability schedule" ON public.trainer_availability;
CREATE POLICY "Trainer can manage availability schedule" 
ON public.trainer_availability FOR ALL 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.3 availability_overrides
-- -----------------------------------------------------------------------------
-- Private to authenticated trainer only (Zero direct anonymous access)
GRANT ALL ON public.availability_overrides TO authenticated;

DROP POLICY IF EXISTS "Trainer can manage overrides" ON public.availability_overrides;
CREATE POLICY "Trainer can manage overrides" 
ON public.availability_overrides FOR ALL 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.4 trainer_settings
-- -----------------------------------------------------------------------------
GRANT SELECT, UPDATE ON public.trainer_settings TO authenticated;

DROP POLICY IF EXISTS "Trainer can view own settings" ON public.trainer_settings;
CREATE POLICY "Trainer can view own settings" 
ON public.trainer_settings FOR SELECT 
TO authenticated 
USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can update own settings" ON public.trainer_settings;
CREATE POLICY "Trainer can update own settings" 
ON public.trainer_settings FOR UPDATE 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.5 consultation_bookings
-- -----------------------------------------------------------------------------
GRANT SELECT, UPDATE, DELETE ON public.consultation_bookings TO authenticated;

DROP POLICY IF EXISTS "Trainer can view own bookings" ON public.consultation_bookings;
CREATE POLICY "Trainer can view own bookings" 
ON public.consultation_bookings FOR SELECT 
TO authenticated 
USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can update own bookings" ON public.consultation_bookings;
CREATE POLICY "Trainer can update own bookings" 
ON public.consultation_bookings FOR UPDATE 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can delete own bookings" ON public.consultation_bookings;
CREATE POLICY "Trainer can delete own bookings" 
ON public.consultation_bookings FOR DELETE 
TO authenticated 
USING (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.6 leads
-- -----------------------------------------------------------------------------
GRANT ALL ON public.leads TO authenticated;

DROP POLICY IF EXISTS "Trainer can manage own leads" ON public.leads;
CREATE POLICY "Trainer can manage own leads" 
ON public.leads FOR ALL 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.7 notifications
-- -----------------------------------------------------------------------------
GRANT ALL ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "Trainer can manage own notifications" ON public.notifications;
CREATE POLICY "Trainer can manage own notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- -----------------------------------------------------------------------------
-- 9.8 activity_logs (Append-Only Audit Trail)
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "Trainer can view own activity logs" ON public.activity_logs;
CREATE POLICY "Trainer can view own activity logs" 
ON public.activity_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = trainer_id);