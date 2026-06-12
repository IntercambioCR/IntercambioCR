do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_offer_type') then
    create type listing_offer_type as enum ('credits', 'item', 'mixed');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_offer_status') then
    create type listing_offer_status as enum ('submitted', 'accepted', 'rejected', 'cancelled');
  end if;
end $$;

create table if not exists listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  receiver_id uuid not null references profiles(id),
  offer_type listing_offer_type not null,
  credits integer not null default 0 check (credits >= 0),
  offered_listing_id uuid references listings(id),
  offered_item_description text,
  message text,
  status listing_offer_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_participants_different check (sender_id <> receiver_id),
  constraint offer_has_value check (
    credits > 0 or offered_listing_id is not null or offered_item_description is not null
  )
);

create table if not exists direct_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id),
  constraint conversation_participants_different check (buyer_id <> seller_id)
);

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references direct_conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists listing_offers_listing_status_idx on listing_offers (listing_id, status, created_at desc);
create index if not exists listing_offers_sender_status_idx on listing_offers (sender_id, status);
create index if not exists listing_offers_receiver_status_idx on listing_offers (receiver_id, status);
create index if not exists direct_conversations_buyer_idx on direct_conversations (buyer_id, updated_at desc);
create index if not exists direct_conversations_seller_idx on direct_conversations (seller_id, updated_at desc);
create index if not exists direct_messages_conversation_created_idx on direct_messages (conversation_id, created_at);

alter table listing_offers enable row level security;
alter table direct_conversations enable row level security;
alter table direct_messages enable row level security;

drop policy if exists "Offer participants can read" on listing_offers;
create policy "Offer participants can read"
  on listing_offers for select
  using (auth.uid() in (sender_id, receiver_id));

drop policy if exists "Users create own offers" on listing_offers;
create policy "Users create own offers"
  on listing_offers for insert
  with check (auth.uid() = sender_id and auth.uid() <> receiver_id);

drop policy if exists "Offer receiver updates status" on listing_offers;
create policy "Offer receiver updates status"
  on listing_offers for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

drop policy if exists "Conversation participants can read" on direct_conversations;
create policy "Conversation participants can read"
  on direct_conversations for select
  using (auth.uid() in (buyer_id, seller_id));

drop policy if exists "Users create own conversations" on direct_conversations;
create policy "Users create own conversations"
  on direct_conversations for insert
  with check (auth.uid() = buyer_id and auth.uid() <> seller_id);

drop policy if exists "Direct message participants can read" on direct_messages;
create policy "Direct message participants can read"
  on direct_messages for select
  using (
    exists (
      select 1
      from direct_conversations
      where direct_conversations.id = direct_messages.conversation_id
        and auth.uid() in (direct_conversations.buyer_id, direct_conversations.seller_id)
    )
  );

drop policy if exists "Direct message participants can send" on direct_messages;
create policy "Direct message participants can send"
  on direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from direct_conversations
      where direct_conversations.id = direct_messages.conversation_id
        and auth.uid() in (direct_conversations.buyer_id, direct_conversations.seller_id)
    )
  );

drop policy if exists "Admins read listing offers" on listing_offers;
create policy "Admins read listing offers"
  on listing_offers for select
  using (is_admin());

drop policy if exists "Admins read direct conversations" on direct_conversations;
create policy "Admins read direct conversations"
  on direct_conversations for select
  using (is_admin());

drop policy if exists "Admins read direct messages" on direct_messages;
create policy "Admins read direct messages"
  on direct_messages for select
  using (is_admin());
