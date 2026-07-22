-- Persist client dashboard tour completion on the profile (once per account).
alter table profiles add column if not exists "manualSeen" boolean default false;
