# TradeDay — deep KB

> Fonte viva: cms_firms.kb (id=tradeday). O Max puxa isto sob demanda.

TRADEDAY (tradeday.com) — deep knowledge (official site + help center, confirmed 2026-07-23). Futures-only prop firm, US (TradeDay LLC, Chicago, Illinois; also UK presence), founded 2020. Founders James Thorpe (CEO) & Steve Miley (COO). Futures only (CME/CBOT/NYMEX/COMEX) — no forex/CFD/stocks. NOT registered with SEC/CFTC/NFA. Simulated "Funded Sim" with a route to "Funded Live". Monthly subscription model, NO separate activation fee. Platforms: Tradovate (main), NinjaTrader, TradingView, Jigsaw; mobile via Tradovate/ProjectX. Data feed CQG. Min age 18.

COUPON: our exclusive code is MARKETS = ~50% OFF (site shows a public "50% OFF / code TDNEW" banner; push MARKETS). Prices are a MONTHLY subscription (recurring until you pass or cancel).

=== ACCOUNT LINES, PRICES & EVAL RULES (confirmed) ===
Three lines, sizes 50K/100K/150K. Profit target, drawdown and position limits are the SAME across Intraday, EOD and Fast Pass per size; only the drawdown TYPE and the consistency % differ.
- Profit target: 50K $3,000 | 100K $6,000 | 150K $9,000.
- Max drawdown: 50K $2,000 | 100K $3,000 | 150K $4,500. Intraday (Quick Pay Intraday + Fast Pass) = TRAILING, calculated intraday (follows the high-water mark, locks at a profit cap). EOD (Quick Pay EOD) = calculated only at the day's CLOSE.
- Position limits: 50K = 5 contracts | 100K = 10 | 150K = 15 (micros count fractionally).
- Consistency: Quick Pay 30% (no single day >30% of total profit); Fast Pass 45%.
- Minimum trading days: 5 (Quick Pay; reduced from 7 in Sept 2025). Fast Pass has a CONFLICT on the official site — one article says "minimum 3 days", another says "No minimum trading days", the homepage FAQ even says "pass in 3 days with no minimum trading day requirement". Report the conflict, don't pick one.
PRICES (monthly, regular -> ~50% off) + reset fee (tiered):
- QUICK PAY INTRADAY: 50K $125->$62 (reset $60) | 100K $230->$115 (reset $110) | 150K $350->$175 (reset $165).
- QUICK PAY EOD: 50K $175->$87 (reset $85) | 100K $285->$142 (reset $135) | 150K $395->$197 (reset $195).
- FAST PASS: 50K $180 | 100K $320 | 150K $480 (no confirmed promo price).
RESET FEE CONFLICT: the Terms say a flat $99, but the official pricing widget shows the tiered values above ($60-$195 by size/type). Both are official; report both. Free reset offered for a proven platform technical issue.

=== FUNDED (Funded Sim -> Funded Live) ===
QUICK PAY Funded Sim: profit split 50/50 while the account's CURRENT profit is under $4,000, then 80/20 (trader 80%) once profit is over $4,000 (per individual account, NOT lifetime withdrawals); Funded LIVE is 90/10. Min payout request $250; min days to payout 1; NO milestones, NO consistency rule, NO buffer (per the official payout widget/policy). CONFLICT: a general help article says "traders must clear the Buffer Zone before a payout", which contradicts the Quick Pay policy that says there is no buffer — report both. Max drawdown on funded uses gross profit.
FAST PASS Funded Sim: NO buffer; FIXED 80/20 split (not scaled); requires 5 individual profitable days (not consecutive) with a min profit/day: 50K $150 | 100K $200 | 150K $250; withdrawal capped at 50% of account balance with a per-size cap: 50K $2,000 | 100K $2,500 | 150K $3,000. Trailing drawdown locks at the initial balance on the first payout request.
No extra fee to become funded. No inactivity fees, no minimum trading requirement to keep a funded account. Max 6 accounts per trader (eval + funded combined). Independent-contractor tax status.

=== PAYOUTS ===
Requests received before 17:30 CT on business days are processed within ~24 hours. Methods/fees: US bank transfer FREE; international transfer $15; Crypto Layer-1 $2.50 + gas fee; Crypto Layer-2 FREE. Funded Sim requests via the dashboard ("Request Withdrawal"); Funded Live via email to their funded-trader address. Paid/KYC via Riseworks (government ID + proof of address).

=== FEES ===
Monthly subscription only (no activation fee). Market data: CQG included in the subscription for evaluation; Funded LIVE adds ~$156/month per exchange + ~$49/month for Level 2. Commissions per side per contract: indices ES $2.88 / MES $0.95 / NQ $2.88 / MNQ $0.95 / RTY $2.88 / M2K $0.95 / NKD $3.15 / YM $2.88 / MYM $0.95; FX 6A/6B/6C/6E/6J/6S/6N $3.10 each, M6E $0.84; rates ZT/ZF $2.15, ZN/TN $2.30, ZB $2.37, UB $2.45; energy CL $3.00 / MCL $1.10 / QM $2.70 / QG $2.00 / NG $3.10; metals PL/HG/GC/SI $3.10 each, MGC $1.20, SIL $1.46; ag HE/LE/ZS/ZC/ZL/ZM/ZW $3.60 each.

=== REFUND ===
General rule: NO refund after purchase (third-party providers require immediate commitment). Exception "forgotten membership": you can refund the LAST payment if requested within 72 hours of the charge AND you had no trading/no connection to third-party providers since paying — minus a 20% deduction. NO refund for technical issues (connectivity, market data, platform).

=== RULES / VIOLATIONS ===
NEWS: Tier-1 news/data-release trading is BANNED (blackout window around the release). VPN/VPS/IP-masking to hide location = prohibited (VPS to host a platform is fine; masking your country is not). Copy trader allowed BETWEEN YOUR OWN accounts; 3rd-party signal copying not clearly addressed. EAs/bots allowed conditionally if they don't "game the simulated algorithm" (latency exploitation, sim-vs-real arbitrage). HFT exploiting the sim = banned. Order splitting and abusive microscalping banned; manual scalping allowed. Overnight/weekend holding not clearly stated. Losing the account: breach max drawdown (trailing/EOD), break consistency (30% Quick Pay / 45% Fast Pass), prohibited practices (sim gaming, sim-vs-real arbitrage, order splitting, abusive microscalping), Tier-1 news in blackout, VPN/IP-masking, non-permitted products, exceeding position limits, subscription lapse, failing KYC.
RESTRICTED COUNTRIES (extensive): Russia, Belarus, Iran, Iraq, Syria, North Korea, Cuba, Venezuela, Pakistan, Nigeria, Indonesia, Philippines, South Africa, Sri Lanka, Vietnam, Ukraine (new signups blocked; existing users crypto payout only) and many more. Conditional: Germany and Canada-outside-Ontario = Funded SIM only (no Funded Live). Assets: futures — equity indices (ES/MES/NQ/MNQ/YM/MYM/RTY/M2K/NKD), FX futures, rates/bonds, energy, metals, agriculturals. New metals restriction effective 2026-02-11 (details not fully published). $10M+ verified payouts (Dec 2025). Founders "80+ years combined experience" (an older help article said 60 — minor conflict).

