import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');
const KEY = process.env.GEMINI_API_KEY || (() => { throw new Error('GEMINI_API_KEY env required'); })();
const MODEL = 'gemini-3-pro-image-preview';
const outDir = path.join(root, 'img/guides-edu/gemini-pro');
fs.mkdirSync(outDir, { recursive: true });

const ACCENT = { G1: '#F97316', G2: '#10B981', G3: '#EF4444', G4: '#3B82F6', G5: '#F0B429' };
const ACCENT_NAME = { G1: 'orange', G2: 'emerald', G3: 'red', G4: 'blue', G5: 'gold' };

const buildPrompt = ({ guide, title, composition, nazmulRef }) => {
  const c = ACCENT[guide];
  const cn = ACCENT_NAME[guide];
  return `Editorial pitch-deck cover in the EXACT visual style of ref-image-1 (Nazmul Hossan ${nazmulRef}). Critical requirements:

COMPOSITION, recreate the layout of ref-image-2 pixel-accurately:
${composition}

ATMOSPHERE, match ref-image-1 exactly:
- 70% of canvas is DEEP BLACK negative space (#0A0A0F), ONLY the subject is illuminated
- Single cinematic light source casting long soft shadows
- ${cn} ${c} accent ONLY on key elements (outlines, pills, hero numbers/values), never fill the whole frame
- Secondary text in cool off-white / pale gray on deep black
- Subtle film grain, moody editorial magazine-spread mood

STYLE: Premium 3D editorial render, not flat graphic. Every word, number, and label from ref-image-2 must be reproduced 100% readable and accurate. No UI chrome, no browser frame, no device mockup unless explicitly stated in composition, no watermark. Output 16:9 landscape.`;
};

