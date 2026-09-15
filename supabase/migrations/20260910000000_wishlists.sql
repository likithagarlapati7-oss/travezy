-- ==============================================================================
-- Migration: 20260910000000_wishlists.sql
-- Description: User Wishlist System with category organization and RLS
-- ==============================================================================

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('destination', 'hotel', 'restaurant', 'experience', 'tour', 'guide')),
  item_id text not null,
  item_title text not null,
  item_image text,
  item_category text,
  destination text,
  city text,
  state text,
  price numeric(10,2),
  currency text not null default 'INR',
  rating numeric(3,2),
  review_count integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint unique_user_wishlist_item unique (user_id, item_type, item_id)
);

-- Indexes for lightning fast queries
create index if not exists idx_wishlists_user_id on public.wishlists(user_id);
create index if not exists idx_wishlists_item_type on public.wishlists(item_type);
create index if not exists idx_wishlists_destination on public.wishlists(destination);
create index if not exists idx_wishlists_created_at on public.wishlists(created_at desc);

-- Permissions
grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

-- Row Level Security
alter table public.wishlists enable row level security;

create policy "wishlists_user_read" on public.wishlists
  for select to authenticated
  using (user_id = auth.uid());

create policy "wishlists_user_insert" on public.wishlists
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "wishlists_user_delete" on public.wishlists
  for delete to authenticated
  using (user_id = auth.uid());
