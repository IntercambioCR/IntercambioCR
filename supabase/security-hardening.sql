-- Intercambio CR - refuerzo de seguridad posterior al esquema base
-- Ejecutar en Supabase SQL Editor sobre el proyecto correcto de Intercambio CR.
-- Este script es idempotente en lo posible y no reemplaza el esquema completo.

create extension if not exists "pgcrypto";

-- 1) Funcion segura para validar administradores por usuario explicito.
-- Mantiene tambien la funcion is_admin() usada por politicas existentes.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'admin'
      and is_blocked = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2) Aceptacion legal trazable.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

-- 3) Auditoria de eventos sensibles.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_idx
  on public.audit_events (created_at desc);

create index if not exists audit_events_actor_idx
  on public.audit_events (actor_id, created_at desc);

alter table public.audit_events enable row level security;

drop policy if exists "Admins read audit events" on public.audit_events;
create policy "Admins read audit events"
  on public.audit_events
  for select
  using (public.is_admin());

drop policy if exists "System writes audit events" on public.audit_events;
create policy "System writes audit events"
  on public.audit_events
  for insert
  with check (public.is_admin(coalesce(actor_id, auth.uid())));

create or replace function public.log_audit_event(
  p_event_type text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_target_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_events (
    actor_id,
    target_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    p_target_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.log_audit_event(text, text, uuid, uuid, jsonb) from public;
grant execute on function public.log_audit_event(text, text, uuid, uuid, jsonb) to authenticated;

-- 4) Auditoria automatica de cambios criticos en perfiles.
create or replace function public.audit_profile_security_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_events (
      actor_id,
      target_user_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    )
    values (
      auth.uid(),
      new.id,
      'role_changed',
      'profiles',
      new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role)
    );
  end if;

  if old.is_blocked is distinct from new.is_blocked then
    insert into public.audit_events (
      actor_id,
      target_user_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    )
    values (
      auth.uid(),
      new.id,
      'user_block_status_changed',
      'profiles',
      new.id,
      jsonb_build_object('old_is_blocked', old.is_blocked, 'new_is_blocked', new.is_blocked)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_profile_security_changes on public.profiles;
create trigger audit_profile_security_changes
  after update of role, is_blocked on public.profiles
  for each row execute procedure public.audit_profile_security_changes();

-- 5) Reportes de mensajes sin abrir todos los mensajes privados a admin.
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, message_id)
);

create index if not exists message_reports_status_created_idx
  on public.message_reports (status, created_at desc);

alter table public.message_reports enable row level security;

drop policy if exists "Participants create message reports" on public.message_reports;
create policy "Participants create message reports"
  on public.message_reports
  for insert
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1
      from public.direct_conversations dc
      where dc.id = conversation_id
        and auth.uid() in (dc.buyer_id, dc.seller_id)
    )
    and exists (
      select 1
      from public.direct_messages dm
      where dm.id = message_id
        and dm.conversation_id = message_reports.conversation_id
    )
  );

drop policy if exists "Reporters read own message reports" on public.message_reports;
create policy "Reporters read own message reports"
  on public.message_reports
  for select
  using (reporter_id = auth.uid());

drop policy if exists "Admins manage message reports" on public.message_reports;
create policy "Admins manage message reports"
  on public.message_reports
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Quita lectura general de mensajes privados por admin. Admin debe revisar solo mensajes reportados.
drop policy if exists "Admins read direct conversations" on public.direct_conversations;
drop policy if exists "Admins read direct messages" on public.direct_messages;

create or replace view public.admin_reported_messages
with (security_invoker = true)
as
select
  mr.id as report_id,
  mr.reason,
  mr.details,
  mr.status,
  mr.created_at as reported_at,
  dm.id as message_id,
  dm.body,
  dm.sender_id,
  dm.created_at as message_created_at,
  dc.id as conversation_id,
  dc.listing_id,
  dc.buyer_id,
  dc.seller_id
from public.message_reports mr
join public.direct_messages dm on dm.id = mr.message_id
join public.direct_conversations dc on dc.id = mr.conversation_id
where public.is_admin();

grant select on public.admin_reported_messages to authenticated;

-- 6) Reglas de integridad adicionales para evitar datos gigantes o HTML innecesario.
alter table public.listings
  drop constraint if exists listings_title_length,
  add constraint listings_title_length check (char_length(trim(title)) between 3 and 120),
  drop constraint if exists listings_description_length,
  add constraint listings_description_length check (char_length(trim(description)) between 10 and 2000);

alter table public.platform_intakes
  drop constraint if exists platform_intakes_title_length,
  add constraint platform_intakes_title_length check (char_length(trim(title)) between 3 and 120),
  drop constraint if exists platform_intakes_description_length,
  add constraint platform_intakes_description_length check (char_length(trim(description)) between 10 and 2000);

alter table public.direct_messages
  drop constraint if exists direct_messages_body_length,
  add constraint direct_messages_body_length check (char_length(trim(body)) between 1 and 1000);

alter table public.reports
  drop constraint if exists reports_reason_length,
  add constraint reports_reason_length check (char_length(trim(reason)) between 3 and 120),
  drop constraint if exists reports_details_length,
  add constraint reports_details_length check (details is null or char_length(trim(details)) <= 1200);

-- 7) Grants defensivos: usuarios autenticados no deben actualizar saldos ni ledger directamente.
revoke update, delete on public.credit_accounts from authenticated;
revoke insert, update, delete on public.credit_movements from authenticated;
revoke insert, update, delete on public.credit_transactions from authenticated;

-- Las operaciones de saldo deben pasar por funciones RPC security definer del esquema base.
