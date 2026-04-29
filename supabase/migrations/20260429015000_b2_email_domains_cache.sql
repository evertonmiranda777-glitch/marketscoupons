-- ============================================================================
-- Migration: Fase B.2 — email_domains_cache para validate-email enhanced
-- Date:      2026-04-29 01:50:00 UTC
-- Phase:     B.2 (Fix #1.6 — DB only, zero UI risk)
-- Applied:   2026-04-29 via MCP execute_sql
-- ============================================================================
-- Cache de domínios validados (MX + disposable). Usado por api/validate-email.js
-- pra evitar DNS lookup repetido + hits em blacklists.
--
-- TTL strategy:
--   30 dias  — domínio válido (MX OK + não-disposable)
--   30 dias  — domínio disposable (lista raramente muda)
--    7 dias  — domínio inválido / sem MX (chance de passar a existir)
--    1 dia   — soft-fail (Node DNS + Cloudflare DoH ambos falharam)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_domains_cache (
  domain text PRIMARY KEY,
  mx_valid boolean NOT NULL,
  is_disposable boolean NOT NULL DEFAULT false,
  reason text,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  ttl_expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_domains_ttl
  ON public.email_domains_cache(ttl_expires_at);

ALTER TABLE public.email_domains_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.email_domains_cache;
CREATE POLICY "service_role_only" ON public.email_domains_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.email_domains_cache IS 'Cache de validacoes de dominio email (MX + disposable). TTL 30d validos, 7d invalidos, 1d soft-fail.';
COMMENT ON COLUMN public.email_domains_cache.domain IS 'Dominio normalizado lowercase. PK.';
COMMENT ON COLUMN public.email_domains_cache.mx_valid IS 'TRUE se MX records existem.';
COMMENT ON COLUMN public.email_domains_cache.is_disposable IS 'TRUE se em blacklist hardcoded ou JSON list.';
COMMENT ON COLUMN public.email_domains_cache.ttl_expires_at IS 'Apos esta data, row eh re-validada.';
COMMENT ON COLUMN public.email_domains_cache.hit_count IS 'Numero de hits no cache (telemetria).';

-- ============================================================================
-- Validation: schema confirmado em 2026-04-29 — 7 colunas com tipos corretos
-- ============================================================================