// 30 jobs: 20 slots + 5 heros + (models-matrix which we already have from 20) -- let me count: heros 5 + slots 20 = 25
const jobs = [
  // ====== 5 HEROS (A5 double-card offset) ======
  { slug: 'hero-g1-deal', guide: 'G1', nazmulRef: 'cardan-c', aesthetic: 'cardan-c.jpg', content: 'nazmul-hero-g1-deal.png',
    title: 'Hero · The Deal',
    composition: `1. Thin orange outlined pill at TOP: "WHY PROP FIRMS EXIST" (JetBrains Mono, uppercase, letter-spaced)
2. Central DOUBLE-CARD stack (Nazmul A5 signature): BACK ghost card offset 10px down-right (barely visible, dim orange outline on near-black), FRONT hero card on top showing "$50K + YOU", "$50K" left with "FIRM'S CAPITAL" label, bold "+" separator, "YOU" right with "TRADER SKILL" label
3. Thin orange outlined pill at BOTTOM: "80/20 SPLIT · CONTRACT"
4. Faint horizontal orange light-bloom behind the hero card` },

  { slug: 'hero-g2-push', guide: 'G2', nazmulRef: 'fynex-fintech', aesthetic: 'fynex-fintech.jpg', content: 'nazmul-hero-g2-push.png',
    title: 'Hero · Final Push',
    composition: `1. Thin emerald outlined pill at TOP: "CHALLENGE · FINAL PUSH"
2. Central DOUBLE-CARD stack (A5): BACK ghost card offset 10px down-right (dim emerald outline), FRONT hero card showing:
   - Small tag: "DAY 4 OF 5 · FINAL PUSH"
   - Massive number line: "$2,840 / $3,000" (the "$2,840" bold emerald, "/$3,000" dim white)
   - Progress bar 94.6% filled emerald
   - 3 stat rows: "Progress 94.6%", "Time left 24h", "Need $160"
3. Emerald light-bloom behind the hero card` },

  { slug: 'hero-g3-neardeath', guide: 'G3', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-hero-g3-neardeath.png',
    title: 'Hero · Near Death',
    composition: `1. Thin red outlined pill at TOP: "DRAWDOWN · NEAR DEATH"
2. Central DOUBLE-CARD stack (A5): BACK ghost card offset 10px down-right (dim red outline), FRONT hero card showing:
   - Warning tag: "⚠ CUSHION CRITICAL" (red)
   - "Balance: $47,620" (white)
   - "DD Floor: $47,500" (red)
   - Highlighted pill row at bottom: "Cushion left $120" (red pill on dark)
3. Red alert glow behind the hero card` },

  { slug: 'hero-g4-bridge', guide: 'G4', nazmulRef: 'jether-web3', aesthetic: 'jether-web3.jpg', content: 'nazmul-hero-g4-bridge.png',
    title: 'Hero · Math → Action',
    composition: `1. Thin blue outlined pill at TOP: "POSITION SIZING · THE BRIDGE"
2. TWO side-by-side DOUBLE-CARDS (A5) connected by central "→" arrow:
   LEFT CARD: heading "Calc", equation "$50K × 1% ÷ (8 × $5)", result line "= 12" (with "12" massive blue)
   RIGHT CARD: heading "Order", order ticket lines "BUY MES", "Qty: 12", "Entry: 15,420", "SL: 15,412", bottom "+$500 risk"
3. Both cards have ghost-card offset bottom-right
4. Blue light-bloom subtle behind both cards` },

  { slug: 'hero-g5-money', guide: 'G5', nazmulRef: 'cardan-c', aesthetic: 'cardan-c.jpg', content: 'nazmul-hero-g5-money.png',
    title: 'Hero · Money Arrives',
    composition: `1. Thin gold outlined pill at TOP: "PAYOUT · MONEY ARRIVES"
2. Central DOUBLE-CARD stack (A5): BACK ghost card offset 10px down-right (dim gold outline), FRONT hero card looks like a BANK PUSH NOTIFICATION:
   - Header row: "Bank · now" left, "Wire received" right (gold badge)
   - Subtitle: "Transfer completed"
   - MASSIVE amount: "+$4,800" (gold serif)
   - Footer small: "From Apex Trader Funding · Payout #1 · 5-day cycle"
3. Warm gold light-bloom behind the hero card` },

  // ====== 4 G1 SLOTS ======
  { slug: 'models-matrix', guide: 'G1', nazmulRef: 'cardan-c', aesthetic: 'cardan-c.jpg', content: 'nazmul-models-matrix.png',
    title: 'Models Matrix',
    composition: `1. Small orange pill at top-center: "EVALUATION MODELS · 3 PATHS"
2. Comparison TABLE 3 columns × 4 rows, structured cards:
   Columns: "1-STEP", "2-STEP", "INSTANT"
   Rows: "Cost: $49 / $99 / $299", "Time: Instant / 10-30d / Instant", "Pass rate: 38% / 27% / 12%", "Best for: Quick capital / Proven steady / No eval"
3. One column has a subtle orange highlight border indicating "best for most"
4. Structured editorial composition, premium dashboard look` },

  { slug: 'money-flow', guide: 'G1', nazmulRef: 'chaintools', aesthetic: 'chaintools.jpg', content: 'nazmul-money-flow.png',
    title: 'Money Flow',
    composition: `1. Single focal: a premium BLACK CREDIT CARD mockup floating with slight 3D rotation, chrome chip realistic, contactless icon, "MarketsCoupons" wordmark subtle
2. Massive balance "$2,400.00" overlapping the card, "$2,400" bold white, ".00" in ORANGE accent
3. Side-light from the right casting long soft shadow to the left
4. Orange diagonal light-bloom background gesture
5. ONE focal only (the card), rest is deep black negative space` },

  { slug: 'global-map', guide: 'G1', nazmulRef: 'heliomove', aesthetic: 'heliomove.jpg', content: 'nazmul-global-map.png',
    title: 'Global Map',
    composition: `1. Small orange pill top: "3 REGIONS · 250+ FIRMS"
2. Minimalist world-map silhouette (dark-on-dark), with 3 illuminated orange cluster points labeled:
   - "North America, Apex / Bulenox / Topstep · Futures"
   - "Europe, FTMO / The5ers / E8 · FX+CFD"
   - "MENA + Asia, FundingPips / Blueberry · Global FX"
3. Bottom badge: "250+ FIRMS · $10B+ FUNDED"
4. Architectonic scale, orange glow only on active clusters` },

  { slug: 'scale-apex-real', guide: 'G1', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-scale-apex-real-.png',
    title: 'Scale (Apex real)',
    composition: `1. Small orange pill top: "APEX MULTI-ACCOUNT STACKING"
2. HORIZONTAL TIMELINE (bold editorial): 4 stages arranged left-to-right
   "$25K start" → "+$2.5K profit" → "add $50K acct" → "+$2.5K" → "add $100K" → "+$5K" → FINAL STACKED "$300K" (largest, orange, pill-wrapped)
3. Thin dashed line connecting stages
4. Bottom tiny label: "Apex official · multi-account stacking"` },

  // ====== 4 G2 SLOTS ======
  { slug: 'slow-vs-fast', guide: 'G2', nazmulRef: 'fynex-fintech', aesthetic: 'fynex-fintech.jpg', content: 'nazmul-slow-vs-fast.png',
    title: 'Slow vs Fast',
    composition: `1. Small emerald pill top: "EQUITY · 20 DAYS · SAME TARGET"
2. MacBook display showing DUAL EQUITY CURVES:
   - Green steady curve rising slowly labeled inside an emerald pill "SLOW +8% · PASS"
   - Red parabolic crash curve spike+dump labeled in a red pill "FAST -100% · BUST"
3. X-axis "Day 0" to "Day 20"
4. Emerald glow only on pass curve, red shadow on bust curve` },

  { slug: 'pass-rate', guide: 'G2', nazmulRef: 'fynex-fintech', aesthetic: 'fynex-fintech.jpg', content: 'nazmul-pass-rate.png',
    title: 'Pass Rate',
    composition: `1. Small emerald pill top: "PASS RATE · 2024 DATA"
2. CENTRAL TYPOGRAPHIC STAT COMPARISON:
   Left card (dim red): big number "7%" (Fraunces serif, red), label "INDUSTRY AVG"
   Center: "VS" separator
   Right card (emerald glow, 1.1x scale): gold pill at top "3.8× MULTIPLIER", big number "27%" (emerald), label "FOLLOWING RULES"
3. Bottom caption: "Traders who follow the 5 core rules pass at 3.8× the industry average"
4. Right card has emerald border + subtle glow` },

  { slug: 'math-of-target', guide: 'G2', nazmulRef: 'jether-web3', aesthetic: 'jether-web3.jpg', content: 'nazmul-math-of-target.png',
    title: 'Math of Target',
    composition: `1. Small emerald pill top: "REVERSE MATH · $3K TARGET"
2. CENTERED TYPOGRAPHIC EQUATION working backward from target, premium Fraunces serif:
   "$3,000 target" → "÷ 20 trades" → "= $150 avg win" → "R:R 1:3" → "Risk $50/trade"
3. The FINAL step "Risk $50/trade" is wrapped in a SOLID emerald pill, the hero result
4. Equation arranged on horizontal editorial baseline, generous whitespace` },

  { slug: 'rules-dashboard', guide: 'G2', nazmulRef: 'fynex-fintech', aesthetic: 'fynex-fintech.jpg', content: 'nazmul-rules-dashboard.png',
    title: 'Rules Dashboard',
    composition: `1. Small emerald pill top: "ACCOUNT RULES · 5 HARD LIMITS"
2. DASHBOARD with 4 stat cards in 2×2 grid, glassmorphic dark:
   - "MAX DRAWDOWN −$2,500" (RED value, labeled "KILLER #1", hero 2× size)
   - "DAILY LOSS LIMIT −$1,500"
   - "PROFIT TARGET $3,000"
   - "MIN DAYS 5"
3. Max Drawdown card is 2× size of others (B1 hierarchy)
4. Thin emerald accent borders on all cards` },

  // ====== 4 G3 SLOTS ======
  { slug: 'trailing-vs-static', guide: 'G3', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-trailing-vs-static.png',
    title: 'Trailing vs Static',
    composition: `1. Small red pill top: "DRAWDOWN BEHAVIOR · LIVE ACCOUNT"
2. MacBook screen showing:
   - White ascending equity curve (solid line)
   - Red dashed line TRAILING the curve (shifted down) labeled inside pill "TRAILING −$2K"
   - Red dotted horizontal line at the floor labeled "STATIC −$2K"
   - Top-left legend pill: "EQUITY" (white)
3. Red accent glow subtle, rest deep black` },

  { slug: 'dd-floor', guide: 'G3', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-dd-floor.png',
    title: 'DD Floor',
    composition: `1. iPhone or dashboard view titled "DRAWDOWN CUSHION"
2. C1 CLEARANCE-ZONE technical layout: vertical and horizontal crosshair lines, 4 pixel-label callouts connecting to measurement points
3. Central balance hero: "$50,000" big white
4. Below: "DD FLOOR $47,500" (red), "CUSHION $2,500" (orange), gauge bar with "NOW" marker near the floor
5. Bottom caption in red pill: "Hit floor = busted"` },

  { slug: 'recovery-math', guide: 'G3', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-recovery-math.png',
    title: 'Recovery Math',
    composition: `1. Small red pill top: "LOSS → RECOVERY NEEDED"
2. ASYMMETRIC CURVE CHART with 4 plotted points, rising dramatically right-upward
3. Left legend stack, 4 labeled pills with color gradient:
   - GREEN pill: "−10% → +11%"
   - AMBER pill: "−25% → +33%"
   - ORANGE pill: "−50% → +100%"
   - RED pill (biggest, hero): "−75% → +300%"
4. Red gradient fill under the curve, x-axis "Loss %" to "Recovery required %"` },

  { slug: 'dd-types-by-firm', guide: 'G3', nazmulRef: 'autonex', aesthetic: 'autonex.jpg', content: 'nazmul-dd-types-by-firm.png',
    title: 'DD Types by Firm',
    composition: `1. Small red pill top: "DD TYPES · 4 FIRMS COMPARED"
2. COMPARISON TABLE: 4 firm rows (Apex, FTMO, Topstep, The5ers) × 3 DD columns (Daily / Max / Trailing)
3. First row (Apex) is HERO-SIZED 2× with red accent glow, showing "TRAILING DD" highlighted
4. Other rows smaller with checkmarks and values
5. Red accent on column headers and hero row` },

  // ====== 4 G4 SLOTS ======
  { slug: 'the-formula', guide: 'G4', nazmulRef: 'jether-web3', aesthetic: 'jether-web3.jpg', content: 'nazmul-the-formula.png',
    title: 'The Formula',
    composition: `1. Small blue pill top: "POSITION SIZING · THE FORMULA"
2. MacBook or clean slate displaying TYPOGRAPHIC EQUATION in premium Fraunces serif, centered:
   TOP line (smaller): "Contracts = (Account × Risk%) ÷ (Stop ticks × Tick value)"
   BOTTOM line (hero 24px): "($50,000 × 1%) ÷ (8 × $5) = 12 contracts"
   The "= 12" result is MASSIVE blue, wrapped in a subtle blue pill
3. Generous whitespace, editorial pacing` },

  { slug: 'contracts-per-size', guide: 'G4', nazmulRef: 'chaintools', aesthetic: 'chaintools.jpg', content: 'nazmul-contracts-per-size.png',
    title: 'Contracts per Size',
    composition: `1. Small blue pill top: "SAME RULE · 1% · 8 TICKS · $5"
2. BAR CHART, 4 ascending 3D blue bars left to right:
   Bar 1: "1×" label above, "$25K" below (smallest)
   Bar 2: "2×" / "$50K"
   Bar 3: "3×" / "$100K"
   Bar 4: "4×" / "$150K" (tallest, vivid blue hero, floating tag INSIDE top-right corner: "$150K ACCT")
3. Bottom caption: "Formula scales linearly · Size changes, math doesn't"
4. Blue glow only on hero bar` },

  { slug: 'compound-effect', guide: 'G4', nazmulRef: 'chaintools', aesthetic: 'chaintools.jpg', content: 'nazmul-compound-effect.png',
    title: 'Compound Effect',
    composition: `1. Small blue pill top-left: "EQUITY · 100 TRADES · 60% WIN · R:R 1:2"
2. CHART with 3 curves plotted:
   - Green smooth steady rise
   - Orange volatile roller-coaster
   - Red crash-and-burn
3. TOP-RIGHT legend stack, 3 pills with dark bg + accent outline:
   - Emerald pill: "1% · +34%"
   - Orange pill: "3% · +52% vol"
   - Red pill: "10% · BUSTED"
4. Blue accent grid lines, dark studio` },

  { slug: '3-traders', guide: 'G4', nazmulRef: 'chaintools', aesthetic: 'chaintools.jpg', content: 'nazmul-3-traders.png',
    title: '3 Traders',
    composition: `1. Small blue pill top: "SAME STRATEGY · 3 TRADERS · 3 OUTCOMES"
2. THREE CARDS side-by-side showing equity curves:
   - LEFT (hero, 1.2× scale, emerald glow): "TRADER A · 1% risk · SURVIVES DAY 90" green rising curve, top tag pill "ONLY SURVIVOR"
   - CENTER (smaller, dim): "TRADER B · 3% · BUSTED DAY 14" red busted curve
   - RIGHT (smallest, dim): "TRADER C · 10% · BUSTED DAY 3" red quick-crash
3. Bottom caption: "Same entries. Different risk. Different fates."
4. Blue accents on borders only` },

  // ====== 4 G5 SLOTS ======
  { slug: 'first-payout-timeline', guide: 'G5', nazmulRef: 'cardan-c', aesthetic: 'cardan-c.jpg', content: 'nazmul-first-payout-timeline.png',
    title: 'First Payout Timeline',
    composition: `1. Small gold pill top: "FIRST PAYOUT · 5-DAY CYCLE"
2. iPhone iOS CALENDAR widget mockup, 7-day grid horizontal:
   - D1 highlighted gold labeled "REQ"
   - D3 highlighted gold labeled "REV"
   - D5 highlighted SOLID GOLD FILL (hero) labeled "PAY $4,800"
   - D2, D4, D6, D7 dim
3. Bottom caption: "Starts after target + min days"
4. Warm gold glow only on D5 hero` },

  { slug: 'firms-payout-matrix', guide: 'G5', nazmulRef: 'cardan-c', aesthetic: 'cardan-c.jpg', content: 'nazmul-firms-payout-matrix.png',
    title: 'Firms Payout Matrix',
    composition: `1. Small gold pill top: "PAYOUT TERMS · 6 FIRMS"
2. COMPARISON TABLE 6 rows (Apex, FTMO, Bulenox, The5ers, FundingPips, E8) × 3 columns (Split % / Frequency / First payout)
3. Apex row is HERO 2× with gold accent and "LIFETIME 90%" highlighted
4. Gold accent only on header row and Apex hero row
5. Clean editorial tabular layout` },

  { slug: 'methods-w-real-fees', guide: 'G5', nazmulRef: 'logofolio2025', aesthetic: 'logofolio2025.jpg', content: 'nazmul-methods-w-real-fees.png',
    title: 'Methods w/ Real Fees',
    composition: `1. Small gold pill top: "WITHDRAWAL METHODS · REAL FEES"
2. 4 PREMIUM ICON CARDS in horizontal row:
   - Card 1 (gold neutral): "BANK WIRE · 1-3 days · $15-35 fee"
   - Card 2 (EMERALD hero with "FASTEST" tag): "CRYPTO · Minutes · $1-5 USDC"
   - Card 3 (gold neutral): "PREPAID CARD · Instant · $10/mo"
   - Card 4 (gold neutral): "WALLET WISE · Hours · 0.5-1%"
3. Crypto card has emerald glow as the hero` },

  { slug: 'rhythm-of-income', guide: 'G5', nazmulRef: 'logofolio2025', aesthetic: 'logofolio2025.jpg', content: 'nazmul-rhythm-of-income.png',
    title: 'Rhythm of Income',
    composition: `1. Small gold pill top: "TRUST → FASTER PAYOUTS"
2. 3 STACKED HORIZONTAL ROWS showing payout rhythm progression:
   - Row 1 (gold, smaller): "#1 First payout · Strict KYC · 5 days"
   - Row 2 (gold, medium): "#2+ Next payouts · Trusted · 2-3 days"
   - Row 3 (EMERALD hero, 2×, glow): "#5+ Monthly rhythm · Automated · 1-2 days"
3. Bottom caption: "Trust → faster payouts"
4. Color gradient gold → emerald top to bottom on accents` },
];

