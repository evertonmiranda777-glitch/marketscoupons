-- ============================================================================
-- Migration: B.4 — normalize country legacy pra ISO-2
-- Date:      2026-04-29 18:00:00 UTC
-- Phase:     B.4 (Fix #1.6 — Match Quality CAPI series)
-- Applied:   2026-04-29 via MCP apply_migration
-- ============================================================================
-- Mapeamento real ANTES (SELECT DISTINCT country FROM profiles):
--   9× 'Brasil'   → 'BR'
--   7× NULL       → mantém NULL
--
-- Mapeamento DEPOIS (validado):
--   9× 'BR'
--   7× NULL
--
-- UPDATEs adicionais cobrem variantes defensivas pra qualquer novo signup que
-- entre antes do form B.4 substituir os values do dropdown (Brasil, Estados
-- Unidos, etc) pelos ISO-2 (BR, US, etc).
-- ============================================================================

UPDATE public.profiles SET country='BR' WHERE country IN ('Brasil','Brazil','brasil','brazil');
UPDATE public.profiles SET country='US' WHERE country IN ('Estados Unidos','United States','USA','EUA','estados unidos','united states');
UPDATE public.profiles SET country='PT' WHERE country IN ('Portugal','portugal');
UPDATE public.profiles SET country='ES' WHERE country IN ('España','Espanha','Spain','spain','espana');
UPDATE public.profiles SET country='MX' WHERE country IN ('Mexico','México','mexico');
UPDATE public.profiles SET country='AR' WHERE country IN ('Argentina','argentina');
UPDATE public.profiles SET country='CO' WHERE country IN ('Colombia','Colômbia','colombia');
UPDATE public.profiles SET country='CL' WHERE country IN ('Chile','chile');
