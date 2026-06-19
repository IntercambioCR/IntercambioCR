-- Intercambio CR - calificaciones para ofertas completadas
-- Ejecutar en Supabase SQL Editor. No borra datos existentes.

create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.listing_offers(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint user_ratings_no_self_review check (reviewer_id <> reviewed_user_id),
  constraint user_ratings_one_per_offer_reviewer unique (offer_id, reviewer_id)
);

create index if not exists user_ratings_reviewed_user_idx
  on public.user_ratings (reviewed_user_id, created_at desc);

alter table public.user_ratings enable row level security;

drop policy if exists "Ratings are public" on public.user_ratings;
create policy "Ratings are public"
on public.user_ratings
for select
to public
using (true);

drop policy if exists "Participants create own offer ratings" on public.user_ratings;
create policy "Participants create own offer ratings"
on public.user_ratings
for insert
to authenticated
with check (auth.uid() = reviewer_id);

create or replace function public.validate_user_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.listing_offers%rowtype;
begin
  select *
  into offer_row
  from public.listing_offers
  where id = new.offer_id;

  if not found then
    raise exception 'offer_not_found';
  end if;

  if offer_row.status::text <> 'completed' then
    raise exception 'offer_not_completed';
  end if;

  if new.reviewer_id not in (offer_row.sender_id, offer_row.receiver_id) then
    raise exception 'reviewer_not_participant';
  end if;

  if new.reviewed_user_id not in (offer_row.sender_id, offer_row.receiver_id) then
    raise exception 'reviewed_user_not_participant';
  end if;

  if new.reviewer_id = new.reviewed_user_id then
    raise exception 'self_rating_not_allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_user_rating_before_insert on public.user_ratings;
create trigger validate_user_rating_before_insert
before insert on public.user_ratings
for each row execute function public.validate_user_rating();

create or replace function public.recalculate_profile_rating(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set rating = coalesce(
        (
          select round(avg(rating)::numeric, 2)
          from public.user_ratings
          where reviewed_user_id = p_user_id
        ),
        0
      )
  where id = p_user_id;
end;
$$;

create or replace function public.recalculate_completed_trades(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set completed_trades = (
    select count(*)
    from public.listing_offers
    where status::text = 'completed'
      and p_user_id in (sender_id, receiver_id)
  )
  where id = p_user_id;
end;
$$;

create or replace function public.update_completed_trades_after_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text = 'completed' and old.status::text is distinct from new.status::text then
    perform public.recalculate_completed_trades(new.sender_id);
    perform public.recalculate_completed_trades(new.receiver_id);
  end if;

  return new;
end;
$$;

drop trigger if exists update_completed_trades_after_offer on public.listing_offers;
create trigger update_completed_trades_after_offer
after update of status on public.listing_offers
for each row execute function public.update_completed_trades_after_offer();

update public.profiles p
set completed_trades = (
  select count(*)
  from public.listing_offers lo
  where lo.status::text = 'completed'
    and p.id in (lo.sender_id, lo.receiver_id)
);

update public.profiles p
set rating = coalesce(
  (
    select round(avg(ur.rating)::numeric, 2)
    from public.user_ratings ur
    where ur.reviewed_user_id = p.id
  ),
  0
);

revoke execute on function public.validate_user_rating() from public;
revoke execute on function public.recalculate_profile_rating(uuid) from public;
revoke execute on function public.recalculate_completed_trades(uuid) from public;
revoke execute on function public.update_completed_trades_after_offer() from public;
grant execute on function public.recalculate_profile_rating(uuid) to authenticated;
