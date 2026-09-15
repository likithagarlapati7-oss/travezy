-- Week 6: Payment, Wallet, Withdrawal, and Transaction Management System Migration

-- 1. Extend payments table for cash confirmation audit and payment methods
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS gateway_reference text,
  ADD COLUMN IF NOT EXISTS payout_reference text;

-- 2. Create provider_wallets table for cached balances (synced dynamically with ledger)
CREATE TABLE IF NOT EXISTS public.provider_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES public.providers(id) ON DELETE CASCADE,
  available_balance numeric NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned numeric NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_withdrawn numeric NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create withdrawals table for tracking provider payout requests
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  withdrawal_method text NOT NULL CHECK (withdrawal_method IN ('bank_transfer', 'upi')),
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  withdrawal_status text NOT NULL DEFAULT 'PENDING' CHECK (withdrawal_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  payout_reference text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create wallet_transactions table for ledger history
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('EARNING', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  reference_id text,
  description text,
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create indexes for high-throughput queries
CREATE INDEX IF NOT EXISTS idx_provider_wallets_provider_id ON public.provider_wallets(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON public.withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(withdrawal_status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_provider_id ON public.wallet_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Provider Wallet RLS Policies:
-- Providers can read their own wallet
DROP POLICY IF EXISTS "provider_wallets_own_select" ON public.provider_wallets;
CREATE POLICY "provider_wallets_own_select" ON public.provider_wallets
  FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Withdrawals RLS Policies:
-- Providers can read their own withdrawals
DROP POLICY IF EXISTS "withdrawals_own_select" ON public.withdrawals;
CREATE POLICY "withdrawals_own_select" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Providers can insert a withdrawal request for their own provider profile
DROP POLICY IF EXISTS "withdrawals_own_insert" ON public.withdrawals;
CREATE POLICY "withdrawals_own_insert" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Wallet Transactions RLS Policies:
DROP POLICY IF EXISTS "wallet_tx_own_select" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_own_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.provider_wallets TO authenticated;
GRANT ALL ON public.provider_wallets TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
