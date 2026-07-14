-- Run once in Supabase SQL Editor (existing projects).
-- Fixes agent "Add Listing" silently failing when these columns are missing.

alter table listings add column if not exists "actionNeeded" boolean default false;
alter table listings add column if not exists "actionNote" text default '';
alter table listings add column if not exists "deletedAt" timestamptz;
