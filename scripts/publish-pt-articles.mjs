#!/usr/bin/env node
// Publica os 10 artigos PT em data/preview/ no Supabase blog_posts.
// Idempotente (skip se slug já existe).
// Uso: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/publish-pt-articles.mjs
//
// Pega a key em: https://supabase.com/dashboard/project/qfwhduvutfumsaxnuofa/settings/api
// (Project API keys > service_role > Reveal)

import fs from 'node:fs';
import path from 'node:path';

const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) {
  console.error('ERRO: SUPABASE_SERVICE_ROLE_KEY não setada.');
  console.error('Pega em: https://supabase.com/dashboard/project/qfwhduvutfumsaxnuofa/settings/api');
  console.error('Rode: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/publish-pt-articles.mjs');
  process.exit(1);
}

const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const PREVIEW = 'data/preview';

const slugs = [
  'indicadores-tecnicos-guia-completo',
  'introducao-analise-tecnica',
  'mercado-americano-guia-trader',
  'metagame-prop-firm-trader',
  'ondas-de-elliott-guia-completo',
  'plano-de-trading-guia-pratico',
  'teorias-dos-mercados-dow-emh',
  'trading-for-a-living-alexander-elder',
  'vpa-volume-price-analysis',
  'wyckoff-2-volume-profile-order-flow',
];

async function existing() {
  const r = await fetch(
    `${SB_URL}/rest/v1/blog_posts?select=slug&lang=eq.pt&slug=in.(${slugs.join(',')})`,
    { headers: { apikey: SK, Authorization: `Bearer ${SK}` } }
  );
  if (!r.ok) throw new Error(`check failed: ${r.status}`);
  const rows = await r.json();
  return new Set(rows.map((x) => x.slug));
}

async function insert(slug, sortOrder) {
  const meta = JSON.parse(fs.readFileSync(path.join(PREVIEW, slug + '-pt.meta.json'), 'utf8'));
  const body = fs.readFileSync(path.join(PREVIEW, slug + '-pt.body.html'), 'utf8');
  const row = {
    slug: meta.slug,
    title: meta.title,
    category: meta.category || 'Análise Técnica',
    level: meta.level || 'intermediario',
    read_time: meta.read_time || '15 min',
    body,
    excerpt: meta.excerpt || '',
    icon: meta.icon || '📊',
    active: true,
    ai_generated: true,
    sort_order: sortOrder,
    lang: 'pt',
    author: meta.author || 'Markets Coupons',
  };
  const r = await fetch(`${SB_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: {
      apikey: SK,
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (r.status >= 400) {
    const t = await r.text();
    throw new Error(`${slug}: ${r.status} ${t}`);
  }
}

(async () => {
  console.log('Checando existentes...');
  const have = await existing();
  console.log(`Já no banco: ${have.size}/${slugs.length}`);
  let i = 0;
  let inserted = 0;
  let skipped = 0;
  for (const slug of slugs) {
    i++;
    if (have.has(slug)) {
      console.log(`${i}/${slugs.length}  SKIP  ${slug} (já existe)`);
      skipped++;
      continue;
    }
    try {
      await insert(slug, 100 + i);
      console.log(`${i}/${slugs.length}  OK    ${slug}`);
      inserted++;
    } catch (e) {
      console.log(`${i}/${slugs.length}  FAIL  ${slug} :: ${e.message}`);
    }
  }
  console.log(`\nTotal: ${inserted} inseridos, ${skipped} pulados.`);
})();
