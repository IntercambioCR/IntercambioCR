-- Intercambio CR - politicas para publicar imagenes de articulos
-- Ejecutar en Supabase SQL Editor.
-- Bucket esperado: listing-images
-- Ruta usada por la app: {auth.uid()}/{listing_id}/{archivo}

-- 1) Storage: lectura publica del bucket publico listing-images.
drop policy if exists "Public read listing images" on storage.objects;

create policy "Public read listing images"
on storage.objects
for select
to public
using (
  bucket_id = 'listing-images'
);

-- 2) Storage: solo usuarios autenticados suben a su propia carpeta.
drop policy if exists "Users upload own listing images" on storage.objects;

create policy "Users upload own listing images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Storage: solo el duenio puede actualizar sus imagenes.
drop policy if exists "Users update own listing images" on storage.objects;

create policy "Users update own listing images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 4) Storage: solo el duenio puede eliminar sus imagenes.
drop policy if exists "Users delete own listing images" on storage.objects;

create policy "Users delete own listing images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 5) Tabla publica listing_images: lectura publica si la publicacion no fue eliminada.
alter table public.listing_images enable row level security;

drop policy if exists "Listing images are public" on public.listing_images;

create policy "Listing images are public"
on public.listing_images
for select
to public
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.status = 'available'
  )
);

-- 6) Tabla listing_images: usuarios autenticados solo insertan registros para sus propias publicaciones.
drop policy if exists "Users insert own listing image rows" on public.listing_images;

create policy "Users insert own listing image rows"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
  and auth.uid()::text = (string_to_array(storage_path, '/'))[1]
);

-- 7) Tabla listing_images: usuarios solo actualizan/eliminan filas de sus propias publicaciones.
drop policy if exists "Users update own listing image rows" on public.listing_images;

create policy "Users update own listing image rows"
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
  and auth.uid()::text = (string_to_array(storage_path, '/'))[1]
);

drop policy if exists "Users delete own listing image rows" on public.listing_images;

create policy "Users delete own listing image rows"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
);
