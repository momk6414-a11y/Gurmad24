-- Base schema for GURMAD 24 storage (private schema, never exposed through the Data API).
-- Idempotent: safe to run against a project that already has these objects.
-- NOTE: reconstructed from what the RPC migrations below read and write; the live project was set up before
-- this file existed, so compare with `supabase db diff` before relying on it for a rebuild.
create schema if not exists gurmad24;

create table if not exists gurmad24.records (
  collection text not null,
  id         text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create table if not exists gurmad24.state (
  singleton  boolean primary key default true check (singleton),
  meta       jsonb not null default '{"version":0}'::jsonb,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Defence in depth: RLS on, nothing for the public roles; only the server-side service_role touches the data.
alter table gurmad24.records enable row level security;
alter table gurmad24.state   enable row level security;

revoke all on schema gurmad24 from public, anon, authenticated;
revoke all on all tables in schema gurmad24 from public, anon, authenticated;
grant usage on schema gurmad24 to service_role;
grant select, insert, update, delete on gurmad24.records, gurmad24.state to service_role;
