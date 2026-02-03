-- Create table for school news
CREATE TABLE public.school_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_code TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_news ENABLE ROW LEVEL SECURITY;

-- Anyone can read news
CREATE POLICY "Anyone can read news"
ON public.school_news
FOR SELECT
USING (true);

-- Only user 426671703 can insert news
CREATE POLICY "Only specific user can create news"
ON public.school_news
FOR INSERT
WITH CHECK (author_code = '426671703');

-- Only user 426671703 can delete their own news
CREATE POLICY "Only specific user can delete news"
ON public.school_news
FOR DELETE
USING (author_code = '426671703');