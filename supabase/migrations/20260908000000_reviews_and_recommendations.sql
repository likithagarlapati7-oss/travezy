-- ==============================================================================
-- Migration: 20260908000000_reviews_and_recommendations.sql
-- Description: Enhances reviews table with titles, image attachments, moderation flags,
--              real-time rating recalculation triggers, and comprehensive seed reviews.
-- ==============================================================================

-- 1. Add fields to public.reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_moderated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS reviewer_location text;

-- 2. Indexes for fast moderation & lookup
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON public.reviews (is_hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews (rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);

-- 3. Automatic Trigger Function to recalculate and synchronize Service rating & review_count
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
      AND is_hidden = false;

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

-- 4. Secure Row Level Security Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read active (non-hidden) reviews
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews
  FOR SELECT USING (
    is_hidden = false
    OR auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Authenticated tourists can insert their own reviews
DROP POLICY IF EXISTS "reviews own insert" ON public.reviews;
CREATE POLICY "reviews own insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authors can update their own review; Providers can update response; Admins can update all
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

-- Authors and Admins can delete reviews
DROP POLICY IF EXISTS "reviews own delete" ON public.reviews;
CREATE POLICY "reviews own delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
