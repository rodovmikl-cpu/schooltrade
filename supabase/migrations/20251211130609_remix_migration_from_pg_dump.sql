CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: check_rate_limit(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(_identifier text, _action_type text, _max_requests integer, _window_minutes integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _record RECORD;
  _current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Check if blocked
  SELECT * INTO _record
  FROM public.rate_limits
  WHERE identifier = _identifier
    AND action_type = _action_type
    AND blocked_until > _current_time;
  
  IF FOUND THEN
    RETURN FALSE; -- Still blocked
  END IF;

  -- Get or create rate limit record
  INSERT INTO public.rate_limits (identifier, action_type, request_count, window_start)
  VALUES (_identifier, _action_type, 1, _current_time)
  ON CONFLICT (identifier, action_type)
  DO UPDATE SET
    request_count = CASE
      WHEN rate_limits.window_start < _current_time - (_window_minutes || ' minutes')::INTERVAL
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < _current_time - (_window_minutes || ' minutes')::INTERVAL
      THEN _current_time
      ELSE rate_limits.window_start
    END
  RETURNING * INTO _record;

  -- Check if limit exceeded
  IF _record.request_count > _max_requests THEN
    -- Block for 15 minutes
    UPDATE public.rate_limits
    SET blocked_until = _current_time + INTERVAL '15 minutes'
    WHERE id = _record.id;
    
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;


--
-- Name: expire_old_subscriptions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_subscriptions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Mark subscriptions as expired
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
  
  -- Remove premium status from users with expired subscriptions
  UPDATE public.users
  SET is_premium = false
  WHERE code IN (
    SELECT user_code
    FROM public.subscriptions
    WHERE status = 'expired'
  )
  AND is_premium = true;
END;
$$;


--
-- Name: has_role(text, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_code text, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_code = _user_code
      AND role = _role
  );
$$;


--
-- Name: reset_monthly_photo_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_monthly_photo_counts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.users
  SET photo_count = 0,
      last_photo_reset = now()
  WHERE last_photo_reset < now() - interval '30 days'
    AND is_premium = false;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    bid_amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_code text NOT NULL,
    user_name text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_code text,
    content_type text NOT NULL,
    original_content text NOT NULL,
    violation_reason text NOT NULL,
    severity text NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_violations_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_code text NOT NULL,
    owner_name text NOT NULL,
    description text NOT NULL,
    price text NOT NULL,
    photo_path text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    comments jsonb DEFAULT '[]'::jsonb,
    posting_mode text DEFAULT 'regular'::text NOT NULL,
    original_price text,
    current_bid_price numeric DEFAULT 0,
    auction_active boolean DEFAULT false,
    max_bid_limit numeric DEFAULT 200
);


--
-- Name: private_chat_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_chat_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_code text NOT NULL,
    month_year text DEFAULT to_char(now(), 'YYYY-MM'::text) NOT NULL,
    message_count integer DEFAULT 0 NOT NULL
);


