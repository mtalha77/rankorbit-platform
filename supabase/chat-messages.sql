-- Client ↔ BDM realtime chat (run once in Supabase SQL editor).
-- Requires is_staff() from schema.sql and profiles table.

create table if not exists messages (
  id text primary key,
  "clientId" uuid not null references profiles(id) on delete cascade,
  "agentId" uuid not null references profiles(id) on delete cascade,
  "senderId" uuid not null references profiles(id) on delete cascade,
  body text not null,
  "createdAt" timestamptz not null default now(),
  "readAt" timestamptz
);

create index if not exists messages_client_created on messages ("clientId", "createdAt" asc);
create index if not exists messages_agent_created on messages ("agentId", "createdAt" desc);
create index if not exists messages_unread_for_client on messages ("clientId") where "readAt" is null;
create index if not exists messages_unread_for_agent on messages ("agentId") where "readAt" is null;

alter table messages enable row level security;

-- Client: own thread
drop policy if exists msg_client_select on messages;
create policy msg_client_select on messages for select using (
  "clientId" = auth.uid()
  or "agentId" = auth.uid()
  or is_staff()
);

drop policy if exists msg_client_insert on messages;
create policy msg_client_insert on messages for insert with check (
  "senderId" = auth.uid()
  and (
    ("clientId" = auth.uid())
    or ("agentId" = auth.uid())
    or is_staff()
  )
);

drop policy if exists msg_update_read on messages;
create policy msg_update_read on messages for update using (
  "clientId" = auth.uid()
  or "agentId" = auth.uid()
  or is_staff()
);

grant select, insert, update on table messages to authenticated;
grant all on table messages to service_role;

-- Realtime for live chat bubbles
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
