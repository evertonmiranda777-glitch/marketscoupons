-- SEED da tabela `firms`. Valores COPIADOS literalmente de cms_firms (fonte em producao hoje),
-- verificados um a um contra o site/painel de cada firma em 27/07/2026.
-- Firmas sem cupom identificavel entram como VERIFICAR_MANUALMENTE + ativo=false (regra do dono).

insert into public.firms (slug, nome, affiliate_url, tracking_param, tracking_value, coupon_code, coupon_description, ativo)
values
  ('alphafutures', 'Alpha Futures', 'https://app.alpha-futures.com/signup/Markets026158/', 'path', 'Markets026158', 'MARKETS026158', '40% OFF', true),
  ('apex', 'Apex Trader Funding', 'https://apextraderfunding.com/member/aff/go/evertonmiranda#block_660bfb7d9cd2c41901144ab4319f8644', 'path', 'evertonmiranda', 'MARKET', 'Legacy Evaluation Accounts are BACK (limited time) + every 100K Intraday No Activation Fee account is $59 ALL-IN', true),
  ('aquafutures', 'Aqua Futures', 'https://www.aquafunded.com/?afmc=h5d', 'afmc', 'h5d', 'h5d', '45% OFF + 200% refund applied at checkout', true),
  ('blueberryfutures', 'Blueberry Futures', 'https://portal.blueberryfutures.com/auth/signup?ref_code=MARKET-7652C', 'ref_code', 'MARKET-7652C', 'MARKET-7652C', '60% OFF', true),
  ('blueguardian', 'Blue Guardian', 'https://checkout.blueguardian.com/?afmc=MARKET', 'afmc', 'MARKET', 'MARKET', '25% OFF', true),
  ('brightfunded', 'BrightFunded', 'https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ', 'path', 'CLNLTPxtT4Sok0PzHaRIIQ', 'VERIFICAR_MANUALMENTE', '30% OFF + 15% Evaluation Profit Reward - applied automatically via our link, no code needed', false),
  ('bulenox', 'Bulenox', 'https://bulenox.com/member/aff/go/marketcoupons', 'path', 'marketcoupons', 'MARKET89', '89% OFF', true),
  ('cti', 'City Traders Imperium', 'https://app.citytradersimperium.com/user-auth/register?referral_code=1331c5&utm_source=client&utm_medium=referral&utm_id=1331c5', 'referral_code', '1331c5', 'INFINITY8', '20% OFF all programs (except Instant Fund Pro)', true),
  ('e2t', 'Earn2Trade', 'https://www.earn2trade.com/purchase?plan=TCP25&a_pid=marketscoupons&a_bid=2e8e8a14', 'a_pid', 'marketscoupons', 'MARKETSCOUPONS', '50% OFF', true),
  ('e8', 'E8 Markets', 'https://e8markets.com/d/MARKET', 'path', 'MARKET', 'MARKET', '40% OFF', true),
  ('fn', 'FundedNext', 'https://fundednext.com/futures?fpr=everton33', 'fpr', 'everton33', 'MARKET', 'NO ACTIVATION FEE, regardless of account size', true),
  ('ftmo', 'FTMO', 'https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP', 'affiliates', 'eyfIptUCGgfcfaUlyrRP', 'VERIFICAR_MANUALMENTE', '19% OFF on the $100K 2-Step (Best Value) - use our link', false),
  ('funded-futures-family', 'Funded Futures Family', 'https://app.fundedfuturesfamily.com/affiliation/?ref_code=ed5ae23f-10eb-46c6-b6d1-280369e720eb', 'ref_code', 'ed5ae23f-10eb-46c6-b6d1-280369e720eb', 'MARKET', '80% OFF', true),
  ('fundingpips', 'Funding Pips', 'https://app.fundingpips.com/register?referral_code=31985EAA', 'referral_code', '31985EAA', 'HELLO', '20% OFF first challenge with code HELLO (excludes 100K accounts)', true),
  ('futureselite', 'Futures Elite', 'https://app.futureselite.com/auth/sign-up?aff=AFF5585615', 'aff', 'AFF5585615', 'VERIFICAR_MANUALMENTE', 'Elite & Prime 20% OFF · Instant 30% OFF · applied automatically, no code needed', false),
  ('goat', 'Goat Funded Futures', 'https://app.goatfundedfutures.com/checkout?referral_id=MARKET', 'referral_id', 'MARKET', 'MARKET', '50% OFF', true),
  ('the5ers', 'The5ers', 'https://www.the5ers.com/?afmc=19jp', 'afmc', '19jp', 'VERIFICAR_MANUALMENTE', 'Summer Plan: $100K for $149 (was $491) - the site''s flagship offer', false),
  ('toponefutures', 'Top One Futures', 'https://toponefutures.com/?linkId=lp_707970&sourceId=markets&tenantId=toponefutures', 'linkId', 'lp_707970', 'MARKET', '50% OFF', true),
  ('tradeday', 'TradeDay', 'https://www.tradeday.com/?a_aid=marketscoupons#pricing', 'a_aid', 'marketscoupons', 'MARKETS', '55% OFF', true)
on conflict (slug) do update set
  nome=excluded.nome, affiliate_url=excluded.affiliate_url, tracking_param=excluded.tracking_param,
  tracking_value=excluded.tracking_value, coupon_code=excluded.coupon_code,
  coupon_description=excluded.coupon_description, ativo=excluded.ativo;
