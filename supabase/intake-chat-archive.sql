-- Intercambio CR - Chat de Entregar a Intercambio y archivado admin
-- Ejecutar en Supabase SQL Editor antes de probar el chat de entregas.

alter table public.platform_intakes
add column if not exists admin_archived_at timestamptz;

create table if not exists public.intake_conversations (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.platform_intakes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intake_id)
);

create table if not exists public.intake_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.intake_conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text not null default 'user' check (sender_role in ('user', 'admin')),
  body text not null check (char_length(trim(body)) between 1 and 1200),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists intake_conversations_user_updated_idx
on public.intake_conversations (user_id, updated_at desc);

create index if not exists intake_messages_conversation_created_idx
on public.intake_messages (conversation_id, created_at);

-- Normaliza paths viejos guardados como URL pública o con prefijo bucket.
update public.intake_images
set storage_path = regexp_replace(storage_path, '^https?://[^/]+/storage/v1/object/(public|sign)/intake-images/', '')
where storage_path ~ '^https?://';

update public.intake_images
set storage_path = regexp_replace(storage_path, '^/?intake-images/', '')
where storage_path like 'intake-images/%'
   or storage_path like '/intake-images/%';

-- Crea conversación para entregas ya existentes.
insert into public.intake_conversations (intake_id, user_id)
select id, user_id
from public.platform_intakes
on conflict (intake_id) do nothing;

alter table public.intake_conversations enable row level security;
alter table public.intake_messages enable row level security;

drop policy if exists "Intake conversation owner or admin read" on public.intake_conversations;
create policy "Intake conversation owner or admin read"
on public.intake_conversations
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "Intake conversation owner or admin create" on public.intake_conversations;
create policy "Intake conversation owner or admin create"
on public.intake_conversations
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.platform_intakes pi
    where pi.id = intake_id
      and pi.user_id = auth.uid()
      and pi.user_id = user_id
  )
);

drop policy if exists "Intake conversation owner or admin update" on public.intake_conversations;
create policy "Intake conversation owner or admin update"
on public.intake_conversations
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
)
with check (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "Intake message participants read" on public.intake_messages;
create policy "Intake message participants read"
on public.intake_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.intake_conversations ic
    where ic.id = conversation_id
      and (ic.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Intake message participants send" on public.intake_messages;
create policy "Intake message participants send"
on public.intake_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.intake_conversations ic
    where ic.id = conversation_id
      and (ic.user_id = auth.uid() or public.is_admin())
  )
);

grant select, insert, update on public.intake_conversations to authenticated;
grant select, insert on public.intake_messages to authenticated;
grant update (admin_archived_at) on public.platform_intakes to authenticated;

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('intake_conversations', 'intake_messages', 'platform_intakes')
order by tablename, policyname;
