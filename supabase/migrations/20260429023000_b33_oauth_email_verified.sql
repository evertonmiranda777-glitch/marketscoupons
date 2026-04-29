-- ============================================================================
-- Migration: Fase B.3.3 — auto email_verified=true para OAuth Google/etc
-- Date:      2026-04-29 02:30:00 UTC
-- Phase:     B.3.3 (Fix #1.6 — DB only, zero UI risk)
-- Applied:   2026-04-29 via MCP execute_sql
-- ============================================================================
-- Trigger handle_new_user atualizada pra setar email_verified=true automaticamente
-- quando user vem via OAuth (Google/etc) ou já tem email confirmado no INSERT.
-- Signup email tradicional continua email_verified=false até clicar no link.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, email, phone, city, state, country, full_name, zip,
    first_name, last_name, nickname, birthday, address, terms_accepted_at,
    email_verified
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
    -- email_verified: TRUE se OAuth (Google/GitHub/etc) OU email_confirmed_at presente
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' IS NOT NULL
        AND NEW.raw_app_meta_data->>'provider' != 'email'
        THEN true
      WHEN NEW.email_confirmed_at IS NOT NULL THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Validation results (5/5 PASS — applied 2026-04-29):
--   C1: provider=email, email_confirmed_at=NULL    → email_verified=false  ✓
--   C2: provider=google, email_confirmed_at=NOW()  → email_verified=true   ✓
--   C3: provider=email, email_confirmed_at=NOW()   → email_verified=true   ✓
--   C4: provider=github, email_confirmed_at=NULL   → email_verified=true   ✓
--   C5: 14 users pré-existentes intactos (todos email_verified=false)      ✓
-- ============================================================================
