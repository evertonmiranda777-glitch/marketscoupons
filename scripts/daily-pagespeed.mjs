#!/usr/bin/env node
// Daily PageSpeed audit + auto-fix
// 1) Roda PageSpeed mobile/desktop pra URL principal
// 2) Salva em pagespeed_runs
// 3) Compara com baseline (media 7d)
// 4) Se regressao severa: aplica auto-fixes seguros, commit, deploy
// 5) Sempre manda relatorio Telegram

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SITE_URL = 'https://www.marketscoupons.com/';
const PSI_KEY = process.env.PAGESPEED_API_KEY || '';
const SB_URL = process.env.SUPABASE_URL;
const SB_SK  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOK = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHT = process.env.TELEGRAM_CHAT_ID;
const REGRESSION_THRESHOLD = 10;
const REVERT_THRESHOLD = 25;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]):/i,'$1:'),'..');

async function runPSI(strategy) {
  // Tenta PSI API primeiro (mais leve). Se 429/falhar, roda lighthouse-cli local.
  if (PSI_KEY) {
    try {
      const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
      u.searchParams.set('url', SITE_URL);
      u.searchParams.set('strategy', strategy);
      u.searchParams.set('category', 'performance');
      u.searchParams.set('key', PSI_KEY);
      const r = await fetch(u.href);
      if (r.ok) return parsePSI(strategy, await r.json());
    } catch {}
  }
  // Fallback: lighthouse CLI local
  const tmpFile = path.join(ROOT, `lh-${strategy}.json`);
  const preset = strategy === 'mobile' ? 'mobile' : 'desktop';
  const flags = [
    SITE_URL,
    `--output=json`,
    `--output-path=${tmpFile}`,
    `--preset=${preset}`,
    `--only-categories=performance`,
    `--chrome-flags="--headless=new --no-sandbox --disable-gpu"`,
    `--max-wait-for-load=60000`,
    `--quiet`
  ].join(' ');
  execSync(`lighthouse ${flags}`, { stdio: 'pipe' });
  const j = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  fs.unlinkSync(tmpFile);
  // lighthouse CLI direct output has same schema as lighthouseResult inside PSI
  return parsePSI(strategy, { lighthouseResult: j });
}

function parsePSI(strategy, j) {
  const lh = j.lighthouseResult || {};
  const cats = lh.categories || {};
  const audits = lh.audits || {};
  const num = (k) => Math.round(Number(audits[k]?.numericValue) || 0);
  return {
    strategy,
    perf_score: Math.round((cats.performance?.score || 0) * 100),
    fcp_ms: num('first-contentful-paint'),
    lcp_ms: num('largest-contentful-paint'),
    cls: Number(audits['cumulative-layout-shift']?.numericValue || 0).toFixed(3),
    tbt_ms: num('total-blocking-time'),
    speed_index_ms: num('speed-index'),
    total_bytes: num('total-byte-weight'),
    raw: { fetch_time: lh.fetchTime, version: lh.lighthouseVersion }
  };
}

