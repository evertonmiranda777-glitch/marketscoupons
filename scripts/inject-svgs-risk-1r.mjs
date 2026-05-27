import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/risk-management-1r.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/risk-1r/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');

const inserts = [
  ['<h2 id="p2">Part 2 — What Is 1R</h2>', dia(1,'r-concept','The 1R concept — your max loss per trade · every win and loss measured in R-multiples')],
  ['<h2 id="p3">Part 3 — The 1% Rule</h2>', dia(8,'risk-per-trade','Risk per trade comparison — 0.5%, 1%, 2%, 3%+ · the brutal math of drawdown recovery')],
  ['<h2 id="p4">Part 4 — Position Sizing Formula</h2>', dia(3,'position-sizing','Position sizing formula — (Account × R%) ÷ (Stop × $/unit) · always round DOWN')],
  ['<h2 id="p5">Part 5 — The 4 Stop-Loss Methodologies</h2>', dia(7,'stop-placement','Stop placement — structural levels beat arbitrary ATR multiples · stop placement first, size second')],
  ['<h2 id="p6">Part 6 — R-Multiple Trade Analysis</h2>', dia(2,'r-multiples','R-multiples outcome table — what -1R, +2R, +5R look like in $ on a $50K account')],
  ['<h2 id="p7">Part 7 — Expectancy</h2>', dia(4,'expectancy','Expectancy formula — E = (Win% × W̄) - (Loss% × L̄) · scalper vs swing vs retail trap comparison')],
  ['<h2 id="p8">Part 8 — Drawdown</h2>', dia(6,'equity-curve','Realistic equity curve — 55% win rate, +1.5R/-1R · max DD -7R is typical · most quit during it')],
  ['<h2 id="p9">Part 9 — Kelly Criterion</h2>', dia(10,'kelly-criterion','Kelly Criterion vs 1/4-Kelly vs fixed fractional — full Kelly theoretical, 1/4 Kelly used by real money')],
  ['<h2 id="p10">Part 10 — Risk of Ruin</h2>', dia(5,'consecutive-losses','Probability of N consecutive losses by win rate — even 60% win rate has 5% chance of 8 losses in 100 trades')],
  ['<h2 id="p11">Part 11 — Psychological Capital</h2>', dia(18,'psychological','Psychological Drawdown Limit (PDL) — the DD level where YOU stop following the system · find it first')],
  ['<h2 id="p12">Part 12 — Top 10 Risk Management Mistakes</h2>', dia(15,'mistakes','7 risk management mistakes that kill accounts — and the fix for each')],
  ['<h2 id="p13">Part 13 — Case Studies</h2>', dia(17,'monte-carlo','Monte Carlo simulation — 1,000 random equity curves · same edge produces wildly different paths')],
  ['<h3>The math of recovery</h3>', dia(11,'anti-martingale','Anti-martingale vs Martingale — scale UP on wins, DOWN on losses · Livermore principle from 1924')],
  ['<h3>The 3-loss rule</h3>', dia(9,'correlation','Correlation trap — 3 equity index positions = 1 position with 3× sizing risk · hidden leverage')],
  ['<h3>Recovery time</h3>', dia(13,'tail-risk','Black swan tail risk — stops fail in flash crashes · plan for 2-3× expected loss in tail events')],
  ['<h2 id="p1">Part 1 — The Hierarchy of Trading Skills</h2>', dia(12,'trailing-stop','Trail after 1R — move stop to BE at +1R, partial at +2R, trail final 50% by structure')],
  ['<h2 id="p14">Part 14 — The Operational Risk Playbook</h2>', dia(14,'journal-template','R-multiples journal template — track every trade in R units · expectancy emerges from data')],
  ['<h2 id="p15">Frequently Asked Questions</h2>', dia(19,'checklist','10-point pre-trade risk checklist — every box checked → execute · any unchecked → wait')],
  ['<h2>Conclusion</h2>', dia(20,'roadmap','Risk management mastery roadmap — 4 stages from survival to portfolio thinking')],
  ['Internal links', dia(16,'prop-firm-math','Prop firm 1R math — calibrate 1R as drawdown/10 · DLL determines daily max trades · plan eval backwards')],
];

let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}

writeFileSync('data/preview/blog-v2/risk-management-1r.v2.html', out);
console.log(`${injected}/20 injected · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
