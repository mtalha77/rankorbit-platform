-- Staff DMs — equal access for super_admin, manager, and agent.
-- Requires profiles table. Run once in Supabase SQL editor.
-- Every pair uses staffId=min(a,b) + peerId=max(a,b) so both sides share one thread.

create or replace function is_super_admin() returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer;

create table if not exists staff_messages (
  id text primary key,
  "staffId" uuid not null references profiles(id) on delete cascade,
  "senderId" uuid not null references profiles(id) on delete cascade,
  body text not null,
  "createdAt" timestamptz not null default now(),
  "readAt" timestamptz,
  "peerId" uuid references profiles(id) on delete cascade
);

-- Safe if table already existed without peerId
alter table staff_messages add column if not exists "peerId" uuid references profiles(id) on delete cascade;

create index if not exists staff_messages_staff_created on staff_messages ("staffId", "createdAt" asc);
create index if not exists staff_messages_unread on staff_messages ("staffId") where "readAt" is null;
create index if not exists staff_messages_pair on staff_messages ("staffId", "peerId", "createdAt" asc);

alter table staff_messages enable row level security;

-- Thread participant (staffId or peerId), or any super admin, can read.
drop policy if exists sm_select on staff_messages;
create policy sm_select on staff_messages for select using (
  "staffId" = auth.uid()
  or "peerId" = auth.uid()
  or is_super_admin()
);

drop policy if exists sm_insert on staff_messages;
create policy sm_insert on staff_messages for insert with check (
  "senderId" = auth.uid()
  and (
    "staffId" = auth.uid()
    or "peerId" = auth.uid()
    or is_super_admin()
  )
);

drop policy if exists sm_update on staff_messages;
create policy sm_update on staff_messages for update using (
  "staffId" = auth.uid()
  or "peerId" = auth.uid()
  or is_super_admin()
);

grant select, insert, update on table staff_messages to authenticated;
grant all on table staff_messages to service_role;

-- Realtime for live chat bubbles
do $$
begin
  alter publication supabase_realtime add table staff_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
