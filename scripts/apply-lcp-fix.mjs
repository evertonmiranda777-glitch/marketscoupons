#!/usr/bin/env node
// Aplica fix LCP: remove opacity:0 do body global, mantem so em firm pages via inline script
import fs from 'node:fs';
import crypto from 'node:crypto';

const idx = 'index.html';
let h = fs.readFileSync(idx, 'utf8');

// Passo 1: remover opacity:0 + transition do body rule
const before = h;
h = h.replace(
  /(body\{font-family:var\(--f\);color:var\(--t1\);min-height:100dvh;overflow-x:hidden;)opacity:0;transition:opacity \.2s ease;/,
  '$1'
);
if (h === before) {
  console.log('opacity:0 ja removido ou rule mudou, abort');
  process.exit(0);
}

// Passo 2: inline script no head detecta firm page e injeta opacity:0 so nesse caso
const inlineJs = `(function(){var s=location.pathname.replace(/^\\/(en|es|fr|de|it|ar)\\//,'/').split('/').filter(Boolean)[0]||'';if(['apex','bulenox','ftmo','tpt','fn','e2t','the5ers','fundingpips','brightfunded','e8','cti','tradeday'].indexOf(s)>-1){var st=document.createElement('style');st.textContent='body{opacity:0;transition:opacity .2s ease}';document.head.appendChild(st);}})();`;
const scriptTag = `<script>${inlineJs}</script>`;

if (!h.includes(inlineJs)) {
  h = h.replace(
    /(<meta name="viewport"[^>]*>)/,
    `$1\n${scriptTag}`
  );
}

fs.writeFileSync(idx, h, 'utf8');

// Passo 3: calcular hash CSP do inline script
const hash = 'sha256-' + crypto.createHash('sha256').update(inlineJs).digest('base64');
console.log('CSP hash:', hash);

// Passo 4: adicionar hash em vercel.json script-src
let v = fs.readFileSync('vercel.json', 'utf8');
if (!v.includes(hash)) {
  v = v.replace(
    /(script-src 'self')(\s+)/,
    `$1 '${hash}'$2`
  );
  fs.writeFileSync('vercel.json', v, 'utf8');
  console.log('hash adicionada em vercel.json');
} else {
  console.log('hash ja existe em vercel.json');
}

console.log('LCP fix aplicado.');
