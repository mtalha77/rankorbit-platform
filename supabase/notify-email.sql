-- Alternate notification email (verified). Login email stays on profiles.email.
-- Safe to re-run.

alter table profiles add column if not exists "notifyEmail" text;
alter table profiles add column if not exists "notifyEmailPending" text;
alter table profiles add column if not exists "notifyEmailToken" text;
alter table profiles add column if not exists "notifyEmailTokenExpiresAt" timestamptz;

create index if not exists profiles_notify_email_token
  on profiles ("notifyEmailToken")
  where "notifyEmailToken" is not null;

-- Bypass flag for confirm_notify_email() RPC (security definer still sees caller JWT).
create or replace function protect_profile_billing() returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if current_setting('app.confirming_notify_email', true) = '1' then
    return new;
  end if;

  -- Everyone (client + staff): cannot self-set notify email without verification API.
  new."notifyEmail" := old."notifyEmail";
  new."notifyEmailPending" := old."notifyEmailPending";
  new."notifyEmailToken" := old."notifyEmailToken";
  new."notifyEmailTokenExpiresAt" := old."notifyEmailTokenExpiresAt";

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

-- Public confirm via email link token (no login required).
create or replace function confirm_notify_email(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.profiles%rowtype;
  pending text;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into r
  from public.profiles
  where "notifyEmailToken" = trim(p_token)
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  pending := lower(trim(coalesce(r."notifyEmailPending", '')));
  if pending = ''
     or r."notifyEmailTokenExpiresAt" is null
     or r."notifyEmailTokenExpiresAt" < now() then
    perform set_config('app.confirming_notify_email', '1', true);
    update public.profiles set
      "notifyEmailPending" = null,
      "notifyEmailToken" = null,
      "notifyEmailTokenExpiresAt" = null
    where id = r.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  perform set_config('app.confirming_notify_email', '1', true);
  update public.profiles set
    "notifyEmail" = pending,
    "notifyEmailPending" = null,
    "notifyEmailToken" = null,
    "notifyEmailTokenExpiresAt" = null
  where id = r.id;

  return jsonb_build_object('ok', true, 'role', r.role, 'notifyEmail', pending);
end;
$$;

grant execute on function confirm_notify_email(text) to anon, authenticated;
