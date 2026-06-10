import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/0dte-options-deep-dive.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/0dte/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');

const inserts = [
  ['<h2 id="p1">Part 1, The Revolution</h2>', dia(1,'volume-growth','SPX 0DTE volume share, from 22% in 2022 to 52% in 2026 · the fastest microstructure shift of the decade')],
  ['<h2 id="p2">Part 2, Timeline</h2>', dia(2,'intraday-timeline','0DTE intraday timeline, each 90-min window of the SPX session has a distinct flow regime')],
  ['<h2 id="p3">Part 3, Why 0DTE Exists</h2>', dia(3,'four-actors','Four actors, four motives, institutions hedge, income funds sell, retail speculates, dealers hedge')],
  ['<h2 id="p4">Part 4, How 0DTE Rebuilt the Dealer Book</h2>', dia(4,'dealer-book','Dealer gamma exposure before vs after 0DTE, flips multiple times per day instead of once per cycle')],
  ['<h2 id="p5">Part 5, Charm vs Gamma</h2>', dia(5,'charm-vs-gamma','Charm vs Gamma intraday, gamma steepens to close, charm drives the pin gravity into the largest OI')],
  ['<h2 id="p6">Part 6, The 3 PM Ramp</h2>', dia(6,'3pm-ramp','The 3 PM ramp mechanism, charm decay forces dealers to buy SPX futures into close, self-reinforcing')],
  ['<h2 id="p7">Part 7, The Volatility Crush Trade</h2>', dia(7,'vol-crush','Lunch vol crush, sell straddle at 11:00 IV peak, buy back at 13:00 trough · 62% win rate')],
  ['<h2 id="p8">Part 8, 0DTE Iron Condors</h2>', dia(8,'iron-condor','0DTE iron condor payoff, sell OTM call &amp; put spreads, profit if SPX stays inside the wings at close')],
  ['<h2 id="p9">Part 9, The Gamma Wall</h2>', dia(9,'gamma-wall','The gamma wall, largest open interest strike acts as a magnet · dealer hedging pulls SPX toward it')],
  ['<h2 id="p10">Part 10, 0DTE and Index Futures</h2>', dia(10,'futures-spillover','0DTE spillover to ES &amp; NQ, dealer SPX hedging happens in futures, so futures inherit 0DTE flow patterns')],
  ['<h2 id="p11">Part 11, Why 95% of 0DTE Buyers Lose</h2>', dia(11,'buyer-stats','95% of retail 0DTE buyers lose · the asymmetry retail does not see vs systematic premium sellers')],
  ['<h2 id="p12">Part 12, Top 8 Professional Strategies</h2>', dia(12,'top-8-strategies','Top 8 professional 0DTE strategies ranked by 24-month backtested win rate × avg ROC')],
  ['<h3>Case 1, August 5, 2024, Yen Carry Unwind</h3>', dia(13,'case-aug-2024','August 5, 2024, SPX -3% pre-market · 0DTE put gamma exploded · dealer hedging amplified the cascade')],
  ['<h3>Case 2, Volmageddon February 5, 2018, 0DTE Echo</h3>', dia(14,'volmageddon','Volmageddon February 5, 2018, XIV/inverse vol products imploded · proto-0DTE event before 0DTE existed')],
  ['<h2 id="p14">Part 14, 0DTE Operational Playbook</h2>', dia(15,'daily-routine','The 7-step 0DTE daily routine, a reproducible workflow that separates pros from gamblers')],
  ['<h3>Risk management</h3>', dia(16,'risk-management','0DTE risk management non-negotiables, sizing, stops, event-day rules, max-loss limits')],
  ['<h2 id="p13">Part 13, Case Studies</h2>', dia(17,'theta-decay','0DTE theta decay curve, 80% of remaining premium evaporates in the last 60 minutes · steepest in markets')],
  ['<h3>Case 3, COVID March 2020, What 0DTE Did and Did Not Do</h3>', dia(18,'pin-risk','Pin risk, when SPX settles $0.05 ITM at close, assignment becomes 50/50 · the catastrophic 0DTE failure')],
  ['<h2>Conclusion</h2>', dia(19,'mistakes','7 mistakes that kill 0DTE accounts, and the rule that fixes each one')],
  ['Internal links', dia(20,'prop-firm-fit','0DTE-inspired setups on prop firm futures accounts, most firms ban options but you can trade the flow in ES')],
];

let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}

writeFileSync('data/preview/blog-v2/0dte-options-deep-dive.v2.html', out);
console.log(`${injected}/20 injected · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
