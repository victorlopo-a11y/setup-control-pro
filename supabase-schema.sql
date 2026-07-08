-- Run this in Supabase SQL editor.
-- It creates tables used by the app and enables RLS policies.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'PCP', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO', 'ALMOXERIFADO', 'DEV_ADMIN')),
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
  status text not null check (status in ('PENDING_QUALITY', 'PENDING_KIT', 'PENDING_QUALITY_AND_KIT', 'PENDING_SETUP_AND_KIT', 'PENDING_SETUP', 'IN_PROGRESS', 'PENDING_KIT_AFTER_SETUP', 'PENDING_TESTE', 'TESTE_IN_PROGRESS', 'PENDING_PROCESSO', 'PROCESSO_IN_PROGRESS', 'PENDING_AUTOMACAO', 'AUTOMACAO_IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
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
  line_type text check (line_type in ('MONTAGEM', 'MONTAGEM/TESTE', 'EMBALAGEM')),
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
  product_key text not null,
  target_role text not null check (target_role in ('ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE')),
  posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  primary key (product_key, target_role)
);

create table if not exists public.oppo_setup_requests (
  id uuid primary key default gen_random_uuid(),
  line text not null,
  product text not null,
  line_type text not null check (line_type in ('MONTAGEM', 'MONTAGEM/TESTE', 'EMBALAGEM')),
  production_order text not null,
  target_role text not null check (target_role in ('ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE')),
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

-- Quando o PCP abre uma solicitação de setup (PCP -> Eng. Processo e Eng. Teste),
-- cria automaticamente os chamados no Almoxerifado para iniciar a separação/conferência por setor.
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
      and r.notes like ('[SETUP_SESSION:' || new.session_id || '] [SETUP_TARGET_ROLE:' || new.target_role || ']%')
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
    '[SETUP_SESSION:' || new.session_id || '] [SETUP_TARGET_ROLE:' || new.target_role || '] [SETUP_OP:' || coalesce(new.production_order,'') || '] Solicitação automática de materiais para setup.'
  );

  return new;
exception when others then
  -- não bloqueia a criação do setup se a automação falhar
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Insert safety: set `created_by` automatically (avoids RLS 42501)
-- -----------------------------------------------------------------------------
create or replace function public._set_created_by_defaults()
returns trigger
language plpgsql
as $$
declare
  user_id uuid;
begin
  user_id := auth.uid();
  if user_id is null then
    return new;
  end if;

  if new.created_by is null or new.created_by <> user_id then
    new.created_by := user_id;
  end if;

  if new.created_by_name is null or btrim(new.created_by_name) = '' then
    select coalesce(u.display_name, u.email, 'Usuario')
      into new.created_by_name
      from public.users u
     where u.id = user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_setup_requests_set_created_by on public.setup_requests;
create trigger trg_setup_requests_set_created_by
before insert on public.setup_requests
for each row execute function public._set_created_by_defaults();

drop trigger if exists trg_oppo_requests_set_created_by on public.oppo_requests;
create trigger trg_oppo_requests_set_created_by
before insert on public.oppo_requests
for each row execute function public._set_created_by_defaults();

drop trigger if exists trg_oppo_setup_requests_set_created_by on public.oppo_setup_requests;
create trigger trg_oppo_setup_requests_set_created_by
before insert on public.oppo_setup_requests
for each row execute function public._set_created_by_defaults();

drop trigger if exists trg_oppo_setup_create_almox_request on public.oppo_setup_requests;
create trigger trg_oppo_setup_create_almox_request
after insert on public.oppo_setup_requests
for each row
execute function public.oppo_setup_create_almox_request();

-- Backfill: setups antigos criados apenas para Processo devem ganhar o par de Teste.
insert into public.oppo_setup_requests (
  line,
  product,
  line_type,
  production_order,
  target_role,
  status,
  session_id,
  created_by,
  created_by_name,
  created_at
)
select
  p.line,
  p.product,
  p.line_type,
  p.production_order,
  'ENGENHARIA_TESTE',
  'PENDING_PROCESSO',
  p.session_id,
  p.created_by,
  p.created_by_name,
  p.created_at
from public.oppo_setup_requests p
where p.target_role = 'ENGENHARIA_PROCESSO'
  and not exists (
    select 1
    from public.oppo_setup_requests t
    where t.session_id = p.session_id
      and t.target_role = 'ENGENHARIA_TESTE'
  );

-- Backfill: garante chamado do Almoxerifado para cada setor da solicitação de setup.
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
)
select
  'SOLICITACAO_DISPOSITIVO',
  'ABERTO',
  s.line,
  s.product,
  s.line_type,
  s.created_by,
  s.created_by_name,
  now(),
  '[SETUP_SESSION:' || s.session_id || '] [SETUP_TARGET_ROLE:' || s.target_role || '] [SETUP_OP:' || coalesce(s.production_order,'') || '] Solicitação automática de materiais para setup.'
