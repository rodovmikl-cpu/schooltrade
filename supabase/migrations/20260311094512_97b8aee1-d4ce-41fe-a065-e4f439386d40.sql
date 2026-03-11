CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark subscriptions as expired
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
  
  -- Remove premium status from users with expired subscriptions
  -- BUT only if they don't have any remaining active subscriptions
  UPDATE public.users
  SET is_premium = false
  WHERE code IN (
    SELECT user_code
    FROM public.subscriptions
    WHERE status = 'expired'
  )
  AND is_premium = true
  AND code NOT IN (
    SELECT user_code
    FROM public.subscriptions
    WHERE status = 'active'
  );
END;
$function$