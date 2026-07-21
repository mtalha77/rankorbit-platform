-- Stripe billing period start (for meeting quota resets). Safe to re-run.
alter table profiles add column if not exists "currentPeriodStart" timestamptz;

-- Keep client freeze in sync with profile-security / billing-plan-switch.
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
      and p.role in ('super_admin','manager','agent')
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
