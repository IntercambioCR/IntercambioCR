-- Intercambio CR - diagnostico y refuerzo de confirmacion de ofertas con creditos.
-- Ejecutar en Supabase SQL Editor si "Confirmar transferencia" queda procesando o falla.
-- No borra datos existentes.

-- 1) Verificar que las funciones existan.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('buyer_confirm_credit_offer', 'seller_respond_listing_offer');

-- 2) Valores requeridos por los enums usados en el flujo.
alter type public.listing_offer_status add value if not exists 'seller_accepted';
alter type public.listing_offer_status add value if not exists 'completed';
alter type public.credit_movement_type add value if not exists 'purchase_release';
alter type public.credit_movement_type add value if not exists 'purchase_hold';
alter type public.credit_transaction_type add value if not exists 'compra';
alter type public.credit_transaction_type add value if not exists 'intercambio';
alter type public.listing_status add value if not exists 'completed';
alter type public.purchase_status add value if not exists 'completed';

-- 3) Funcion final de transferencia: valida saldo, mueve creditos y deja auditoria.
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

  insert into public.credit_accounts (user_id, available)
  values (offer_row.receiver_id, 0)
  on conflict (user_id) do nothing;

  select available
  into seller_before
  from public.credit_accounts
  where user_id = offer_row.receiver_id
  for update;

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
    'Creditos enviados por oferta confirmada',
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

  update public.listing_offers
  set status = 'completed'::public.listing_offer_status,
      updated_at = now()
  where id = p_offer_id;

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

revoke execute on function public.buyer_confirm_credit_offer(uuid) from public;
revoke execute on function public.buyer_confirm_credit_offer(uuid) from anon;
grant execute on function public.buyer_confirm_credit_offer(uuid) to authenticated;
