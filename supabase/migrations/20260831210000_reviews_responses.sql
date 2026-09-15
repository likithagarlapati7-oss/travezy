-- Week 5: Payment & Reviews — Part 3: Reviews, Ratings and Provider Responses Migration

-- 1. Add fields to public.reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_response text,
  ADD COLUMN IF NOT EXISTS provider_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Populate provider_id on existing reviews if any
UPDATE public.reviews r
SET provider_id = s.provider_id
FROM public.services s
WHERE r.service_id = s.id AND r.provider_id IS NULL;

-- 3. Add Unique Constraint on booking_id to prevent duplicate reviews per booking
-- (Only where booking_id is not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;

-- 4. Add Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews (booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews (service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews (provider_id);

-- 5. Trigger Function to automatically recalculate and update Service rating & review_count
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

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(*)
  INTO avg_score, total_count
  FROM public.reviews
  WHERE service_id = target_service_id;

  UPDATE public.services
  SET
    rating = avg_score,
    review_count = total_count
  WHERE id = target_service_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_service_rating ON public.reviews;
CREATE TRIGGER trigger_sync_service_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_service_rating();

-- 6. Row Level Security Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read all reviews
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews
  FOR SELECT USING (true);

-- Authenticated tourist can insert their own review
DROP POLICY IF EXISTS "reviews own insert" ON public.reviews;
CREATE POLICY "reviews own insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated tourist can update their own review (e.g. comment/rating)
DROP POLICY IF EXISTS "reviews own update" ON public.reviews;
CREATE POLICY "reviews own update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Authenticated tourist can delete their own review
DROP POLICY IF EXISTS "reviews own delete" ON public.reviews;
CREATE POLICY "reviews own delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
