import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');
const srcDir = path.join(root, '.firecrawl', 'nazmul-full');
const dstDir = path.join(root, '.firecrawl', 'nazmul-full', 'images');
fs.mkdirSync(dstDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
const jobs = [];

for (const f of files) {
  const md = fs.readFileSync(path.join(srcDir, f), 'utf8');
  const match = f.match(/gallery-\d+-(.+)\.md$/);
  const slug = match ? match[1] : f.replace('.md', '');
  const urls = [...new Set(
    [...md.matchAll(/https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"')\s]+/g)].map(m => m[0])
  )];
  urls.forEach((u, i) => {
    const ext = path.extname(new URL(u).pathname) || '.jpg';
    const name = `${slug}__${String(i+1).padStart(2,'0')}${ext}`;
    jobs.push({ url: u, dest: path.join(dstDir, name) });
  });
}

console.log(`Baixando ${jobs.length} imagens...`);

function dl({ url, dest }) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return Promise.resolve('skip');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); return reject(new Error(`${res.statusCode} ${url}`)); }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve('ok')));
    }).on('error', reject);
  });
}

let ok = 0, skip = 0, err = 0;
const CONC = 5;
async function worker(queue) {
  while (queue.length) {
    const j = queue.shift();
    try {
      const r = await dl(j);
      if (r === 'ok') ok++; else skip++;
    } catch (e) { err++; console.error('ERR', j.url.slice(-40), e.message); }
  }
}
const workers = Array.from({ length: CONC }, () => worker(jobs));
await Promise.all(workers);
console.log(`OK: ${ok} · SKIP: ${skip} · ERR: ${err}`);
