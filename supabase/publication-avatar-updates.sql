-- Intercambio CR - publicaciones flexibles y avatares
-- Ejecutar en Supabase SQL Editor.

-- 1) Publicaciones: créditos opcionales y campo "qué busca a cambio".
alter table public.listings
  add column if not exists looking_for text;

alter table public.listings
  alter column credit_price drop not null;

alter table public.listings
  drop constraint if exists listings_credit_price_check;

alter table public.listings
  add constraint listings_credit_price_check
  check (credit_price is null or credit_price > 0);

create index if not exists listings_available_created_idx
  on public.listings (status, created_at desc)
  where status = 'available';

-- 2) Storage: bucket público de avatares.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'Avatars',
  'Avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public avatars are readable" on storage.objects;
create policy "Public avatars are readable"
on storage.objects
for select
to public
using (bucket_id = 'Avatars');

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Perfil: permitir que el usuario guarde su avatar_url sin abrir el rol.
alter table public.profiles enable row level security;

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, location, bio) on public.profiles to authenticated;
