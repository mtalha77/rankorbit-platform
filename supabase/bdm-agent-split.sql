-- Split BDM vs Agent assignment.
-- assignedBdmId  = client-facing BDM (chat / calls / meetings)
-- assignedAgentId = backend Agent (listings / GMB / reports scope)
-- Safe to re-run.

alter table profiles
  add column if not exists "assignedBdmId" uuid references profiles(id) on delete set null;

create index if not exists profiles_assigned_bdm_idx on profiles ("assignedBdmId");
create index if not exists profiles_assigned_agent_idx on profiles ("assignedAgentId");

-- Existing links were BDM-facing (after earlier agent→bdm rename). Move them.
update profiles
set
  "assignedBdmId" = coalesce("assignedBdmId", "assignedAgentId"),
  "assignedAgentId" = null
where "assignedAgentId" is not null
  and (
    "assignedBdmId" is null
    or "assignedBdmId" = "assignedAgentId"
  );

create or replace function is_staff() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and role in ('super_admin', 'manager', 'bdm', 'agent')
  );
$$ language sql security definer stable;

create or replace function protect_profile_billing() returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','manager','bdm','agent')
  ) then
    return new;
  end if;

  new.plan := old.plan;
  new."stripeCustomerId" := old."stripeCustomerId";
  new."stripeSubscriptionId" := old."stripeSubscriptionId";
  new."stripePriceId" := old."stripePriceId";
  new."subscriptionStatus" := old."subscriptionStatus";
  new."cancelAtPeriodEnd" := old."cancelAtPeriodEnd";
  new."canceledAt" := old."canceledAt";
  new."currentPeriodStart" := old."currentPeriodStart";
  new."currentPeriodEnd" := old."currentPeriodEnd";
  new."cardBrand" := old."cardBrand";
  new."cardLast4" := old."cardLast4";
  new."pendingPlanId" := old."pendingPlanId";
  new."pendingPlanEffectiveAt" := old."pendingPlanEffectiveAt";
  new."paymentFailedAt" := old."paymentFailedAt";
  new."paymentGraceEndsAt" := old."paymentGraceEndsAt";

  new.role := old.role;
  new.status := old.status;
  new.perms := old.perms;
  new."canImpersonate" := old."canImpersonate";
  new."assignedAgentId" := old."assignedAgentId";
  new."assignedBdmId" := old."assignedBdmId";
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
