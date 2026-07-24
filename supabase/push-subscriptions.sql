-- Browser Web Push (VAPID) subscriptions. Safe to re-run.
-- Inserts/updates/deletes use service role from /api/push-subscribe|unsubscribe.

create table if not exists push_subscriptions (
  id text primary key,
  "userId" uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions ("userId");

alter table push_subscriptions enable row level security;

-- Clients never read/write this table directly; APIs use service_role.
drop policy if exists push_sub_deny_all on push_subscriptions;
-- No authenticated policies → anon/authenticated blocked by RLS; service_role bypasses.

grant all on table push_subscriptions to service_role;
