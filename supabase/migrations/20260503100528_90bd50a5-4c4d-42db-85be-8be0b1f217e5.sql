CREATE TABLE public.game_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_key text NOT NULL,
  user_code text NOT NULL,
  user_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_scores_game_score ON public.game_scores (game_key, score DESC);
CREATE INDEX idx_game_scores_user ON public.game_scores (user_code);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game scores"
  ON public.game_scores FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game scores"
  ON public.game_scores FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;