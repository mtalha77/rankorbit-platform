-- Regular vs guidance meeting type for plan quotas. Safe to re-run.
alter table call_bookings add column if not exists kind text not null default 'regular';

-- Normalize any unexpected values.
update call_bookings set kind = 'regular' where kind is null or kind not in ('regular', 'guidance');

create index if not exists call_bookings_client_kind on call_bookings ("clientId", kind, "createdAt" desc);
