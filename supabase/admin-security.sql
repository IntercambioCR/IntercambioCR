do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'admin');
  end if;
end $$;

alter table profiles
  alter column role set default 'user';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
      and is_blocked = false
  );
$$;

create or replace function public.admin_adjust_credits(
  p_user_id uuid,
  p_amount integer,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;

  update credit_accounts
  set available = available + p_amount,
      updated_at = now()
  where user_id = p_user_id
    and available + p_amount >= 0;

  if not found then
    raise exception 'credit_account_not_found_or_negative_balance';
  end if;

  perform record_credit_movement(
    p_user_id,
    null,
    null,
    'admin_adjustment',
    p_amount,
    coalesce(p_note, 'Ajuste administrativo de créditos'),
    auth.uid()
  );
end;
$$;

create or replace function public.admin_set_user_blocked(
  p_user_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  update profiles
  set is_blocked = p_blocked
  where id = p_user_id
    and id <> auth.uid();

  if not found then
    raise exception 'user_not_found_or_self_block';
  end if;
end;
$$;

create or replace function public.admin_update_listing_status(
  p_listing_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_status not in ('draft', 'available', 'reserved', 'in_process', 'completed', 'cancelled', 'removed') then
    raise exception 'invalid_listing_status';
  end if;

  update listings
  set status = p_status::listing_status,
      updated_at = now(),
      approved_at = case when p_status = 'available' then coalesce(approved_at, now()) else approved_at end
  where id = p_listing_id;

  if not found then
    raise exception 'listing_not_found';
  end if;
end;
$$;

create or replace function public.admin_update_report_status(
  p_report_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid_report_status';
  end if;

  update reports
  set status = p_status::report_status,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else resolved_at end
  where id = p_report_id;

  if not found then
    raise exception 'report_not_found';
  end if;
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
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  update platform_intakes
  set status = 'rejected',
      inspection_notes = coalesce(p_notes, inspection_notes),
      updated_at = now()
  where id = p_intake_id
    and status not in ('paid', 'rejected');

  if not found then
    raise exception 'intake_not_found_or_locked';
  end if;
end;
$$;

drop policy if exists "Admins read profiles" on profiles;
create policy "Admins read profiles"
  on profiles for select
  using (is_admin());

drop policy if exists "Admins manage profiles" on profiles;
create policy "Admins manage profiles"
  on profiles for update
  using (is_admin())
  with check (is_admin());

revoke update on profiles from authenticated;
grant update (full_name, avatar_url, location, bio) on profiles to authenticated;

revoke execute on function public.admin_adjust_credits(uuid, integer, text) from anon;
revoke execute on function public.admin_set_user_blocked(uuid, boolean) from anon;
revoke execute on function public.admin_update_listing_status(uuid, text) from anon;
revoke execute on function public.admin_update_report_status(uuid, text) from anon;
revoke execute on function public.admin_reject_intake(uuid, text) from anon;