console.log(`Batch of ${jobs.length} images, model: ${MODEL}`);
console.log(`Est. time ~${Math.round(jobs.length * 40 / 3 / 60)}min (concurrency 3), est. cost ~$${(jobs.length * 0.04).toFixed(2)}`);

const toInline = (p) => ({
  inlineData: {
    mimeType: p.endsWith('.png') ? 'image/png' : 'image/jpeg',
    data: fs.readFileSync(p).toString('base64'),
  },
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function genOne(job, attempt = 1) {
  const outPath = path.join(outDir, `${job.slug}.png`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
    return { slug: job.slug, status: 'skip', size: fs.statSync(outPath).size };
  }
  const aestheticPath = path.join(root, '.firecrawl/nazmul-thumbs', job.aesthetic);
  const contentPath = path.join(root, '.firecrawl', job.content);
  if (!fs.existsSync(aestheticPath)) return { slug: job.slug, status: 'err', err: `aesthetic missing: ${job.aesthetic}` };
  if (!fs.existsSync(contentPath)) return { slug: job.slug, status: 'err', err: `content missing: ${job.content}` };

  const prompt = buildPrompt(job);
  const body = {
    contents: [{ role: 'user', parts: [toInline(aestheticPath), toInline(contentPath), { text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };
  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (res.status === 429 && attempt <= 4) {
      const backoff = 60 * attempt;
      console.log(` [429 retry ${attempt} in ${backoff}s]`);
      await sleep(backoff * 1000);
      return genOne(job, attempt + 1);
    }
    if (!res.ok) return { slug: job.slug, status: 'err', err: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData) {
        fs.writeFileSync(outPath, Buffer.from(p.inlineData.data, 'base64'));
        return { slug: job.slug, status: 'ok', ms: Date.now() - t0, size: fs.statSync(outPath).size };
      }
    }
    return { slug: job.slug, status: 'err', err: 'no image in response' };
  } catch (e) {
    return { slug: job.slug, status: 'err', err: e.message };
  }
}

const DELAY_MS = 15000;
const results = [];
for (let i = 0; i < jobs.length; i++) {
  const j = jobs[i];
  process.stdout.write(`[${i + 1}/${jobs.length}] ${j.slug}... `);
  const r = await genOne(j);
  results.push(r);
  if (r.status === 'ok') console.log(`OK ${Math.round(r.ms / 1000)}s ${Math.round(r.size / 1024)}KB`);
  else if (r.status === 'skip') console.log(`SKIP (exists)`);
  else console.log(`ERR ${r.err}`);
  if (r.status === 'ok' && i < jobs.length - 1) await sleep(DELAY_MS);
}

console.log('\n=== Summary ===');
const ok = results.filter(r => r.status === 'ok').length;
const skip = results.filter(r => r.status === 'skip').length;
const err = results.filter(r => r.status === 'err');
console.log(`OK: ${ok} · SKIP: ${skip} · ERR: ${err.length}`);
err.forEach(e => console.log(`  ${e.slug}: ${e.err}`));
