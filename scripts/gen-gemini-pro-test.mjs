import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');
const KEY = 'AQ.Ab8RN6KiWD4OdlqKN7tzLEMgUHKfmoncwNEztIcHD_8wxwE1Mg';
const MODEL = 'gemini-3-pro-image-preview';

const aesthetic = path.join(root, '.firecrawl/nazmul-thumbs/cardan-c.jpg');
const content = path.join(root, '.firecrawl/nazmul-hero-g1-deal.png');
const outDir = path.join(root, 'img/guides-edu/gemini-pro');
fs.mkdirSync(outDir, { recursive: true });

const prompt = `Editorial pitch-deck cover in the EXACT visual style of ref-image-1 (Nazmul Hossan cardan-c). Critical requirements:

COMPOSITION — recreate the layout of ref-image-2 pixel-accurately:
1. Thin orange outlined pill at top: "WHY PROP FIRMS EXIST" (JetBrains Mono, uppercase, letter-spacing)
2. Central DOUBLE-CARD stack (Nazmul A5 signature): a BACK ghost card offset 10px down-right (barely visible, very dim orange outline on near-black), and a FRONT hero card on top showing "$50K + YOU" — "$50K" left side with "FIRM'S CAPITAL" label, bold "+" separator, "YOU" right side with "TRADER SKILL" label. The offset MUST be visible — this is the defining move.
3. Thin orange outlined pill at bottom: "80/20 SPLIT · CONTRACT"

ATMOSPHERE — match ref-image-1 exactly:
- 70% of canvas is DEEP BLACK negative space (#0A0A0F), ONLY the cards and pills are illuminated
- Single cinematic light source from the upper-right casting long soft shadows to the lower-left
- Orange #F97316 accent ONLY on pill outlines, "$50K" number, "+" sign, and a faint horizontal light-bloom behind the hero card
- Everything else in cool off-white / pale gray on deep black
- Subtle film grain, moody editorial mood, like a premium magazine spread

STYLE: Premium 3D editorial render, not flat graphic. Text must be crisp and 100% readable. No UI chrome, no browser frame, no device mockup, no watermark. Output 16:9 landscape.`;

const toInline = (p) => ({
  inlineData: {
    mimeType: p.endsWith('.png') ? 'image/png' : 'image/jpeg',
    data: fs.readFileSync(p).toString('base64'),
  },
});

const body = {
  contents: [{ role: 'user', parts: [toInline(aesthetic), toInline(content), { text: prompt }] }],
  generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
};

console.log('Sending request to', MODEL, '...');
const t0 = Date.now();
const res = await fetch(
  `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
);
const data = await res.json();
console.log(`HTTP ${res.status} in ${Date.now() - t0}ms`);

if (!res.ok) {
  console.error(JSON.stringify(data, null, 2).slice(0, 1000));
  process.exit(1);
}

const parts = data.candidates?.[0]?.content?.parts || [];
let saved = 0;
for (const p of parts) {
  if (p.inlineData) {
    const out = path.join(outDir, 'hero-g1-deal-v2.png');
    fs.writeFileSync(out, Buffer.from(p.inlineData.data, 'base64'));
    console.log('saved', out, `(${(fs.statSync(out).size / 1024).toFixed(0)}KB)`);
    saved++;
  } else if (p.text) {
    console.log('[text]', p.text.slice(0, 200));
  }
}
if (!saved) console.error('No image returned. Full response:', JSON.stringify(data).slice(0, 800));
