
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_code TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public books are viewable by everyone"
ON public.books FOR SELECT
USING (is_public = true);

CREATE POLICY "Anyone can view own books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Anyone can create books"
ON public.books FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update books"
ON public.books FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete books"
ON public.books FOR DELETE
USING (true);

CREATE INDEX idx_books_author ON public.books(author_code);
CREATE INDEX idx_books_public ON public.books(is_public, created_at DESC);

CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