from public.oppo_setup_requests s
where not exists (
  select 1
  from public.oppo_requests r
  where r.call_type = 'SOLICITACAO_DISPOSITIVO'
    and r.notes like ('[SETUP_SESSION:' || s.session_id || '] [SETUP_TARGET_ROLE:' || s.target_role || ']%')
);

-- RPC: Upsert de layouts por setor (workaround para instabilidades no PostgREST upsert)
create or replace function public.upsert_oppo_setup_layout(
  p_product_key text,
  p_target_role text,
  p_posts jsonb,
  p_updated_by uuid,
  p_updated_by_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
  jwt_email text;
begin
  select u.role
    into jwt_role
    from public.users u
   where u.id = auth.uid();

  jwt_role := coalesce(nullif(jwt_role, ''), auth.jwt() -> 'user_metadata' ->> 'role');
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if jwt_email in ('victor.lopo@grupomultilaser.com.br', 'victorlopo77@gmail.com', 'devsistemasetup@gmail.com.br') then
    jwt_role := 'DEV_ADMIN';
  end if;

  if jwt_role is null or jwt_role = '' then
    raise exception 'Unauthorized';
  end if;

  if jwt_role <> 'DEV_ADMIN' and jwt_role <> 'ENGENHARIA_PROCESSO' and jwt_role <> 'ENGENHARIA_TESTE' then
    raise exception 'Forbidden';
  end if;

  if jwt_role = 'ENGENHARIA_PROCESSO' and p_target_role <> 'ENGENHARIA_PROCESSO' then
    raise exception 'Forbidden';
  end if;

  if jwt_role = 'ENGENHARIA_TESTE' and p_target_role <> 'ENGENHARIA_TESTE' then
    raise exception 'Forbidden';
  end if;

  insert into public.oppo_setup_layouts (
    product_key,
    target_role,
    posts,
    updated_at,
    updated_by,
    updated_by_name
  ) values (
    upper(btrim(coalesce(p_product_key,''))),
    p_target_role,
    coalesce(p_posts, '[]'::jsonb),
    now(),
    p_updated_by,
    p_updated_by_name
  )
  on conflict (product_key, target_role) do update
    set posts = excluded.posts,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by,
        updated_by_name = excluded.updated_by_name;
end;
$$;

revoke all on function public.upsert_oppo_setup_layout(text,text,jsonb,uuid,text) from public;
grant execute on function public.upsert_oppo_setup_layout(text,text,jsonb,uuid,text) to authenticated;

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

-- Garante que inserts antigos e novos sempre recebam uma PK UUID válida.
-- O frontend também envia o UUID, mas o default protege triggers e clientes legados.
alter table public.oppo_requests alter column id set default gen_random_uuid();
alter table public.oppo_requests alter column id set not null;

create table if not exists public.oppo_setup_layouts (
  product_key text not null,
  target_role text not null check (target_role in ('ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE')),
  posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  primary key (product_key, target_role)
);
-- Migration helpers (layout por setor)
alter table public.oppo_setup_layouts add column if not exists target_role text;
update public.oppo_setup_layouts set target_role = 'ENGENHARIA_PROCESSO' where target_role is null;
alter table public.oppo_setup_layouts alter column target_role set not null;
alter table public.oppo_setup_layouts drop constraint if exists oppo_setup_layouts_target_role_check;
alter table public.oppo_setup_layouts add constraint oppo_setup_layouts_target_role_check check (target_role in ('ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE'));
alter table public.oppo_setup_layouts drop constraint if exists oppo_setup_layouts_pkey;
alter table public.oppo_setup_layouts add primary key (product_key, target_role);

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
  check (role in ('PRODUCAO', 'QUALIDADE', 'AREA_KIT', 'PCP', 'ENGENHARIA_SETUP', 'ENGENHARIA_TESTE', 'ENGENHARIA_AUTOMACAO', 'ENGENHARIA_PROCESSO', 'ALMOXERIFADO', 'DEV_ADMIN'));

alter table public.setup_requests drop constraint if exists setup_requests_status_check;
alter table public.setup_requests
  add constraint setup_requests_status_check
  check (status in ('PENDING_QUALITY', 'PENDING_KIT', 'PENDING_QUALITY_AND_KIT', 'PENDING_SETUP_AND_KIT', 'PENDING_SETUP', 'IN_PROGRESS', 'PENDING_KIT_AFTER_SETUP', 'PENDING_TESTE', 'TESTE_IN_PROGRESS', 'PENDING_PROCESSO', 'PROCESSO_IN_PROGRESS', 'PENDING_AUTOMACAO', 'AUTOMACAO_IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

alter table public.oppo_requests drop constraint if exists oppo_requests_status_check;
alter table public.oppo_requests
  add constraint oppo_requests_status_check
  check (status in ('ABERTO', 'SEPARACAO', 'CONFERINDO', 'FINALIZADO_ALMOXERIFADO', 'CONCLUIDO', 'DIVERGENCIA'));

alter table public.oppo_requests drop constraint if exists oppo_requests_line_type_check;
alter table public.oppo_requests
  add constraint oppo_requests_line_type_check
  check (line_type is null or line_type in ('MONTAGEM', 'MONTAGEM/TESTE', 'EMBALAGEM'));

alter table public.oppo_setup_requests drop constraint if exists oppo_setup_requests_line_type_check;
alter table public.oppo_setup_requests
  add constraint oppo_setup_requests_line_type_check
  check (line_type in ('MONTAGEM', 'MONTAGEM/TESTE', 'EMBALAGEM'));

alter table public.users enable row level security;
alter table public.setup_requests enable row level security;
alter table public.oppo_requests enable row level security;
alter table public.oppo_setup_layouts enable row level security;
alter table public.oppo_setup_requests enable row level security;

-- Migration helpers for existing projects
alter table public.oppo_setup_requests add column if not exists production_order text;
alter table public.oppo_setup_requests add column if not exists target_role text not null default 'ENGENHARIA_PROCESSO';
alter table public.oppo_setup_requests add column if not exists finished_at timestamptz;
alter table public.oppo_setup_requests drop constraint if exists oppo_setup_requests_target_role_check;
alter table public.oppo_setup_requests
  add constraint oppo_setup_requests_target_role_check
  check (target_role in ('ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE'));

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
  -- `created_by` is set in a BEFORE INSERT trigger; allow the insert as long as the user is authenticated.
  with check (auth.uid() is not null);

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
  using (
    lower(auth.jwt() ->> 'email') in ('victor.lopo@grupomultilaser.com.br', 'victorlopo77@gmail.com')
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
  );

drop policy if exists "oppo_requests_select_all_authenticated" on public.oppo_requests;
create policy "oppo_requests_select_all_authenticated"
  on public.oppo_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('DEV_ADMIN', 'ALMOXERIFADO')
    )
    or created_by = auth.uid()
    or almox_by = auth.uid()
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_PROCESSO]%'
    )
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_TESTE]%'
    )
  );

