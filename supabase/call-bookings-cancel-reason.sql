-- Cancel reason on meeting cancel. Safe to re-run.
-- Prefer supabase/call-bookings-harden.sql (includes this + unique slot index).
alter table call_bookings add column if not exists "cancelReason" text;
