-- Phase 1: Database Setup for Payments & Escrow

-- 1. Extend PROFILES Table with bank details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recipient_code TEXT; -- For Paystack transfers

-- 2. Update JOBS status enum (handled via check constraint or just text)
-- If status was an enum, we'd need to update it. For now, let's ensure the column supports the new statuses.
-- Most Supabase setups use text with check constraints or just text.
-- Let's check for existing constraints if possible, but for now we'll assume we can insert any text.

-- 3. Create ORDERS table (Escrow)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    freelancer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    commission DECIMAL(12, 2) NOT NULL,
    freelancer_amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'submitted', 'released', 'refunded')),
    paystack_reference TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create TRANSACTIONS table (Audit Logs)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'payout', 'refund')),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    reference TEXT UNIQUE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS and Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Orders Policies
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Helper for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
