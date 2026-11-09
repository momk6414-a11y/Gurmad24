-- Upgrade the GURMAD 24 writer RPC to apply row-level changesets.
drop function if exists public.gurmad24_store_replace(jsonb);

create function public.gurmad24_store_replace(p_changes jsonb)
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
  v_change jsonb;
  v_rows jsonb;
  v_deleted jsonb;
begin
  if jsonb_typeof(p_changes) <> 'object'
     or jsonb_typeof(p_changes->'collections') <> 'object' then
    raise exception 'Invalid GURMAD 24 changeset';
  end if;

  foreach v_collection in array v_allowed loop
    v_change := p_changes->'collections'->v_collection;
    if v_change is null then continue; end if;
    v_deleted := coalesce(v_change->'delete', '[]'::jsonb);
    v_rows := coalesce(v_change->'upsert', '[]'::jsonb);
    if jsonb_typeof(v_deleted) <> 'array' or jsonb_typeof(v_rows) <> 'array' then
      raise exception 'Invalid changes for collection: %', v_collection;
    end if;

    delete from gurmad24.records as r
    where r.collection = v_collection
      and r.id in (select jsonb_array_elements_text(v_deleted));

    insert into gurmad24.records (collection, id, payload, created_at, updated_at)
    select v_collection, row_data->>'id', row_data, now(), now()
    from jsonb_array_elements(v_rows) as row_data
    where jsonb_typeof(row_data) = 'object' and coalesce(row_data->>'id', '') <> ''
    on conflict (collection, id) do update
      set payload = excluded.payload, updated_at = now();
  end loop;

  if coalesce((p_changes->>'stateChanged')::boolean, false) then
    insert into gurmad24.state (singleton, meta, settings, updated_at)
    values (true, coalesce(p_changes->'meta', '{"version":0}'::jsonb),
            coalesce(p_changes->'settings', '{}'::jsonb), now())
    on conflict (singleton) do update
      set meta = excluded.meta, settings = excluded.settings, updated_at = now();
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.gurmad24_store_replace(jsonb) from public, anon, authenticated;
grant execute on function public.gurmad24_store_replace(jsonb) to service_role;
