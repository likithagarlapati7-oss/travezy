-- ==============================================================================
-- Migration: 20260907000000_verifier_and_hotels.sql
-- Description: Adds tables, indexes, and RLS policies for Verifier / Hotel Partner role,
--              properties, room inventory, availability, reservations, and front-desk check-in/out.
-- ==============================================================================

-- 1. Hotels Table
create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  verifier_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  address text not null,
  city text not null,
  state text not null,
  country text not null default 'India',
  latitude numeric(10,6),
  longitude numeric(10,6),
  phone text,
  email text,
  amenities text[] default '{}',
  check_in_time text default '14:00',
  check_out_time text default '11:00',
  cancellation_policy text default 'Free cancellation up to 24 hours before check-in',
  hotel_rules text default 'Valid government ID required at check-in. Non-smoking property.',
  image_url text,
  images text[] default '{}',
  star_rating numeric(2,1) default 4.5,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hotels_verifier_id on public.hotels(verifier_id);
create index if not exists idx_hotels_city on public.hotels(city);
create index if not exists idx_hotels_state on public.hotels(state);
create index if not exists idx_hotels_status on public.hotels(status);

-- 2. Hotel Rooms Table
create table if not exists public.hotel_rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  room_type text not null,
  description text,
  price_per_night numeric(10,2) not null default 1500.00,
  currency text not null default 'INR',
  capacity integer not null default 2,
  total_rooms integer not null default 5,
  available_rooms integer not null default 5,
  amenities text[] default '{}',
  images text[] default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hotel_rooms_hotel_id on public.hotel_rooms(hotel_id);
create index if not exists idx_hotel_rooms_status on public.hotel_rooms(status);

-- 3. Hotel Reservations Table
create table if not exists public.hotel_reservations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  room_id uuid references public.hotel_rooms(id) on delete set null,
  tourist_id uuid not null references auth.users(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  nights integer not null default 1,
  total_price numeric(10,2) not null default 0,
  currency text not null default 'INR',
  booking_status text not null default 'PENDING',
  payment_status text not null default 'PENDING',
  payment_method text default 'card',
  guest_name text,
  guest_phone text,
  guest_email text,
  special_requests text,
  rejection_reason text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  checked_in_by uuid references auth.users(id),
  checked_out_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hotel_reservations_hotel_id on public.hotel_reservations(hotel_id);
create index if not exists idx_hotel_reservations_room_id on public.hotel_reservations(room_id);
create index if not exists idx_hotel_reservations_tourist_id on public.hotel_reservations(tourist_id);
create index if not exists idx_hotel_reservations_booking_status on public.hotel_reservations(booking_status);
create index if not exists idx_hotel_reservations_dates on public.hotel_reservations(check_in, check_out);

-- 4. Row Level Security & Permissions
alter table public.hotels enable row level security;
alter table public.hotel_rooms enable row level security;
alter table public.hotel_reservations enable row level security;

-- Grants
grant select on public.hotels to anon;
grant select, insert, update, delete on public.hotels to authenticated;
grant all on public.hotels to service_role;

grant select on public.hotel_rooms to anon;
grant select, insert, update, delete on public.hotel_rooms to authenticated;
grant all on public.hotel_rooms to service_role;

grant select, insert, update, delete on public.hotel_reservations to authenticated;
grant all on public.hotel_reservations to service_role;

-- Policies for hotels
create policy "hotels_public_read" on public.hotels
  for select using (status = 'active');

create policy "hotels_verifier_all" on public.hotels
  for all to authenticated
  using (verifier_id = auth.uid())
  with check (verifier_id = auth.uid());

-- Policies for hotel_rooms
create policy "hotel_rooms_public_read" on public.hotel_rooms
  for select using (status = 'active');

create policy "hotel_rooms_verifier_all" on public.hotel_rooms
  for all to authenticated
  using (hotel_id in (select id from public.hotels where verifier_id = auth.uid()))
  with check (hotel_id in (select id from public.hotels where verifier_id = auth.uid()));

-- Policies for hotel_reservations
create policy "hotel_reservations_tourist_read" on public.hotel_reservations
  for select to authenticated
  using (tourist_id = auth.uid());

create policy "hotel_reservations_tourist_insert" on public.hotel_reservations
  for insert to authenticated
  with check (tourist_id = auth.uid());

create policy "hotel_reservations_verifier_all" on public.hotel_reservations
  for all to authenticated
  using (hotel_id in (select id from public.hotels where verifier_id = auth.uid()))
  with check (hotel_id in (select id from public.hotels where verifier_id = auth.uid()));
