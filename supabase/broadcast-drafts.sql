-- Broadcast drafts (admin Broadcast section). Content + channel flags only — no recipients.
create table if not exists broadcast_drafts (
  id text primary key,
  name text,
  title text not null default '',
  body text not null default '',
  "sendEmail" boolean not null default true,
  "sendInApp" boolean not null default true,
  "createdBy" uuid not null references profiles(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists broadcast_drafts_created_by on broadcast_drafts ("createdBy", "updatedAt" desc);

alter table broadcast_drafts enable row level security;

-- Writes go through service role API; staff can read own drafts if needed from client later.
drop policy if exists bd_own_select on broadcast_drafts;
create policy bd_own_select on broadcast_drafts for select using (
  auth.uid() = "createdBy" or is_staff()
);

grant select on table broadcast_drafts to authenticated;
grant all on table broadcast_drafts to service_role;
