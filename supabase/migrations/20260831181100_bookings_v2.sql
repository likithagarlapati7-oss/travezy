-- Add fields to bookings and services for booking workflow (Week 4)

-- 1. Add fields to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS max_guests integer DEFAULT 10;

-- 2. Add fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Populate existing provider_id values for active bookings based on their service relationship
UPDATE public.bookings b
SET provider_id = s.provider_id
FROM public.services s
WHERE b.service_id = s.id AND b.provider_id IS NULL;
