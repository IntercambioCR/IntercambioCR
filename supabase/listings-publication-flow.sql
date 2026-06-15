-- Intercambio CR - flujo publico de publicaciones
-- Ejecutar en Supabase SQL Editor.

-- 1) Campo opcional para indicar que busca la persona a cambio.
alter table public.listings
  add column if not exists looking_for text null;

-- Columna estandar usada por la app para valor sugerido en creditos.
alter table public.listings
  add column if not exists credit_price integer null;

-- 2) Permitir publicaciones pendientes/rechazadas en el flujo de moderacion.
alter type public.listing_status add value if not exists 'pending';
alter type public.listing_status add value if not exists 'rejected';

-- 3) Creditos sugeridos opcionales.
alter table public.listings
  alter column credit_price drop not null;

alter table public.listings
  drop constraint if exists listings_credit_price_check;

alter table public.listings
  add constraint listings_credit_price_check
  check (credit_price is null or credit_price > 0);

-- Bases tempranas pudieron tener otros nombres obligatorios para creditos.
-- Los dejamos opcionales para que publicar sin creditos no falle.
do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array['credit_', 'credits', 'credit_value', 'suggested_credits']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'listings'
        and information_schema.columns.column_name = legacy_column
    ) then
      execute format('alter table public.listings alter column %I drop not null', legacy_column);
    end if;
  end loop;
end $$;

-- Si existen valores historicos en columnas antiguas, copiarlos a credit_price.
do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array['credit_', 'credits', 'credit_value', 'suggested_credits']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'listings'
        and information_schema.columns.column_name = legacy_column
    ) then
      execute format(
        'update public.listings set credit_price = %I where credit_price is null and %I is not null',
        legacy_column,
        legacy_column
      );
    end if;
  end loop;
end $$;

-- 4) Normalizar estados publicos antiguos.
-- Nota: si tu enum actual no tenia approved/active/published, esas filas no existen.
update public.listings
set status = 'available'::public.listing_status,
    updated_at = now()
where status::text in ('approved', 'active', 'published');

-- 5) Solo available debe ser publico en la app.
create index if not exists listings_public_available_idx
  on public.listings (created_at desc)
  where status = 'available';

drop policy if exists "Listings are public" on public.listings;
create policy "Listings are public"
on public.listings
for select
using (status = 'available');

drop policy if exists "Listing images are public" on public.listing_images;
create policy "Listing images are public"
on public.listing_images
for select
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.status = 'available'
  )
);

-- 6) Funcion admin: aprobar debe pasar a available.
create or replace function public.admin_update_listing_status(
  p_listing_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_status not in ('available', 'pending', 'rejected', 'cancelled', 'removed') then
    raise exception 'invalid_listing_status';
  end if;

  update listings
  set status = p_status::listing_status,
      updated_at = now(),
      approved_at = case when p_status = 'available' then coalesce(approved_at, now()) else approved_at end
  where id = p_listing_id;
end;
$$;

revoke execute on function public.admin_update_listing_status(uuid, text) from public;
revoke execute on function public.admin_update_listing_status(uuid, text) from anon;
grant execute on function public.admin_update_listing_status(uuid, text) to authenticated;

-- 7) Recargar cache de PostgREST/Supabase para evitar errores de schema cache.
notify pgrst, 'reload schema';
