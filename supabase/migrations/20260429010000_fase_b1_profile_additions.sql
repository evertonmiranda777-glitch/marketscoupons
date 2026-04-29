-- ============================================================================
-- Migration: Fase B.1 — Profile additions for expanded signup form
-- Date:      2026-04-29 01:00:00 UTC
-- Phase:     B.1 (Fix #1.6 — DB only, zero UI risk)
-- Applied:   2026-04-29 via MCP execute_sql
-- ============================================================================
-- 9 new columns + trigger update.
-- birthday is `date` (type-safe). Trigger uses NULLIF(...,'')::date so empty
-- string from form input doesn't break cast.
-- ============================================================================

-- 1) Add 9 new columns (all nullable for backward compat with existing users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verification_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN public.profiles.first_name IS 'Primeiro nome separado (pra CAPI fn).';
COMMENT ON COLUMN public.profiles.last_name IS 'Sobrenome separado (pra CAPI ln).';
COMMENT ON COLUMN public.profiles.nickname IS 'Apelido publico — UX interna, nao vai pro CAPI.';
COMMENT ON COLUMN public.profiles.birthday IS 'Data nascimento (date) — formatada YYYYMMDD hashed pro CAPI db.';
COMMENT ON COLUMN public.profiles.address IS 'Endereco (rua + numero), preenchido auto via ViaCEP/Zippopotam.';
COMMENT ON COLUMN public.profiles.email_verified IS 'TRUE apos click no link double opt-in.';
COMMENT ON COLUMN public.profiles.email_verification_token IS 'Token UUID do double opt-in (TTL via _expires_at).';
COMMENT ON COLUMN public.profiles.email_verification_expires_at IS 'Expira em 24h apos envio (security).';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp da aceitacao LGPD/GDPR no signup.';

-- 2) Recreate handle_new_user trigger to include all new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, email, phone, city, state, country, full_name, zip,
    first_name, last_name, nickname, birthday, address, terms_accepted_at
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
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN NOW() ELSE NULL END
  );
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Validation results (run 2026-04-29):
--   T1: 9 columns exist with correct types — OK
--   T2: trigger includes all new fields + NULLIF — OK
--   T3: full INSERT (all fields incl. birthday=1990-05-13, terms=true) — OK
--       → first_name=João, last_name=Silva, nickname=jsilva, birthday=1990-05-13,
--         address='Av Paulista, 1000', zip=01310-100, terms_set=true, verified=false
--   T4: minimal INSERT (only legacy fields, no new ones) — OK (all new fields NULL,
--       terms_accepted_at NULL, email_verified=false default)
--   T5: INSERT with birthday="" (empty string) — OK (NULLIF saved birthday=NULL)
--   T6: cleanup — 0 test users remaining
-- ============================================================================
