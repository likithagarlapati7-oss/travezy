-- roles
create type public.app_role as enum ('tourist','provider','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  account_type text not null default 'tourist',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _type text := coalesce(new.raw_user_meta_data->>'account_type','tourist');
begin
  insert into public.profiles (id, full_name, email, account_type, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, _type, new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, case when _type = 'provider' then 'provider'::public.app_role else 'tourist'::public.app_role end)
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- providers
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  description text,
  location text,
  logo_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id)
);
grant select on public.providers to anon;
grant select, insert, update, delete on public.providers to authenticated;
grant all on public.providers to service_role;
alter table public.providers enable row level security;
create policy "providers public read" on public.providers for select using (true);
create policy "providers own insert" on public.providers for insert to authenticated with check (auth.uid() = user_id);
create policy "providers own update" on public.providers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "providers own delete" on public.providers for delete to authenticated using (auth.uid() = user_id);

-- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'tour',
  destination text not null,
  country text,
  image_url text,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select using (is_active = true);
create policy "services owner read" on public.services for select to authenticated
  using (provider_id in (select id from public.providers where user_id = auth.uid()));
create policy "services owner write" on public.services for insert to authenticated
  with check (provider_id in (select id from public.providers where user_id = auth.uid()));
create policy "services owner update" on public.services for update to authenticated
  using (provider_id in (select id from public.providers where user_id = auth.uid()))
  with check (provider_id in (select id from public.providers where user_id = auth.uid()));
create policy "services owner delete" on public.services for delete to authenticated
  using (provider_id in (select id from public.providers where user_id = auth.uid()));

-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  travel_date date,
  guests integer not null default 1,
  total_price numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings own read" on public.bookings for select to authenticated using (auth.uid() = user_id);
create policy "bookings provider read" on public.bookings for select to authenticated
  using (service_id in (select s.id from public.services s join public.providers p on p.id = s.provider_id where p.user_id = auth.uid()));
create policy "bookings own insert" on public.bookings for insert to authenticated with check (auth.uid() = user_id);
create policy "bookings own update" on public.bookings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookings provider update" on public.bookings for update to authenticated
  using (service_id in (select s.id from public.services s join public.providers p on p.id = s.provider_id where p.user_id = auth.uid()))
  with check (service_id in (select s.id from public.services s join public.providers p on p.id = s.provider_id where p.user_id = auth.uid()));
create policy "bookings own delete" on public.bookings for delete to authenticated using (auth.uid() = user_id);

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null default 5,
  comment text,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews own insert" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews own update" on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews own delete" on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  method text not null default 'card',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments own read" on public.payments for select to authenticated using (auth.uid() = user_id);
create policy "payments provider read" on public.payments for select to authenticated
  using (booking_id in (select b.id from public.bookings b join public.services s on s.id = b.service_id join public.providers p on p.id = s.provider_id where p.user_id = auth.uid()));
create policy "payments own insert" on public.payments for insert to authenticated with check (auth.uid() = user_id);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages participant read" on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages send" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "messages recipient update" on public.messages for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- starter catalogue
insert into public.services (title, description, category, destination, country, image_url, price, rating, review_count) values
('Overwater Villa Escape','Private overwater villa with sunrise deck, coral house reef and daily breakfast.','hotel','Maldives','Maldives','https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',890.00,4.9,214),
('Santorini Caldera Sunset Cruise','Catamaran cruise past Oia with swim stops, Greek BBQ and unlimited drinks.','tour','Santorini','Greece','https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',145.00,4.8,982),
('Kyoto Temples & Tea Ceremony','Guided walk through Fushimi Inari and Gion with a private matcha ceremony.','experience','Kyoto','Japan','https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',98.00,4.9,1345),
('Swiss Alps Glacier Express','Panoramic rail journey from Zermatt to St. Moritz with gourmet lunch on board.','tour','Zermatt','Switzerland','https://images.unsplash.com/photo-1531210483974-4f8c1f33fd35?auto=format&fit=crop&w=1200&q=80',320.00,4.7,436),
('Desert Safari & Bedouin Night','Dune bashing, camel ride and a starlit dinner in a private desert camp.','experience','Dubai','UAE','https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?auto=format&fit=crop&w=1200&q=80',75.00,4.6,2210),
('Bali Jungle Wellness Retreat','Three nights in an Ubud rainforest suite with daily yoga and spa rituals.','hotel','Ubud, Bali','Indonesia','https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',410.00,4.8,671),
('Serengeti Great Migration Safari','Four-day guided safari in a luxury tented camp with expert trackers.','tour','Serengeti','Tanzania','https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',1480.00,5.0,188),
('Amalfi Coast Private Boat Day','Skipper-led gozzo boat along Positano, Amalfi and the Emerald Grotto.','tour','Amalfi Coast','Italy','https://images.unsplash.com/photo-1533165850316-le?auto=format&fit=crop&w=1200&q=80',540.00,4.9,309),
('Reykjavik Northern Lights Chase','Small-group aurora hunt with a photographer, hot cocoa and thermal suits.','experience','Reykjavik','Iceland','https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1200&q=80',89.00,4.5,1502),
('Machu Picchu Sacred Valley Trek','Four-day guided Inca Trail trek with porters, chef and sunrise at the Sun Gate.','tour','Cusco','Peru','https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=80',760.00,4.9,522),
('Dubrovnik Old Town Airport Transfer','Private chauffeur transfer in an executive sedan, flight tracking included.','transport','Dubrovnik','Croatia','https://images.unsplash.com/photo-1555990538-1e0d1b2b2b9c?auto=format&fit=crop&w=1200&q=80',65.00,4.4,143),
('Cape Town Table Mountain & Winelands','Cable car ascent plus a Stellenbosch wine tasting with a local sommelier.','experience','Cape Town','South Africa','https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80',120.00,4.7,398);