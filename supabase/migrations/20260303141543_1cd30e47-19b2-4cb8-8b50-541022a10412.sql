
-- 1. Fix storage: allow anon uploads to schooltrade-photos
CREATE POLICY "Allow anon upload to schooltrade-photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'schooltrade-photos');

CREATE POLICY "Allow anon read from schooltrade-photos"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'schooltrade-photos');

-- 2. Restrict news posting to admin code only
DROP POLICY IF EXISTS "Anyone can create news" ON public.school_news;
CREATE POLICY "Only admin can post news" ON public.school_news
FOR INSERT WITH CHECK (author_code = '541285226');

-- 3. Enable realtime for school_news
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_news;
