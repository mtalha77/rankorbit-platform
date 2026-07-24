-- Client "Connect with your BDM" request timestamp.
-- Set when a messaging-plan client with no assigned BDM taps Connect;
-- cleared by /api/assign-client once a BDM is assigned.
alter table profiles add column if not exists "bdmConnectRequestedAt" timestamptz;
