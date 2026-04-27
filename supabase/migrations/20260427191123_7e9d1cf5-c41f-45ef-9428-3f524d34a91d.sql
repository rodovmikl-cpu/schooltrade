CREATE TABLE IF NOT EXISTS public.user_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code TEXT NOT NULL UNIQUE,
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatar records are viewable by app users"
ON public.user_avatars
FOR SELECT
USING (true);

CREATE POLICY "Avatar records can be created by app users"
ON public.user_avatars
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Avatar records can be updated by app users"
ON public.user_avatars
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_avatars_updated_at ON public.user_avatars;
CREATE TRIGGER update_user_avatars_updated_at
BEFORE UPDATE ON public.user_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();