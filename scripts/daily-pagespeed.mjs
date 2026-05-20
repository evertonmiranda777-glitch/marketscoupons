#!/usr/bin/env node
// Daily PageSpeed audit + auto-fix
// 1) Roda PageSpeed mobile/desktop pra URL principal
// 2) Salva em pagespeed_runs (com quality_flag pra filtrar anomalias do baseline)
// 3) Compara com baseline = min(P75_14d, max_7d) filtrando quality_flag='ok'
// 4) 4 niveis: OK / OBSERVACAO / REGRESSION (auto-fix) / REVERT (auto-revert)
//    + alerta CRITICO independente se score < 50 (com cooldown via pagespeed_alert_state)
// 5) Telegram silencioso se OK (heartbeat segunda), sempre fala em queda

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SITE_URL = 'https://www.marketscoupons.com/';
const PSI_KEY = process.env.PAGESPEED_API_KEY || '';
const SB_URL = process.env.SUPABASE_URL;
const SB_SK  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOK = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHT = process.env.TELEGRAM_CHAT_ID;

const DROP_OBSERVATION = 5;    // 📉 informa, sem ação
const DROP_REGRESSION  = 8;    // ⚠️ auto-fix
const DROP_REVERT      = 15;   // 🚨 auto-revert
const CRITICAL_SCORE   = 50;   // 🚨 alerta absoluto (independente de baseline)
const BASELINE_FALLBACK = 65;
const MIN_BASELINE_SAMPLES = 4;
const COOLDOWN_DEGRADE_PTS = 5; // re-alerta crítico se piorar >=5pts no mesmo dia
const RESET_SCORE = 55;        // score >= reset → limpa cooldown
const NOTIFY_ON_OK = false;    // heartbeat semanal cobre o "tá tudo bem"

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
  const flags = [
    SITE_URL,
    `--output=json`,
    `--output-path=${tmpFile}`,
    strategy === 'desktop' ? `--preset=desktop` : `--form-factor=mobile`,
    `--only-categories=performance`,
    `--chrome-flags="--headless=new --no-sandbox --disable-gpu"`,
    `--max-wait-for-load=60000`,
    `--quiet`
  ].join(' ');
  execSync(`npx --yes lighthouse@12 ${flags}`, { stdio: 'pipe' });
  const j = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  fs.unlinkSync(tmpFile);
  return parsePSI(strategy, { lighthouseResult: j });
}

function parsePSI(strategy, j) {
  const lh = j.lighthouseResult || {};
  const cats = lh.categories || {};
  const audits = lh.audits || {};
  const num = (k) => Math.round(Number(audits[k]?.numericValue) || 0);
  const lcp = num('largest-contentful-paint');
  const cls = Number(audits['cumulative-layout-shift']?.numericValue || 0);
  return {
    strategy,
    perf_score: Math.round((cats.performance?.score || 0) * 100),
    fcp_ms: num('first-contentful-paint'),
    lcp_ms: lcp,
    cls: cls.toFixed(3),
    tbt_ms: num('total-blocking-time'),
    speed_index_ms: num('speed-index'),
    total_bytes: num('total-byte-weight'),
    // quality_flag: métrica fisicamente improvável = runner sobrecarregado mediu lixo.
    // getBaseline filtra eq.ok → anomalia não entra no baseline. (2026-05-20: runner
    // mediu CLS 0.754 / LCP 7.2s num site que estava CLS 0 / LCP 1s.)
    quality_flag: (lcp > 15000 || cls > 0.5) ? 'anomaly' : 'ok',
    raw: { fetch_time: lh.fetchTime, version: lh.lighthouseVersion }
  };
}

