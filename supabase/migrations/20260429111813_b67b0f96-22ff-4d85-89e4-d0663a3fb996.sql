
-- Merge duplicate keif_balances into one row per user_code (cap totals to avoid corrupted values)
WITH merged AS (
  SELECT 
    user_code,
    MAX(user_name) AS user_name,
    LEAST(SUM(LEAST(total_keif, 1000000000000)), 1000000000000) AS total_keif,
    LEAST(MAX(converted_math), 1000000000000) AS converted_math,
    LEAST(MAX(converted_hebrew), 1000000000000) AS converted_hebrew,
    LEAST(MAX(converted_english), 1000000000000) AS converted_english,
    LEAST(MAX(converted_crypto), 1000000000000) AS converted_crypto
  FROM public.keif_balances
  GROUP BY user_code
  HAVING COUNT(*) > 1
)
DELETE FROM public.keif_balances kb
USING merged m
WHERE kb.user_code = m.user_code;

INSERT INTO public.keif_balances (user_code, user_name, total_keif, converted_math, converted_hebrew, converted_english, converted_crypto)
SELECT user_code, user_name, total_keif, converted_math, converted_hebrew, converted_english, converted_crypto
FROM (
  SELECT 
    user_code,
    MAX(user_name) AS user_name,
    LEAST(SUM(LEAST(total_keif, 1000000000000)), 1000000000000) AS total_keif,
    LEAST(MAX(converted_math), 1000000000000) AS converted_math,
    LEAST(MAX(converted_hebrew), 1000000000000) AS converted_hebrew,
    LEAST(MAX(converted_english), 1000000000000) AS converted_english,
    LEAST(MAX(converted_crypto), 1000000000000) AS converted_crypto
  FROM (SELECT * FROM public.keif_balances) sub
  GROUP BY user_code
) final
WHERE NOT EXISTS (SELECT 1 FROM public.keif_balances WHERE user_code = final.user_code);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.keif_balances ADD CONSTRAINT keif_balances_user_code_unique UNIQUE (user_code);
