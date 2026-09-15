-- ==============================================================================
-- Migration: 20260908010000_reviews_booking_id_schema_fix.sql
-- Description: Ensures booking_id exists on reviews table with proper foreign key,
--              unique constraint per booking, indexes, triggers, and cache reload.
-- ==============================================================================

-- 1. Ensure public.reviews table has booking_id column referencing public.bookings(id)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_moderated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS reviewer_location text,
  ADD COLUMN IF NOT EXISTS provider_response text,
  ADD COLUMN IF NOT EXISTS provider_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Link existing reviews to providers if provider_id is missing
UPDATE public.reviews r
SET provider_id = s.provider_id
FROM public.services s
WHERE r.service_id = s.id AND r.provider_id IS NULL;

-- 3. Add Partial Unique Constraint on booking_id (only when booking_id IS NOT NULL)
-- This allows seed/demo reviews with booking_id = NULL without violating uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    NULL;
END $$;

-- 4. High-performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews (booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews (service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews (provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON public.reviews (is_hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews (rating);

-- 5. Trigger Function to dynamically sync Service rating and review_count
CREATE OR REPLACE FUNCTION public.sync_service_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_service_id uuid;
  avg_score numeric(2,1);
  total_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_service_id := OLD.service_id;
  ELSE
    target_service_id := NEW.service_id;
  END IF;

  IF target_service_id IS NOT NULL THEN
    SELECT
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
      COUNT(*)
    INTO avg_score, total_count
    FROM public.reviews
    WHERE service_id = target_service_id
      AND (is_hidden IS FALSE OR is_hidden IS NULL);

    UPDATE public.services
    SET
      rating = avg_score,
      review_count = total_count
    WHERE id = target_service_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_service_rating ON public.reviews;
CREATE TRIGGER trigger_sync_service_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_service_rating();

-- 6. Row Level Security Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Select policy: public can read active reviews
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews
  FOR SELECT USING (
    is_hidden IS FALSE
    OR is_hidden IS NULL
    OR auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Insert policy: authenticated tourists can insert review for themselves
DROP POLICY IF EXISTS "reviews own insert" ON public.reviews;
CREATE POLICY "reviews own insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy: Author can update review content; Provider can reply; Admin can update
DROP POLICY IF EXISTS "reviews own update" ON public.reviews;
CREATE POLICY "reviews own update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Delete policy: Author and Admin can delete
DROP POLICY IF EXISTS "reviews own delete" ON public.reviews;
CREATE POLICY "reviews own delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
