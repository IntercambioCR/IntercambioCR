-- Intercambio CR - mensajes no leidos, ofertas y confirmacion doble de creditos
-- Ejecutar en Supabase SQL Editor.
-- No borra datos existentes.

alter table public.direct_messages
  add column if not exists read_at timestamptz;

alter type public.listing_offer_status add value if not exists 'seller_accepted';
alter type public.listing_offer_status add value if not exists 'completed';

do $$
begin
  if exists (select 1 from pg_type where typname = 'notification_type')
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'notification_type'
         and e.enumlabel = 'offer_received'
     ) then
    alter type public.notification_type add value 'offer_received';
  end if;
end $$;

create index if not exists direct_messages_unread_idx
  on public.direct_messages (conversation_id, sender_id, read_at);

drop policy if exists "Direct message participants mark received read" on public.direct_messages;
create policy "Direct message participants mark received read"
on public.direct_messages
for update
to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1
    from public.direct_conversations dc
    where dc.id = direct_messages.conversation_id
      and auth.uid() in (dc.buyer_id, dc.seller_id)
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1
    from public.direct_conversations dc
    where dc.id = direct_messages.conversation_id
      and auth.uid() in (dc.buyer_id, dc.seller_id)
  )
);

drop policy if exists "Offer sender creates receiver notification" on public.notifications;
create policy "Offer sender creates receiver notification"
on public.notifications
for insert
to authenticated
with check (
  type::text = 'offer_received'
  and exists (
    select 1
    from public.listing_offers lo
    where lo.id = notifications.related_offer_id
      and lo.listing_id = notifications.related_listing_id
      and lo.sender_id = auth.uid()
      and lo.receiver_id = notifications.user_id
  )
);

