-- Intercambio CR - esquema completo para Supabase SQL Editor
-- Proyecto esperado: Intercambio CR
-- Ejecutar en Supabase > SQL Editor sobre el proyecto correcto.
-- Este script crea tipos, tablas, indices, funciones, trigger de auth y politicas RLS.

create extension if not exists "pgcrypto";

create type user_role as enum ('user', 'admin');
create type credit_movement_type as enum (
  'platform_issue',
  'purchase_hold',
  'purchase_release',
  'purchase_refund',
  'admin_adjustment',
  'freeze',
  'unfreeze'
);
create type credit_transaction_type as enum (
  'emision',
  'intercambio',
  'compra',
  'ajuste_admin',
  'devolucion',
  'cancelacion'
);
create type listing_status as enum ('available', 'reserved', 'in_process', 'completed', 'cancelled', 'removed');
create type purchase_status as enum ('requested', 'seller_accepted', 'buyer_confirmed', 'seller_confirmed', 'completed', 'cancelled', 'disputed');
create type intake_status as enum ('submitted', 'offer_made', 'scheduled', 'received', 'approved', 'rejected', 'paid');
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type listing_offer_type as enum ('credits', 'item', 'mixed');
create type listing_offer_status as enum ('submitted', 'accepted', 'rejected', 'cancelled');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  full_name text not null,
  avatar_url text,
  location text,
  bio text,
  rating numeric(3,2) not null default 0,
  completed_trades integer not null default 0,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table credit_accounts (
  user_id uuid primary key references profiles(id) on delete cascade,
  available integer not null default 0 check (available >= 0),
  held integer not null default 0 check (held >= 0),
  pending integer not null default 0 check (pending >= 0),
  frozen integer not null default 0 check (frozen >= 0),
  updated_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id),
  title text not null,
  category text not null,
  description text not null,
  condition text not null,
  credit_price integer check (credit_price is null or credit_price > 0),
  looking_for text,
  location text not null,
  status listing_status not null default 'available',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table platform_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  title text not null,
  category text not null,
  condition text not null,
  description text not null,
  requested_notes text,
  offered_credits integer check (offered_credits > 0),
  status intake_status not null default 'submitted',
  dropoff_location text not null default 'Escazú Centro o Alajuela Centro',
  inspection_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table intake_images (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references platform_intakes(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  credits integer not null check (credits > 0),
  status purchase_status not null default 'requested',
  buyer_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint buyer_seller_different check (buyer_id <> seller_id)
);

create table listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  receiver_id uuid not null references profiles(id),
  offer_type listing_offer_type not null,
  credits integer not null default 0 check (credits >= 0),
  offered_listing_id uuid references listings(id),
  offered_item_description text,
  message text,
  status listing_offer_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_participants_different check (sender_id <> receiver_id),
  constraint offer_has_value check (
    credits > 0 or offered_listing_id is not null or offered_item_description is not null
  ),
  constraint offer_type_matches_value check (
    (offer_type = 'credits' and credits > 0 and offered_listing_id is null and offered_item_description is null)
    or (offer_type = 'item' and credits = 0 and (offered_listing_id is not null or offered_item_description is not null))
    or (offer_type = 'mixed' and credits > 0 and (offered_listing_id is not null or offered_item_description is not null))
  )
);

create table direct_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id),
  constraint conversation_participants_different check (buyer_id <> seller_id)
);

create table direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references direct_conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table credit_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  related_purchase_id uuid references purchases(id),
  related_intake_id uuid references platform_intakes(id),
  movement_type credit_movement_type not null,
  amount integer not null,
  balance_available integer not null,
  balance_held integer not null,
  balance_pending integer not null,
  balance_frozen integer not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table credit_transactions (
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

create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text,
  image_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint message_has_content check (body is not null or image_path is not null)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  reported_user_id uuid references profiles(id),
  listing_id uuid references listings(id),
  purchase_id uuid references purchases(id),
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id),
  reviewer_id uuid not null references profiles(id),
  reviewed_user_id uuid not null references profiles(id),
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (purchase_id, reviewer_id)
);

