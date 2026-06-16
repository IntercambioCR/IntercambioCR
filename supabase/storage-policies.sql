insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('intake-images', 'intake-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-images', 'chat-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('Avatars', 'Avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public listing images are readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users upload own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own listing images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own intake images"
  on storage.objects for insert
  with check (
    bucket_id = 'intake-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own intake images"
  on storage.objects for select
  using (
    bucket_id = 'intake-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins read intake images"
  on storage.objects for select
  using (
    bucket_id = 'intake-images'
    and public.is_admin()
  );

create policy "Admins manage intake images"
  on storage.objects for delete
  using (
    bucket_id = 'intake-images'
    and public.is_admin()
  );

create policy "Public avatars are readable"
  on storage.objects for select
  using (bucket_id = 'Avatars');

create policy "Users upload own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'Avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'Avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
