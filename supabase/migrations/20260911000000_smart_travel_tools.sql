-- ==============================================================================
-- Migration: 20260911000000_smart_travel_tools.sql
-- Description: Creates packing_lists and packing_items tables with RLS,
--              and adds max_budget column to trip_plans table.
-- ==============================================================================

-- 1. Add max_budget to trip_plans
ALTER TABLE public.trip_plans
  ADD COLUMN IF NOT EXISTS max_budget numeric(12, 2);

-- 2. Create packing_lists table
CREATE TABLE IF NOT EXISTS public.packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_plan_id uuid REFERENCES public.trip_plans(id) ON DELETE CASCADE,
  destination text NOT NULL,
  title text NOT NULL,
  weather_summary text,
  total_items integer NOT NULL DEFAULT 0,
  packed_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create packing_items table
CREATE TABLE IF NOT EXISTS public.packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  is_packed boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_packing_lists_user_id ON public.packing_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_packing_lists_trip_plan_id ON public.packing_lists(trip_plan_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_packing_list_id ON public.packing_items(packing_list_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_user_id ON public.packing_items(user_id);

-- 5. Row Level Security
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_lists TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_items TO authenticated, anon;
GRANT ALL ON public.packing_lists TO service_role;
GRANT ALL ON public.packing_items TO service_role;

-- RLS Policies for packing_lists
DROP POLICY IF EXISTS "packing_lists_select" ON public.packing_lists;
CREATE POLICY "packing_lists_select" ON public.packing_lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.trip_plans tp
      WHERE tp.id = packing_lists.trip_plan_id AND (tp.is_public = true OR tp.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "packing_lists_insert" ON public.packing_lists;
CREATE POLICY "packing_lists_insert" ON public.packing_lists
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "packing_lists_update" ON public.packing_lists;
CREATE POLICY "packing_lists_update" ON public.packing_lists
  FOR UPDATE TO authenticated, anon
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "packing_lists_delete" ON public.packing_lists;
CREATE POLICY "packing_lists_delete" ON public.packing_lists
  FOR DELETE TO authenticated, anon
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
  );

-- RLS Policies for packing_items
DROP POLICY IF EXISTS "packing_items_select" ON public.packing_items;
CREATE POLICY "packing_items_select" ON public.packing_items
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.packing_lists pl
      WHERE pl.id = packing_items.packing_list_id AND (pl.user_id = auth.uid() OR pl.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "packing_items_insert" ON public.packing_items;
CREATE POLICY "packing_items_insert" ON public.packing_items
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "packing_items_update" ON public.packing_items;
CREATE POLICY "packing_items_update" ON public.packing_items
  FOR UPDATE TO authenticated, anon
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "packing_items_delete" ON public.packing_items;
CREATE POLICY "packing_items_delete" ON public.packing_items
  FOR DELETE TO authenticated, anon
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
  );

NOTIFY pgrst, 'reload schema';
