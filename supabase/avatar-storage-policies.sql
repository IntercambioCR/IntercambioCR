-- Intercambio CR - bucket y politicas seguras para fotos de perfil
-- Ejecutar en Supabase SQL Editor.
-- Ruta usada por la app: {auth.uid()}/avatar-{timestamp}.jpg|png|webp

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

drop policy if exists "Public Avatars are readable" on storage.objects;

create policy "Public Avatars are readable"
on storage.objects
for select
to public
using (
  bucket_id = 'Avatars'
);

drop policy if exists "Users upload own Avatars" on storage.objects;

create policy "Users upload own Avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own Avatars" on storage.objects;

create policy "Users update own Avatars"
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

drop policy if exists "Users delete own Avatars" on storage.objects;

create policy "Users delete own Avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

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
