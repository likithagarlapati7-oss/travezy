-- Add geographical coordinates to services table (Week 3 Mapbox integration)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
