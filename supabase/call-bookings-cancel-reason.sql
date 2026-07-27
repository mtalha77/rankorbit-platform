-- Cancel reason required on meeting cancel (client or staff). Safe to re-run.
alter table call_bookings add column if not exists "cancelReason" text;
