#!/usr/bin/env node
// Rename "N - slug.jpeg" → "slug.webp" + convert to WebP for the 8 v7 covers
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = 'img/blog-heros';
const files = fs.readdirSync(dir).filter(f => /^\d+ - .*\.jpeg$/.test(f));
console.log(`Found ${files.length} numbered files to process`);

for (const file of files) {
  const slug = file.replace(/^\d+ - /, '').replace(/\.jpeg$/, '');
  const inPath = path.join(dir, file);
  const outPath = path.join(dir, `${slug}.webp`);
  const inSize = fs.statSync(inPath).size;
  await sharp(inPath)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(outPath);
  const outSize = fs.statSync(outPath).size;
  const saved = Math.round((1 - outSize / inSize) * 100);
  console.log(`  ${slug}.webp · ${(inSize/1024).toFixed(0)}KB → ${(outSize/1024).toFixed(0)}KB (-${saved}%)`);
  // Delete numbered original
  fs.unlinkSync(inPath);
}
console.log('Done.');
