DROP POLICY IF EXISTS "Avatar records can be created by app users" ON public.user_avatars;
DROP POLICY IF EXISTS "Avatar records can be updated by app users" ON public.user_avatars;

CREATE POLICY "Avatar records can be created with valid data"
ON public.user_avatars
FOR INSERT
WITH CHECK (
  user_code IS NOT NULL
  AND length(trim(user_code)) BETWEEN 1 AND 64
  AND avatar_url IS NOT NULL
  AND length(trim(avatar_url)) BETWEEN 12 AND 2048
  AND avatar_url ~ '^https://'
  AND (
    avatar_url LIKE 'https://models.readyplayer.me/%'
    OR avatar_url LIKE 'https://api.readyplayer.me/%'
    OR avatar_url LIKE 'https://%.readyplayer.me/%'
    OR avatar_url LIKE 'https://%.glb%'
    OR avatar_url LIKE 'https://%.png%'
  )
);

CREATE POLICY "Avatar records can be updated with valid data"
ON public.user_avatars
FOR UPDATE
USING (
  user_code IS NOT NULL
  AND length(trim(user_code)) BETWEEN 1 AND 64
)
WITH CHECK (
  user_code IS NOT NULL
  AND length(trim(user_code)) BETWEEN 1 AND 64
  AND avatar_url IS NOT NULL
  AND length(trim(avatar_url)) BETWEEN 12 AND 2048
  AND avatar_url ~ '^https://'
  AND (
    avatar_url LIKE 'https://models.readyplayer.me/%'
    OR avatar_url LIKE 'https://api.readyplayer.me/%'
    OR avatar_url LIKE 'https://%.readyplayer.me/%'
    OR avatar_url LIKE 'https://%.glb%'
    OR avatar_url LIKE 'https://%.png%'
  )
);