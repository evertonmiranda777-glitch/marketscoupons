-- Migration: add promo_ends_at to cms_firms
-- Run in Supabase SQL Editor

ALTER TABLE cms_firms
ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN cms_firms.promo_ends_at IS 'Optional: when the current promo ends. Timer pill shown on home card + checkout. Null = no timer.';

-- Example: set Apex promo ending in 2 days
-- UPDATE cms_firms SET promo_ends_at = NOW() + INTERVAL '2 days' WHERE id = 'apex';
