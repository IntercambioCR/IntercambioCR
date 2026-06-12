do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_transaction_type') then
    create type credit_transaction_type as enum (
      'emision',
      'intercambio',
      'compra',
      'ajuste_admin',
      'devolucion',
      'cancelacion'
    );
  end if;
end $$;

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type credit_transaction_type not null,
  amount integer not null check (amount <> 0),
  previous_balance integer not null check (previous_balance >= 0),
  new_balance integer not null check (new_balance >= 0),
  description text not null,
  related_item_id uuid,
  related_offer_id uuid references listing_offers(id),
  related_purchase_id uuid references purchases(id),
  related_intake_id uuid references platform_intakes(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint credit_transaction_balance_math check (previous_balance + amount = new_balance)
);

create index if not exists credit_transactions_user_created_idx on credit_transactions (user_id, created_at desc);
create index if not exists credit_transactions_offer_idx on credit_transactions (related_offer_id);

alter table credit_transactions enable row level security;

drop policy if exists "Users see own credit transactions" on credit_transactions;
create policy "Users see own credit transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Admins read credit transactions" on credit_transactions;
create policy "Admins read credit transactions"
  on credit_transactions for select
  using (is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offer_type_matches_value'
      and conrelid = 'listing_offers'::regclass
  ) then
    alter table listing_offers
      add constraint offer_type_matches_value check (
        (offer_type = 'credits' and credits > 0 and offered_listing_id is null and offered_item_description is null)
        or (offer_type = 'item' and credits = 0 and (offered_listing_id is not null or offered_item_description is not null))
        or (offer_type = 'mixed' and credits > 0 and (offered_listing_id is not null or offered_item_description is not null))
      );
  end if;
end $$;

create or replace function public.record_credit_movement(
  p_user_id uuid,
  p_purchase_id uuid,
  p_intake_id uuid,
  p_type credit_movement_type,
  p_amount integer,
  p_note text,
  p_created_by uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row credit_accounts%rowtype;
  transaction_type credit_transaction_type;
  should_record_transaction boolean := false;
begin
  select *
  into account_row
  from credit_accounts
  where user_id = p_user_id;

  insert into credit_movements (
    user_id,
    related_purchase_id,
    related_intake_id,
    movement_type,
    amount,
    balance_available,
    balance_held,
    balance_pending,
    balance_frozen,
    note,
    created_by
  )
  values (
    p_user_id,
    p_purchase_id,
    p_intake_id,
    p_type,
    p_amount,
    account_row.available,
    account_row.held,
    account_row.pending,
    account_row.frozen,
    p_note,
    p_created_by
  );

  transaction_type := case p_type
    when 'platform_issue' then 'emision'::credit_transaction_type
    when 'purchase_hold' then 'compra'::credit_transaction_type
    when 'purchase_release' then 'intercambio'::credit_transaction_type
    when 'purchase_refund' then 'devolucion'::credit_transaction_type
    when 'admin_adjustment' then 'ajuste_admin'::credit_transaction_type
    else null
  end;

  should_record_transaction :=
    transaction_type is not null
    and (
      p_type in ('platform_issue', 'purchase_hold', 'purchase_refund', 'admin_adjustment')
      or (p_type = 'purchase_release' and p_amount > 0)
    );

  if should_record_transaction then
    insert into credit_transactions (
      user_id,
      type,
      amount,
      previous_balance,
      new_balance,
      description,
      related_item_id,
      related_offer_id,
      related_purchase_id,
      related_intake_id,
      created_by
    )
    values (
      p_user_id,
      transaction_type,
      p_amount,
      account_row.available - p_amount,
      account_row.available,
      coalesce(p_note, p_type::text),
      null,
      null,
      p_purchase_id,
      p_intake_id,
      p_created_by
    );
  end if;
end;
$$;

create or replace function public.respond_listing_offer(
  p_offer_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  offer_row listing_offers%rowtype;
  listing_row listings%rowtype;
  purchase_id uuid;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception 'invalid_offer_status';
  end if;

  select *
  into offer_row
  from listing_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'offer_not_found';
  end if;

  if offer_row.receiver_id <> actor_id then
    raise exception 'not_offer_receiver';
  end if;

  if offer_row.status <> 'submitted' then
    raise exception 'offer_already_resolved';
  end if;

  if p_status = 'rejected' then
    update listing_offers
    set status = 'rejected',
        updated_at = now()
    where id = p_offer_id;

    return null;
  end if;

  select *
  into listing_row
  from listings
  where id = offer_row.listing_id
  for update;

  if not found or listing_row.status <> 'available' then
    raise exception 'listing_not_available';
  end if;

  if listing_row.seller_id <> actor_id then
    raise exception 'not_listing_owner';
  end if;

  if offer_row.credits < 0 then
    raise exception 'invalid_credit_amount';
  end if;

  if offer_row.offer_type in ('credits', 'mixed') and offer_row.credits <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  if offer_row.credits > 0 then
    update credit_accounts
    set available = available - offer_row.credits,
        held = held + offer_row.credits,
        updated_at = now()
    where user_id = offer_row.sender_id
      and available >= offer_row.credits;

    if not found then
      raise exception 'insufficient_credits';
    end if;

    insert into purchases (listing_id, buyer_id, seller_id, credits, status)
    values (offer_row.listing_id, offer_row.sender_id, offer_row.receiver_id, offer_row.credits, 'seller_accepted')
    returning id into purchase_id;

    insert into chat_threads (purchase_id)
    values (purchase_id);

    perform record_credit_movement(
      offer_row.sender_id,
      purchase_id,
      null,
      'purchase_hold',
      -offer_row.credits,
      'Créditos retenidos por oferta aceptada',
      actor_id
    );

    update credit_transactions
    set related_offer_id = offer_row.id
    where user_id = offer_row.sender_id
      and related_purchase_id = purchase_id
      and type = 'compra';
  end if;

  update listing_offers
  set status = 'accepted',
      updated_at = now()
  where id = p_offer_id;

  update listing_offers
  set status = 'rejected',
      updated_at = now()
  where listing_id = offer_row.listing_id
    and id <> p_offer_id
    and status = 'submitted';

  update listings
  set status = case when offer_row.credits > 0 then 'in_process'::listing_status else 'reserved'::listing_status end,
      updated_at = now()
  where id = offer_row.listing_id;

  return purchase_id;
end;
$$;

drop policy if exists "Offer receiver updates status" on listing_offers;

revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from public;
revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from anon;
revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from authenticated;

revoke execute on function public.respond_listing_offer(uuid, text) from anon;
grant execute on function public.respond_listing_offer(uuid, text) to authenticated;

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
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_offered_credits <= 0 then
    raise exception 'invalid_amount';
  end if;

  update platform_intakes
  set offered_credits = p_offered_credits,
      inspection_notes = p_notes,
      status = 'approved',
      updated_at = now()
  where id = p_intake_id
    and status in ('submitted', 'offer_made', 'scheduled', 'received', 'approved');

  if not found then
    raise exception 'intake_not_found_or_locked';
  end if;
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
    'Créditos emitidos por artículo recibido y aprobado en Escazú',
    auth.uid()
  );
end;
$$;
