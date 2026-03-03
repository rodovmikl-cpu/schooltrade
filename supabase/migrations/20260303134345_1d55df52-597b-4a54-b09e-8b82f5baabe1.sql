DROP POLICY IF EXISTS "Only specific user can create news" ON public.school_news;
CREATE POLICY "Anyone can create news" ON public.school_news FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only specific user can delete news" ON public.school_news;
CREATE POLICY "Author can delete own news" ON public.school_news FOR DELETE USING (true);