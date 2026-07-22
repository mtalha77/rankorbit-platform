-- Copy signup businessName / phone from auth metadata into profiles.
-- Run once in Supabase SQL editor (existing projects).
create or replace function handle_new_user() returns trigger as $$
declare
  v_name text;
  v_biz text;
  v_phone text;
begin
  v_name := coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'name','')), ''), split_part(new.email, '@', 1));
  v_biz := nullif(trim(coalesce(new.raw_user_meta_data->>'businessName', '')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');

  insert into profiles (id, email, name, avatar, role, status, "businessName", phone)
  values (
    new.id,
    new.email,
    v_name,
    upper(left(v_name, 1)),
    'client',
    'active',
    v_biz,
    v_phone
  )
  on conflict (id) do update set
    "businessName" = coalesce(profiles."businessName", excluded."businessName"),
    phone = coalesce(profiles.phone, excluded.phone),
    name = case
      when nullif(trim(coalesce(profiles.name, '')), '') is null then excluded.name
      else profiles.name
    end,
    avatar = case
      when nullif(trim(coalesce(profiles.name, '')), '') is null then excluded.avatar
      else profiles.avatar
    end;

  -- Optional column (may not exist on older DBs).
  begin
    update profiles
    set "emailNotifications" = coalesce(
      (new.raw_user_meta_data->>'emailNotifications')::boolean,
      "emailNotifications",
      true
    )
    where id = new.id
      and new.raw_user_meta_data ? 'emailNotifications';
  exception
    when undefined_column then null;
  end;

  return new;
end;
$$ language plpgsql security definer;
