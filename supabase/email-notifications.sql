-- Client opt-in for app notification emails (signup checkbox). In-app notifications still work when false.
alter table profiles add column if not exists "emailNotifications" boolean default true;
