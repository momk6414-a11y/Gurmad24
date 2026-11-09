-- Supabase RPC bridge for GURMAD 24. Keep SECURITY INVOKER and service_role-only grants.
create or replace function public.gurmad24_store_load()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'meta', coalesce((select s.meta from gurmad24.state as s where s.singleton = true), '{"version":0}'::jsonb),
    'settings', coalesce((select s.settings from gurmad24.state as s where s.singleton = true), '{}'::jsonb),
    'collections', coalesce((
      select jsonb_object_agg(c.collection, c.items)
      from (
        select r.collection, jsonb_agg(r.payload order by r.id) as items
        from gurmad24.records as r
        group by r.collection
      ) as c
    ), '{}'::jsonb)
  );
$$;

create or replace function public.gurmad24_store_replace(p_snapshot jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_collection text;
  v_allowed text[] := array[
    'users','sessions','orgs','cards','orders','appointments','cases','services',
    'subscriptions','plans','transactions','invoices','complaints','audit','sponsored'
  ];
  v_rows jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(p_snapshot->'collections') <> 'object' then
    raise exception 'Invalid GURMAD 24 snapshot';
  end if;

  foreach v_collection in array v_allowed loop
    v_rows := coalesce(p_snapshot->'collections'->v_collection, '[]'::jsonb);
    if jsonb_typeof(v_rows) <> 'array' then
      raise exception 'Invalid collection payload: %', v_collection;
    end if;

    delete from gurmad24.records where collection = v_collection;
    insert into gurmad24.records (collection, id, payload, created_at, updated_at)
    select v_collection, row_data->>'id', row_data, now(), now()
    from jsonb_array_elements(v_rows) as row_data
    where jsonb_typeof(row_data) = 'object' and coalesce(row_data->>'id', '') <> '';
  end loop;

  insert into gurmad24.state (singleton, meta, settings, updated_at)
  values (true, coalesce(p_snapshot->'meta', '{"version":0}'::jsonb),
          coalesce(p_snapshot->'settings', '{}'::jsonb), now())
  on conflict (singleton) do update
    set meta = excluded.meta, settings = excluded.settings, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.gurmad24_store_load() from public, anon, authenticated;
revoke all on function public.gurmad24_store_replace(jsonb) from public, anon, authenticated;
grant execute on function public.gurmad24_store_load() to service_role;
grant execute on function public.gurmad24_store_replace(jsonb) to service_role;
