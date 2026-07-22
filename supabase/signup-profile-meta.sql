-- Copy signup businessName / phone / emailNotifications from auth metadata into profiles.
-- Run once in Supabase SQL editor (existing projects). New installs get this via schema.sql.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id,email,name,avatar,role,status,"businessName",phone,"emailNotifications")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email),1)),
    'client',
    'active',
    nullif(trim(coalesce(new.raw_user_meta_data->>'businessName','')),''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone','')),''),
    coalesce((new.raw_user_meta_data->>'emailNotifications')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;$$ language plpgsql security definer;
