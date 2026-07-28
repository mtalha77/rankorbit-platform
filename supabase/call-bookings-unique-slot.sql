-- Prefer supabase/call-bookings-harden.sql (cancelReason + kind + unique slot, correct order).
-- This file kept for reference; harden.sql is the one to run on existing projects.

alter table call_bookings add column if not exists "cancelReason" text;

with ranked as (
  select
    id,
    row_number() over (
      partition by "agentId", "slotDate", "slotTime"
      order by "createdAt" asc nulls last, id asc
    ) as rn
  from call_bookings
  where status in ('pending', 'confirmed')
    and "agentId" is not null
)
update call_bookings b
set
  status = 'cancelled',
  "cancelReason" = coalesce(b."cancelReason", 'Duplicate slot cleaned for unique index')
from ranked r
where b.id = r.id
  and r.rn > 1
  and b.status in ('pending', 'confirmed');

create unique index if not exists call_bookings_agent_slot_active_uidx
  on call_bookings ("agentId", "slotDate", "slotTime")
  where status in ('pending', 'confirmed')
    and "agentId" is not null;