drop policy if exists "oppo_requests_insert_authenticated" on public.oppo_requests;
create policy "oppo_requests_insert_authenticated"
  on public.oppo_requests
  for insert
  to authenticated
  -- `created_by` is set in a BEFORE INSERT trigger; allow the insert as long as the user is authenticated.
  with check (auth.uid() is not null);

drop policy if exists "oppo_requests_update_authenticated" on public.oppo_requests;
create policy "oppo_requests_update_authenticated"
  on public.oppo_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('DEV_ADMIN', 'ALMOXERIFADO')
    )
    or created_by = auth.uid()
    or almox_by = auth.uid()
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_PROCESSO]%'
    )
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_TESTE]%'
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('DEV_ADMIN', 'ALMOXERIFADO')
    )
    or created_by = auth.uid()
    or almox_by = auth.uid()
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_PROCESSO]%'
    )
    or (
      call_type = 'SOLICITACAO_DISPOSITIVO'
      and notes like '%[SETUP_SESSION:%'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and notes like '%[SETUP_TARGET_ROLE:ENGENHARIA_TESTE]%'
    )
  );

-- Permite limpeza de histórico somente para emails de admin (mesma regra do setup_requests).
drop policy if exists "oppo_requests_delete_dev_only" on public.oppo_requests;
create policy "oppo_requests_delete_dev_only"
  on public.oppo_requests
  for delete
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in ('victor.lopo@grupomultilaser.com.br', 'victorlopo77@gmail.com', 'devsistemasetup@gmail.com.br')
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
  );

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
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
    or created_by = auth.uid()
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and target_role = 'ENGENHARIA_PROCESSO'
    )
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and target_role = 'ENGENHARIA_TESTE'
    )
  );

drop policy if exists "oppo_setup_requests_insert_authenticated" on public.oppo_setup_requests;
create policy "oppo_setup_requests_insert_authenticated"
  on public.oppo_setup_requests
  for insert
  to authenticated
  -- `created_by` is set in a BEFORE INSERT trigger; allow the insert as long as the user is authenticated.
  with check (auth.uid() is not null);

drop policy if exists "oppo_setup_requests_update_authenticated" on public.oppo_setup_requests;
create policy "oppo_setup_requests_update_authenticated"
  on public.oppo_setup_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
    or created_by = auth.uid()
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and target_role = 'ENGENHARIA_PROCESSO'
    )
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and target_role = 'ENGENHARIA_TESTE'
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
    or created_by = auth.uid()
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_PROCESSO'
      )
      and target_role = 'ENGENHARIA_PROCESSO'
    )
    or (
      exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ENGENHARIA_TESTE'
      )
      and target_role = 'ENGENHARIA_TESTE'
    )
  );

drop policy if exists "oppo_setup_requests_delete_dev_only" on public.oppo_setup_requests;
create policy "oppo_setup_requests_delete_dev_only"
  on public.oppo_setup_requests
  for delete
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in ('victor.lopo@grupomultilaser.com.br', 'victorlopo77@gmail.com', 'devsistemasetup@gmail.com.br')
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'DEV_ADMIN'
    )
  );
