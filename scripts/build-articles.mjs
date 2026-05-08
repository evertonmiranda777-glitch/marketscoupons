#!/usr/bin/env node
// Builds blog article HTML files (standalone preview + body for DB + meta JSON)
import fs from 'node:fs';
import path from 'node:path';

const PREVIEW_DIR = 'data/preview';
const CDN_BASE = 'https://qfwhduvutfumsaxnuofa.supabase.co/storage/v1/object/public/blog-images';

const CSS = `body{background:#0a0d14;color:#e8eaed;font:16px/1.7 -apple-system,Segoe UI,sans-serif;max-width:760px;margin:40px auto;padding:0 20px}h1{color:#f0b429;font-size:36px;font-weight:800;line-height:1.2;margin:30px 0}h2{color:#fff;font-size:26px;margin:36px 0 14px;border-bottom:1px solid #2a2f3a;padding-bottom:10px}h3{color:#fff;font-size:19px;margin:24px 0 10px}p{margin:14px 0;color:#cbd0d8}strong{color:#fff}em{color:#f0b429;font-style:normal}.callout{padding:18px 24px;margin:24px 0;border-radius:8px;border-left:4px solid}.callout-gold{background:rgba(240,180,41,.08);border-color:#f0b429}.callout-red{background:rgba(239,68,68,.08);border-color:#ef4444}.callout-blue{background:rgba(107,182,201,.08);border-color:#6bb6c9}.callout-green{background:rgba(16,185,129,.08);border-color:#10b981}table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px}th{background:rgba(240,180,41,.1);color:#f0b429;text-align:left;padding:12px;border-bottom:2px solid #f0b429}td{padding:12px;border-bottom:1px solid #2a2f3a;color:#cbd0d8}.mini-ui{background:rgba(13,20,28,.6);border:1px solid #2a2f3a;border-radius:10px;padding:24px;margin:24px 0}img{max-width:100%;height:auto;border-radius:10px;margin:14px 0}ul{padding-left:24px}li{margin:8px 0;color:#cbd0d8}hr{border:none;border-top:1px solid #2a2f3a;margin:32px 0}a{color:#6bb6c9;text-decoration:none;border-bottom:1px solid rgba(107,182,201,.3)}`;

export function writeArticle(meta, body) {
  if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const base = path.join(PREVIEW_DIR, meta.slug + '-pt');
  fs.writeFileSync(base + '.body.html', body);
  fs.writeFileSync(base + '.meta.json', JSON.stringify(meta, null, 2));
  const standalone = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${meta.title}</title><style>${CSS}</style></head><body><h1>${meta.title}</h1><div style="color:#8590a3;font-size:13px;margin:0 0 30px;">${meta.category} · Nível ${meta.level} · ${meta.read_time} · ${meta.lang}</div>${body}</body></html>`;
  fs.writeFileSync(base + '.html', standalone);
  const stats = {
    slug: meta.slug,
    chars: body.length,
    callouts: (body.match(/class="callout/g) || []).length,
    tables: (body.match(/<table/g) || []).length,
    svgs: (body.match(/<svg/g) || []).length,
    imgs: (body.match(/<img/g) || []).length,
    h2: (body.match(/<h2/g) || []).length,
    h3: (body.match(/<h3/g) || []).length,
  };
  return stats;
}

export function cdn(slug, file) {
  return `${CDN_BASE}/${slug}/${file}`;
}
