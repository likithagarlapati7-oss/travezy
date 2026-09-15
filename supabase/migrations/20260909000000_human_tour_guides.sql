-- Migration: 20260909000000_human_tour_guides.sql
-- Description: Database schema for Nearby Human Tour Guide System

-- 1. Tour Guides Table
create table if not exists public.tour_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  profile_image text,
  bio text,
  city text not null,
  state text not null,
  latitude numeric not null,
  longitude numeric not null,
  service_radius_km integer not null default 25,
  coverage_areas text[] default '{}',
  languages text[] default '{}',
  tour_categories text[] default '{}',
  specializations text[] default '{}',
  hourly_rate numeric(10,2) not null default 350.00,
  half_day_rate numeric(10,2) not null default 1300.00,
  full_day_rate numeric(10,2) not null default 2400.00,
  currency text not null default 'INR',
  experience_years integer not null default 5,
  verification_status text not null default 'verified',
  is_travezy_verified boolean not null default true,
  active boolean not null default true,
  rating numeric(3,2) not null default 4.80,
  review_count integer not null default 0,
  completed_tours integer not null default 0,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

grant select on public.tour_guides to anon;
grant select, insert, update, delete on public.tour_guides to authenticated;
grant all on public.tour_guides to service_role;
alter table public.tour_guides enable row level security;

create policy "tour_guides_public_read" on public.tour_guides
  for select using (active = true);

create policy "tour_guides_owner_manage" on public.tour_guides
  for all to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Guide Availability Table
create table if not exists public.guide_availability (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.tour_guides(id) on delete cascade,
  date date not null,
  start_time text not null,
  end_time text not null,
  status text not null default 'available', -- 'available' | 'booked' | 'unavailable'
  created_at timestamptz not null default now()
);

grant select on public.guide_availability to anon;
grant select, insert, update, delete on public.guide_availability to authenticated;
grant all on public.guide_availability to service_role;
alter table public.guide_availability enable row level security;

create policy "guide_availability_public_read" on public.guide_availability
  for select using (true);

create policy "guide_availability_owner_write" on public.guide_availability
  for all to authenticated
  using (guide_id in (select id from public.tour_guides where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (guide_id in (select id from public.tour_guides where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Guide Bookings Table
create table if not exists public.guide_bookings (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid not null references auth.users(id) on delete cascade,
  guide_id uuid not null references public.tour_guides(id) on delete cascade,
  booking_date date not null,
  start_time text not null,
  duration_hours numeric not null default 3,
  duration_type text not null default 'half_day', -- 'hourly' | 'half_day' | 'full_day'
  travellers integer not null default 1,
  meeting_location text not null,
  latitude numeric,
  longitude numeric,
  total_price numeric(10,2) not null default 0.00,
  currency text not null default 'INR',
  booking_status text not null default 'PENDING', -- 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED'
  payment_status text not null default 'PENDING', -- 'PENDING' | 'PAID' | 'REFUNDED'
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.guide_bookings to authenticated;
grant all on public.guide_bookings to service_role;
alter table public.guide_bookings enable row level security;

create policy "guide_bookings_tourist_read" on public.guide_bookings
  for select to authenticated
  using (tourist_id = auth.uid());

create policy "guide_bookings_guide_read" on public.guide_bookings
  for select to authenticated
  using (guide_id in (select id from public.tour_guides where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "guide_bookings_tourist_insert" on public.guide_bookings
  for insert to authenticated
  with check (tourist_id = auth.uid());

create policy "guide_bookings_manage_update" on public.guide_bookings
  for update to authenticated
  using (
    tourist_id = auth.uid() or
    guide_id in (select id from public.tour_guides where user_id = auth.uid()) or
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  with check (
    tourist_id = auth.uid() or
    guide_id in (select id from public.tour_guides where user_id = auth.uid()) or
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 4. Guide Reviews Table
create table if not exists public.guide_reviews (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.tour_guides(id) on delete cascade,
  tourist_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.guide_bookings(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text not null,
  created_at timestamptz not null default now(),
  constraint unique_tourist_guide_booking unique (tourist_id, booking_id)
);

grant select on public.guide_reviews to anon;
grant select, insert, update, delete on public.guide_reviews to authenticated;
grant all on public.guide_reviews to service_role;
alter table public.guide_reviews enable row level security;

create policy "guide_reviews_public_read" on public.guide_reviews
  for select using (true);

create policy "guide_reviews_tourist_insert" on public.guide_reviews
  for insert to authenticated
  with check (tourist_id = auth.uid());

create policy "guide_reviews_tourist_manage" on public.guide_reviews
  for all to authenticated
  using (tourist_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (tourist_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Auto-recalculate Guide Rating Trigger
create or replace function public.recalculate_guide_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _guide_id uuid;
  _avg_rating numeric(3,2);
  _rev_count integer;
begin
  if (TG_OP = 'DELETE') then
    _guide_id := OLD.guide_id;
  else
    _guide_id := NEW.guide_id;
  end if;

  select coalesce(round(avg(rating)::numeric, 2), 4.80), count(*)
  into _avg_rating, _rev_count
  from public.guide_reviews
  where guide_id = _guide_id;

  update public.tour_guides
  set rating = _avg_rating,
      review_count = _rev_count
  where id = _guide_id;

  return null;
end;
$$;

drop trigger if exists trigger_recalculate_guide_rating on public.guide_reviews;
create trigger trigger_recalculate_guide_rating
after insert or update or delete on public.guide_reviews
for each row execute function public.recalculate_guide_rating();
