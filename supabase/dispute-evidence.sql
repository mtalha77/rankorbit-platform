-- Dispute / chargeback evidence tables (safe to re-run).
-- Consent acceptance + IP/device/login/usage access events.

create table if not exists consent_records (
  id text primary key,
  "userId" uuid references profiles(id) on delete set null,
  email text not null,
  "acceptedAt" timestamptz not null default now(),
  ip text,
  "userAgent" text,
  "tosVersion" text not null,
  "privacyVersion" text not null,
  source text not null,
  "checkboxConfirmed" boolean not null default true,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists consent_records_user on consent_records ("userId", "acceptedAt" desc);
create index if not exists consent_records_email on consent_records (email, "acceptedAt" desc);

alter table consent_records enable row level security;

drop policy if exists consent_staff_read on consent_records;
create policy consent_staff_read on consent_records for select using (is_staff());

drop policy if exists consent_self_read on consent_records;
create policy consent_self_read on consent_records for select using (auth.uid() = "userId");

grant select on table consent_records to authenticated;
grant all on table consent_records to service_role;

create table if not exists access_events (
  id text primary key,
  "userId" uuid references profiles(id) on delete set null,
  email text,
  "eventType" text not null,
  feature text,
  ip text,
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists access_events_user on access_events ("userId", "createdAt" desc);
create index if not exists access_events_email on access_events (email, "createdAt" desc);
create index if not exists access_events_type on access_events ("eventType", "createdAt" desc);

alter table access_events enable row level security;

drop policy if exists access_staff_read on access_events;
create policy access_staff_read on access_events for select using (is_staff());

drop policy if exists access_self_read on access_events;
create policy access_self_read on access_events for select using (auth.uid() = "userId");

grant select on table access_events to authenticated;
grant all on table access_events to service_role;
