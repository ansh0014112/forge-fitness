-- =============================================================================
-- FORGE FITNESS — Email Audit Column Migration
-- Run this in Supabase Dashboard → SQL Editor AFTER deploying the Edge Function.
-- This is OPTIONAL — bookings work correctly without this column.
-- It simply records when a confirmation email was sent for audit purposes.
-- =============================================================================

-- Add email_sent_at audit column to consultation_bookings (additive, safe to run multiple times)
ALTER TABLE public.consultation_bookings 
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.consultation_bookings.email_sent_at IS
  'Timestamp when the client confirmation email was successfully dispatched via Resend. NULL means no email sent yet.';
