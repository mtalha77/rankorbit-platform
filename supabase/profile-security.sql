-- Lock privileged profile columns so clients cannot self-escalate via direct Supabase updates.
-- Safe to re-run. Extends protect_profile_billing() (billing freeze stays + privilege freeze).
-- Staff + service_role + null JWT (webhooks/server) may still update everything.

create or replace function protect_profile_billing() returns trigger as $$
begin
  -- service role / no JWT / postgres: allow (webhooks + server routes)
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  -- staff: allow full updates
  if exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','manager','bdm','agent')
  ) then
    return new;
  end if;

  -- ── client: freeze billing + plan ──────────────────────────────────────────
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

  -- ── client: freeze privilege / ops columns (no self role-escalation) ───────
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
