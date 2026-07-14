-- Profile ops + audit trail (run once in Supabase SQL Editor).
-- Safe to re-run. Fixes assign / trash / agent perms / impersonation grants / NAP history / suspend / audit.

-- ── profiles: staff & ops columns ────────────────────────────────────────────
alter table profiles add column if not exists "assignedAgentId" uuid references profiles(id) on delete set null;
alter table profiles add column if not exists "canImpersonate" boolean default false;
alter table profiles add column if not exists perms jsonb default '{}'::jsonb;
alter table profiles add column if not exists "deletedAt" timestamptz;
alter table profiles add column if not exists "napHistory" jsonb default '[]'::jsonb;
alter table profiles add column if not exists "reportEmail" text;
alter table profiles add column if not exists "reportSentMonth" text;
alter table profiles add column if not exists "suspendedAt" timestamptz;
alter table profiles add column if not exists "suspendReason" text;
alter table profiles add column if not exists "suspendedBy" text;
alter table profiles add column if not exists "staffPassword" text;
alter table profiles add column if not exists "createdByRole" text;

create index if not exists profiles_assigned_agent on profiles ("assignedAgentId") where "assignedAgentId" is not null;
create index if not exists profiles_deleted_at on profiles ("deletedAt") where "deletedAt" is not null;

-- ── audit trail ──────────────────────────────────────────────────────────────
create table if not exists audit (
  id text primary key,
  "actorId" text,
  "actorName" text,
  "actorRole" text,
  action text not null,
  "targetType" text,
  "targetId" text,
  "targetName" text,
  detail text,
  "createdAt" timestamptz not null default now()
);

create index if not exists audit_created on audit ("createdAt" desc);
create index if not exists audit_action on audit (action);

alter table audit enable row level security;

drop policy if exists au_staff_read on audit;
create policy au_staff_read on audit for select using (is_staff());

drop policy if exists au_staff_write on audit;
create policy au_staff_write on audit for insert with check (is_staff());

grant select, insert on table audit to authenticated;
grant all on table audit to service_role;
