// CORS fail-closed helper.
// Se Origin não estiver na allowlist, NÃO seta Access-Control-Allow-Origin.
// Browser bloqueia o request automaticamente.
// Allowlist via env var ALLOWED_ORIGINS (CSV) com fallback hardcoded.

const FALLBACK_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];

function getAllowed() {
  const env = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return env.length ? env : FALLBACK_ORIGINS;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return getAllowed().includes(origin);
}

// Aplica CORS. Retorna true se já respondeu (OPTIONS preflight) — handler deve retornar.
function applyCors(req, res, opts = {}) {
  const methods = opts.methods || 'POST, OPTIONS';
  const headers = opts.headers || 'Content-Type, Authorization';
  const origin = req.headers.origin || '';

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

module.exports = { applyCors, isAllowedOrigin };
