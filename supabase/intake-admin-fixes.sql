-- Intercambio CR - Fix puntual para Entregar a Intercambio/admin intakes
-- Ejecutar en Supabase SQL Editor si:
-- 1. Las fotos de entregas no cargan en admin.
-- 2. "Solicitar más información" falla.
-- 3. El bucket privado intake-images no tiene policies completas.
-- Nota: algunas bases usan scheduled y otras needs_info para esta etapa.
-- Esta función detecta cuál valor existe y la app lo muestra como "Requiere información".

-- Bucket exacto usado por la app: intake-images
-- Ruta esperada: {auth.uid()}/{platform_intake_id}/{archivo}
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'intake-images',
  'intake-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own intake images" on storage.objects;
drop policy if exists "Users read own intake images" on storage.objects;
drop policy if exists "Users update own intake images" on storage.objects;
drop policy if exists "Users delete own intake images" on storage.objects;
drop policy if exists "Admins read intake images" on storage.objects;
drop policy if exists "Admins manage intake images" on storage.objects;

create policy "Users upload own intake images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'intake-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users read own intake images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'intake-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users update own intake images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'intake-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'intake-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users delete own intake images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'intake-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Admins read intake images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'intake-images'
  and public.is_admin()
);

create policy "Admins manage intake images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'intake-images'
  and public.is_admin()
);

create or replace function public.admin_request_intake_info(
  p_intake_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row platform_intakes%rowtype;
  target_status text;
begin
  if not is_admin() then
    raise exception 'admin_required';
  end if;

  if p_notes is null or length(trim(p_notes)) = 0 then
    raise exception 'missing_notes';
  end if;

  select *
  into intake_row
  from platform_intakes
  where id = p_intake_id
  for update;

  if not found or intake_row.status::text in ('paid', 'credited', 'rejected') then
    raise exception 'intake_not_found_or_locked';
  end if;

  select enumlabel
  into target_status
  from pg_enum
  where enumtypid = 'public.intake_status'::regtype
    and enumlabel in ('needs_info', 'scheduled')
  order by case enumlabel when 'needs_info' then 0 else 1 end
  limit 1;

  if target_status is null then
    raise exception 'missing_intake_info_status';
  end if;

  execute
    'update platform_intakes
     set status = $1::public.intake_status,
         inspection_notes = $2,
         updated_at = now()
     where id = $3'
  using target_status, p_notes, p_intake_id;

  insert into notifications (user_id, type, title, body, related_intake_id)
  values (
    intake_row.user_id,
    'intake_info_requested',
    'Intercambio CR necesita más información',
    p_notes,
    p_intake_id
  );
end;
$$;

revoke execute on function public.admin_request_intake_info(uuid, text) from anon;
grant execute on function public.admin_request_intake_info(uuid, text) to authenticated;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'intake-images';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    qual::text ilike '%intake-images%'
    or with_check::text ilike '%intake-images%'
  )
order by policyname;
