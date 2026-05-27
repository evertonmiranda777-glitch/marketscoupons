import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/trailing-drawdown-vs-eod.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/trailing-vs-eod/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');
const inserts = [
  ['<h2 id="p1">Part 1 — The Variable</h2>', dia(1,'comparison','Trailing Intraday vs Trailing EOD vs Static — the single biggest rule difference between firms')],
  ['<h2 id="p2">Part 2 — Trailing Intraday</h2>', dia(2,'trailing-intraday-math','Trailing Intraday math step-by-step — DD trails every tick of equity HIGH · ratchets up only')],
  ['<h2 id="p3">Part 3 — Trailing EOD</h2>', dia(3,'eod-math','Trailing EOD math step-by-step — DD trails ONLY on end-of-day equity · intraday spikes ignored')],
  ['<h2 id="p4">Part 4 — Static</h2>', dia(4,'static-math','Static drawdown step-by-step — DD fixed at floor · buffer grows as you profit · most forgiving')],
  ['<h2 id="p5">Part 5 — Worked Examples</h2>', dia(5,'same-trade-different','Same trade · 3 different outcomes — +5R giveback to BE feels very different by DD type')],
  ['<h2 id="p6">Part 6 — Why Trailing Intraday Destroys Most Funded Accounts</h2>', dia(8,'buffer-mgmt','Buffer management — the key to surviving Apex · 4 rules for protecting DD buffer like portfolio risk')],
  ['<h2 id="p7">Part 7 — Profit Lock</h2>', dia(9,'lock-in-points','Lock-in points — when DD stops trailing · the safer phase of the eval most traders never reach')],
  ['<h2 id="p8">Part 8 — Side-by-Side Comparison</h2>', dia(19,'summary-table','Drawdown cheat sheet — every attribute compared · print and keep next to your trading station')],
  ['<h2 id="p9">Part 9 — Strategy Match</h2>', dia(6,'strategy-match','Strategy ↔ Drawdown type match · pick DD that fits your style · mismatched pair = guaranteed failure')],
  ['<h2 id="p10">Part 10 — The Mental Game of Trailing DD</h2>', dia(17,'decision-tree','Decision tree — 3 questions to find your DD type · scalper/day/swing → intraday/EOD/static')],
  ['<h2 id="p11">Part 11 — Top 5 Mistakes That Trigger Trailing DD</h2>', dia(15,'mistakes','7 drawdown mistakes that blow evals — misunderstanding mechanics = guaranteed failure')],
  ['<h3>Case 1 — Trader A, Apex $50K, blew on single revenge trade</h3>', dia(11,'50k-trace','$50K Apex eval — trade-by-trade trace · realistic 6-day pass with 60% win rate')],
  ['<h3>Case 3 — Trader C, FTMO Swing $100K static, multiple payouts</h3>', dia(12,'150k-trace','$150K Apex eval — trade-by-trade trace · realistic 7-day pass with disciplined sizing')],
  ['<h2 id="p13">Part 13 — How Long Funded Accounts Actually Last</h2>', dia(16,'pre-funded-shift','Pre-funded vs Post-funded DD changes — Bulenox shifts to intraday post-pass · trap to avoid')],
  ['<h2 id="p14">Part 14 — Optimal Setup for Each Profile</h2>', dia(13,'multi-account-mix','Multi-account mix strategy — diversify across DD types to balance income · scalp Apex + swing FTMO')],
  ['<h2 id="p12">Part 12 — Case Studies</h2>', dia(10,'instruments','Best instruments by DD type — volatile hurts intraday-trail · steady OK for any · pick by math')],
  ['<h2 id="p15">Frequently Asked Questions</h2>', dia(14,'dd-vs-target','DD-to-target ratio — pick firms with ratio under 1.0 when possible · Apex $100K = 0.50 (easiest)')],
  ['<h2>Conclusion</h2>', dia(7,'firm-table','Firm-by-firm drawdown type reference — know what you\'re paying for before clicking buy')],
  ['Internal links', dia(18,'switch-firms','When to switch DD types — failed 3+ evals = signal · stop paying for same lesson')],
  ['<h3>Sources</h3>', dia(20,'roadmap','Drawdown mastery roadmap — learn one DD type · master · then diversify · respect the learning curve')],
];
let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}
writeFileSync('data/preview/blog-v2/trailing-drawdown-vs-eod.v2.html', out);
console.log(`${injected}/20 · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
