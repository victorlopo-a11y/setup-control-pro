-- Run this in Supabase SQL editor.
-- It creates tables used by the app and enables RLS policies.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'PCP', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO', 'ALMOXERIFADO')),
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
  quality_document_received_by text,
  kit_material_received_by text,
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

create table if not exists public.oppo_requests (
  id uuid primary key default gen_random_uuid(),
  call_type text not null check (call_type in ('SOLICITACAO_DISPOSITIVO', 'DEVOLUCAO_DISPOSITIVO')),
  status text not null check (status in ('ABERTO', 'SEPARACAO', 'CONFERINDO', 'FINALIZADO_ALMOXERIFADO', 'CONCLUIDO', 'DIVERGENCIA')),
  line text,
  product text,
  line_type text check (line_type in ('MONTAGEM/TESTE', 'EMBALAGEM')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_name text,
  almox_by uuid references auth.users(id) on delete set null,
  almox_by_name text,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  finalized_at timestamptz,
  requester_confirmed_at timestamptz,
  requester_confirmed boolean,
  requester_confirmed_by uuid references auth.users(id) on delete set null,
  requester_confirmed_by_name text,
  return_items_note text,
  return_items_selected jsonb not null default '[]'::jsonb,
  paid_items_selected jsonb not null default '[]'::jsonb,
  paid_items_note text,
  notes text
);

create table if not exists public.oppo_setup_layouts (
  product_key text primary key,
  posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text
);

create table if not exists public.oppo_setup_requests (
  id uuid primary key default gen_random_uuid(),
  line text not null,
  product text not null,
  line_type text not null check (line_type in ('MONTAGEM/TESTE', 'EMBALAGEM')),
  production_order text not null,
  status text not null check (status in ('PENDING_PROCESSO', 'ACCEPTED', 'CANCELLED')),
  session_id text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_by_name text,
  accepted_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz
);

-- Quando o PCP abre uma solicitação de setup (PCP -> Eng. Processo),
-- cria automaticamente um chamado no Almoxerifado para iniciar a separação/conferência.
create or replace function public.oppo_setup_create_almox_request()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Evita duplicar caso o frontend já tenha criado o chamado.
  if exists (
    select 1
    from public.oppo_requests r
    where r.call_type = 'SOLICITACAO_DISPOSITIVO'
      and r.notes like ('[SETUP_SESSION:' || new.session_id || ']%')
  ) then
    return new;
  end if;

  insert into public.oppo_requests (
    call_type,
    status,
    line,
    product,
    line_type,
    created_by,
    created_by_name,
    requested_at,
    notes
  ) values (
    'SOLICITACAO_DISPOSITIVO',
    'ABERTO',
    new.line,
    new.product,
    new.line_type,
    new.created_by,
    new.created_by_name,
    now(),
    '[SETUP_SESSION:' || new.session_id || '] [SETUP_OP:' || coalesce(new.production_order,'') || '] Solicitação automática de materiais para setup.'
  );
  return new;
exception when others then
  -- não bloqueia a criação do setup se a automação falhar
  return new;
end;
$$;

drop trigger if exists trg_oppo_setup_create_almox_request on public.oppo_setup_requests;
create trigger trg_oppo_setup_create_almox_request
after insert on public.oppo_setup_requests
for each row
execute function public.oppo_setup_create_almox_request();

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
alter table public.setup_requests add column if not exists quality_document_received_by text;
alter table public.setup_requests add column if not exists kit_material_received_by text;
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

alter table public.oppo_requests add column if not exists call_type text;
alter table public.oppo_requests add column if not exists status text;
alter table public.oppo_requests add column if not exists line text;
alter table public.oppo_requests add column if not exists product text;
alter table public.oppo_requests add column if not exists line_type text;
alter table public.oppo_requests add column if not exists created_by uuid;
alter table public.oppo_requests add column if not exists created_by_name text;
alter table public.oppo_requests add column if not exists almox_by uuid;
alter table public.oppo_requests add column if not exists almox_by_name text;
alter table public.oppo_requests add column if not exists requested_at timestamptz;
alter table public.oppo_requests add column if not exists accepted_at timestamptz;
alter table public.oppo_requests add column if not exists finalized_at timestamptz;
alter table public.oppo_requests add column if not exists requester_confirmed_at timestamptz;
alter table public.oppo_requests add column if not exists requester_confirmed boolean;
alter table public.oppo_requests add column if not exists requester_confirmed_by uuid;
alter table public.oppo_requests add column if not exists requester_confirmed_by_name text;
alter table public.oppo_requests add column if not exists return_items_note text;
alter table public.oppo_requests add column if not exists return_items_selected jsonb not null default '[]'::jsonb;
alter table public.oppo_requests add column if not exists paid_items_selected jsonb not null default '[]'::jsonb;
alter table public.oppo_requests add column if not exists paid_items_note text;
alter table public.oppo_requests add column if not exists notes text;

create table if not exists public.oppo_setup_layouts (
  product_key text primary key,
  posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text
);
alter table public.oppo_setup_layouts add column if not exists product_key text;
alter table public.oppo_setup_layouts add column if not exists posts jsonb not null default '[]'::jsonb;
alter table public.oppo_setup_layouts add column if not exists updated_at timestamptz not null default now();
alter table public.oppo_setup_layouts add column if not exists updated_by uuid;
alter table public.oppo_setup_layouts add column if not exists updated_by_name text;

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
  check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'PCP', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO', 'ALMOXERIFADO'));

alter table public.setup_requests drop constraint if exists setup_requests_status_check;
alter table public.setup_requests
  add constraint setup_requests_status_check
  check (status in ('PENDING_QUALITY', 'PENDING_KIT', 'PENDING_QUALITY_AND_KIT', 'PENDING_SETUP_AND_KIT', 'PENDING_SETUP', 'IN_PROGRESS', 'PENDING_KIT_AFTER_SETUP', 'PENDING_TESTE', 'TESTE_IN_PROGRESS', 'PENDING_PROCESSO', 'PROCESSO_IN_PROGRESS', 'PENDING_AUTOMACAO', 'AUTOMACAO_IN_PROGRESS', 'COMPLETED'));

alter table public.oppo_requests drop constraint if exists oppo_requests_status_check;
alter table public.oppo_requests
  add constraint oppo_requests_status_check
  check (status in ('ABERTO', 'SEPARACAO', 'CONFERINDO', 'FINALIZADO_ALMOXERIFADO', 'CONCLUIDO', 'DIVERGENCIA'));

alter table public.users enable row level security;
alter table public.setup_requests enable row level security;
alter table public.oppo_requests enable row level security;
alter table public.oppo_setup_layouts enable row level security;
alter table public.oppo_setup_requests enable row level security;

-- Migration helpers for existing projects
alter table public.oppo_setup_requests add column if not exists production_order text;
alter table public.oppo_setup_requests add column if not exists finished_at timestamptz;

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

drop policy if exists "oppo_requests_select_all_authenticated" on public.oppo_requests;
create policy "oppo_requests_select_all_authenticated"
  on public.oppo_requests
  for select
  to authenticated
  using (true);

drop policy if exists "oppo_requests_insert_authenticated" on public.oppo_requests;
create policy "oppo_requests_insert_authenticated"
  on public.oppo_requests
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "oppo_requests_update_authenticated" on public.oppo_requests;
create policy "oppo_requests_update_authenticated"
  on public.oppo_requests
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "oppo_setup_layouts_select_all_authenticated" on public.oppo_setup_layouts;
create policy "oppo_setup_layouts_select_all_authenticated"
  on public.oppo_setup_layouts
  for select
  to authenticated
  using (true);

drop policy if exists "oppo_setup_layouts_insert_authenticated" on public.oppo_setup_layouts;
create policy "oppo_setup_layouts_insert_authenticated"
  on public.oppo_setup_layouts
  for insert
  to authenticated
  with check (true);

drop policy if exists "oppo_setup_layouts_update_authenticated" on public.oppo_setup_layouts;
create policy "oppo_setup_layouts_update_authenticated"
  on public.oppo_setup_layouts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "oppo_setup_layouts_delete_authenticated" on public.oppo_setup_layouts;
create policy "oppo_setup_layouts_delete_authenticated"
  on public.oppo_setup_layouts
  for delete
  to authenticated
  using (true);

drop policy if exists "oppo_setup_requests_select_all_authenticated" on public.oppo_setup_requests;
create policy "oppo_setup_requests_select_all_authenticated"
  on public.oppo_setup_requests
  for select
  to authenticated
  using (true);

drop policy if exists "oppo_setup_requests_insert_authenticated" on public.oppo_setup_requests;
create policy "oppo_setup_requests_insert_authenticated"
  on public.oppo_setup_requests
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "oppo_setup_requests_update_authenticated" on public.oppo_setup_requests;
create policy "oppo_setup_requests_update_authenticated"
  on public.oppo_setup_requests
  for update
  to authenticated
  using (true)
  with check (true);
