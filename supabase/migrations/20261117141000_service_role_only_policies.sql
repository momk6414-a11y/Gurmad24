-- Explicitly scope direct table access to the backend service role.
-- anon/authenticated have no schema USAGE or table grants; policies reinforce that boundary.
drop policy if exists service_role_only_records on gurmad24.records;
create policy service_role_only_records on gurmad24.records
  for all to service_role using (true) with check (true);

drop policy if exists service_role_only_state on gurmad24.state;
create policy service_role_only_state on gurmad24.state
  for all to service_role using (true) with check (true);

drop policy if exists service_role_only_migrations on gurmad24.migrations;
create policy service_role_only_migrations on gurmad24.migrations
  for all to service_role using (true) with check (true);
