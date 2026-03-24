-- Run this in Supabase SQL editor.
-- It creates tables used by the app and enables RLS policies.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO')),
  created_at timestamptz not null default now()
);

create table if not exists public.setup_requests (
  id uuid primary key default gen_random_uuid(),
  line text not null,
  product text not null,
  setup_type text not null check (setup_type in ('LINHAO', 'MEIA_LINHA')),
  line_drainage boolean not null default false,
  has_document boolean not null default false,
  sa_paid_by_kit boolean not null default true,
  checklist_url text,
  checklist_completed boolean not null default false,
  checklist_completed_at timestamptz,
  setup_pending_at timestamptz,
  quality_pending_at timestamptz,
  kit_pending_at timestamptz,
  teste_pending_at timestamptz,
  processo_pending_at timestamptz,
  automacao_pending_at timestamptz,
  material_in_line_confirmed boolean,
  material_in_line_checked_at timestamptz,
  teste_checklist jsonb not null default '[]'::jsonb,
  teste_checklist_completed boolean not null default false,
  teste_checklist_completed_at timestamptz,
  processo_checklist jsonb not null default '[]'::jsonb,
  processo_checklist_completed boolean not null default false,
  processo_checklist_completed_at timestamptz,
  processo_version_changed boolean,
  processo_version_target text,
  automacao_checklist jsonb not null default '[]'::jsonb,
  automacao_checklist_completed boolean not null default false,
  automacao_checklist_completed_at timestamptz,
  automacao_sync_validated boolean,
  status text not null check (status in ('PENDING_QUALITY', 'PENDING_KIT', 'PENDING_QUALITY_AND_KIT', 'PENDING_SETUP_AND_KIT', 'PENDING_SETUP', 'IN_PROGRESS', 'PENDING_KIT_AFTER_SETUP', 'PENDING_TESTE', 'TESTE_IN_PROGRESS', 'PENDING_PROCESSO', 'PROCESSO_IN_PROGRESS', 'PENDING_AUTOMACAO', 'AUTOMACAO_IN_PROGRESS', 'COMPLETED')),
  token text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  quality_accepted_at timestamptz,
  quality_finished_at timestamptz,
  kit_accepted_at timestamptz,
  kit_finished_at timestamptz,
  setup_accepted_at timestamptz,
  setup_finished_at timestamptz,
  teste_accepted_at timestamptz,
  teste_finished_at timestamptz,
  processo_accepted_at timestamptz,
  processo_finished_at timestamptz,
  automacao_accepted_at timestamptz,
  automacao_finished_at timestamptz,
  history jsonb not null default '[]'::jsonb
);

-- Migration helpers for existing projects
alter table public.setup_requests add column if not exists sa_paid_by_kit boolean not null default true;
alter table public.setup_requests add column if not exists checklist_url text;
alter table public.setup_requests add column if not exists checklist_completed boolean not null default false;
alter table public.setup_requests add column if not exists checklist_completed_at timestamptz;
alter table public.setup_requests add column if not exists setup_pending_at timestamptz;
alter table public.setup_requests add column if not exists quality_pending_at timestamptz;
alter table public.setup_requests add column if not exists kit_pending_at timestamptz;
alter table public.setup_requests add column if not exists teste_pending_at timestamptz;
alter table public.setup_requests add column if not exists processo_pending_at timestamptz;
alter table public.setup_requests add column if not exists automacao_pending_at timestamptz;
alter table public.setup_requests add column if not exists material_in_line_confirmed boolean;
alter table public.setup_requests add column if not exists material_in_line_checked_at timestamptz;
alter table public.setup_requests add column if not exists teste_checklist jsonb not null default '[]'::jsonb;
alter table public.setup_requests add column if not exists teste_checklist_completed boolean not null default false;
alter table public.setup_requests add column if not exists teste_checklist_completed_at timestamptz;
alter table public.setup_requests add column if not exists processo_checklist jsonb not null default '[]'::jsonb;
alter table public.setup_requests add column if not exists processo_checklist_completed boolean not null default false;
alter table public.setup_requests add column if not exists processo_checklist_completed_at timestamptz;
alter table public.setup_requests add column if not exists processo_version_changed boolean;
alter table public.setup_requests add column if not exists processo_version_target text;
alter table public.setup_requests add column if not exists automacao_checklist jsonb not null default '[]'::jsonb;
alter table public.setup_requests add column if not exists automacao_checklist_completed boolean not null default false;
alter table public.setup_requests add column if not exists automacao_checklist_completed_at timestamptz;
alter table public.setup_requests add column if not exists automacao_sync_validated boolean;
alter table public.setup_requests add column if not exists kit_accepted_at timestamptz;
alter table public.setup_requests add column if not exists kit_finished_at timestamptz;
alter table public.setup_requests add column if not exists teste_accepted_at timestamptz;
alter table public.setup_requests add column if not exists teste_finished_at timestamptz;
alter table public.setup_requests add column if not exists processo_accepted_at timestamptz;
alter table public.setup_requests add column if not exists processo_finished_at timestamptz;
alter table public.setup_requests add column if not exists automacao_accepted_at timestamptz;
alter table public.setup_requests add column if not exists automacao_finished_at timestamptz;
alter table public.setup_requests add column if not exists created_by_name text;

-- Optional backfill for old rows (if public.users has the profile)
update public.setup_requests sr
set created_by_name = u.display_name
from public.users u
where sr.created_by = u.id
  and (sr.created_by_name is null or btrim(sr.created_by_name) = '');

-- Backfill prioritizing auth metadata (full_name/name), then public.users, then email prefix
update public.setup_requests sr
set created_by_name = coalesce(
  nullif(au.raw_user_meta_data->>'full_name', ''),
  nullif(au.raw_user_meta_data->>'name', ''),
  nullif(pu.display_name, ''),
  split_part(au.email, '@', 1)
)
from auth.users au
left join public.users pu on pu.id = au.id
where sr.created_by = au.id
  and (sr.created_by_name is null or btrim(sr.created_by_name) = '');

alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO'));

alter table public.setup_requests drop constraint if exists setup_requests_status_check;
alter table public.setup_requests
  add constraint setup_requests_status_check
  check (status in ('PENDING_QUALITY', 'PENDING_KIT', 'PENDING_QUALITY_AND_KIT', 'PENDING_SETUP_AND_KIT', 'PENDING_SETUP', 'IN_PROGRESS', 'PENDING_KIT_AFTER_SETUP', 'PENDING_TESTE', 'TESTE_IN_PROGRESS', 'PENDING_PROCESSO', 'PROCESSO_IN_PROGRESS', 'PENDING_AUTOMACAO', 'AUTOMACAO_IN_PROGRESS', 'COMPLETED'));

alter table public.users enable row level security;
alter table public.setup_requests enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "setup_requests_select_all_authenticated" on public.setup_requests;
create policy "setup_requests_select_all_authenticated"
  on public.setup_requests
  for select
  to authenticated
  using (true);

drop policy if exists "setup_requests_insert_authenticated" on public.setup_requests;
create policy "setup_requests_insert_authenticated"
  on public.setup_requests
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "setup_requests_update_authenticated" on public.setup_requests;
create policy "setup_requests_update_authenticated"
  on public.setup_requests
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "setup_requests_delete_dev_only" on public.setup_requests;
create policy "setup_requests_delete_dev_only"
  on public.setup_requests
  for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') in ('victor.lopo@grupomultilaser.com.br'));