--
-- Name: private_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user1_code text NOT NULL,
    user2_code text NOT NULL,
    user1_name text NOT NULL,
    user2_name text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: private_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_code text NOT NULL,
    sender_name text NOT NULL,
    content text NOT NULL,
    month_year text DEFAULT to_char(now(), 'YYYY-MM'::text) NOT NULL
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    action_type text NOT NULL,
    request_count integer DEFAULT 0,
    window_start timestamp with time zone DEFAULT now(),
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    severity text NOT NULL,
    user_code text,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT security_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_code text NOT NULL,
    payment_provider text NOT NULL,
    transaction_id text,
    started_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT subscriptions_payment_provider_check CHECK ((payment_provider = ANY (ARRAY['stripe'::text, 'paypal'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_code text NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    policy_accepted boolean DEFAULT false,
    is_premium boolean DEFAULT false,
    photo_count integer DEFAULT 0,
    last_photo_reset timestamp with time zone DEFAULT now()
);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: content_violations content_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_violations
    ADD CONSTRAINT content_violations_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: private_chat_limits private_chat_limits_chat_id_user_code_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_chat_limits
    ADD CONSTRAINT private_chat_limits_chat_id_user_code_month_year_key UNIQUE (chat_id, user_code, month_year);


--
-- Name: private_chat_limits private_chat_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_chat_limits
    ADD CONSTRAINT private_chat_limits_pkey PRIMARY KEY (id);


--
-- Name: private_chats private_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_chats
    ADD CONSTRAINT private_chats_pkey PRIMARY KEY (id);


--
-- Name: private_messages private_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_identifier_action_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_identifier_action_type_key UNIQUE (identifier, action_type);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_code_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_code_role_key UNIQUE (user_code, role);


--
-- Name: users users_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_code_key UNIQUE (code);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at DESC);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_content_violations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_violations_created_at ON public.content_violations USING btree (created_at DESC);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);


--
-- Name: idx_posts_owner_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_owner_code ON public.posts USING btree (owner_code);


--
-- Name: idx_rate_limits_blocked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_blocked_until ON public.rate_limits USING btree (blocked_until);


--
-- Name: idx_rate_limits_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_identifier ON public.rate_limits USING btree (identifier);


--
-- Name: idx_security_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_created_at ON public.security_logs USING btree (created_at DESC);


--
-- Name: idx_security_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_severity ON public.security_logs USING btree (severity);


--
-- Name: idx_users_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_code ON public.users USING btree (code);


--
-- Name: bids bids_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: subscriptions fk_user_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_user_code FOREIGN KEY (user_code) REFERENCES public.users(code) ON DELETE CASCADE;


--
-- Name: private_chat_limits private_chat_limits_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_chat_limits
    ADD CONSTRAINT private_chat_limits_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.private_chats(id) ON DELETE CASCADE;


--
-- Name: private_messages private_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.private_chats(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_code_fkey FOREIGN KEY (user_code) REFERENCES public.users(code) ON DELETE CASCADE;


--
-- Name: subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING ((current_setting('app.user_code'::text, true) = ANY (ARRAY['admin'::text, 'michaelrodov'::text])));


--
-- Name: bids Anyone can create bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create bids" ON public.bids FOR INSERT WITH CHECK (true);


--
-- Name: comments Anyone can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create comments" ON public.comments FOR INSERT WITH CHECK (true);


--
-- Name: posts Anyone can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create posts" ON public.posts FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: subscriptions Anyone can create subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (true);


--
-- Name: comments Anyone can delete comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete comments" ON public.comments FOR DELETE USING (true);


--
-- Name: posts Anyone can delete posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete posts" ON public.posts FOR DELETE TO authenticated, anon USING (true);


--
-- Name: private_chat_limits Anyone can insert limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert limits" ON public.private_chat_limits FOR INSERT WITH CHECK (true);


--
-- Name: users Anyone can register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can register" ON public.users FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: private_messages Anyone can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can send messages" ON public.private_messages FOR INSERT WITH CHECK (true);


--
-- Name: private_chats Anyone can update chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update chats" ON public.private_chats FOR UPDATE USING (true);


--
-- Name: private_chat_limits Anyone can update limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update limits" ON public.private_chat_limits FOR UPDATE USING (true);


--
-- Name: posts Anyone can update posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update posts" ON public.posts FOR UPDATE TO authenticated, anon USING (true);


--
-- Name: bids Anyone can view bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view bids" ON public.bids FOR SELECT USING (true);


--
-- Name: private_chats Anyone can view chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view chats" ON public.private_chats FOR SELECT USING (true);


--
-- Name: comments Anyone can view comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);


--
-- Name: private_chat_limits Anyone can view limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view limits" ON public.private_chat_limits FOR SELECT USING (true);


--
-- Name: private_messages Anyone can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view messages" ON public.private_messages FOR SELECT USING (true);


--
-- Name: posts Anyone can view posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT TO authenticated, anon USING (true);


--
-- Name: user_roles Only admins can modify roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can modify roles" ON public.user_roles USING (public.has_role(user_code, 'admin'::public.app_role));


--
-- Name: security_logs Only admins can view security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view security logs" ON public.security_logs FOR SELECT USING (public.has_role(( SELECT users.code
   FROM public.users
  WHERE (users.code = (auth.uid())::text)
 LIMIT 1), 'admin'::public.app_role));


--
-- Name: content_violations Only admins can view violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view violations" ON public.content_violations FOR SELECT USING (public.has_role(( SELECT users.code
   FROM public.users
  WHERE (users.code = (auth.uid())::text)
 LIMIT 1), 'admin'::public.app_role));


--
-- Name: private_chats Premium users can create chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can create chats" ON public.private_chats FOR INSERT WITH CHECK (true);


--
-- Name: users Users can delete their own account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own account" ON public.users FOR DELETE USING (true);


--
-- Name: users Users can update their own account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own account" ON public.users FOR UPDATE USING (true);


--
-- Name: users Users can view all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated, anon USING (true);


--
-- Name: rate_limits Users can view own rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (true);


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((user_code = current_setting('app.user_code'::text, true)));


--
-- Name: bids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: content_violations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_violations ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: private_chat_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_chat_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: private_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: private_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


