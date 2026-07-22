-- Allow staff to insert/update settings (Control Panel). Run once in SQL editor.
drop policy if exists s_write on settings;
create policy s_write on settings
  for all
  using (is_staff())
  with check (is_staff());
