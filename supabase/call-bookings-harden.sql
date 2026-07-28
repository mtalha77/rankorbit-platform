-- Meeting bookings hardening — safe to re-run on existing projects.
-- 1) cancelReason column (always present for cancel emails / UI)
-- 2) kind column (regular | guidance)
-- 3) unique active slot per agent (no double-book)
--
-- Run this once in Supabase SQL editor after deploy.
-- Individual files (call-bookings-cancel-reason.sql, call-bookings-unique-slot.sql)
-- remain available; this combines them in the correct order.

-- ── Columns ──────────────────────────────────────────────────────────────────
alter table call_bookings add column if not exists "meetingUrl" text;
alter table call_bookings add column if not exists kind text not null default 'regular';
alter table call_bookings add column if not exists "cancelReason" text;

update call_bookings
set kind = 'regular'
where kind is null or kind not in ('regular', 'guidance');

-- ── Dedupe active clashes (keep oldest) so unique index can be created ───────
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

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists call_bookings_client on call_bookings ("clientId", "createdAt" desc);
create index if not exists call_bookings_agent on call_bookings ("agentId", "createdAt" desc);
create index if not exists call_bookings_client_kind on call_bookings ("clientId", kind, "createdAt" desc);

create unique index if not exists call_bookings_agent_slot_active_uidx
  on call_bookings ("agentId", "slotDate", "slotTime")
  where status in ('pending', 'confirmed')
    and "agentId" is not null;
