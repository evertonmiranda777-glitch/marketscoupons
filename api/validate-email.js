// Vercel Serverless — Public email validation (B.2 enhanced)
// POST /api/validate-email
// Body: { email: "user@example.com" }
// Returns: { valid, reason, cached, domain, [soft_fail] }
//
// Pipeline:
//  1) CORS + rate limit (30 req/IP)
//  2) Format regex
//  3) Cache lookup (email_domains_cache TTL 30d valid / 7d invalid / 1d soft-fail)
//  4) Disposable hardcoded fallback (top 30)
//  5) Disposable JSON list (5.4k domains, loaded at boot from data/disposable-domains.json)
//  6) Domain regex
//  7) DNS MX (Node primary)
//  8) Cloudflare DoH (fallback if Node DNS errors)
//  9) Cache write with TTL
// 10) Lazy cleanup (1% chance, async)

const dns = require('dns');
const { promisify } = require('util');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const resolveMx = promisify(dns.resolveMx);

// Carrega lista oficial uma vez no cold start (5.4k domínios, ~80kb)
let DISPOSABLE_LIST = new Set();
try {
  const raw = require('../data/disposable-domains.json');
  DISPOSABLE_LIST = new Set(raw.domains || []);
} catch {}

// Hardcoded fallback (defesa em profundidade — top 30 mais comuns)
const DISPOSABLE_HARDCODED = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.de',
  'tmail.ws','tmails.net','mohmal.com','fakeinbox.com','dispostable.com',
  'maildrop.cc','mailnesia.com','mailcatch.com','trashmail.com','trashmail.me',
  'harakirimail.com','tempinbox.com','getnada.com','emailondeck.com','33mail.com',
  'temp-mail.org','10minutemail.com','minutemail.com','emailfake.com','crazymailing.com',
]);

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SH = SK ? { apikey: SK, Authorization: `Bearer ${SK}` } : null;

// === Cache helpers ===
async function cacheGet(domain) {
  if (!SH) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_domains_cache?domain=eq.${encodeURIComponent(domain)}&select=*`, { headers: SH });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows.length) return null;
    const row = rows[0];
    if (new Date(row.ttl_expires_at) < new Date()) return null; // expirado, força re-check
    // Increment hit_count async (fire-and-forget)
    fetch(`${SUPABASE_URL}/rest/v1/email_domains_cache?domain=eq.${encodeURIComponent(domain)}`, {
      method: 'PATCH', headers: { ...SH, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ hit_count: (row.hit_count || 0) + 1 }),
    }).catch(()=>{});
    return row;
  } catch { return null; }
}

async function cacheSet(domain, mxValid, isDisposable, reason, ttlDays) {
  if (!SH) return;
  try {
    const ttl = new Date(Date.now() + ttlDays * 86400000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/email_domains_cache`, {
      method: 'POST',
      headers: { ...SH, 'Content-Type': 'application/json', Prefer: 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify({ domain, mx_valid: mxValid, is_disposable: isDisposable, reason, ttl_expires_at: ttl, last_checked_at: new Date().toISOString() }),
    });
  } catch {}
}

// Lazy cleanup — 1% chance, LIMIT 100, async fire-and-forget
async function maybeCleanupCache() {
  if (!SH || Math.random() > 0.01) return;
  try {
    const expired = await fetch(`${SUPABASE_URL}/rest/v1/email_domains_cache?ttl_expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=domain&limit=100`, { headers: SH });
    if (!expired.ok) return;
    const rows = await expired.json();
    if (!rows.length) return;
    const domains = rows.map(r => `"${r.domain.replace(/"/g,'\\"')}"`).join(',');
    await fetch(`${SUPABASE_URL}/rest/v1/email_domains_cache?domain=in.(${domains})`, {
      method: 'DELETE', headers: { ...SH, Prefer: 'return=minimal' },
    });
  } catch {}
}

// === DNS MX checks ===
async function checkMxNode(domain) {
  const records = await resolveMx(domain);
  return records && records.length > 0;
}

async function checkMxCloudflare(domain) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?type=MX&name=${encodeURIComponent(domain)}`, {
    headers: { Accept: 'application/dns-json' },
  });
  if (!r.ok) throw new Error('doh ' + r.status);
  const d = await r.json();
  return Array.isArray(d.Answer) && d.Answer.some(a => a.type === 15);
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitIp(req, 30)) return res.status(429).json({ valid: false, reason: 'rate_limit' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ valid: false, reason: 'missing_email' });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(email)) {
    return res.status(200).json({ valid: false, reason: 'invalid_format' });
  }

  const domain = email.split('@')[1].toLowerCase();

  // Lazy cleanup async (não bloqueia resposta)
  maybeCleanupCache();

  // Cache lookup
  const cached = await cacheGet(domain);
  if (cached) {
    return res.status(200).json({
      valid: cached.mx_valid && !cached.is_disposable,
      reason: cached.reason || (cached.mx_valid && !cached.is_disposable ? 'ok' : 'cached_invalid'),
      cached: true,
      domain,
    });
  }

  // Disposable check (hardcoded primeiro, JSON list depois)
  if (DISPOSABLE_HARDCODED.has(domain) || DISPOSABLE_LIST.has(domain)) {
    await cacheSet(domain, false, true, 'disposable', 30);
    return res.status(200).json({ valid: false, reason: 'disposable', cached: false, domain });
  }

  const domainRe = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!domainRe.test(domain)) {
    return res.status(200).json({ valid: false, reason: 'invalid_domain', cached: false, domain });
  }

  // MX check: Node primary, Cloudflare DoH fallback
  let mxOk = null;
  try {
    mxOk = await checkMxNode(domain);
  } catch {
    try { mxOk = await checkMxCloudflare(domain); }
    catch { mxOk = null; } // ambos falharam
  }

  if (mxOk === null) {
    console.warn('[validate-email] DNS soft-fail for domain:', domain);
    await cacheSet(domain, true, false, 'soft_fail', 1);
    return res.status(200).json({ valid: true, reason: 'ok', cached: false, domain, soft_fail: true });
  }

  if (!mxOk) {
    await cacheSet(domain, false, false, 'no_mx', 7);
    return res.status(200).json({ valid: false, reason: 'no_mx', cached: false, domain });
  }

  await cacheSet(domain, true, false, 'ok', 30);
  return res.status(200).json({ valid: true, reason: 'ok', cached: false, domain });
};
