alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;

-- profiles: admin access
create policy "admins read all profiles" on public.profiles
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins update any profile" on public.profiles
for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- providers: admin manage
create policy "admins update any provider" on public.providers
for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins delete any provider" on public.providers
for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- services: admin manage
create policy "admins read all services" on public.services
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins update any service" on public.services
for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins delete any service" on public.services
for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- bookings / payments / reviews / messages: admin oversight
create policy "admins read all bookings" on public.bookings
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins read all payments" on public.payments
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "admins delete any review" on public.reviews
for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- reviews: only reviewable after a booking of that service
drop policy if exists "reviews own insert" on public.reviews;
create policy "reviews own insert" on public.reviews
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.bookings b
    where b.user_id = auth.uid() and b.service_id = reviews.service_id
  )
);

-- admins can read reviewer identity for moderation
grant select (id, service_id, user_id, rating, comment, created_at) on public.reviews to authenticated;