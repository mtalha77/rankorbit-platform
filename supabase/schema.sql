-- Rank Orbit Platform schema + seed (run once in Supabase SQL Editor)
-- Works WITH Supabase Auth. `profiles` links to auth.users.
drop table if exists invoices, stripe_events, activity, listings, gmb, analytics, settings, profiles cascade;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'client',
  name text, avatar text,
  "businessName" text, plan text, phone text, address text, city text, state text, zip text,
  website text, category text, status text default 'active', "napScore" int default 0,
  protected boolean default false,
  "gaId" text, "gbpId" text,
  "stripeCustomerId" text, "stripeSubscriptionId" text, "stripePriceId" text,
  "subscriptionStatus" text, "cancelAtPeriodEnd" boolean default false, "canceledAt" timestamptz,
  "currentPeriodEnd" timestamptz, "cardBrand" text, "cardLast4" text,
  "createdAt" timestamptz default now()
);

-- Auto-create a profile whenever anyone signs up (email or Google)
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id,email,name,avatar,role,status)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email),1)),
    'client','active')
  on conflict (id) do nothing;
  return new;
end;$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table listings (
  id text primary key,
  "clientId" uuid references profiles(id) on delete cascade,
  directory text, status text, submitted text, "liveDate" text,
  "napMatch" text, "liveLink" text, da int default 0, notes text
);

create table gmb (
  "clientId" uuid primary key references profiles(id) on delete cascade,
  data jsonb not null default '{}'
);

create table analytics (
  "clientId" uuid primary key references profiles(id) on delete cascade,
  data jsonb not null default '{}'
);

create table activity (
  id text primary key,
  "clientId" text, type text, "desc" text, date text, "by" text,
  "createdAt" timestamptz default now()
);

create table settings (
  id int primary key default 1,
  data jsonb not null default '{}'
);

insert into settings (id,data) values (1,'{"stripe":{"pubKey":""}}')
  on conflict (id) do nothing;

create table stripe_events (
  id text primary key,
  type text not null,
  "processedAt" timestamptz default now()
);

create table invoices (
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

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table listings enable row level security;
alter table gmb enable row level security;
alter table analytics enable row level security;
alter table activity enable row level security;
alter table settings enable row level security;
alter table stripe_events enable row level security;
alter table invoices enable row level security;

-- helper: is the current user staff (admin/manager/agent)?
create or replace function is_staff() returns boolean as $$
  select exists(select 1 from profiles where id=auth.uid() and role in ('super_admin','manager','agent'));
$$ language sql security definer stable;

-- profiles: everyone reads their own; staff read/write all; users update own row
create policy p_self_read on profiles for select using (auth.uid()=id or is_staff());
create policy p_self_update on profiles for update using (auth.uid()=id or is_staff());
create policy p_staff_all on profiles for all using (is_staff());

-- listings/gmb/analytics: client reads own, staff read/write all
create policy l_read on listings for select using ("clientId"=auth.uid() or is_staff());
create policy l_write on listings for all using (is_staff());
create policy g_read on gmb for select using ("clientId"=auth.uid() or is_staff());
create policy g_write on gmb for all using (is_staff());
create policy an_read on analytics for select using ("clientId"=auth.uid() or is_staff());
create policy an_write on analytics for all using (is_staff());
create policy ac_read on activity for select using ("clientId"=auth.uid() or is_staff());
create policy ac_write on activity for all using (is_staff());
create policy s_read on settings for select using (true);
create policy s_write on settings for update using (is_staff());
create policy inv_read on invoices for select using ("clientId"=auth.uid() or is_staff());

-- Clients cannot self-write plan / Stripe billing columns (webhook + staff only).
create or replace function protect_profile_billing() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if exists (select 1 from profiles p where p.id=auth.uid() and p.role in ('super_admin','manager','agent')) then
    return new;
  end if;
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
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists trg_protect_profile_billing on profiles;
create trigger trg_protect_profile_billing
  before update on profiles
  for each row execute function protect_profile_billing();

-- ── DEMO SEED ────────────────────────────────────────────────────────────────
-- Demo auth users are created by the SEPARATE seed-demo.sql (needs auth schema access)
-- or via the Supabase dashboard. This file sets up structure + RLS only.
-- After creating the 6 demo auth users, run seed-demo.sql to fill their profiles + data.