async function sbInsert(rows) {
  const r = await fetch(`${SB_URL}/rest/v1/pagespeed_runs`, {
    method: 'POST',
    headers: {
      'apikey': SB_SK,
      'Authorization': `Bearer ${SB_SK}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!r.ok) console.warn('sb insert failed', r.status, await r.text());
}

async function getBaseline(strategy) {
  const since = new Date(Date.now() - 7*24*3600*1000).toISOString();
  const u = new URL(`${SB_URL}/rest/v1/pagespeed_runs`);
  u.searchParams.set('select','perf_score,lcp_ms,cls');
  u.searchParams.set('strategy',`eq.${strategy}`);
  u.searchParams.set('url',`eq.${SITE_URL}`);
  u.searchParams.set('created_at',`gte.${since}`);
  u.searchParams.set('limit','30');
  const r = await fetch(u.href, { headers: { apikey: SB_SK, Authorization: `Bearer ${SB_SK}` }});
  if (!r.ok) return null;
  const arr = await r.json();
  if (!arr.length) return null;
  const avg = arr.reduce((a,x)=>a+(x.perf_score||0),0) / arr.length;
  return { perf_avg: Math.round(avg), n: arr.length };
}

function autoFixHtml() {
  const fixes = [];
  const htmlFiles = ['index.html','admin.html'];
  for (const f of htmlFiles) {
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    let html = fs.readFileSync(fp, 'utf8');
    const before = html;

    // Regra 1: <img sem loading=lazy → add lazy + decoding=async
    html = html.replace(/<img\b((?:(?!loading=)(?!>).)*?)>/g, (m, attrs) => {
      if (/\bsrc\s*=/.test(attrs) && !/loading\s*=/.test(attrs)) {
        let a = attrs;
        if (!/decoding\s*=/.test(a)) a += ' decoding="async"';
        a += ' loading="lazy"';
        return `<img${a}>`;
      }
      return m;
    });

    if (html !== before) {
      fs.writeFileSync(fp, html, 'utf8');
      fixes.push(`${f}: lazy/decoding adicionado`);
    }
  }
  return fixes;
}

function deployVercel() {
  try {
    const tok = process.env.VERCEL_TOKEN;
    if (!tok) return 'sem VERCEL_TOKEN, deploy pulado';
    execSync(`npx --yes vercel --prod --yes --token=${tok}`, { cwd: ROOT, stdio: 'pipe', env: { ...process.env, CI: '1' }});
    return 'deploy ok';
  } catch (e) { return `deploy falhou: ${e.message.slice(0,200)}`; }
}

function commit(fixes) {
  try {
    execSync('git config user.name "github-actions[bot]"', { cwd: ROOT });
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { cwd: ROOT });
    execSync('git add index.html admin.html', { cwd: ROOT });
    const msg = `chore(perf): auto-fix PageSpeed regression\n\n${fixes.join('\n')}`;
    execSync(`git commit -m "${msg.replace(/"/g,'\\"')}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync('git push', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch (e) { console.warn('commit falhou', e.message); return false; }
}

async function tg(msg) {
  if (!TG_TOK || !TG_CHT) { console.log(msg); return; }
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOK}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHT, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch {}
}

async function triggerAutoRevert() {
  const tok = process.env.GITHUB_TOKEN;
  if (!tok) return false;
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/dispatches`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tok}`, 'Accept': 'application/vnd.github+json' },
    body: JSON.stringify({ event_type: 'prod-down', client_payload: { reason: 'pagespeed-regression' }})
  });
  return r.ok;
}

(async () => {
  console.log('PSI run start', new Date().toISOString());
  const [m, d] = await Promise.all([runPSI('mobile'), runPSI('desktop')]);
  await sbInsert([
    { url: SITE_URL, ...m },
    { url: SITE_URL, ...d }
  ]);

  const baseM = await getBaseline('mobile');
  const drop = baseM ? baseM.perf_avg - m.perf_score : 0;

  let action = 'nenhuma';
  let fixes = [];
  if (baseM && drop >= REVERT_THRESHOLD) {
    const ok = await triggerAutoRevert();
    action = ok ? 'auto-revert disparado' : 'auto-revert falhou';
  } else if (baseM && drop >= REGRESSION_THRESHOLD) {
    fixes = autoFixHtml();
    if (fixes.length) {
      if (commit(fixes)) action = `auto-fix aplicado: ${fixes.length} arquivo(s)`;
      else action = 'auto-fix tentado mas commit falhou';
    } else action = 'regressao detectada mas nenhum fix automatico aplicavel';
  }

  const msg =
`<b>PageSpeed Daily ${new Date().toISOString().slice(0,10)}</b>
Mobile: <b>${m.perf_score}/100</b>  LCP ${(m.lcp_ms/1000).toFixed(1)}s  CLS ${m.cls}
Desktop: <b>${d.perf_score}/100</b>  LCP ${(d.lcp_ms/1000).toFixed(1)}s  CLS ${d.cls}
Baseline 7d (mobile): ${baseM?.perf_avg ?? 'sem dados'}  drop: ${drop}
Acao: ${action}${fixes.length?'\n'+fixes.join('\n'):''}`;
  await tg(msg);
  console.log(msg);
})().catch(async (e) => {
  console.error(e);
  await tg(`<b>PageSpeed Daily ERRO</b>\n${e.message}`);
  process.exit(1);
});
