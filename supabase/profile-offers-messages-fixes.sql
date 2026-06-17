-- Intercambio CR - Fix puntual para avatar persistente, ofertas y mensajes
-- Ejecutar en Supabase SQL Editor si:
-- 1. Algunos usuarios no conservan avatar porque no tienen fila en profiles.
-- 2. Las ofertas no aparecen al dueño del artículo.
-- 3. Los mensajes/conversaciones no aparecen para ambos participantes.

-- Profiles: permitir que un usuario autenticado cree su propia fila si el trigger no la creó.
alter table public.profiles enable row level security;

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
);

grant insert (id, full_name, avatar_url, location, bio) on public.profiles to authenticated;
grant update (full_name, avatar_url, location, bio) on public.profiles to authenticated;

-- Ofertas: solo emisor/receptor pueden verlas. El receptor debe ser el seller_id real del listing.
alter table public.listing_offers enable row level security;

drop policy if exists "Offer participants can read" on public.listing_offers;
create policy "Offer participants can read"
on public.listing_offers
for select
to authenticated
using (
  auth.uid() in (sender_id, receiver_id)
);

drop policy if exists "Users create own offers" on public.listing_offers;
create policy "Users create own offers"
on public.listing_offers
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and auth.uid() <> receiver_id
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = receiver_id
      and l.seller_id <> auth.uid()
      and l.status = 'available'
  )
);

grant select, insert on public.listing_offers to authenticated;

-- Conversaciones directas: comprador y vendedor ven la conversación.
-- El seller_id debe ser el dueño real del listing.
alter table public.direct_conversations enable row level security;

drop policy if exists "Conversation participants can read" on public.direct_conversations;
create policy "Conversation participants can read"
on public.direct_conversations
for select
to authenticated
using (
  auth.uid() in (buyer_id, seller_id)
);

drop policy if exists "Users create own conversations" on public.direct_conversations;
create policy "Users create own conversations"
on public.direct_conversations
for insert
to authenticated
with check (
  auth.uid() = buyer_id
  and auth.uid() <> seller_id
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = seller_id
      and l.seller_id <> auth.uid()
      and l.status = 'available'
  )
);

drop policy if exists "Conversation participants can update timestamp" on public.direct_conversations;
create policy "Conversation participants can update timestamp"
on public.direct_conversations
for update
to authenticated
using (
  auth.uid() in (buyer_id, seller_id)
)
with check (
  auth.uid() in (buyer_id, seller_id)
);

grant select, insert, update on public.direct_conversations to authenticated;

-- Mensajes directos: solo participantes pueden leer y enviar.
alter table public.direct_messages enable row level security;

drop policy if exists "Direct message participants can read" on public.direct_messages;
create policy "Direct message participants can read"
on public.direct_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_conversations dc
    where dc.id = conversation_id
      and auth.uid() in (dc.buyer_id, dc.seller_id)
  )
);

drop policy if exists "Direct message participants can send" on public.direct_messages;
create policy "Direct message participants can send"
on public.direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.direct_conversations dc
    where dc.id = conversation_id
      and auth.uid() in (dc.buyer_id, dc.seller_id)
  )
);

grant select, insert on public.direct_messages to authenticated;

-- Verificación rápida de policies relevantes.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'listing_offers', 'direct_conversations', 'direct_messages')
order by tablename, policyname;
