-- Staff/BDM in-app notifications + call bookings (run in Supabase SQL editor).
-- Safe to re-run. REQUIRED for Book a Call / BDM message notifications.

create table if not exists notifications (
  id text primary key,
  "userId" uuid not null references profiles(id) on delete cascade,
  "clientId" uuid references profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

-- In case an older partial table exists without these columns:
alter table notifications add column if not exists meta jsonb not null default '{}'::jsonb;
alter table notifications add column if not exists read boolean not null default false;
alter table notifications add column if not exists body text;
alter table notifications add column if not exists "clientId" uuid references profiles(id) on delete set null;
alter table notifications add column if not exists "createdAt" timestamptz not null default now();

create index if not exists notifications_user_created on notifications ("userId", "createdAt" desc);
create index if not exists notifications_user_unread on notifications ("userId") where read = false;

alter table notifications enable row level security;

drop policy if exists n_self_read on notifications;
create policy n_self_read on notifications for select using (auth.uid() = "userId" or is_staff());

drop policy if exists n_self_update on notifications;
create policy n_self_update on notifications for update using (auth.uid() = "userId" or is_staff());

-- Browser (agent JWT) must be able to read/update; inserts use service role from API.
grant select, update on table notifications to authenticated;
grant all on table notifications to service_role;

create table if not exists call_bookings (
  id text primary key,
  "clientId" uuid not null references profiles(id) on delete cascade,
  "agentId" uuid references profiles(id) on delete set null,
  "slotDate" text not null,
  "slotTime" text not null,
  note text,
  status text not null default 'pending',
  "meetingUrl" text,
  "createdAt" timestamptz not null default now()
);

alter table call_bookings add column if not exists "meetingUrl" text;
alter table call_bookings add column if not exists kind text not null default 'regular';

create index if not exists call_bookings_client on call_bookings ("clientId", "createdAt" desc);
create index if not exists call_bookings_agent on call_bookings ("agentId", "createdAt" desc);

alter table call_bookings enable row level security;

drop policy if exists cb_client_read on call_bookings;
create policy cb_client_read on call_bookings for select using (
  "clientId" = auth.uid() or "agentId" = auth.uid() or is_staff()
);

grant select on table call_bookings to authenticated;
grant all on table call_bookings to service_role;
