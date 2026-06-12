-- Intercambio CR - flujo privado de Entregar a Intercambio CR
-- Ejecutar en Supabase SQL Editor despues de supabase/schema.sql.

do $$
begin
  create type notification_type as enum (
    'intake_submitted',
    'intake_approved',
    'intake_rejected',
    'intake_info_requested',
    'credits_issued',
    'offer_received',
    'message_received',
    'rating_received'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  related_intake_id uuid references platform_intakes(id) on delete cascade,
  related_listing_id uuid references listings(id) on delete set null,
  related_offer_id uuid references listing_offers(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Users read own notifications" on notifications;
create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on notifications;
create policy "Users update own notifications"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read notifications" on notifications;
create policy "Admins read notifications"
  on notifications for select
  using (is_admin());

create or replace function public.admin_make_intake_offer(
  p_intake_id uuid,
  p_offered_credits integer,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row platform_intakes%rowtype;
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_offered_credits is null or p_offered_credits <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  select *
  into intake_row
  from platform_intakes
  where id = p_intake_id
  for update;

  if not found or intake_row.status in ('paid', 'rejected') then
    raise exception 'intake_not_found_or_locked';
  end if;

  update platform_intakes
  set offered_credits = p_offered_credits,
      inspection_notes = p_notes,
      status = 'approved',
      updated_at = now()
  where id = p_intake_id;

  insert into notifications (user_id, type, title, body, related_intake_id)
  values (
    intake_row.user_id,
    'intake_approved',
    'Solicitud aprobada',
    'Intercambio CR aprobó tu solicitud y asignó ' || p_offered_credits || ' credis.',
    p_intake_id
  );
end;
$$;

create or replace function public.admin_request_intake_info(
  p_intake_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row platform_intakes%rowtype;
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_notes is null or length(trim(p_notes)) = 0 then
    raise exception 'missing_notes';
  end if;

  select *
  into intake_row
  from platform_intakes
  where id = p_intake_id
  for update;

  if not found or intake_row.status in ('paid', 'rejected') then
    raise exception 'intake_not_found_or_locked';
  end if;

  update platform_intakes
  set status = 'scheduled',
      inspection_notes = p_notes,
      updated_at = now()
  where id = p_intake_id;

  insert into notifications (user_id, type, title, body, related_intake_id)
  values (
    intake_row.user_id,
    'intake_info_requested',
    'Intercambio CR necesita más información',
    p_notes,
    p_intake_id
  );
end;
$$;

create or replace function public.admin_issue_intake_credits(p_intake_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row platform_intakes%rowtype;
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  select *
  into intake_row
  from platform_intakes
  where id = p_intake_id
  for update;

  if not found then
    raise exception 'intake_not_found';
  end if;

  if intake_row.offered_credits is null or intake_row.offered_credits <= 0 then
    raise exception 'missing_offer';
  end if;

  if intake_row.status <> 'approved' then
    raise exception 'intake_locked';
  end if;

  update credit_accounts
  set available = available + intake_row.offered_credits,
      updated_at = now()
  where user_id = intake_row.user_id;

  update platform_intakes
  set status = 'paid',
      updated_at = now()
  where id = p_intake_id;

  perform record_credit_movement(
    intake_row.user_id,
    null,
    p_intake_id,
    'platform_issue',
    intake_row.offered_credits,
    'Credis emitidos por artículo recibido y aprobado en Escazú',
    auth.uid()
  );

  insert into notifications (user_id, type, title, body, related_intake_id)
  values (
    intake_row.user_id,
    'credits_issued',
    'Credis emitidos',
    'Recibiste ' || intake_row.offered_credits || ' credis por tu entrega aprobada.',
    p_intake_id
  );
end;
$$;

create or replace function public.admin_reject_intake(
  p_intake_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row platform_intakes%rowtype;
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  select *
  into intake_row
  from platform_intakes
  where id = p_intake_id
  for update;

  if not found or intake_row.status in ('paid', 'rejected') then
    raise exception 'intake_not_found_or_locked';
  end if;

  update platform_intakes
  set status = 'rejected',
      inspection_notes = coalesce(p_notes, inspection_notes),
      updated_at = now()
  where id = p_intake_id;

  insert into notifications (user_id, type, title, body, related_intake_id)
  values (
    intake_row.user_id,
    'intake_rejected',
    'Solicitud rechazada',
    coalesce(p_notes, 'Intercambio CR rechazó la solicitud después de revisarla.'),
    p_intake_id
  );
end;
$$;

revoke execute on function public.admin_make_intake_offer(uuid, integer, text) from anon;
revoke execute on function public.admin_request_intake_info(uuid, text) from anon;
revoke execute on function public.admin_issue_intake_credits(uuid) from anon;
revoke execute on function public.admin_reject_intake(uuid, text) from anon;

grant execute on function public.admin_make_intake_offer(uuid, integer, text) to authenticated;
grant execute on function public.admin_request_intake_info(uuid, text) to authenticated;
grant execute on function public.admin_issue_intake_credits(uuid) to authenticated;
grant execute on function public.admin_reject_intake(uuid, text) to authenticated;
