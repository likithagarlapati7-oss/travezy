-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  related_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  link_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications own read" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications own insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications own update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications own delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC);

-- Messages table index for conversation threads & real-time lookups
CREATE INDEX IF NOT EXISTS idx_messages_participants
  ON public.messages(sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_booking
  ON public.messages(booking_id, created_at DESC);
