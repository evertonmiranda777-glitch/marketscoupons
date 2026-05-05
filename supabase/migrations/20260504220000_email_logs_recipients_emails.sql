-- Onda 1 email observability: log per-recipient emails per batch
-- Antes: email_logs.recipients = 9 (count). Agora: recipients_emails = ['a@b.com', ...]
-- User pode ver no admin EXATAMENTE quem recebeu cada batch.

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS recipients_emails jsonb DEFAULT '[]'::jsonb;

-- Index pra acelerar consultas no admin (ordena por data desc, filtra hoje)
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at_desc
  ON public.email_logs (created_at DESC);

COMMENT ON COLUMN public.email_logs.recipients_emails IS
  'Array de emails que receberam neste batch. Permite drilldown no admin pra "quem recebeu hoje".';
