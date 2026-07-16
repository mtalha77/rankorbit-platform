-- Google Business Profile OAuth connections (run once in Supabase SQL editor).
-- Tokens are written/read only via service role from Vercel APIs — never from the browser.

create table if not exists google_connections (
  "clientId" uuid primary key references profiles(id) on delete cascade,
  "refreshToken" text,
  "accessToken" text,
  "accessExpiresAt" timestamptz,
  "accountName" text,
  "locationName" text,
  "locationTitle" text,
  "syncedAt" timestamptz,
  status text not null default 'pending',
  "lastError" text,
  "connectedBy" uuid references profiles(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists google_connections_status on google_connections (status);
create index if not exists google_connections_synced on google_connections ("syncedAt" desc nulls last);

alter table google_connections enable row level security;

-- Staff may see connection status (no token columns exposed via a view would be ideal;
-- for now: no SELECT policy for authenticated — only service_role).
drop policy if exists gc_staff_select_meta on google_connections;
-- Intentionally no authenticated policies: browser never reads this table directly.

grant all on table google_connections to service_role;

-- Optional display columns on profiles (Integrations modal already uses gaId/gbpId).
alter table profiles add column if not exists "gaId" text;
alter table profiles add column if not exists "gbpId" text;
