-- Onda 3 email observability: bounce/complaint tracking pra suppression automática
-- Brevo webhook atualiza esses campos quando email volta com hard_bounce/spam/etc.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS bounce_status text,            -- 'hard_bounce' | 'spam_complaint' | 'soft_bounce' | NULL
  ADD COLUMN IF NOT EXISTS bounce_reason text,            -- mensagem do MTA (truncada 200 chars)
  ADD COLUMN IF NOT EXISTS soft_bounce_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;     -- último evento Brevo recebido

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status
  ON public.email_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_bounce_status
  ON public.email_subscribers (bounce_status) WHERE bounce_status IS NOT NULL;

COMMENT ON COLUMN public.email_subscribers.bounce_status IS
  'Tipo do último bounce/complaint do Brevo. Hard/spam = status=bounced/complained imediato. Soft = incrementa soft_bounce_count, ao chegar 3 vira bounced.';
