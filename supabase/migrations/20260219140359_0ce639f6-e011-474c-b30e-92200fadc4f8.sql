
-- Create keif (קיף) currency table
CREATE TABLE IF NOT EXISTS public.keif_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code text NOT NULL,
  user_name text NOT NULL,
  total_keif numeric NOT NULL DEFAULT 0,
  converted_math numeric NOT NULL DEFAULT 0,
  converted_hebrew numeric NOT NULL DEFAULT 0,
  converted_english numeric NOT NULL DEFAULT 0,
  converted_crypto numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keif_balances ENABLE ROW LEVEL SECURITY;

-- Anyone can view balances (for leaderboard)
CREATE POLICY "Anyone can view keif balances"
  ON public.keif_balances
  FOR SELECT
  USING (true);

-- Anyone can insert their own balance
CREATE POLICY "Anyone can insert keif balance"
  ON public.keif_balances
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update balances
CREATE POLICY "Anyone can update keif balance"
  ON public.keif_balances
  FOR UPDATE
  USING (true);
