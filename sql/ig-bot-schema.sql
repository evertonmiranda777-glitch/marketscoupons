-- ====================================================================
-- Bot DM Instagram — Schema Supabase
-- Roda em: SQL Editor do Supabase (qfwhduvutfumsaxnuofa)
-- ====================================================================

-- 1) Cadastro de respostas automáticas por keyword
CREATE TABLE IF NOT EXISTS ig_auto_replies (
  id BIGSERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,                    -- ex: "VOLUME", "CUPOM", "APEX"
  post_id TEXT,                             -- opcional: limitar a 1 post específico (Meta media_id). NULL = todos posts.
  reply_templates JSONB NOT NULL,           -- array de strings, escolhido random pra evitar pattern spam
  reply_link TEXT,                          -- link enviado junto (ex: site.com/volumefilter)
  enabled BOOLEAN DEFAULT true,
  match_mode TEXT DEFAULT 'contains',       -- 'contains' | 'exact' | 'word_boundary'
  created_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_ig_replies_enabled ON ig_auto_replies (enabled) WHERE enabled = true;

-- 2) Log de DMs enviados (rate limit + audit)
CREATE TABLE IF NOT EXISTS ig_dm_log (
  id BIGSERIAL PRIMARY KEY,
  comment_id TEXT,                          -- Meta comment id que gatilhou
  ig_user_id TEXT,                          -- IG user que comentou
  post_id TEXT,                              -- post onde comentou
  keyword_matched TEXT,
  reply_id BIGINT REFERENCES ig_auto_replies(id) ON DELETE SET NULL,
  template_used INT,                        -- index do template escolhido
  dm_status TEXT,                            -- 'sent', 'failed', 'opted_out', 'rate_limited'
  meta_response JSONB,                      -- resposta crua da Graph API
  sent_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ig_log_user_recent ON ig_dm_log (ig_user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_log_sent_at ON ig_dm_log (sent_at DESC);

-- 3) Usuários que pediram opt-out (reply "STOP")
CREATE TABLE IF NOT EXISTS ig_opt_outs (
  ig_user_id TEXT PRIMARY KEY,
  opted_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- 4) RLS — ninguém anon lê/escreve direto
ALTER TABLE ig_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_dm_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_opt_outs ENABLE ROW LEVEL SECURITY;

-- 5) Seed inicial: keyword "VOLUME" pra VolumeFilter
INSERT INTO ig_auto_replies (keyword, post_id, reply_templates, reply_link, match_mode, notes)
VALUES (
  'VOLUME',
  NULL,
  jsonb_build_array(
    'Hey trader, here''s the VolumeFilter link as promised. Free until Dec 31, 2026. Setup takes 2 min on NinjaTrader 8: {link}',
    'Sent! VolumeFilter free until end of year. Direct download here: {link} (NinjaTrader 8). Any questions just reply.',
    'There you go: {link} — VolumeFilter free indicator, 100% functional on NT8. Lemme know if the install is OK.'
  ),
  'https://www.marketscoupons.com/volumefilter',
  'contains',
  'Auto-reply do carrossel VolumeFilter. 3 templates rotativos pra evitar spam pattern.'
);

-- ====================================================================
-- Pronto. Pra adicionar nova keyword no futuro:
-- INSERT INTO ig_auto_replies (keyword, reply_templates, reply_link) VALUES (...)
-- ====================================================================