// Mede uma strategy com proteção anti-ruído. O runner do GitHub Actions é
// compartilhado e às vezes mede LIXO (2026-05-20: mobile 39/CLS .754/LCP 7.2s num
// site que estava CLS 0/LCP 1s → auto-revert disparou errado e reverteu deploy bom).
// Se a 1ª medição parece REVERT/REGRESSION, re-mede até 3x e fica com o MELHOR score.
// Regressão real sobrevive às 3 medições; ruído de runner não.
async function measureStrategy(strategy, baseline) {
  let best = await runPSI(strategy);
  let attempts = 1;
  while (attempts < 3) {
    const c = classify(best.perf_score, baseline);
    if (c.level !== 'REVERT' && c.level !== 'REGRESSION') break;
    console.log(`[${strategy}] medição ${attempts}=${best.perf_score}/100 (${c.level}) — re-medindo (anti-ruído)`);
    const again = await runPSI(strategy);
    attempts++;
    if (again.perf_score > best.perf_score) best = again;
  }
  if (attempts > 1) console.log(`[${strategy}] best-of-${attempts} = ${best.perf_score}/100`);
  best._attempts = attempts;
  return best;
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

// Calcula baseline = min(P75_14d, max_7d) filtrando quality_flag='ok'.
// Se < MIN_BASELINE_SAMPLES runs ok em 14d, retorna fallback + warning.
//
// TODO: detectar baseline drift — se >=3 runs consecutivos com score
// abaixo do P25 dos últimos 30 dias (ok-only), disparar TG manual
// "baseline pode estar virando, investigar manualmente"
async function getBaseline(strategy) {
  const since14 = new Date(Date.now() - 14*24*3600*1000).toISOString();
  const u = new URL(`${SB_URL}/rest/v1/pagespeed_runs`);
  u.searchParams.set('select', 'perf_score,created_at');
  u.searchParams.set('strategy', `eq.${strategy}`);
  u.searchParams.set('quality_flag', 'eq.ok');
  u.searchParams.set('created_at', `gte.${since14}`);
  u.searchParams.set('order', 'created_at.desc');
  u.searchParams.set('limit', '100');
  const r = await fetch(u.href, { headers: { apikey: SB_SK, Authorization: `Bearer ${SB_SK}` }});
  if (!r.ok) {
    console.warn(`[baseline ${strategy}] fetch failed ${r.status}, fallback ${BASELINE_FALLBACK}`);
    return { value: BASELINE_FALLBACK, source: 'fallback_fetch_error', n: 0, p75_14d: null, max_7d: null };
  }
  const all = await r.json();
  if (all.length < MIN_BASELINE_SAMPLES) {
    console.warn(`[baseline ${strategy}] WARNING: apenas ${all.length} runs ok em 14d (< ${MIN_BASELINE_SAMPLES}), fallback ${BASELINE_FALLBACK}`);
    return { value: BASELINE_FALLBACK, source: 'fallback_insufficient_samples', n: all.length, p75_14d: null, max_7d: null };
  }
  // P75 via nearest-rank (sem interpolação — preserva valores reais do dataset)
  const sorted14 = all.map(x => x.perf_score).sort((a,b) => a-b);
  const p75Idx = Math.ceil(sorted14.length * 0.75) - 1;
  const p75_14d = sorted14[Math.max(0, p75Idx)];
  // Max dos 7d
  const cutoff7 = Date.now() - 7*24*3600*1000;
  const last7 = all.filter(x => new Date(x.created_at).getTime() >= cutoff7);
  const max_7d = last7.length ? Math.max(...last7.map(x => x.perf_score)) : p75_14d;
  const baseline = Math.min(p75_14d, max_7d);
  return { value: baseline, source: 'calculated', n: all.length, p75_14d, max_7d };
}

async function getAlertState(strategy) {
  const u = new URL(`${SB_URL}/rest/v1/pagespeed_alert_state`);
  u.searchParams.set('select', '*');
  u.searchParams.set('strategy', `eq.${strategy}`);
  const r = await fetch(u.href, { headers: { apikey: SB_SK, Authorization: `Bearer ${SB_SK}` }});
  if (!r.ok) return null;
  const arr = await r.json();
  return arr[0] || null;
}
async function updateAlertState(strategy, payload) {
  await fetch(`${SB_URL}/rest/v1/pagespeed_alert_state?strategy=eq.${strategy}`, {
    method: 'PATCH',
    headers: { apikey: SB_SK, Authorization: `Bearer ${SB_SK}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  });
}
// Reset idempotente: filtra last_critical_alert_at IS NOT NULL no PATCH → no-op se já limpo
async function resetAlertState(strategy) {
  await fetch(`${SB_URL}/rest/v1/pagespeed_alert_state?strategy=eq.${strategy}&last_critical_alert_at=not.is.null`, {
    method: 'PATCH',
    headers: { apikey: SB_SK, Authorization: `Bearer ${SB_SK}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ last_critical_alert_at: null, last_critical_alert_score: null, updated_at: new Date().toISOString() }),
  });
}
function shouldFireCritical(state, score) {
  if (!state || !state.last_critical_alert_at) return true; // primeira vez
  const sameDay = state.last_critical_alert_at.slice(0,10) === new Date().toISOString().slice(0,10);
  if (!sameDay) return true; // dia novo
  if (score < (state.last_critical_alert_score - COOLDOWN_DEGRADE_PTS)) return true; // piorou >=5pts
  return false; // cooldown ativo
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

function classify(score, baseline) {
  const drop = baseline.value - score;
  const isCritical = score < CRITICAL_SCORE;
  let level, emoji;
  if (drop >= DROP_REVERT)         { level = 'REVERT';      emoji = '🚨'; }
  else if (drop >= DROP_REGRESSION){ level = 'REGRESSION';  emoji = '⚠️'; }
  else if (drop >= DROP_OBSERVATION){ level = 'OBSERVATION'; emoji = '📉'; }
  else                              { level = 'OK';          emoji = '✅'; }
  return { drop, level, emoji, isCritical };
}

function tgTemplate(strategy, m, baseline, c, runUrl, asCritical) {
  const head = asCritical
    ? `🚨 <b>CRÍTICO ABSOLUTO</b> — ${strategy}`
    : c.level === 'REVERT'
      ? `🚨 <b>AUTO-REVERT disparado</b> — ${strategy}`
      : c.level === 'REGRESSION'
        ? `⚠️ <b>Regressão — auto-fix tentado</b> — ${strategy}`
        : c.level === 'OBSERVATION'
          ? `📉 <b>Queda detectada (sem ação automática)</b> — ${strategy}`
          : `✅ <b>PageSpeed OK</b> — ${strategy}`;
  return `${head}
Score: <b>${m.perf_score}/100</b>  LCP ${(m.lcp_ms/1000).toFixed(1)}s  CLS ${m.cls}  TBT ${m.tbt_ms}ms
Baseline: ${baseline.value} (${baseline.source}, n=${baseline.n}, P75₁₄=${baseline.p75_14d ?? '—'}, max₇=${baseline.max_7d ?? '—'})
Drop: ${c.drop > 0 ? '−' + c.drop : '+' + (-c.drop)}pts
Run: ${runUrl}`;
}

// Processa uma strategy (mobile|desktop). Retorna { msgs, actions, level, critFired, fixes }.
//
// Tabela-verdade do envio TG (próxima pessoa lendo: NÃO MEXE sem entender):
//
// critFired  level         NOTIFY_ON_OK  isMonday  → mensagens enviadas
// false      OK            false         false     → []                              (silencioso, default)
// false      OK            false         true      → [OK]                            (heartbeat segunda)
// false      OK            true          *         → [OK]                            (modo "notify all" ligado)
// false      OBSERVATION   *             *         → [OBSERVATION]                   (sempre fala em queda)
// false      REGRESSION    *             *         → [REGRESSION, action]            (sempre fala + ação)
// false      REVERT        *             *         → [REVERT, action]                (sempre fala + ação)
// true       OK            *             *         → [CRITICAL]                      (raro: baseline puxado, score<50, drop pequeno)
// true       OBSERVATION   *             *         → [CRITICAL, OBSERVATION]         (raro: score<50, drop 5-7)
// true       REGRESSION    *             *         → [CRITICAL, REGRESSION, action]  (score<50 E drop 8-14)
// true       REVERT        *             *         → [CRITICAL, action]              (score<50 E drop>=15 — caso 16/05)
//                                                                                     suprime REVERT redundante (ação cobre)
async function processStrategy(strategy, m, runUrl, baseline) {
  const state    = await getAlertState(strategy);
  const c        = classify(m.perf_score, baseline);

  // Ajuste 1: calcular critFired ANTES de qualquer mutação no state
  const critFired = c.isCritical && shouldFireCritical(state, m.perf_score);

  // Cooldown state mutation (EXCLUSIVO via if/else if):
  // - score >= RESET (55): reset idempotente (no-op se já limpo)
  // - critFired: persiste novo estado
  // c.isCritical implica score < 50 < 55, então as duas branches são mutuamente exclusivas
  if (m.perf_score >= RESET_SCORE) {
    if (state?.last_critical_alert_at) await resetAlertState(strategy);
  } else if (critFired) {
    await updateAlertState(strategy, {
      last_critical_alert_at: new Date().toISOString(),
      last_critical_alert_score: m.perf_score,
    });
  }

  // Ações automáticas (REVERT e REGRESSION são exclusivas via if/else)
  const actions = [];
  let fixes = [];
  if (c.level === 'REVERT') {
    const ok = await triggerAutoRevert();
    actions.push(ok ? 'auto-revert disparado' : 'auto-revert falhou');
  } else if (c.level === 'REGRESSION') {
    fixes = autoFixHtml();
    if (fixes.length) {
      if (commit(fixes)) actions.push(`auto-fix aplicado: ${fixes.length} arquivo(s)`);
      else actions.push('auto-fix tentado mas commit falhou');
    } else {
      actions.push('regressão detectada — nenhum fix automático aplicável, intervenção manual necessária');
    }
  }

  // Montagem das mensagens (ver tabela-verdade acima)
  const msgs = [];
  const isMonday = new Date().getUTCDay() === 1;

  if (critFired) msgs.push(tgTemplate(strategy, m, baseline, c, runUrl, true));

  if (c.level === 'OK') {
    if (!critFired && (NOTIFY_ON_OK || isMonday)) {
      msgs.push(tgTemplate(strategy, m, baseline, c, runUrl, false));
    }
  } else if (c.level === 'REVERT' && critFired) {
    // Crítico já cobriu — não duplica REVERT, só mostra ação abaixo
  } else {
    msgs.push(tgTemplate(strategy, m, baseline, c, runUrl, false));
  }

  if (actions.length) msgs.push(`<b>Ação ${strategy}:</b> ${actions.join(' + ')}`);

  return { msgs, actions, level: c.level, critFired, fixes };
}

(async () => {
  console.log('PSI run start', new Date().toISOString());
  // Baseline buscado ANTES de medir — measureStrategy usa pra decidir se re-mede.
  const blM = await getBaseline('mobile');
  const blD = await getBaseline('desktop');
  const [m, d] = await Promise.all([
    measureStrategy('mobile', blM),
    measureStrategy('desktop', blD),
  ]);
  // _attempts é interno (não é coluna) — remove antes do insert.
  const stripInternal = ({ _attempts, ...rest }) => rest;
  await sbInsert([
    { url: SITE_URL, ...stripInternal(m) },
    { url: SITE_URL, ...stripInternal(d) }
  ]);

  const runUrl = process.env.GITHUB_RUN_ID
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '(local)';

  // Ajuste 2: Serializado pra evitar contenção de writes em pagespeed_alert_state
  // e tornar logs determinísticos (mobile antes de desktop). Custo: ~200ms/dia.
  const resM = await processStrategy('mobile', m, runUrl, blM);
  const resD = await processStrategy('desktop', d, runUrl, blD);

  const allMsgs = [
    `<b>PageSpeed Daily ${new Date().toISOString().slice(0,10)}</b>`,
    ...resM.msgs,
    ...resD.msgs,
  ];

  // Se TODAS as strategies estão silenciadas (sem crítico, sem heartbeat), pula TG
  const allSilent = resM.msgs.length === 0 && resD.msgs.length === 0;
  if (!allSilent) {
    await tg(allMsgs.join('\n\n'));
  } else {
    console.log('all silent OK (no critical, no heartbeat) — TG skipped');
  }
  console.log(allMsgs.join('\n\n'));
})().catch(async (e) => {
  console.error(e);
  await tg(`<b>PageSpeed Daily ERRO</b>\n${e.message}`);
  process.exit(1);
});
