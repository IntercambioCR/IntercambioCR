-- Intercambio CR - politicas de Supabase Storage para foto de perfil
-- Ejecutar en Supabase SQL Editor.
-- Bucket usado por la app: Avatars
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

drop policy if exists "Public read Avatars" on storage.objects;
drop policy if exists "Authenticated read Avatars" on storage.objects;
drop policy if exists "Users insert own Avatars" on storage.objects;
drop policy if exists "Users update own Avatars" on storage.objects;
drop policy if exists "Users delete own Avatars" on storage.objects;

-- Lectura publica para que las fotos de perfil se puedan mostrar con getPublicUrl().
create policy "Public read Avatars"
on storage.objects
for select
to public
using (
  bucket_id = 'Avatars'
);

-- Lectura explicita para usuarios autenticados.
create policy "Authenticated read Avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'Avatars'
);

-- Usuarios autenticados solo pueden subir dentro de su propia carpeta.
create policy "Users insert own Avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuarios autenticados solo pueden actualizar sus propios archivos.
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

-- La app no elimina avatares normalmente, pero esta politica permite limpiar
-- archivos propios si luego agregamos reemplazo/borrado de foto.
create policy "Users delete own Avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Permite guardar la URL publica despues del upload.
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
