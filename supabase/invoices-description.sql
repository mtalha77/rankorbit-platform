-- Store human-readable invoice descriptions from Stripe (plan start, proration, renewals).
alter table invoices add column if not exists description text;
alter table invoices add column if not exists "billingReason" text;
