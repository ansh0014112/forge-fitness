-- =============================================================================
-- FORGE FITNESS — COMPLETE TRAINER ACCOUNT & AVAILABILITY PROVISIONING SCRIPT
-- Execute this script once in your Supabase Dashboard -> SQL Editor
-- It creates the coach account in Supabase Auth and provisions their profile,
-- settings, and weekly booking availability.
-- =============================================================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_trainer_id UUID;
    v_email TEXT := 'coach.haisam@forgefitness.com';
    v_password TEXT := 'ForgeCoach2026!';
    v_full_name TEXT := 'Coach Haisam';
    v_phone TEXT := '+91 98765 43210';
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. Ensure Coach Account Exists in auth.users
    -- -------------------------------------------------------------------------
    SELECT id INTO v_trainer_id FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_trainer_id IS NULL THEN
        v_trainer_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_trainer_id,
            'authenticated',
            'authenticated',
            v_email,
            crypt(v_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_full_name, 'phone', v_phone, 'role', 'trainer'),
            now(),
            now(),
            '',
            ''
        );

        -- Also create identity record in auth.identities if table exists
        BEGIN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_trainer_id,
                format('{"sub":"%s","email":"%s"}', v_trainer_id, v_email)::jsonb,
                'email',
                now(),
                now(),
                now()
            );
        EXCEPTION WHEN OTHERS THEN
            -- In case identities table schema varies by Supabase version
            NULL;
        END;

        RAISE NOTICE 'Created new coach account in auth.users with email % and ID %', v_email, v_trainer_id;
    ELSE
        RAISE NOTICE 'Coach account already exists in auth.users with ID %', v_trainer_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Provision Trainer Profile in public.trainer_profiles
    -- -------------------------------------------------------------------------
    INSERT INTO public.trainer_profiles (
        id,
        full_name,
        title,
        email,
        phone,
        business_name,
        bio,
        avatar_url,
        is_active
    ) VALUES (
        v_trainer_id,
        v_full_name,
        'Head Strength Coach & Biomechanics Specialist',
        v_email,
        v_phone,
        'FORGE FITNESS Elite Coaching',
        'Elite strength coach specializing in hypertrophy, biomechanics, and sustainable athletic conditioning.',
        'assets/images/coach-haisam.jpg',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_active = true,
        updated_at = now();

    -- -------------------------------------------------------------------------
    -- 3. Provision Settings in public.trainer_settings
    -- -------------------------------------------------------------------------
    INSERT INTO public.trainer_settings (
        trainer_id,
        timezone,
        default_duration_minutes,
        buffer_minutes,
        slot_interval_minutes,
        max_bookings_per_day
    ) VALUES (
        v_trainer_id,
        'Asia/Kolkata',
        45,
        15,
        60,
        6
    )
    ON CONFLICT (trainer_id) DO UPDATE SET
        timezone = EXCLUDED.timezone,
        default_duration_minutes = EXCLUDED.default_duration_minutes,
        buffer_minutes = EXCLUDED.buffer_minutes,
        slot_interval_minutes = EXCLUDED.slot_interval_minutes,
        max_bookings_per_day = EXCLUDED.max_bookings_per_day,
        updated_at = now();

    -- -------------------------------------------------------------------------
    -- 4. Provision Weekly Recurring Schedule (Monday to Friday Active)
    -- -------------------------------------------------------------------------
    INSERT INTO public.trainer_availability (trainer_id, day_of_week, is_enabled, time_ranges) VALUES
        (v_trainer_id, 0, false, '[]'::jsonb),                                    -- 0 = Sunday (Closed)
        (v_trainer_id, 1, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),   -- 1 = Monday
        (v_trainer_id, 2, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),   -- 2 = Tuesday
        (v_trainer_id, 3, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),   -- 3 = Wednesday
        (v_trainer_id, 4, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),   -- 4 = Thursday
        (v_trainer_id, 5, true,  '["09:00 - 13:00"]'::jsonb),                     -- 5 = Friday
        (v_trainer_id, 6, false, '["10:00 - 13:00"]'::jsonb)                     -- 6 = Saturday (Closed)
    ON CONFLICT (trainer_id, day_of_week) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        time_ranges = EXCLUDED.time_ranges,
        updated_at = now();

    RAISE NOTICE 'SUCCESS: Coach Haisam profile, settings, and availability schedule are fully provisioned!';
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Auto-Provisioning Trigger for Future Coach Signups
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_trainer_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only provision if no active trainer exists yet
    IF NOT EXISTS (SELECT 1 FROM public.trainer_profiles WHERE is_active = true) THEN
        INSERT INTO public.trainer_profiles (
            id, full_name, title, email, phone, is_active
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Coach Haisam'),
            'Head Strength Coach & Biomechanics Specialist',
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', '+91 98765 43210'),
            true
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.trainer_settings (trainer_id)
        VALUES (NEW.id)
        ON CONFLICT (trainer_id) DO NOTHING;

        INSERT INTO public.trainer_availability (trainer_id, day_of_week, is_enabled, time_ranges) VALUES
            (NEW.id, 0, false, '[]'::jsonb),
            (NEW.id, 1, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
            (NEW.id, 2, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
            (NEW.id, 3, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
            (NEW.id, 4, true,  '["09:00 - 12:00", "14:00 - 18:00"]'::jsonb),
            (NEW.id, 5, true,  '["09:00 - 13:00"]'::jsonb),
            (NEW.id, 6, false, '["10:00 - 13:00"]'::jsonb)
        ON CONFLICT (trainer_id, day_of_week) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_trainer_signup();
