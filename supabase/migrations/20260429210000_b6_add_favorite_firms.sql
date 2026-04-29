-- ============================================================================
-- Migration: B.6 — favorite_firms text[] + trigger update
-- Date:      2026-04-29 21:00:00 UTC
-- Phase:     B.6 (Fix #1.6 — modal completar perfil + nickname OAuth)
-- Applied:   2026-04-29 via MCP apply_migration
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_firms text[] DEFAULT '{}';
COMMENT ON COLUMN public.profiles.favorite_firms IS 'Slugs canônicos de prop firms favoritas (multi-select). Usado pra segmentação email marketing e gate de fidelidade.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, email, phone, city, state, country, full_name, zip,
    first_name, last_name, nickname, birthday, address, terms_accepted_at,
    email_verified, favorite_firms
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'zip',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'nickname',
    NULLIF(NEW.raw_user_meta_data->>'birthday','')::date,
    NEW.raw_user_meta_data->>'address',
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN NOW() ELSE NULL END,
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' IS NOT NULL
        AND NEW.raw_app_meta_data->>'provider' != 'email'
        THEN true
      WHEN NEW.email_confirmed_at IS NOT NULL THEN true
      ELSE false
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'favorite_firms' IS NOT NULL
        AND NEW.raw_user_meta_data->>'favorite_firms' != ''
        THEN string_to_array(NEW.raw_user_meta_data->>'favorite_firms', ',')
      ELSE '{}'::text[]
    END
  );
  RETURN NEW;
END;
$function$;
