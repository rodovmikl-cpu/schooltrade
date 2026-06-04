
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code TEXT NOT NULL UNIQUE REFERENCES public.users(code) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 1,
  last_visit_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jerusalem')::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_streaks TO authenticated, anon;
GRANT ALL ON public.user_streaks TO service_role;

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view streaks" ON public.user_streaks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert streaks" ON public.user_streaks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update streaks" ON public.user_streaks FOR UPDATE TO anon, authenticated USING (true);

CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side function to check in (prevents cheating)
CREATE OR REPLACE FUNCTION public.streak_check_in(_user_code TEXT)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_visit_date DATE,
  days_missed INTEGER,
  server_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  _rec public.user_streaks%ROWTYPE;
  _diff INTEGER;
  _new_streak INTEGER;
BEGIN
  SELECT * INTO _rec FROM public.user_streaks WHERE user_code = _user_code;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_code, current_streak, longest_streak, last_visit_date)
    VALUES (_user_code, 1, 1, _today)
    RETURNING * INTO _rec;
    RETURN QUERY SELECT _rec.current_streak, _rec.longest_streak, _rec.last_visit_date, 0, _today;
    RETURN;
  END IF;

  _diff := _today - _rec.last_visit_date;

  IF _diff = 0 THEN
    -- already checked in today
    RETURN QUERY SELECT _rec.current_streak, _rec.longest_streak, _rec.last_visit_date, 0, _today;
    RETURN;
  ELSIF _diff = 1 THEN
    _new_streak := _rec.current_streak + 1;
  ELSIF _diff >= 2 AND _diff <= 3 THEN
    -- grace period: keep streak but don't increment, update last_visit_date so days_missed reflects gap from current visit
    UPDATE public.user_streaks
    SET last_visit_date = _today,
        current_streak = _rec.current_streak + 1
    WHERE user_code = _user_code
    RETURNING * INTO _rec;
    RETURN QUERY SELECT _rec.current_streak,
      GREATEST(_rec.longest_streak, _rec.current_streak),
      _rec.last_visit_date, _diff - 1, _today;
    RETURN;
  ELSE
    -- 4+ days missed: reset
    _new_streak := 1;
  END IF;

  UPDATE public.user_streaks
  SET current_streak = _new_streak,
      longest_streak = GREATEST(_rec.longest_streak, _new_streak),
      last_visit_date = _today
  WHERE user_code = _user_code
  RETURNING * INTO _rec;

  RETURN QUERY SELECT _rec.current_streak, _rec.longest_streak, _rec.last_visit_date, 0, _today;
END;
$$;

GRANT EXECUTE ON FUNCTION public.streak_check_in(TEXT) TO anon, authenticated, service_role;

-- Read-only status function (for clients to check without writing)
CREATE OR REPLACE FUNCTION public.streak_status(_user_code TEXT)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_visit_date DATE,
  days_missed INTEGER,
  server_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  _rec public.user_streaks%ROWTYPE;
  _diff INTEGER;
BEGIN
  SELECT * INTO _rec FROM public.user_streaks WHERE user_code = _user_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, _today, 0, _today;
    RETURN;
  END IF;
  _diff := _today - _rec.last_visit_date;
  RETURN QUERY SELECT _rec.current_streak, _rec.longest_streak, _rec.last_visit_date, GREATEST(_diff, 0), _today;
END;
$$;

GRANT EXECUTE ON FUNCTION public.streak_status(TEXT) TO anon, authenticated, service_role;