create index listings_status_created_idx on listings (status, created_at desc);
create index purchases_buyer_status_idx on purchases (buyer_id, status);
create index purchases_seller_status_idx on purchases (seller_id, status);
create index listing_offers_listing_status_idx on listing_offers (listing_id, status, created_at desc);
create index listing_offers_sender_status_idx on listing_offers (sender_id, status);
create index listing_offers_receiver_status_idx on listing_offers (receiver_id, status);
create index direct_conversations_buyer_idx on direct_conversations (buyer_id, updated_at desc);
create index direct_conversations_seller_idx on direct_conversations (seller_id, updated_at desc);
create index direct_messages_conversation_created_idx on direct_messages (conversation_id, created_at);
create index credit_movements_user_created_idx on credit_movements (user_id, created_at desc);
create index credit_transactions_user_created_idx on credit_transactions (user_id, created_at desc);
create index credit_transactions_offer_idx on credit_transactions (related_offer_id);
create index reports_status_created_idx on reports (status, created_at desc);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuario Intercambio'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into credit_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

create or replace function public.create_purchase_request(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer_id uuid := auth.uid();
  listing_row listings%rowtype;
  purchase_id uuid;
begin
  if buyer_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into listing_row
  from listings
  where id = p_listing_id
  for update;

  if not found or listing_row.status <> 'available' then
    raise exception 'listing_not_available';
  end if;

  if listing_row.seller_id = buyer_id then
    raise exception 'cannot_buy_own_listing';
  end if;

  update credit_accounts
  set available = available - listing_row.credit_price,
      held = held + listing_row.credit_price,
      updated_at = now()
  where user_id = buyer_id
    and available >= listing_row.credit_price;

  if not found then
    raise exception 'insufficient_credits';
  end if;

  update listings
  set status = 'reserved',
      updated_at = now()
  where id = listing_row.id;

  insert into purchases (listing_id, buyer_id, seller_id, credits)
  values (listing_row.id, buyer_id, listing_row.seller_id, listing_row.credit_price)
  returning id into purchase_id;

  insert into chat_threads (purchase_id)
  values (purchase_id);

  perform record_credit_movement(
    buyer_id,
    purchase_id,
    null,
    'purchase_hold',
    -listing_row.credit_price,
    'Créditos retenidos por solicitud de artículo'
  );

  return purchase_id;
end;
$$;

create or replace function public.seller_accept_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_row purchases%rowtype;
begin
  select *
  into purchase_row
  from purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'purchase_not_found';
  end if;

  if purchase_row.seller_id <> auth.uid() then
    raise exception 'not_purchase_seller';
  end if;

  if purchase_row.status <> 'requested' then
    raise exception 'invalid_purchase_status';
  end if;

  update purchases
  set status = 'seller_accepted'
  where id = p_purchase_id;

  update listings
  set status = 'in_process',
      updated_at = now()
  where id = purchase_row.listing_id;
end;
$$;

create or replace function public.confirm_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  purchase_row purchases%rowtype;
  buyer_done boolean;
  seller_done boolean;
begin
  select *
  into purchase_row
  from purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'purchase_not_found';
  end if;

  if actor_id not in (purchase_row.buyer_id, purchase_row.seller_id) then
    raise exception 'not_purchase_participant';
  end if;

  if purchase_row.status not in ('seller_accepted', 'buyer_confirmed', 'seller_confirmed') then
    raise exception 'invalid_purchase_status';
  end if;

  if actor_id = purchase_row.buyer_id then
    update purchases
    set buyer_confirmed_at = coalesce(buyer_confirmed_at, now())
    where id = p_purchase_id;
  else
    update purchases
    set seller_confirmed_at = coalesce(seller_confirmed_at, now())
    where id = p_purchase_id;
  end if;

  select buyer_confirmed_at is not null, seller_confirmed_at is not null
  into buyer_done, seller_done
  from purchases
  where id = p_purchase_id;

  if buyer_done and seller_done then
    update credit_accounts
    set held = held - purchase_row.credits,
        updated_at = now()
    where user_id = purchase_row.buyer_id
      and held >= purchase_row.credits;

    if not found then
      raise exception 'held_credits_missing';
    end if;

    perform record_credit_movement(
      purchase_row.buyer_id,
      p_purchase_id,
      null,
      'purchase_release',
      -purchase_row.credits,
      'Créditos retenidos liberados a la persona oferente'
    );

    update credit_accounts
    set available = available + purchase_row.credits,
        updated_at = now()
    where user_id = purchase_row.seller_id;

    perform record_credit_movement(
      purchase_row.seller_id,
      p_purchase_id,
      null,
      'purchase_release',
      purchase_row.credits,
      'Créditos recibidos por intercambio completado'
    );

    update purchases
    set status = 'completed',
        completed_at = now()
    where id = p_purchase_id;

    update listings
    set status = 'completed',
        updated_at = now()
    where id = purchase_row.listing_id;
  elsif buyer_done then
    update purchases set status = 'buyer_confirmed' where id = p_purchase_id;
  elsif seller_done then
    update purchases set status = 'seller_confirmed' where id = p_purchase_id;
  end if;
end;
$$;

create or replace function public.cancel_purchase(p_purchase_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  purchase_row purchases%rowtype;
begin
  select *
  into purchase_row
  from purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'purchase_not_found';
  end if;

  if actor_id not in (purchase_row.buyer_id, purchase_row.seller_id) and not is_admin() then
    raise exception 'not_allowed';
  end if;

  if purchase_row.status in ('completed', 'cancelled') then
    raise exception 'invalid_purchase_status';
  end if;

  update credit_accounts
  set held = held - purchase_row.credits,
      available = available + purchase_row.credits,
      updated_at = now()
  where user_id = purchase_row.buyer_id
    and held >= purchase_row.credits;

  if not found then
    raise exception 'held_credits_missing';
  end if;

  update purchases
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_purchase_id;

  update listings
  set status = 'available',
      updated_at = now()
  where id = purchase_row.listing_id;

  perform record_credit_movement(
    purchase_row.buyer_id,
    p_purchase_id,
    null,
    'purchase_refund',
    purchase_row.credits,
    coalesce(p_note, 'Solicitud cancelada, créditos devueltos')
  );
end;
$$;

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
    'Créditos emitidos por artículo recibido y aprobado en Escazú Centro o Alajuela Centro'
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

  if p_status not in ('available', 'cancelled', 'removed') then
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

create or replace function public.dispute_purchase(p_purchase_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  purchase_row purchases%rowtype;
begin
  select *
  into purchase_row
  from purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'purchase_not_found';
  end if;

  if actor_id not in (purchase_row.buyer_id, purchase_row.seller_id) then
    raise exception 'not_purchase_participant';
  end if;

  update purchases
  set status = 'disputed'
  where id = p_purchase_id
    and status <> 'completed';

  insert into reports (reporter_id, reported_user_id, listing_id, purchase_id, reason, details)
  values (
    actor_id,
    case when actor_id = purchase_row.buyer_id then purchase_row.seller_id else purchase_row.buyer_id end,
    purchase_row.listing_id,
    p_purchase_id,
    'Disputa de intercambio',
    p_reason
  );
end;
$$;

alter table profiles enable row level security;
alter table credit_accounts enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table intake_images enable row level security;
alter table platform_intakes enable row level security;
alter table purchases enable row level security;
alter table listing_offers enable row level security;
alter table direct_conversations enable row level security;
alter table direct_messages enable row level security;
alter table credit_movements enable row level security;
alter table credit_transactions enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table reports enable row level security;
alter table ratings enable row level security;

create policy "Profiles are public unless blocked"
  on profiles for select
  using (is_blocked = false or auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Listings are public"
  on listings for select
  using (status <> 'removed');

create policy "Users manage own listings"
  on listings for all
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create policy "Users see own credit account"
  on credit_accounts for select
  using (auth.uid() = user_id);

create policy "Users see own credit movements"
  on credit_movements for select
  using (auth.uid() = user_id);

create policy "Users see own credit transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);

create policy "Users manage own intakes"
  on platform_intakes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Purchase participants can read"
  on purchases for select
  using (auth.uid() in (buyer_id, seller_id));

create policy "Offer participants can read"
  on listing_offers for select
  using (auth.uid() in (sender_id, receiver_id));

create policy "Users create own offers"
  on listing_offers for insert
  with check (auth.uid() = sender_id and auth.uid() <> receiver_id);

create policy "Conversation participants can read"
  on direct_conversations for select
  using (auth.uid() in (buyer_id, seller_id));

create policy "Users create own conversations"
  on direct_conversations for insert
  with check (auth.uid() = buyer_id and auth.uid() <> seller_id);

create policy "Direct message participants can read"
  on direct_messages for select
  using (
    exists (
      select 1
      from direct_conversations
      where direct_conversations.id = direct_messages.conversation_id
        and auth.uid() in (direct_conversations.buyer_id, direct_conversations.seller_id)
    )
  );

create policy "Direct message participants can send"
  on direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from direct_conversations
      where direct_conversations.id = direct_messages.conversation_id
        and auth.uid() in (direct_conversations.buyer_id, direct_conversations.seller_id)
    )
  );

create policy "Buyer creates purchase request"
  on purchases for insert
  with check (auth.uid() = buyer_id);

create policy "Reports created by users"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "Reporters can read reports"
  on reports for select
  using (auth.uid() = reporter_id);

create policy "Ratings are public"
  on ratings for select
  using (true);

create policy "Admins read profiles"
  on profiles for select
  using (is_admin());

create policy "Admins manage profiles"
  on profiles for update
  using (is_admin());

create policy "Admins read credit accounts"
  on credit_accounts for select
  using (is_admin());

create policy "Admins read credit movements"
  on credit_movements for select
  using (is_admin());

create policy "Admins read credit transactions"
  on credit_transactions for select
  using (is_admin());

create policy "Admins manage listings"
  on listings for all
  using (is_admin())
  with check (is_admin());

create policy "Listing images are public"
  on listing_images for select
  using (
    exists (
      select 1 from listings
      where listings.id = listing_images.listing_id
        and listings.status <> 'removed'
    )
  );

create policy "Users manage own listing images"
  on listing_images for all
  using (
    exists (
      select 1 from listings
      where listings.id = listing_images.listing_id
        and listings.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from listings
      where listings.id = listing_images.listing_id
        and listings.seller_id = auth.uid()
    )
  );

create policy "Users manage own intake images"
  on intake_images for all
  using (
    exists (
      select 1 from platform_intakes
      where platform_intakes.id = intake_images.intake_id
        and platform_intakes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from platform_intakes
      where platform_intakes.id = intake_images.intake_id
        and platform_intakes.user_id = auth.uid()
    )
  );

create policy "Admins manage intake images"
  on intake_images for all
  using (is_admin())
  with check (is_admin());

create policy "Admins manage intakes"
  on platform_intakes for all
  using (is_admin())
  with check (is_admin());

create policy "Admins read purchases"
  on purchases for select
  using (is_admin());

create policy "Admins read listing offers"
  on listing_offers for select
  using (is_admin());

create policy "Admins read direct conversations"
  on direct_conversations for select
  using (is_admin());

create policy "Admins read direct messages"
  on direct_messages for select
  using (is_admin());

create policy "Thread participants can read"
  on chat_threads for select
  using (
    exists (
      select 1 from purchases
      where purchases.id = chat_threads.purchase_id
        and auth.uid() in (purchases.buyer_id, purchases.seller_id)
    )
  );

create policy "Message participants can read"
  on chat_messages for select
  using (
    exists (
      select 1
      from chat_threads
      join purchases on purchases.id = chat_threads.purchase_id
      where chat_threads.id = chat_messages.thread_id
        and auth.uid() in (purchases.buyer_id, purchases.seller_id)
    )
  );

create policy "Message participants can send"
  on chat_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from chat_threads
      join purchases on purchases.id = chat_threads.purchase_id
      where chat_threads.id = chat_messages.thread_id
        and auth.uid() in (purchases.buyer_id, purchases.seller_id)
    )
  );

create policy "Admins manage reports"
  on reports for all
  using (is_admin())
  with check (is_admin());

revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from public;
revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from anon;
revoke execute on function public.record_credit_movement(uuid, uuid, uuid, credit_movement_type, integer, text, uuid) from authenticated;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke update on profiles from authenticated;
grant update (full_name, avatar_url, location, bio) on profiles to authenticated;

revoke execute on function public.respond_listing_offer(uuid, text) from anon;
grant execute on function public.respond_listing_offer(uuid, text) to authenticated;

-- ============================================================
-- Notificaciones privadas para entregas y eventos de usuario
-- ============================================================

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
