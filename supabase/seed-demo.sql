-- Rank Orbit — DEMO DATA SEED
-- Run this AFTER schema.sql, in the Supabase SQL Editor.
-- Creates 6 demo auth users (password for all: see below) + their profiles + data.
--   admin@rankorbit.com / admin123      (super_admin)
--   manager@rankorbit.com / manager123  (manager)
--   agent@rankorbit.com / agent123      (agent)
--   mike@example.com / client123        (Growth client)
--   sarah@dentalcare.com / client123    (GMB Pro client)
--   john@autoshop.com / client123       (Essentials client)

-- Helper to create a confirmed auth user + return its id
create or replace function seed_user(p_email text, p_pass text) returns uuid as $$
declare uid uuid;
begin
  select id into uid from auth.users where email=p_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change)
    values (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',p_email,crypt(p_pass,gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}','','','','');
    insert into auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),uid,uid::text,format('{"sub":"%s","email":"%s"}',uid,p_email)::jsonb,'email',now(),now(),now());
  end if;
  return uid;
end;$$ language plpgsql;

do $$
declare
  a_admin uuid; a_mgr uuid; a_agent uuid; a_mike uuid; a_sarah uuid; a_john uuid;
begin
  a_admin := seed_user('admin@rankorbit.com','admin123');
  a_mgr   := seed_user('manager@rankorbit.com','manager123');
  a_agent := seed_user('agent@rankorbit.com','agent123');
  a_mike  := seed_user('mike@example.com','client123');
  a_sarah := seed_user('sarah@dentalcare.com','client123');
  a_john  := seed_user('john@autoshop.com','client123');

  -- profiles (upsert, mark protected so they can't be deleted in-app)
  insert into profiles (id,email,role,name,avatar,protected) values
    (a_admin,'admin@rankorbit.com','super_admin','Talha (Admin)','T',true),
    (a_mgr,'manager@rankorbit.com','manager','Sara (Manager)','S',true),
    (a_agent,'agent@rankorbit.com','agent','Ali (Agent)','A',true)
  on conflict (id) do update set role=excluded.role,name=excluded.name,avatar=excluded.avatar,protected=true;

  insert into profiles (id,email,role,name,avatar,"businessName",plan,phone,address,city,state,zip,website,category,status,"napScore",protected) values
    (a_mike,'mike@example.com','client','Mike Johnson','M','Mike''s Plumbing','growth','(555) 200-1000','123 Main St','Austin','TX','78701','mikesplumbing.com','Home Services','active',94,true),
    (a_sarah,'sarah@dentalcare.com','client','Sarah Miller','S','Sarah''s Dental Care','gmb','(555) 300-2000','456 Oak Ave','Houston','TX','77001','sarahsdental.com','Medical / Health','active',88,true),
    (a_john,'john@autoshop.com','client','John Davis','J','Davis Auto Repair','essentials','(555) 400-3000','789 Elm Rd','Dallas','TX','75201','davisauto.com','Auto Services','active',72,true)
  on conflict (id) do update set plan=excluded.plan,"businessName"=excluded."businessName",protected=true;

  delete from listings where "clientId" in (a_mike,a_sarah,a_john);
  insert into listings (id,"clientId",directory,status,submitted,"liveDate","napMatch","liveLink",da,notes) values
    (gen_random_uuid()::text,a_mike,'Google Business Profile','live','Mar 1','Mar 2','match','https://business.google.com',99,''),
    (gen_random_uuid()::text,a_mike,'Yellow Pages','live','Mar 1','Mar 5','match','https://yellowpages.com',92,''),
    (gen_random_uuid()::text,a_mike,'Foursquare','live','Mar 2','Mar 6','match','https://foursquare.com',88,''),
    (gen_random_uuid()::text,a_mike,'Manta','live','Mar 3','Mar 8','match','https://manta.com',74,''),
    (gen_random_uuid()::text,a_mike,'MerchantCircle','live','Mar 4','Mar 10','fixed','https://merchantcircle.com',68,'Phone corrected Jun 24'),
    (gen_random_uuid()::text,a_mike,'Hotfrog','live','Apr 1','Apr 4','match','https://hotfrog.com',62,''),
    (gen_random_uuid()::text,a_mike,'Storeboard','live','Apr 2','Apr 7','match','https://storeboard.com',55,''),
    (gen_random_uuid()::text,a_mike,'Proven Expert','live','Apr 3','Apr 9','match','https://provenexpert.com',58,''),
    (gen_random_uuid()::text,a_mike,'Apple Business Connect','pending','Jul 1','—','—','',96,'Awaiting Apple verification'),
    (gen_random_uuid()::text,a_mike,'Bing Places','pending','Jul 1','—','—','',94,''),
    (gen_random_uuid()::text,a_sarah,'Google Business Profile','live','Mar 15','Mar 16','match','https://business.google.com',99,''),
    (gen_random_uuid()::text,a_sarah,'Healthgrades','live','Mar 16','Mar 20','match','https://healthgrades.com',82,''),
    (gen_random_uuid()::text,a_sarah,'Zocdoc','live','Mar 17','Mar 22','match','https://zocdoc.com',78,''),
    (gen_random_uuid()::text,a_sarah,'Yellow Pages','live','Mar 18','Mar 25','mismatch','https://yellowpages.com',92,'Address format issue'),
    (gen_random_uuid()::text,a_sarah,'Vitals','pending','Jul 2','—','—','',70,''),
    (gen_random_uuid()::text,a_john,'Google Business Profile','live','Apr 1','Apr 2','match','https://business.google.com',99,''),
    (gen_random_uuid()::text,a_john,'Yellow Pages','live','Apr 2','Apr 6','match','https://yellowpages.com',92,''),
    (gen_random_uuid()::text,a_john,'Yelp','flagged','Apr 3','Apr 8','mismatch','https://yelp.com',90,'Unauthorized edit detected'),
    (gen_random_uuid()::text,a_john,'Manta','rejected','May 1','—','—','',74,'Duplicate listing found');

  insert into gmb ("clientId",data) values
    (a_sarah,'{"views":1240,"calls":47,"directions":83,"source":"manual","trend":[{"m":"Mar","v":680,"c":28,"d":51},{"m":"Apr","v":820,"c":34,"d":63},{"m":"May","v":1050,"c":42,"d":74},{"m":"Jun","v":1240,"c":47,"d":83}],"posts":[{"title":"New Patient Special","date":"Jun 25","status":"live"},{"title":"Open Saturdays","date":"Jun 15","status":"live"}],"qa":[{"q":"Do you accept insurance?","a":"Yes, we accept most major insurance plans.","date":"Jun 20"}],"photos":3,"completeness":{"category":true,"description":true,"hours":true,"photo":true,"services":false,"attributes":false}}')
  on conflict ("clientId") do update set data=excluded.data;

  delete from activity where "clientId" in (a_mike,a_sarah,a_john);
  insert into activity (id,"clientId",type,"desc",date,"by") values
    (gen_random_uuid()::text,a_mike,'listing_live','Yellow Pages listing went live','Jul 4, 2025','Ali (Agent)'),
    (gen_random_uuid()::text,a_mike,'nap_fix','Phone corrected on MerchantCircle','Jun 24, 2025','Ali (Agent)'),
    (gen_random_uuid()::text,a_mike,'edit_blocked','Unauthorized edit blocked on Yelp — hours change reverted','Jun 22, 2025','System'),
    (gen_random_uuid()::text,a_sarah,'listing_live','Healthgrades listing went live','Jun 18, 2025','Ali (Agent)'),
    (gen_random_uuid()::text,a_john,'flagged','Yelp listing flagged — unauthorized edit detected','Jun 20, 2025','System'),
    (gen_random_uuid()::text,a_john,'rejected','Manta listing rejected — duplicate found','May 10, 2025','Ali (Agent)');
end $$;
