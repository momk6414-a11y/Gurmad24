-- The incremental RPC already accepts visits; align the backing records constraint.
alter table gurmad24.records
  drop constraint if exists records_collection_check;

alter table gurmad24.records
  add constraint records_collection_check
  check (collection = any (array[
    'users','sessions','orgs','cards','orders','appointments','cases','services',
    'subscriptions','plans','transactions','invoices','complaints','audit','sponsored','visits'
  ]::text[]));
