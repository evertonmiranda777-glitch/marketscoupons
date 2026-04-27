// Calcula SHA-256 de cada bloco <script type="application/ld+json">
// pra usar como hash no CSP (substitui 'unsafe-inline').
// Run: node scripts/csp-hash.js
//
// Quando o conteúdo de um JSON-LD mudar, rodar de novo e atualizar vercel.json.

import fs from 'fs';
import crypto from 'crypto';

const html = fs.readFileSync('index.html', 'utf8');
const re = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/g;

const hashes = [];
let m;
while ((m = re.exec(html)) !== null) {
  const content = m[1];
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  hashes.push(hash);
}

console.log(`[csp-hash] found ${hashes.length} JSON-LD blocks`);
console.log('');
console.log('Adicionar no script-src do CSP em vercel.json:');
console.log('');
console.log(hashes.map(h => `'sha256-${h}'`).join(' '));
console.log('');
