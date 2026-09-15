-- Week 5: Payment & Reviews — Razorpay Integration Schema Update

-- 1. Ensure columns exist on payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure method column defaults or is synced
UPDATE public.payments
SET payment_method = method
WHERE payment_method IS NULL AND method IS NOT NULL;

-- 2. Add partial unique index to strictly prevent multiple successful payments per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_booking_success
  ON public.payments (booking_id)
  WHERE status IN ('SUCCESS', 'success');

-- 3. Add lookup indexes for fast querying and webhooks
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments (provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON public.payments (razorpay_payment_id);

-- 4. Enable RLS and establish security policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Tourist can read own payments
DROP POLICY IF EXISTS "payments own read" ON public.payments;
CREATE POLICY "payments own read" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Provider can read payments associated with their services/bookings
DROP POLICY IF EXISTS "payments provider read" ON public.payments;
CREATE POLICY "payments provider read" ON public.payments
  FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.services s ON s.id = b.service_id
      JOIN public.providers p ON p.id = s.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Tourist can insert initial payment record for their booking
DROP POLICY IF EXISTS "payments own insert" ON public.payments;
CREATE POLICY "payments own insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grants for authenticated and service_role
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
