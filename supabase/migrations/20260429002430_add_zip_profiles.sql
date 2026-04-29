-- ============================================================================
-- Migration: add zip column to profiles + update handle_new_user trigger
-- Date:      2026-04-29 00:24:30 UTC
-- Phase:     A (Fix #1.6 Match Quality CAPI — DB only, zero UI risk)
-- Applied:   2026-04-29 via MCP execute_sql
-- ============================================================================

-- 1) Add zip column (nullable for backward compat with existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zip text;

COMMENT ON COLUMN public.profiles.zip IS 'Postal code (CEP/ZIP). Country-specific format validated client-side.';

-- 2) Recreate handle_new_user trigger function to include zip
-- Diff vs previous: 1 column + 1 value in INSERT — zip extracted from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, phone, city, state, country, full_name, zip)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'zip'
  );
  RETURN NEW;
END;
$function$;

-- Trigger 'on_auth_user_created' já aponta pra essa função.
-- CREATE OR REPLACE FUNCTION atualiza inline sem precisar DROP/CREATE TRIGGER.

-- ============================================================================
-- Validation (run after applying):
--
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles' AND column_name='zip';
-- → expects: zip / text / YES
--
-- SELECT pg_get_functiondef('public.handle_new_user'::regproc::oid)
--   LIKE '%raw_user_meta_data->>''zip''%' AS includes_zip;
-- → expects: includes_zip = true
-- ============================================================================
