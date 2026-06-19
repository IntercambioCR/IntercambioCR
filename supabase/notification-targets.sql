-- Notification targets for direct navigation from the notifications center.
-- Safe to run more than once.

alter table public.notifications
  add column if not exists related_message_id uuid references public.direct_messages(id) on delete set null,
  add column if not exists related_conversation_id uuid references public.direct_conversations(id) on delete set null;

create index if not exists notifications_related_message_id_idx
  on public.notifications(related_message_id)
  where related_message_id is not null;

create index if not exists notifications_related_conversation_id_idx
  on public.notifications(related_conversation_id)
  where related_conversation_id is not null;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
