-- Stripe billing columns + tables (safe to re-run). Run in Supabase SQL Editor.
-- Does NOT drop existing data.

-- ── profiles: Stripe identity + subscription state ────────────────────────────
alter table profiles add column if not exists "stripeCustomerId" text;
alter table profiles add column if not exists "stripeSubscriptionId" text;
alter table profiles add column if not exists "stripePriceId" text;
alter table profiles add column if not exists "subscriptionStatus" text;
alter table profiles add column if not exists "cancelAtPeriodEnd" boolean default false;
alter table profiles add column if not exists "canceledAt" timestamptz;
alter table profiles add column if not exists "currentPeriodEnd" timestamptz;
alter table profiles add column if not exists "cardBrand" text;
alter table profiles add column if not exists "cardLast4" text;

create unique index if not exists profiles_stripe_customer_uidx
  on profiles ("stripeCustomerId") where "stripeCustomerId" is not null;
create unique index if not exists profiles_stripe_subscription_uidx
  on profiles ("stripeSubscriptionId") where "stripeSubscriptionId" is not null;

-- ── Idempotent webhook event log ─────────────────────────────────────────────
create table if not exists stripe_events (
  id text primary key,
  type text not null,
  "processedAt" timestamptz default now()
);
alter table stripe_events enable row level security;
-- No client policies: only service role (webhook) writes/reads.

-- ── Invoice history (synced from Stripe) ─────────────────────────────────────
create table if not exists invoices (
  id text primary key,
  "clientId" uuid references profiles(id) on delete cascade,
  "amountCents" int default 0,
  currency text default 'usd',
  status text,
  "hostedInvoiceUrl" text,
  "invoicePdf" text,
  "periodStart" timestamptz,
  "periodEnd" timestamptz,
  "createdAt" timestamptz default now()
);
alter table invoices enable row level security;
drop policy if exists inv_read on invoices;
create policy inv_read on invoices for select using ("clientId"=auth.uid() or is_staff());
-- Writes only via service role (webhook).

-- ── Block clients from self-writing billing / privilege fields ───────────────
-- Staff and service-role may update everything. Clients cannot escalate role/status
-- or change billing cols (see profile-security.sql for the same function).
create or replace function protect_profile_billing() returns trigger as $$
begin
  -- service role / no JWT / postgres: allow (webhooks + /api billing routes)
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  -- staff: allow
  if exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','manager','agent')
  ) then
    return new;
  end if;
  -- client: freeze billing + plan columns
  new.plan := old.plan;
  new."stripeCustomerId" := old."stripeCustomerId";
  new."stripeSubscriptionId" := old."stripeSubscriptionId";
  new."stripePriceId" := old."stripePriceId";
  new."subscriptionStatus" := old."subscriptionStatus";
  new."cancelAtPeriodEnd" := old."cancelAtPeriodEnd";
  new."canceledAt" := old."canceledAt";
  new."currentPeriodEnd" := old."currentPeriodEnd";
  new."cardBrand" := old."cardBrand";
  new."cardLast4" := old."cardLast4";
  -- client: freeze privilege / ops columns
  new.role := old.role;
  new.status := old.status;
  new.perms := old.perms;
  new."canImpersonate" := old."canImpersonate";
  new."assignedAgentId" := old."assignedAgentId";
  new."deletedAt" := old."deletedAt";
  new."suspendedAt" := old."suspendedAt";
  new."suspendReason" := old."suspendReason";
  new."suspendedBy" := old."suspendedBy";
  new."staffPassword" := old."staffPassword";
  new."createdByRole" := old."createdByRole";
  new.protected := old.protected;
  new.email := old.email;
  new."napScore" := old."napScore";
  new."napHistory" := old."napHistory";
  new."reportSentMonth" := old."reportSentMonth";
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_profile_billing on profiles;
create trigger trg_protect_profile_billing
  before update on profiles
  for each row execute function protect_profile_billing();

-- Trim secrets from settings.stripe if they were ever saved in the dashboard.
update settings
set data = jsonb_set(
  coalesce(data,'{}'::jsonb),
  '{stripe}',
  coalesce(data->'stripe','{}'::jsonb)
    - 'secretKey'
    - 'webhookSecret'
    - 'essentials'
    - 'growth'
    - 'gmb'
    - 'portalLink'
)
where id = 1;
