-- ==============================================================================
-- Migration: 20260908020000_trip_plans_and_itineraries.sql
-- Description: Creates trip_plans and itinerary_items tables with indexes,
--              foreign keys, RLS policies, and triggers for AI Trip Planner.
-- ==============================================================================

-- 1. Create trip_plans table
CREATE TABLE IF NOT EXISTS public.trip_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text NOT NULL,
  destination_slug text,
  days_count integer NOT NULL DEFAULT 3,
  travelers_count integer NOT NULL DEFAULT 1,
  budget_tier text DEFAULT 'moderate',
  estimated_total_cost numeric(12, 2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  travel_style text DEFAULT 'balanced',
  interests text[] DEFAULT '{}',
  start_date date,
  end_date date,
  cover_image_url text,
  summary text,
  is_public boolean DEFAULT false,
  status text DEFAULT 'saved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create itinerary_items table
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_plan_id uuid NOT NULL REFERENCES public.trip_plans(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  time_slot text NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
  order_index integer NOT NULL DEFAULT 0,
  item_type text NOT NULL, -- 'hotel', 'restaurant', 'experience', 'guide', 'custom_activity'
  title text NOT NULL,
  description text,
  location text,
  estimated_cost numeric(10, 2) DEFAULT 0,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  external_reference_id text,
  image_url text,
  rating numeric(2, 1),
  booking_url text,
  notes text,
  is_booked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for fast retrieval and ordering
CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON public.trip_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_destination ON public.trip_plans(destination);
CREATE INDEX IF NOT EXISTS idx_trip_plans_created_at ON public.trip_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_plan_id ON public.itinerary_items(trip_plan_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day ON public.itinerary_items(trip_plan_id, day_number, order_index);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for trip_plans
-- Anyone can view public plans or plans where user_id matches or unauthenticated temporary plans
DROP POLICY IF EXISTS "trip_plans_select" ON public.trip_plans;
CREATE POLICY "trip_plans_select" ON public.trip_plans
  FOR SELECT USING (
    is_public = true
    OR auth.uid() = user_id
    OR user_id IS NULL
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Authenticated users can insert their own plans; anonymous can insert draft
DROP POLICY IF EXISTS "trip_plans_insert" ON public.trip_plans;
CREATE POLICY "trip_plans_insert" ON public.trip_plans
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

-- Only owners and admins can update their plans
DROP POLICY IF EXISTS "trip_plans_update" ON public.trip_plans;
CREATE POLICY "trip_plans_update" ON public.trip_plans
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Only owners and admins can delete their plans
DROP POLICY IF EXISTS "trip_plans_delete" ON public.trip_plans;
CREATE POLICY "trip_plans_delete" ON public.trip_plans
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- 6. RLS Policies for itinerary_items
DROP POLICY IF EXISTS "itinerary_items_select" ON public.itinerary_items;
CREATE POLICY "itinerary_items_select" ON public.itinerary_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = itinerary_items.trip_plan_id
        AND (tp.is_public = true OR tp.user_id = auth.uid() OR tp.user_id IS NULL)
    )
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "itinerary_items_insert" ON public.itinerary_items;
CREATE POLICY "itinerary_items_insert" ON public.itinerary_items
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = itinerary_items.trip_plan_id
        AND (tp.user_id = auth.uid() OR tp.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "itinerary_items_update" ON public.itinerary_items;
CREATE POLICY "itinerary_items_update" ON public.itinerary_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = itinerary_items.trip_plan_id
        AND (tp.user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = itinerary_items.trip_plan_id
        AND (tp.user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "itinerary_items_delete" ON public.itinerary_items;
CREATE POLICY "itinerary_items_delete" ON public.itinerary_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = itinerary_items.trip_plan_id
        AND (tp.user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_plans TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_items TO authenticated, anon;
GRANT ALL ON public.trip_plans TO service_role;
GRANT ALL ON public.itinerary_items TO service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