create or replace function public.seller_respond_listing_offer(
  p_offer_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  offer_row public.listing_offers%rowtype;
  listing_row public.listings%rowtype;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception 'invalid_offer_status';
  end if;

  select *
  into offer_row
  from public.listing_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'offer_not_found';
  end if;

  if offer_row.receiver_id <> actor_id then
    raise exception 'not_offer_receiver';
  end if;

  if offer_row.status::text <> 'submitted' then
    raise exception 'offer_already_resolved';
  end if;

  select *
  into listing_row
  from public.listings
  where id = offer_row.listing_id
  for update;

  if not found or listing_row.status::text <> 'available' then
    raise exception 'listing_not_available';
  end if;

  if listing_row.seller_id <> actor_id then
    raise exception 'not_listing_owner';
  end if;

  if p_status = 'rejected' then
    update public.listing_offers
    set status = 'rejected'::public.listing_offer_status,
        updated_at = now()
    where id = p_offer_id;
    return;
  end if;

  if offer_row.offer_type::text in ('credits', 'mixed') and offer_row.credits <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  if offer_row.credits > 0 and not exists (
    select 1
    from public.credit_accounts
    where user_id = offer_row.sender_id
      and available >= offer_row.credits
  ) then
    raise exception 'insufficient_credits';
  end if;

  execute
    'update public.listing_offers set status = $1::public.listing_offer_status, updated_at = now() where id = $2'
    using 'seller_accepted', p_offer_id;
end;
$$;

create or replace function public.buyer_confirm_credit_offer(
  p_offer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  offer_row public.listing_offers%rowtype;
  listing_row public.listings%rowtype;
  purchase_id uuid;
  buyer_before integer;
  seller_before integer;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into offer_row
  from public.listing_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'offer_not_found';
  end if;

  if offer_row.sender_id <> actor_id then
    raise exception 'not_offer_sender';
  end if;

  if offer_row.status::text <> 'seller_accepted' then
    raise exception 'offer_not_ready';
  end if;

  if offer_row.credits <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  select *
  into listing_row
  from public.listings
  where id = offer_row.listing_id
  for update;

  if not found or listing_row.status::text <> 'available' then
    raise exception 'listing_not_available';
  end if;

  select available
  into buyer_before
  from public.credit_accounts
  where user_id = offer_row.sender_id
  for update;

  if buyer_before is null or buyer_before < offer_row.credits then
    raise exception 'insufficient_credits';
  end if;

  select available
  into seller_before
  from public.credit_accounts
  where user_id = offer_row.receiver_id
  for update;

  if seller_before is null then
    insert into public.credit_accounts (user_id, available)
    values (offer_row.receiver_id, 0)
    on conflict (user_id) do nothing;

    select available
    into seller_before
    from public.credit_accounts
    where user_id = offer_row.receiver_id
    for update;
  end if;

  update public.credit_accounts
  set available = available - offer_row.credits,
      updated_at = now()
  where user_id = offer_row.sender_id
    and available >= offer_row.credits;

  if not found then
    raise exception 'insufficient_credits';
  end if;

  update public.credit_accounts
  set available = available + offer_row.credits,
      updated_at = now()
  where user_id = offer_row.receiver_id;

  insert into public.purchases (
    listing_id,
    buyer_id,
    seller_id,
    credits,
    status,
    buyer_confirmed_at,
    seller_confirmed_at,
    completed_at
  )
  values (
    offer_row.listing_id,
    offer_row.sender_id,
    offer_row.receiver_id,
    offer_row.credits,
    'completed',
    now(),
    now(),
    now()
  )
  returning id into purchase_id;

  insert into public.credit_movements (
    user_id,
    related_purchase_id,
    movement_type,
    amount,
    balance_available,
    balance_held,
    balance_pending,
    balance_frozen,
    note,
    created_by
  )
  select
    offer_row.sender_id,
    purchase_id,
    'purchase_release',
    -offer_row.credits,
    ca.available,
    ca.held,
    ca.pending,
    ca.frozen,
    'Creditos transferidos por oferta confirmada',
    actor_id
  from public.credit_accounts ca
  where ca.user_id = offer_row.sender_id;

  insert into public.credit_movements (
    user_id,
    related_purchase_id,
    movement_type,
    amount,
    balance_available,
    balance_held,
    balance_pending,
    balance_frozen,
    note,
    created_by
  )
  select
    offer_row.receiver_id,
    purchase_id,
    'purchase_release',
    offer_row.credits,
    ca.available,
    ca.held,
    ca.pending,
    ca.frozen,
    'Creditos recibidos por oferta confirmada',
    actor_id
  from public.credit_accounts ca
  where ca.user_id = offer_row.receiver_id;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    previous_balance,
    new_balance,
    description,
    related_offer_id,
    related_purchase_id,
    created_by
  )
  values
    (
      offer_row.sender_id,
      'compra',
      -offer_row.credits,
      buyer_before,
      buyer_before - offer_row.credits,
      'Creditos enviados por oferta confirmada',
      offer_row.id,
      purchase_id,
      actor_id
    ),
    (
      offer_row.receiver_id,
      'intercambio',
      offer_row.credits,
      seller_before,
      seller_before + offer_row.credits,
      'Creditos recibidos por oferta confirmada',
      offer_row.id,
      purchase_id,
      actor_id
    );

  execute
    'update public.listing_offers set status = $1::public.listing_offer_status, updated_at = now() where id = $2'
    using 'completed', p_offer_id;

  update public.listing_offers
  set status = 'rejected'::public.listing_offer_status,
      updated_at = now()
  where listing_id = offer_row.listing_id
    and id <> p_offer_id
    and status::text = 'submitted';

  update public.listings
  set status = 'completed'::public.listing_status,
      updated_at = now()
  where id = offer_row.listing_id;

  return purchase_id;
end;
$$;

revoke execute on function public.seller_respond_listing_offer(uuid, text) from public;
revoke execute on function public.seller_respond_listing_offer(uuid, text) from anon;
grant execute on function public.seller_respond_listing_offer(uuid, text) to authenticated;

revoke execute on function public.buyer_confirm_credit_offer(uuid) from public;
revoke execute on function public.buyer_confirm_credit_offer(uuid) from anon;
grant execute on function public.buyer_confirm_credit_offer(uuid) to authenticated;
