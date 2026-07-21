-- Run this if columns already exist but confirm still fails.
-- Creates confirm_notify_email() for the email link / SPA page.

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
